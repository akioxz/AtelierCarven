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
  for (const [width, expected] of [[320, '100%'], [420, '47.5%']]) {
    const rt = runtime({ width, state: [[{ id: 'piece', name: 'Chair', category: 'Chair', price: 100 }], false] });
    const Screen = rt.load('src/app/(admin)/manage-furniture.tsx').default;
    const tree = Screen();
    const item = descendants(tree, node => node.type?.name === 'Reveal' && node.props.children?.props?.style?.[0]?.width === '100%')[0];
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
