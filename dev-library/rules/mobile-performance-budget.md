# Rule: Mobile Performance Budget (Expo / React Native)

Hard, measurable budgets for Expo/React Native apps so performance is a reviewed constraint, not an accident. Attach whenever a session adds screens, lists, images, or animations to a mobile app. Numbers are starting points for a typical consumer app — adjust per project and record the actuals.

## Startup & bundle

- [ ] Hermes enabled (release builds)
- [ ] No `console.log` in production bundles
- [ ] Splash screen controlled explicitly (hide on first frame, not a fixed sleep)
- [ ] Route-level code splitting (async routes / `lazy`); no giant barrel imports (`@components/index` pulls in everything)
- [ ] Initial JS bundle target: < 25 MB uncompressed; audit any dependency over ~1 MB with justification

## Lists

- [ ] `FlashList` (or `FlatList`) for anything longer than ~10 rows — never an unvirtualized `ScrollView` over mapped data
- [ ] Provide `estimatedItemSize` (FlashList) / `getItemLayout` (FlatList) for fixed-size rows
- [ ] `getItemType` for heterogeneous lists; stable `renderItem` via `useCallback`
- [ ] Row components memoized; no inline objects/functions passed into rows (breaks memoization)

## Images

- [ ] `expo-image` with caching over raw `<Image>` for remote photos
- [ ] Request size-appropriate images (never full-res for thumbnails); WebP/AVIF where the source supports it
- [ ] Prefetch hero/above-the-fold images during splash; lazy-load everything below
- [ ] `recyclingKey` on FlashList image rows
- [ ] Image budget: no single hero over ~300 KB; thumbnails ≤ 40 KB

## Rendering

- [ ] Memoize expensive computations (`useMemo`); stabilize handlers (`useCallback`)
- [ ] Split context by update frequency so a fast-changing value doesn't re-render the whole tree
- [ ] Animate `transform`/`opacity`, not `width`/`height`/`top`; native driver / Reanimated for anything but trivial transitions
- [ ] No layout thrashing from reading layout then writing style in the same frame

## Memory & data

- [ ] Subscriptions, timers, and fetch aborted on unmount
- [ ] List data capped in memory (paginate/window, don't hold an unbounded array)
- [ ] Async compound requests batched/parallelized (`Promise.all`), not awaited serially when independent

## Related
- Prompts: [[start-new-project-prompt]], [[project-continuation-prompt]]
- Workflows: [[ai-development-workflow-map]]
- Skills: [[web-performance-audit]]

---
Last updated: 2026-09-07