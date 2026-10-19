import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { requireLocalQa, createQaSandbox } from './qa-sandbox.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
function load(path) {
  const module = { exports: {} };
  const code = ts.transpileModule(read(path), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(code, { module, exports: module.exports, URL, URLSearchParams });
  return module.exports;
}
function callback(path, name, context) {
  const source = read(path);
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) {
      expression = node.initializer;
      if (ts.isCallExpression(expression)) expression = expression.arguments[0];
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(expression, `${path}: ${name} exists`);
  return runInNewContext(ts.transpileModule(`(${expression.getText(ast)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
}
const { effectivePrice, cartTotal } = load('src/lib/pricing.ts');
const { fetchAllRows } = load('src/lib/pagination.ts');
const { parseRecoveryUrl } = load('src/lib/recovery.ts');
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('one effective price contract handles raw/mapped sale rows and ignores invalid discounts', () => {
  assert.equal(effectivePrice({ price: '100', sale_price: '80' }), 80);
  assert.equal(effectivePrice({ price: 100, salePrice: 80 }), 80);
  for (const sale_price of [null, '', 0, -1, 100, 200, 'bad', Infinity]) {
    assert.equal(effectivePrice({ price: 100, sale_price }), 100);
  }
  assert.equal(cartTotal([{ quantity: 3, furniture: { price: 0.1 } }, { quantity: 1, furniture: { price: 0.2 } }]), 0.5);
  assert.throws(() => effectivePrice(null), /valid price/);
  assert.throws(() => cartTotal([{ quantity: -1, furniture: { price: 100 } }]), /quantity/);
  assert.throws(() => cartTotal([{ quantity: 1, furniture: null }]), /valid price/);
});

test('recovery supports query/fragment, Expo deep links, PKCE and token hashes', () => {
  for (const base of ['https://example.invalid/reset-password', 'ateliercarven://reset-password', 'exp://127.0.0.1:8081/--/reset-password']) {
    for (const separator of ['#', '?']) {
      const proof = parseRecoveryUrl(`${base}${separator}type=recovery&access_token=test-access&refresh_token=test-refresh`);
      assert.equal(proof.kind, 'tokens');
      assert.equal(proof.access_token, 'test-access');
    }
  }
  assert.equal(parseRecoveryUrl('https://example.invalid/reset-password?code=local-test-code').kind, 'code');
  assert.equal(parseRecoveryUrl('https://example.invalid/reset-password?type=recovery&token_hash=local-test-hash').kind, 'hash');
});

test('recovery rejects incomplete, duplicate, mixed, wrong-route and non-recovery proofs', () => {
  for (const suffix of ['', '#access_token=a', '#type=signup&access_token=a&refresh_token=b', '?code=a#code=b', '?code=a#type=recovery&access_token=x&refresh_token=y', '#error=expired', '#type=recovery&token_hash=']) {
    assert.throws(() => parseRecoveryUrl(`https://example.invalid/reset-password${suffix}`));
  }
  assert.throws(() => parseRecoveryUrl('https://example.invalid/home?code=a'));
});

test('database pagination crosses 1000 rows and honors a cap smaller than the page size', async () => {
  const expected = Array.from({ length: 1307 }, (_, id) => ({ id }));
  const ranges = [];
  const rows = await fetchAllRows(async (from, to) => {
    ranges.push([from, to]);
    return { data: expected.slice(from, Math.min(to + 1, from + 37)), error: null, count: expected.length };
  });
  assert.equal(rows.length, expected.length);
  assert.equal(rows.at(-1).id, 1306);
  assert.equal(ranges[1][0], 37);
});

test('pagination never returns a misleading partial success after a page error', async () => {
  await assert.rejects(fetchAllRows(async from => from ? { data: null, error: new Error('page failed'), count: 3 } : { data: [{ id: 1 }], error: null, count: 3 }), /page failed/);
  await assert.rejects(fetchAllRows(async () => ({ data: [], error: null, count: 3 })), /changed/);
  await assert.rejects(fetchAllRows(async () => ({ data: [], error: null, count: null })), /completely/);
});

test('older home category response cannot replace newer data or loading state', async () => {
  const first = deferred(), second = deferred();
  const request = { current: 0 }, furniture = [], loading = [];
  let calls = 0;
  const context = { catalogRequest: request, selectedCategory: 'All',
    fetchAllRows: () => ++calls === 1 ? first.promise : second.promise,
    effectivePrice, setFurniture: rows => furniture.push(rows), setLoading: value => loading.push(value), setActionError() {},
  };
  const fetch = callback('src/app/(user)/home.tsx', 'fetchFurniture', context);
  const older = fetch(), newer = fetch();
  second.resolve([{ id: 'new', price: 100 }]);
  await newer;
  first.resolve([{ id: 'old', price: 100 }]);
  await older;
  assert.equal(furniture.length, 1);
  assert.equal(furniture[0][0].id, 'new');
  assert.deepEqual(loading, [true, true, false]);
});

test('older admin detail response cannot overwrite the selected order', async () => {
  const first = deferred(), second = deferred();
  const written = [];
  let calls = 0;
  const context = { detailRequest: { current: 0 }, fetchAllRows: () => ++calls === 1 ? first.promise : second.promise,
    setLoadingItems() {}, setItemsError() {}, setOrderItems: rows => written.push(rows), setUpdateError() {},
  };
  const fetch = callback('src/app/(admin)/manage-orders.tsx', 'fetchOrderItems', context);
  const older = fetch('old'), newer = fetch('new');
  second.resolve([{ id: 'new' }]); await newer;
  first.resolve([{ id: 'old' }]); await older;
  assert.equal(written.at(-1)[0].id, 'new');
  assert.equal(written.filter(rows => rows[0]?.id === 'old').length, 0);
});

test('review uniqueness failure keeps the sheet, rating and draft intact', async () => {
  const errors = [], resets = [], busy = [];
  const submit = callback('src/app/(user)/product.tsx', 'submitReview', {
    reviewRating: 5, reviewComment: 'Keep my draft', reviewPending: { current: false }, id: 'product', router: { replace() {} },
    setSubmittingReview: value => busy.push(value), setActionError: message => errors.push(message),
    setReviewSheetOpen: value => resets.push(value), setReviewRating: value => resets.push(value), setReviewComment: value => resets.push(value),
    fetchItem() {}, fetchReviews() {},
    supabase: { auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) }, from: () => ({ insert: async () => ({ error: { code: '23505' } }) }) },
  });
  await submit();
  assert.equal(resets.length, 0);
  assert.match(errors.at(-1), /already reviewed/);
  assert.deepEqual(busy, [true, false]);
});

