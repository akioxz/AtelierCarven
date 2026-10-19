import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const element = (type, props) => ({ type, props });
const animation = new Proxy({}, { get: () => () => animation });

// Render actual components without a native runtime or backend connections.
function runtime({ platform = 'android', width = 420, bottom = 34, state = [] } = {}) {
  let stateIndex = 0;
  const react = {
    useState: initial => [stateIndex in state ? state[stateIndex++] : (stateIndex++, initial), () => {}],
    useEffect: () => {}, useCallback: fn => fn, useRef: value => ({ current: value }),
  };
  const native = {
    Platform: { OS: platform }, StyleSheet: { create: value => value, hairlineWidth: 1 },
    useWindowDimensions: () => ({ width, height: 900 }),
    ...Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'StatusBar', 'Modal', 'TextInput', 'FlatList'].map(name => [name, name])),
  };
  const reanimated = {
    View: 'Animated.View', createAnimatedComponent: component => `Animated.${component}`,
    useReducedMotion: () => false, useSharedValue: value => ({ value }),
    useAnimatedStyle: fn => fn(), withSpring: value => value,
  };
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const module = { exports: {} };
    const require = id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'Fragment' };
      if (id === 'react-native') return native;
      if (id === 'react-native-reanimated') return { __esModule: true, default: reanimated, ...reanimated, FadeIn: animation, FadeInUp: animation, ZoomIn: animation };
      if (id === 'expo-haptics') return { selectionAsync: () => Promise.resolve() };
      if (id === 'expo-router') return { useRouter: () => ({}), Stack: 'Stack' };
      if (id === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 28, left: 0, right: 0, bottom }) };
      if (id === '@expo/vector-icons') return { Feather: 'Feather' };
      if (id === 'expo-image') return { Image: 'Image' };
      if (id.endsWith('/constants/design')) return load('src/constants/design.ts');
      if (id.endsWith('/components/app-ui')) return load('src/components/app-ui.tsx');
      if (id.endsWith('/motion')) return load('src/components/motion.tsx');
      if (id.endsWith('/skeleton')) return { ShimmerBlock: 'ShimmerBlock' };
      if (id.endsWith('/confirm-modal')) return { __esModule: true, default: 'ConfirmModal' };
      if (id.endsWith('/supabase')) return { supabase: new Proxy({}, { get() { throw new Error('Unexpected backend access'); } }) };
      if (id.endsWith('/statuses')) return { getStatusBadge: () => ({}) };
      if (id.endsWith('/imageUpload') || id.endsWith('/pagination') || id.endsWith('/navigation')) return {};
      throw new Error(`Unmocked dependency ${id}`);
    };
    const code = ts.transpileModule(read(path), { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    runInNewContext(code, { module, exports: module.exports, require });
    cache.set(path, module.exports);
    return module.exports;
  }
  return { load };
}

function descendants(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  const children = [node.props?.children].flat(Infinity);
  return [...(predicate(node) ? [node] : []), ...children.flatMap(child => descendants(child, predicate))];
}

test('shared pressable keeps row children together and preserves touch/accessibility callbacks', () => {
  const { PressScale } = runtime().load('src/components/motion.tsx');
  const children = [element('Icon', {}), element('Text', {})];
  let pressed = 0;
  const button = PressScale({ children, style: { flexDirection: 'row', gap: 8 }, onPress: () => pressed++, accessibilityLabel: 'Edit', disabled: false, hitSlop: 8 });
  assert.equal(button.type, 'Animated.Pressable');
  assert.equal(button.props.children, children);
  assert.equal(flatten(button.props.style).flexDirection, 'row');
  assert.equal(button.props.accessibilityLabel, 'Edit');
  assert.equal(button.props.hitSlop, 8);
  button.props.onPress({});
  assert.equal(pressed, 1);
  const disabled = PressScale({ children, disabled: true, accessibilityState: { disabled: true } });
  assert.equal(disabled.props.disabled, true);
  assert.equal(disabled.props.accessibilityState.disabled, true);
});

test('explicit customer contentStyle remains a separate content wrapper', () => {
  const { PressScale } = runtime().load('src/components/motion.tsx');
  const contentStyle = { flexDirection: 'row', alignItems: 'center' };
  const button = PressScale({ children: 'Search', style: { padding: 12 }, contentStyle });
  assert.equal(button.props.children.type, 'View');
  assert.equal(button.props.children.props.style, contentStyle);
  assert.equal(button.props.children.props.children, 'Search');
});

test('mobile admin navigation reserves flow space and includes the device bottom inset', () => {
  const { AdminNavigation } = runtime().load('src/components/app-ui.tsx');
  assert.equal(AdminNavigation({ active: 'orders' }), null);
  const footer = AdminNavigation({ active: 'orders', placement: 'footer' });
  const nav = footer.type(footer.props);
  const style = flatten(nav.props.style);
  assert.equal(style.position, 'relative');
  assert.equal(style.flexShrink, 0);
  assert.equal(style.paddingBottom, 34);
});

