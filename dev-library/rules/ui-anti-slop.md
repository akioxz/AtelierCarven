# Rule: UI/UX Anti-Slop Patterns

Overused, templated AI-generated design patterns to actively avoid when building new UI. Used by [[start-new-project-prompt]] before any UI/UX decisions are made, and by [[project-continuation-prompt]] when a session's goal is UI/UX work.

## Visual patterns to avoid
1. Purple-to-blue gradient (the default AI gradient)
2. Gradient text on hero headings
3. Emojis used inside headings
4. Inter font used everywhere (pick a deliberate pairing instead)
5. Colored border cards as the default card style
6. Glassmorphism cards as a default choice
7. Low-contrast dark mode (test actual contrast, don't eyeball it)
8. Three icon boxes in a row (the default "features" section layout)
9. A badge sitting above the headline
10. Lucide icons used indiscriminately everywhere
11. Untouched/default shadcn UI components with no customization
12. Generic Space Grotesk + Instrument Serif font pairing
13. Bento-grid layout used as the default way to present any set of features
14. Pill-shaped buttons used as the only button shape everywhere
15. Numbered-circle-with-connecting-line "how it works" diagrams
16. Generic 5-star testimonial cards with stock-looking avatars

## Interaction/motion patterns to avoid
17. Fade-in-on-scroll as the only/default animation
18. Cursor-following beam/glow effects
19. Buttons that only fade on hover with no other affordance

## Layout/craft signals to avoid
20. Inconsistent spacing (no defined spacing scale)
21. Grain texture layered over a gradient as a default treatment

## Copy patterns to avoid
22. Em dashes used everywhere in copy
23. Generic buzzword copy ("supercharge," "unlock," "seamless," "elevate")
24. Serif italic accents used as a generic "premium" signal

## Modern AI design tells to avoid
25. Warm-cream background (`#F4F1EA`-style) + terracotta/clay accent (`#D97757`-style) as the default "editorial" palette
26. Near-black hero (`#0B0B0B` or `#111`) + a single acid-green or bright vermilion accent chosen because it "looks designed" without a real rationale
27. A `→` arrow appended to every link and button
28. All-caps eyebrow labels paired with middle-dot meta strings (`Home · About · Contact`)
29. Monospace fonts for small data labels (timestamps, counts) used as a default editorial tic
30. Broadsheet "newspaper" layouts — hairline rules, zero border-radius, dense multi-column text — treated as premium by default

## React Native / Expo-specific patterns to avoid
31. Unguarded `ScrollView` for long lists — use `FlatList`/`FlashList` with virtualization
32. Ignoring safe-area insets (notch, home indicator, status bar) so content clips or overlaps
33. Web-style hover-only affordances: `:hover` states that do nothing on touch devices
34. Emoji used as icons instead of real SVG iconography
35. Generic placeholder profile avatars or stock imagery instead of meaningful media
36. Async actions with no loading feedback (no skeleton screens or activity indicators)

## How to apply this

Before building any UI, review this list. Make deliberate, specific choices instead — a real design direction (color, type, spacing, motion) chosen for the project's identity, not defaults reached for because they're common in AI output. If in doubt, choose restraint over decoration.

## Related
- Prompts: [[start-new-project-prompt]], [[project-continuation-prompt]]
- Workflows: [[ai-development-workflow-map]]

---
Last updated: 2026-09-07