test('failed product cart RPC keeps chosen variants and sheet open', async () => {
  const resets = [], errors = [];
  const submit = callback('src/app/(user)/product.tsx', 'submit', {
    cartPending: { current: false }, setSubmitting() {}, setActionError: value => errors.push(value),
    id: 'product', quantity: 3, selectedColor: 'Black', selectedMaterial: 'Wood', intent: 'buy',
    setSheetOpen: value => resets.push(value), router: { push: value => resets.push(value) },
    supabase: { rpc: async (_name, args) => { assert.equal(args.p_color, 'Black'); assert.equal(args.p_quantity, 3); return { data: null, error: { code: '42501' } }; } },
  });
  await submit();
  assert.equal(resets.length, 0);
  assert.match(errors.at(-1), /selections have been kept/);
});

test('failed home favorite write keeps the prior selection and releases its guard', async () => {
  const errors = [], writes = [], pending = new Set();
  const builder = { delete() { return this; }, eq() { return this; }, then(resolve) { resolve({ error: { code: '42501' } }); } };
  const toggle = callback('src/app/(user)/home.tsx', 'toggleFavorite', {
    pendingFavorites: { current: pending }, favorites: ['saved'], setFavorites: value => writes.push(value), setActionError: value => errors.push(value),
    router: { replace() {} }, supabase: { auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) }, from: () => builder },
  });
  await toggle('saved');
  assert.equal(writes.length, 0);
  assert.equal(pending.size, 0);
  assert.match(errors.at(-1), /Could not update/);
});