test('desktop admin navigation stays above content and has no second footer', () => {
  const { AdminNavigation } = runtime({ platform: 'web', width: 1440 }).load('src/components/app-ui.tsx');
  assert.ok(AdminNavigation({ active: 'dashboard' }));
  assert.equal(AdminNavigation({ active: 'dashboard', placement: 'footer' }), null);
});

test('admin stack applies top and side safe areas without duplicating footer bottom insets', () => {
  const Layout = runtime({ state: [false] }).load('src/app/(admin)/_layout.tsx').default;
  const tree = Layout();
  assert.equal(tree.type, 'SafeAreaView');
  assert.equal(Array.from(tree.props.edges).join(','), 'top,left,right');
  assert.equal(tree.props.children.type, 'Stack');
});

test('furniture grid puts width on direct layout children and fills each card', () => {
  for (const [width, columns, expected] of [[320, 1, 288], [420, 2, 187]]) {
    const rt = runtime({ width, state: [[{ id: 'piece', name: 'Chair', category: 'Chair', price: 100 }], false] });
    const Screen = rt.load('src/app/(admin)/manage-furniture.tsx').default;
    const tree = Screen();
    const list = descendants(tree, node => node.type === 'FlatList')[0];
    assert.equal(list.props.numColumns, columns);
    assert.equal(list.props.initialNumToRender, 12);
    const item = list.props.renderItem({ item: list.props.data[0], index: 0 });
    assert.ok(item);
    assert.equal(flatten(item.props.style).width, expected);
    assert.equal(flatten(item.props.children.props.style).width, '100%');
    const footer = descendants(tree, node => node.props?.placement === 'footer')[0];
    assert.ok(footer);
  }
});

