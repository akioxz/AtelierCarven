---
name: AtelierCarven
description: A working atelier's ledger — every piece a numbered manifestation with a serial, its material ledger, and its making on record.
colors:
  canvas: "#E9E3D6"
  surface: "#F5F0E4"
  surface-muted: "#DDD5C4"
  ink: "#1D1B17"
  ink-soft: "#5A554B"
  ink-muted: "#76705F"
  line: "#CFC6B2"
  accent: "#B5501E"
  accent-deep: "#8A3A12"
  accent-soft: "#E3C6A3"
  success: "#39553A"
  danger: "#A3312F"
typography:
  display:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 700
    letterSpacing: "-0.03em"
  display-medium:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 600
  body:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 400
  body-medium:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 500
  body-semibold:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 600
  body-bold:
    fontFamily: "'Archivo', sans-serif"
    fontWeight: 700
  mono:
    fontFamily: "'IBM Plex Mono', monospace"
    fontWeight: 400
  mono-semibold:
    fontFamily: "'IBM Plex Mono', monospace"
    fontWeight: 600
rounded:
  small: "4px"
  card: "10px"
  sheet: "14px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
  xxxl: "72px"
motion:
  stagger: "70ms"
  quick: "140ms"
  base: "240ms"
  slow: "400ms"
  press-scale: "0.972"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.small}"
    padding: "0 20px"
    height: "52px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.small}"
    padding: "0 20px"
    height: "52px"
---

# Design System: AtelierCarven — The Workshop Manifest

## Overview

**Creative North Star: "The Workshop Manifest"**

A maker's atelier as documented practice. Every piece reads as a numbered manifestation with a serial, a material ledger, and its making on record. The design refuses the warm-gallery catalog and its gold-ornament 'luxury' sibling, replacing chrome with workshop data: mono overlines, dimensioned tabs, stamped states, and a single burnt-oxide signal.

**Key Characteristics:**
- Kraft/mineral neutral ground, graphite ink, one burnt-oxide stamp
- Squared corners and hairlines; no gold, no ornament, no cream-plus-serif
- IBM Plex Mono tabular numerals and overlines; Archivo grotesque for display and body
- The interface stays out of the way but is never precious

## Colors

A workshop-neutral palette that provides a dry canvas for photography, anchored by a graphite ink and a single burnt-oxide signal used sparingly.

### Primary
- **Burnt Oxide** (#B5501E): The single accent/signal stamp. Used for overlines, brand rules, active indicators, and status marks.
- **Oxide Deep** (#8A3A12): Pressed/hover states of the signal accent.
- **Oxide Soft** (#E3C6A3): Inverse overlines and washed signal fields for admin rows.

### Neutral
- **Ink** (#1D1B17): Primary text and primary button color.
- **Ink Soft** (#5A554B): Secondary text and icons.
- **Ink Muted** (#76705F): Tertiary text, disabled states, metadata (darkened from the legacy reference).
- **Canvas** (#E9E3D6): Main background for app views.
- **Surface** (#F5F0E4): Slightly lighter background for cards, sheets, and elevated elements.
- **Surface Muted** (#DDD5C4): Darker field for navigation bars and contrast areas.
- **Line** (#CFC6B2): Borders and dividers.

### Named Rules
**The Single-Stamp Color Rule.** The burnt-oxide accent is used on ≤5% of any given screen, kept for the ledger's signal moments: the brand rule, mono overlines, the active tab indicator, and status. The interface stays predominantly Ink and Canvas so the furniture photography is the color of the app.

## Typography

**Display/Body Font:** Archivo
**Data Font:** IBM Plex Mono

**Character:** A grotesque that reads workshop, not gallery. Archivo carries display and body at tight tracking; IBM Plex Mono carries serials, overlines, dimensions, and stamped states as documented data.

### Hierarchy
- **Display** (Archivo 700, -0.03em tracking): Page titles, brand names, major headings, the oversize serial numeral.
- **Display Medium** (Archivo 600): Secondary headings.
- **Body Bold** (700): Primary button labels and emphasized values.
- **Body Semibold** (600): Links and secondary emphasis.
- **Body Medium** (500): Navigation labels and standard UI text.
- **Body** (400): Long-form descriptions and paragraph text.
- **Overline** (IBM Plex Mono, 10px, 2.2px tracking, uppercase): Category labels, ledger lines, brand marks.
- **Data** (IBM Plex Mono): Serials (`ATELIER №…`), dimensions, load numbers, dispatch stamps.

### Named Rules
**The Ledger Overline Rule.** Use tracked, uppercase mono overlines in Burnt Oxide to open major headings, and data in Mono where a number is a fact of the piece — serial, dimension, status, count. Numbers that factor a decision are always tabular mono.

## Layout

Responsive from mobile to desktop. Desktop content is constrained to `pageMaxWidth` of 1180px and centered. Mobile navigation uses a bottom tab bar; desktop switches to a top horizontal navigation bar. Sections open with an index numeral (01, 02, …) in mono, ledger-style.

## Elevation & Depth

Flat by Default: shadows appear only as a response to state (hover, focus, modals). The interface relies on tonal contrast (Canvas vs Surface) rather than constant elevation.

### Shadow Vocabulary
- **Card Shadow** (`#1D1B17 0px 2px 10px @ 10%`): Product cards, sheets, and modals — a near-flat offset that separates without chrome.

## Shapes

Squared, workshop-straight. The ledger is squared; nothing is pill-shaped except the custom presence-dot and tab markers that keep their tactile role.
- **Radius Strategy:** Interactive elements (buttons) use a 4px radius. Cards use 10px. Bottom sheets and modals use 14px. The corner stays near-square everywhere — hairlines and stamps, not curves.

## Components

Restrained, structural, and dry.

### Buttons
- **Shape:** Squared (4px radius).
- **Primary:** Ink background, Surface text. 52px height.
- **Secondary:** Transparent background, Ink border, Ink text.
- **Hover / Press:** Scale down to `0.972` and shift opacity for a tactile, damped response (`motion.base` 240ms).

### Text Links
- **Style:** Burnt Oxide text, semibold weight, underline.

### Navigation
- **Desktop:** A top bar over a muted surface with squared tabs that turn Ink when selected.
- **Mobile:** A bottom tab bar with minimal icons and a burnt-oxide active-indicator dot beneath the selected tab.

### Stamps & State
- Status, saves, and critical actions read as stamped/inked states — not filled gradients.
- **Dispatch stamp** (order success): `DISPATCH STAMP · THE CRATE GOES OUT` in mono — the memorable moment carried through cart → checkout → order-success.

## Motion

One authored moment per screen, damped and quick: staggered reveals at `motion.stagger` (70ms), press-scale `0.972` on interactive tiles, transitions at `motion.quick` (140ms) to `slow` (400ms).

## Do's and Don'ts

### Do:
- **Do** use `Design.space.md` (16px) or `lg` (24px) to separate distinct sections.
- **Do** wrap desktop content in `ContentFrame` to enforce the 1180px max-width.
- **Do** render every real number — ledger counts, serials, dimensions — from data, tabular mono. No invented figures.
- **Do** use `Design.color.canvas` for the main background and `Design.color.surface` for elevated cards.

### Don't:
- **Don't** use standard blue for text links or primary actions; always use Ink or Burnt Oxide.
- **Don't** introduce gold, cream-plus-serif, pill buttons, or ornamental chrome — the ledger refuses them.
- **Don't** use heavy drop shadows on static elements.
- **Don't** let photography fall behind decoration; placeholder photography is clearly a placeholder until real studies are shot.

## Build Completion

`FINISH` (verbatim): unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.