function furnitureHarness({ guideError = true, deletionError = false } = {}) {
  const errors = [], editing = [], closed = [], logs = [], calls = [];
  const state = { guideError };
  const context = {
    mutationPending: { current: false }, imagePending: { current: false }, galleryPending: { current: false }, setUploadingGallery: () => {}, guidesReady: true, editing: null, name: 'Chair', price: '100', category: 'Chair',
    CATEGORIES: ['Chair'], description: '', imageUrl: '', width: '20', height: '', depth: '', weight: '',
    setErrorMsg: value => errors.push(value), setSaving() {}, setEditing: value => { editing.push(value); context.editing = value; },
    setModalVisible: value => closed.push(value), fetchFurniture: async () => {}, fetchSizeGuides: async () => {},
    logAction: async action => logs.push(action), itemToDelete: { id: 'saved-id', name: 'Chair' },
    setDeleteModalVisible: value => closed.push(value), setItemToDelete() {},
    supabase: { from(table) {
      let operation;
      const result = () => table === 'furniture' ? { data: { id: 'saved-id' }, error: deletionError ? { code: '42501' } : null }
        : { data: { furniture_id: 'saved-id' }, error: state.guideError ? { code: '42501' } : null };
      const builder = { then(resolve) { resolve(result()); }, single: async () => result() };
      for (const name of ['insert', 'update', 'upsert', 'delete', 'eq', 'select']) builder[name] = (...args) => { operation ??= name; calls.push([table, operation, args]); return builder; };
      return builder;
    } },
  };
  return { context, errors, editing, closed, logs, calls, state };
}

test('partial admin dimension save stays open and retry updates the same furniture row', async () => {
  const h = furnitureHarness();
  const save = callback('src/app/(admin)/manage-furniture.tsx', 'handleSave', h.context);
  await save();
  assert.equal(h.editing[0].id, 'saved-id');
  assert.equal(h.closed.length, 0);
  assert.equal(h.logs.length, 0);
  assert.match(h.errors.at(-1), /dimensions were not saved/);
  h.state.guideError = false;
  await save();
  assert.equal(h.calls.filter(([table, op]) => table === 'furniture' && op === 'insert').filter(([, , args]) => args.length === 1 && typeof args[0] === 'object').length, 1);
  assert.equal(h.closed.at(-1), false);
  assert.equal(h.logs.length, 1);
});

test('invalid dimensions reject before writing and failed deletion never logs success', async () => {
  const invalid = furnitureHarness(); invalid.context.width = '20cm';
  await callback('src/app/(admin)/manage-furniture.tsx', 'handleSave', invalid.context)();
  assert.equal(invalid.calls.length, 0);
  const deletion = furnitureHarness({ deletionError: true });
  await callback('src/app/(admin)/manage-furniture.tsx', 'confirmDelete', deletion.context)();
  assert.equal(deletion.logs.length, 0);
  assert.equal(deletion.closed.length, 0);
  assert.match(deletion.errors.at(-1), /Could not remove/);
});

test('failed gallery deletion keeps the local image row and reports the error', async () => {
  const h = furnitureHarness();
  const updates = [];
  h.context.setGalleryImages = value => updates.push(value);
  await callback('src/app/(admin)/manage-furniture.tsx', 'removeGalleryImage', h.context)('image-id');
  assert.equal(updates.length, 0);
  assert.match(h.errors.at(-1), /Could not remove this gallery image/);
});

