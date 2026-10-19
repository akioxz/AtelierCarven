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
const { fetchPage } = load('src/lib/pagination.ts');

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
  let failed = true;
  const context = { reviewsRequest: { current: 0 }, reviewPage: 0, setReviewsTotal() {}, fetchPage: async () => { if (failed) throw Error('Failed'); return { rows: [], total: 0 }; }, id: 'fixture', setReviewsError: value => error = value, setReviewsLoading: value => loading = value, setReviews: value => rows = value, isPublicReview: () => true, supabase: { rpc: () => ({ order: async () => ({ data: null, error: Error('Failed') }) }) } };
  const fetch = callback('src/app/(user)/product.tsx', 'fetchReviews', context);
  await fetch(); assert.match(error, /Could not load/); assert.equal(loading, false); assert.equal(rows, undefined);
  failed = false;
  await fetch(); assert.equal(error, ''); assert.equal(rows.length, 0);
});

test('required delivery rejects missing, blank, array and delimiter-conflicting route values', () => {
  const valid = { fullName: ' Buyer ', mobile: '09123456789', city: 'City', address: 'Street', notes: 'Gate' };
  assert.equal(formatDelivery(valid), 'Name: Buyer | Mobile: 09123456789 | City: City | Address: Street | Notes: Gate');
  for (const key of ['fullName', 'mobile', 'city', 'address']) for (const value of [undefined, '', ' \t\n', ['City'], 'A | B']) assert.throws(() => formatDelivery({ ...valid, [key]: value }));
});


test('bounded pages fill through small server caps without skipping or fetching the entire list', async () => {
  const rows = Array.from({ length: 1050 }, (_, id) => ({ id })), requests = [];
  const build = async (from, to) => { requests.push([from, to]); return { data: rows.slice(from, Math.min(to + 1, from + 7)), error: null, count: rows.length }; };
  const first = await fetchPage(build, 0);
  assert.equal(first.rows.length, 24); assert.equal(first.total, 1050); assert.equal(first.rows[23].id, 23);
  assert.equal(requests.length, 4); assert.equal(requests.at(-1)[1], 23);
  const second = await fetchPage(build, 1);
  assert.equal(second.rows[0].id, 24); assert.equal(second.rows.at(-1).id, 47);
  const last = await fetchPage(build, 43);
  assert.equal(last.rows.length, 18); assert.equal(last.rows.at(-1).id, 1049);
});

test('bounded pages reject a partial failure or changed count rather than returning partial success', async () => {
  let calls = 0;
  await assert.rejects(fetchPage(async () => ++calls === 1 ? { data: [{ id: 1 }], count: 50, error: null } : { data: null, count: null, error: Error('Disconnected') }, 0), /Disconnected/);
  calls = 0;
  await assert.rejects(fetchPage(async () => ({ data: [{ id: ++calls }], count: calls === 1 ? 50 : 49, error: null }), 0), /list changed/);
  await assert.rejects(fetchPage(async () => { assert.fail('Must reject before query'); }, -1), /Invalid page/);
});
