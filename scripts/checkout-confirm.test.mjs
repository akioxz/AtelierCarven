import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the actual screen callbacks without mounting React Native or using
// live accounts/orders. AST extraction keeps this fixture dependency-free.
const source = readFileSync(new URL('../src/app/(user)/checkout-review.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('checkout-review.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function callback(name, context) {
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) {
      expression = node.initializer;
      if (ts.isCallExpression(expression)) expression = expression.arguments[0];
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(expression, `Missing screen callback: ${name}`);
  const code = ts.transpileModule(`(${expression.getText(ast)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return runInNewContext(code, context);
}

const deliveryModule = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/delivery.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: deliveryModule, exports: deliveryModule.exports });
const { formatDelivery } = deliveryModule.exports;
const orderId = '30000000-0000-0000-0000-000000000001';
function harness(options = {}) {
  const events = { rpc: [], routes: [], alerts: [], processing: [], cancelled: 0 };
  const context = {
    formatDelivery, confirming: { current: false }, loading: false, cartError: false, cartItems: [{ id: 'cart-row' }],
    orderTotal: 500, fullName: 'Test Buyer', address: 'Test address', city: 'Test city', mobile: '09123456789', notes: '', method: 'cod',
    setProcessing: value => events.processing.push(value),
    spin: { set() {} }, withRepeat() {}, withTiming() {}, Easing: { linear() {} },
    cancelAnimation: () => { events.cancelled++; },
    showAlert: (title, message) => events.alerts.push({ title, message }),
    router: { replace: route => events.routes.push(route) },
    supabase: {
      auth: { getUser: options.getUser ?? (async () => ({ data: { user: { id: 'owner' } }, error: null })) },
      rpc: async (...args) => {
        events.rpc.push(args);
        return options.rpc ? options.rpc(...args) : { data: orderId, error: null };
      },
      from() { assert.fail('Confirmation must not perform separate table writes'); },
    },
    ...options.context,
  };
  return { context, events, confirm: callback('handleConfirm', context) };
}

test('success uses one atomic RPC, validates confirmation, and releases busy state', async () => {
  const { confirm, events, context } = harness();
  await confirm();
  assert.equal(events.rpc.length, 1);
  const [name, args] = events.rpc[0];
  assert.equal(name, 'checkout_cart');
  assert.deepEqual(JSON.parse(JSON.stringify(args)), {
    p_total: 500, p_address: 'Name: Test Buyer | Mobile: 09123456789 | City: Test city | Address: Test address | Notes: ', p_payment_method: 'cod',
  });
  assert.deepEqual(events.routes, ['/(user)/order-success']);
  assert.equal(events.alerts.length, 0);
  assert.deepEqual(events.processing, [true, false]);
  assert.equal(events.cancelled, 1);
  assert.equal(context.confirming.current, false);
});

for (const [label, rpc] of [
  ['order/line constraint failure', async () => ({ data: null, error: { code: '23514' } })],
  ['cart deletion failure', async () => ({ data: null, error: { code: '42501' } })],
  ['empty or already checked-out cart', async () => ({ data: null, error: { code: 'P0002' } })],
  ['unapplied RPC migration', async () => ({ data: null, error: { code: 'PGRST202' } })],
  ['network rejection', async () => { throw new Error('Network disconnected'); }],
  ['null confirmation', async () => ({ data: null, error: null })],
  ['malformed confirmation', async () => ({ data: { id: orderId }, error: null })],
  ['non-UUID confirmation', async () => ({ data: 'not-an-order-id', error: null })],
]) {
  test(`${label}: no success navigation, direct writes, or stuck busy state`, async () => {
    const { confirm, events, context } = harness({ rpc });
    await confirm();
    assert.equal(events.rpc.length, 1);
    assert.deepEqual(events.routes, []);
    assert.equal(events.alerts.length, 1);
    assert.deepEqual(events.processing, [true, false]);
    assert.equal(context.confirming.current, false);
    assert.equal(context.cartItems.length, 1);
  });
}

test('authentication failures never call the checkout RPC', async () => {
  for (const getUser of [
    async () => ({ data: { user: null }, error: null }),
    async () => ({ data: { user: null }, error: { message: 'Auth unavailable' } }),
    async () => { throw new Error('Auth transport failed'); },
  ]) {
    const { confirm, events } = harness({ getUser });
    await confirm();
    assert.equal(events.rpc.length, 0);
    assert.equal(events.routes.length, 0);
    assert.equal(events.alerts.length, 1);
    assert.deepEqual(events.processing, [true, false]);
  }
});

test('synchronous guard blocks a second tap while the first request is pending', async () => {
  let release;
  let started;
  const entered = new Promise(resolve => { started = resolve; });
  const pending = new Promise(resolve => { release = resolve; });
  const { confirm, events } = harness({ rpc: () => { started(); return pending; } });
  const first = confirm();
  const second = confirm();
  await entered;
  assert.equal(events.rpc.length, 1);
  release({ data: orderId, error: null });
  await Promise.all([first, second]);
  assert.equal(events.routes.length, 1);
});

test('failed submission releases the synchronous guard for an explicit retry', async () => {
  let calls = 0;
  const { confirm, events } = harness({ rpc: async () => ++calls === 1
    ? { data: null, error: { code: '23514' } } : { data: orderId, error: null } });
  await confirm();
  await confirm();
  assert.equal(events.rpc.length, 2);
  assert.equal(events.routes.length, 1);
});

test('loading, failed load, and empty cart cannot submit', async () => {
  for (const context of [{ loading: true }, { cartError: true }, { cartItems: [] }]) {
    const { confirm, events } = harness({ context });
    await confirm();
    assert.equal(events.rpc.length, 0);
    assert.equal(events.processing.length, 0);
  }
});

test('cart load failure remains visible and can be retried without discarding rows', async () => {
  let shouldFail = true;
  const state = { cart: [{ id: 'previous' }], error: false, loading: false };
  const context = {
    fetchAllRows: async () => { if (shouldFail) throw new Error("Cart unavailable"); return [{ id: "loaded" }]; },
    cartTotal: () => 500,
    setLoading: value => { state.loading = value; }, setCartError: value => { state.error = value; },
    setCartItems: value => { state.cart = value; }, router: { replace() { assert.fail('Unexpected auth redirect'); } },
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
      from: () => ({ select: () => ({ eq: async () => shouldFail
        ? { data: null, error: { message: 'Cart read failed' } }
        : { data: [{ id: 'loaded' }], error: null } }) }),
    },
  };
  const fetchCart = callback('fetchCart', context);
  await fetchCart();
  assert.equal(state.error, true);
  assert.equal(state.loading, false);
  assert.equal(state.cart[0].id, 'previous');
  shouldFail = false;
  await fetchCart();
  assert.equal(state.error, false);
  assert.equal(state.loading, false);
  assert.equal(state.cart[0].id, 'loaded');
});