const localEnv = { BASE_URL: 'http://127.0.0.1:8721', QA_SUPABASE_URL: 'http://127.0.0.1:54321', QA_ALLOW_MUTATIONS: 'local-only', QA_SUPABASE_SERVICE_ROLE_KEY: 'fake-local-test-key' };
test('QA rejects remote/implicit targets before creating any account', async () => {
  for (const env of [{}, { ...localEnv, BASE_URL: 'https://production.example' }, { ...localEnv, QA_SUPABASE_URL: 'https://hghsiwgxzawivwgsqdvd.supabase.co' }, { ...localEnv, QA_ALLOW_MUTATIONS: '' }]) {
    assert.throws(() => requireLocalQa(env));
    await assert.rejects(createQaSandbox(env, () => assert.fail('Client must not be constructed')));
  }
});

test('QA creates disposable local fixtures and cleans their dependent rows and account', async () => {
  const operations = [];
  const client = { auth: { admin: {
    createUser: async () => ({ data: { user: { id: 'fixture-user' } }, error: null }),
    deleteUser: async id => { operations.push(['auth', id]); return { error: null }; },
  } }, from(table) {
    let operation;
    return { insert: async value => { operations.push([table, 'insert', value.id]); return { error: null }; },
      select() { operation = 'select'; return this; }, delete() { operation = 'delete'; return this; },
      eq: async (key, value) => { operations.push([table, operation, key, value]); return { data: operation === 'select' ? [{ id: 'fixture-order' }] : null, error: null }; },
    };
  } };
  const sandbox = await createQaSandbox(localEnv, () => client);
  assert.equal(sandbox.allowRequest('https://hghsiwgxzawivwgsqdvd.supabase.co/rest/v1/orders'), false);
  assert.equal(sandbox.allowRequest('http://127.0.0.1:54321/rest/v1/orders'), true);
  await sandbox.cleanup();
  assert.ok(operations.some(op => op[0] === 'order_items' && op[3] === 'fixture-order'));
  assert.ok(operations.some(op => op[0] === 'orders' && op[3] === 'fixture-user'));
  assert.ok(operations.some(op => op[0] === 'furniture' && op[3] === sandbox.productId));
  assert.deepEqual(operations.at(-1), ['auth', 'fixture-user']);
});

test('failed QA cleanup preserves the owner for retry and still attempts other dependencies', async () => {
  let fail = true;
  const operations = [];
  const client = { auth: { admin: {
    createUser: async () => ({ data: { user: { id: 'fixture-user' } }, error: null }),
    deleteUser: async id => { operations.push(['auth', id]); return { error: null }; },
  } }, from(table) {
    let operation;
    return { insert: async () => ({ error: null }), select() { operation = 'select'; return this; }, delete() { operation = 'delete'; return this; },
      eq: async () => {
        operations.push([table, operation]);
        return { data: operation === 'select' ? [{ id: 'fixture-order' }] : null,
          error: table === 'order_items' && fail ? { message: 'Fixture cleanup failed' } : null };
      },
    };
  } };
  const sandbox = await createQaSandbox(localEnv, () => client);
  await assert.rejects(sandbox.cleanup(), /cleanup incomplete/);
  assert.ok(operations.some(([table]) => table === 'cart'));
  assert.equal(operations.some(([table]) => table === 'auth' || table === 'profiles'), false);
  fail = false;
  await sandbox.cleanup();
  assert.deepEqual(operations.at(-1), ['auth', 'fixture-user']);
});

test('every theme display font is registered, and checkout no longer reads URL totals', () => {
  const root = read('src/app/_layout.tsx');
  const fonts = root.slice(root.indexOf('useFonts({'), root.indexOf('  useEffect'));
  for (const font of ['PlayfairDisplay_400Regular', 'PlayfairDisplay_500Medium', 'PlayfairDisplay_600SemiBold', 'PlayfairDisplay_700Bold']) assert.ok(fonts.includes(font));
  for (const path of ['checkout-payment', 'checkout-review']) {
    const source = read(`src/app/(user)/${path}.tsx`);
    assert.ok(source.includes('const orderTotal = cartTotal(cartItems)'));
    assert.ok(!source.includes('total ? Number(total)'));
  }
  assert.ok(root.includes('if (event === "TOKEN_REFRESHED" || recoveryRoute) return;'));
});