test('reselecting the active Orders filter never starts loading; changing it still does', () => {
  const source = read('src/app/(admin)/manage-orders.tsx');
  const ast = ts.createSourceFile('orders.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  const visit = node => {
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'onPress' && node.initializer?.expression?.getText(ast).includes('setSelectedStatus(status)')) handler = node.initializer.expression;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(handler);
  for (const status of ['All', 'Pending']) {
    let selected = 'All', loading = false;
    const callback = runInNewContext(ts.transpileModule(`(${handler.getText(ast)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
      { status, selectedStatus: selected, setSelectedStatus: value => selected = value, setLoading: value => loading = value });
    callback();
    assert.equal(selected, status);
    assert.equal(loading, status !== 'All');
  }
});

function callback(path, name, context) {
  const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) {
      expression = node.initializer;
      if (ts.isCallExpression(expression)) expression = expression.arguments[0];
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(expression, name);
  return runInNewContext(ts.transpileModule(`(${expression.getText(ast)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
}

test('profile session failure clears loading, reports retry and never invents a profile', async () => {
  let loading, error, writes = 0;
  await callback('src/app/(admin)/profile.tsx', 'fetchProfile', {
    setLoading: value => loading = value, setLoadError: value => error = value, setProfile: () => writes++,
    supabase: { auth: { getUser: async () => ({ data: { user: null }, error: null }) } },
  })();
  assert.equal(loading, false);
  assert.match(error, /Could not load/);
  assert.equal(writes, 0);
});

test('avatar profile-write error stays visible and releases its synchronous guard', async () => {
  let error, uploading, fetched = 0;
  const pending = { current: false };
  await callback('src/app/(admin)/profile.tsx', 'handleAvatarUpload', {
    avatarPending: pending, setUploadingAvatar: value => uploading = value, setAvatarError: value => error = value,
    pickAndUploadImage: async () => 'local-test-image', fetchProfile: async () => fetched++,
    supabase: { auth: { getUser: async () => ({ data: { user: { id: 'test' } } }) },
      from: () => ({ update: () => ({ eq: async () => ({ error: { code: '42501' } }) }) }) },
  })();
  assert.match(error, /Could not confirm/);
  assert.equal(uploading, false);
  assert.equal(pending.current, false);
  assert.equal(fetched, 0);
});

test('dashboard load failure shows Retry rather than an empty-store welcome', () => {
  const Screen = runtime({ state: [{ furniture: 0 }, [], false, 'Failed to load'] }).load('src/app/(admin)/dashboard.tsx').default;
  const tree = Screen();
  assert.equal(descendants(tree, node => node.type?.name === 'RetryNotice').length, 1);
  assert.equal(descendants(tree, node => node.props?.children === 'Your dashboard is ready.').length, 0);
});

test('activity list virtualizes rows and retains the full recorded action', () => {
  const log = { id: 'log', action: 'Updated order status to Completed', target_item: 'Order #test', created_at: '2026-10-19' };
  const Screen = runtime({ state: [[log], false] }).load('src/app/(admin)/activity-logs.tsx').default;
  const list = descendants(Screen(), node => node.type === 'FlatList')[0];
  assert.ok(list);
  assert.equal(list.props.initialNumToRender, 12);
  const row = list.props.renderItem({ item: log, index: 0 });
  assert.equal(descendants(row, node => node.props?.children === log.action).length, 1);
});

test('confirmation blocks cancellation/back and disables both actions while pending', () => {
  let cancelled = 0;
  const Confirm = runtime().load('src/components/confirm-modal.tsx').default;
  const tree = Confirm({ visible: true, title: 'Update?', message: 'Confirm', confirmLabel: 'UPDATE', pending: true, error: 'Retry failed', onCancel: () => cancelled++, onConfirm: () => {} });
  tree.props.onRequestClose();
  assert.equal(cancelled, 0);
  const buttons = descendants(tree, node => node.type?.name === 'PressScale');
  assert.equal(buttons.length, 2);
  assert.ok(buttons.every(button => button.props.disabled));
  assert.equal(descendants(tree, node => node.props?.accessibilityRole === 'alert').length, 1);
});

test('status update rejection is visible in the confirmation and duplicate taps make one request', async () => {
  let release, calls = 0, updating, error;
  const pending = { current: false };
  const promise = new Promise(resolve => release = resolve);
  const context = {
    selectedOrder: { id: 'order' }, modalStatus: 'Completed', updatePending: pending,
    setUpdating: value => updating = value, setUpdateError: value => error = value,
    supabase: { from: () => ({ update: () => ({ eq: () => { calls++; return { select: () => ({ single: () => promise }) }; } }) }) },
  };
  const update = callback('src/app/(admin)/manage-orders.tsx', 'handleUpdateStatus', context);
  const first = update();
  await update();
  assert.equal(calls, 1);
  release({ error: { code: '42501' } });
  await first;
  assert.match(error, /Couldn't confirm/);
  assert.equal(updating, false);
  assert.equal(pending.current, false);
});

test('dirty form dismissal requests confirmation and pending work cannot dismiss', () => {
  let discarded = false, closed = false;
  const context = {
    mutationPending: { current: false }, imagePending: { current: false }, galleryPending: { current: false },
    formSignature: 'changed', originalForm: { current: 'original' },
    setDiscardOpen: value => discarded = value, closeForm: () => closed = true,
  };
  const close = callback('src/app/(admin)/manage-furniture.tsx', 'requestCloseForm', context);
  close();
  assert.equal(discarded, true);
  assert.equal(closed, false);
  discarded = false;
  context.galleryPending.current = true;
  close();
  assert.equal(discarded, false);
  context.galleryPending.current = false;
  context.formSignature = 'original';
  close();
  assert.equal(closed, true);
});

test('muted text token meets normal-text contrast on all three surfaces', () => {
  const { Design } = runtime().load('src/constants/design.ts');
  const luminance = hex => {
    const c = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
  };
  for (const surface of ['canvas', 'surface', 'surfaceMuted']) {
    const a = luminance(Design.color.inkMuted), b = luminance(Design.color[surface]);
    assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, surface);
  }
});

test('order detail displays stored variants and a legacy fallback without inventing values', () => {
  for (const variant of [{ color: 'Blue', material: 'Oak' }, {}]) {
    const state = [];
    state[4] = { id: 'order', status: 'Pending', address: '' };
    state[5] = [{ id: 'line', furniture: { name: 'Chair', category: 'Chair' }, price: 100, quantity: 1, ...variant }];
    const Screen = runtime({ state }).load('src/app/(admin)/manage-orders.tsx').default;
    const copy = descendants(Screen(), node => node.type === 'Text').map(node => [node.props.children].flat().join('')).join('\n');
    assert.ok(copy.includes(`Color: ${variant.color || 'Not recorded'}`));
    assert.ok(copy.includes(`Material: ${variant.material || 'Not recorded'}`));
  }
});

test('furniture dimensions have native accessible names and category selection is exposed', () => {
  const Screen = runtime().load('src/app/(admin)/manage-furniture.tsx').default;
  const tree = Screen();
  const labels = descendants(tree, node => node.type === 'TextInput').map(node => node.props.accessibilityLabel);
  for (const label of ['Width in centimetres', 'Height in centimetres', 'Depth in centimetres', 'Weight in kilograms']) assert.ok(labels.includes(label));
  const category = descendants(tree, node => node.props?.accessibilityLabel === 'Set category to Sofa')[0];
  assert.equal(category.props.accessibilityRole, 'radio');
  assert.equal(category.props.accessibilityState.checked, true);
});
