import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
function callback(path, name, context) {
  const source = read(path), ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) {
      expression = node.initializer;
      if (ts.isCallExpression(expression)) expression = expression.arguments[0];
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(expression, name);
  return runInNewContext(ts.transpileModule(`(${expression.getText(ast)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
}
function load(path) {
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports });
  return module.exports;
}
const { formatDelivery } = load('src/lib/delivery.ts');

test('native auth persistence awaits writes and propagates storage rejection', async () => {
  const failure = Promise.reject(new Error('Storage unavailable'));
  failure.catch(() => {});
  const storage = callback('src/lib/supabase.ts', 'customStorage', { isWeb: false, AsyncStorage: { setItem: () => failure, removeItem: () => Promise.resolve('removed') } });
  await assert.rejects(storage.setItem('test', 'value'), /Storage unavailable/);
  assert.equal(await storage.removeItem('test'), 'removed');
});

test('auth request rejections release pending state and keep errors visible', async () => {
  for (const [file, name, api] of [['login', 'handleLogin', 'signInWithPassword'], ['signup', 'handleSignup', 'signUp'], ['forgot-password', 'handleSubmit', 'resetPasswordForEmail']]) {
    let loading, message;
    const pending = { current: false };
    const context = { pending, email: 'test@example.invalid', username: 'Buyer', password: 'fixture-pass', confirmPassword: 'fixture-pass', setLoading: value => loading = value, setError: value => message = value, Linking: { createURL: () => 'test://reset-password' }, supabase: { auth: { [api]: async () => { throw Error('Network unavailable'); } } } };
    await callback(`src/app/(auth)/${file}.tsx`, name, context)();
    assert.equal(loading, false); assert.equal(pending.current, false); assert.ok(message.includes('try again'));
  }
});

test('signup without a session shows email confirmation and does not enter protected Home', async () => {
  let confirmation, routes = 0;
  await callback('src/app/(auth)/signup.tsx', 'handleSignup', { pending: { current: false }, email: 'test@example.invalid', username: 'Buyer', password: 'fixture-pass', confirmPassword: 'fixture-pass', setLoading() {}, setError() {}, setConfirmationEmail: value => confirmation = value, router: { replace: () => routes++ }, supabase: { auth: { signUp: async () => ({ data: { session: null }, error: null }) } } })();
  assert.equal(confirmation, 'test@example.invalid'); assert.equal(routes, 0);
});

test('expired customer profile settles loading with a retryable error', async () => {
  let loading, message;
  await callback('src/app/(user)/profile.tsx', 'fetchProfile', { setLoading: value => loading = value, setLoadError: value => message = value, supabase: { auth: { getUser: async () => ({ data: { user: null }, error: null }) } } })();
  assert.equal(loading, false); assert.match(message, /sign in again/);
});

test('customer order detail ignores an older response after selecting a newer order', async () => {
  const pending = {}, detailRequest = { current: 0 }; let rows;
  const fetch = callback('src/app/(user)/profile.tsx', 'fetchOrderItems', { detailRequest, setLoadingItems() {}, setItemsError() {}, setOrderItems: value => rows = value, fetchAllRows: build => build(0, 199), supabase: { from() { let id; const q = { select: () => q, eq: (_, value) => { id = value; return q; }, order: () => q, range: () => new Promise(resolve => pending[id] = resolve) }; return q; } } });
  const a = fetch('A'), b = fetch('B'); pending.B([{ order: 'B' }]); await b; pending.A([{ order: 'A' }]); await a;
  assert.equal(rows[0].order, 'B');
});

test('failed customer profile save keeps the draft and releases its synchronous guard', async () => {
  let saving, message, closed = false; const savePending = { current: false };
  await callback('src/app/(user)/profile.tsx', 'handleSave', { savePending, setSaving: value => saving = value, setSaveError: value => message = value, setEditing: () => closed = true, supabase: { auth: { getUser: async () => { throw Error('Expired'); } } } })();
  assert.equal(saving, false); assert.equal(savePending.current, false); assert.equal(closed, false); assert.match(message, /draft is kept/);
});

test('product review read failure stays separate from a successful empty result', async () => {
  let error, loading, rows;
  const context = { id: 'fixture', setReviewsError: value => error = value, setReviewsLoading: value => loading = value, setReviews: value => rows = value, isPublicReview: () => true, supabase: { rpc: () => ({ order: async () => ({ data: null, error: Error('Failed') }) }) } };
  const fetch = callback('src/app/(user)/product.tsx', 'fetchReviews', context);
  await fetch(); assert.match(error, /Could not load/); assert.equal(loading, false); assert.equal(rows, undefined);
  context.supabase.rpc = () => ({ order: async () => ({ data: [], error: null }) });
  await fetch(); assert.equal(error, ''); assert.equal(rows.length, 0);
});

test('required delivery rejects missing, blank, array and delimiter-conflicting route values', () => {
  const valid = { fullName: ' Buyer ', mobile: '09123456789', city: 'City', address: 'Street', notes: 'Gate' };
  assert.equal(formatDelivery(valid), 'Name: Buyer | Mobile: 09123456789 | City: City | Address: Street | Notes: Gate');
  for (const key of ['fullName', 'mobile', 'city', 'address']) for (const value of [undefined, '', ' \t\n', ['City'], 'A | B']) assert.throws(() => formatDelivery({ ...valid, [key]: value }));
});
