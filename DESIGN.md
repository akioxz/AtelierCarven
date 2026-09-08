---
name: AtelierCarven
description: A curated gallery of avant-garde and timeless architectural furniture.
colors:
  gold: "#A87842"
  gold-soft: "#E9D8C2"
  canvas: "#F8F5F0"
  surface: "#FFFCF8"
  surface-muted: "#F1E9DE"
  ink: "#211A16"
  ink-soft: "#65594F"
  ink-muted: "#6B5D52"
  line: "#DED2C4"
  success: "#2F6D52"
  danger: "#A7473A"
typography:
  display:
    fontFamily: "'Cormorant Garamond', serif"
    fontWeight: 600
    letterSpacing: "-0.03em"
  display-medium:
    fontFamily: "'Cormorant Garamond', serif"
    fontWeight: 500
  body:
    fontFamily: "'Manrope', sans-serif"
    fontWeight: 400
  body-medium:
    fontFamily: "'Manrope', sans-serif"
    fontWeight: 500
  body-semibold:
    fontFamily: "'Manrope', sans-serif"
    fontWeight: 600
  body-bold:
    fontFamily: "'Manrope', sans-serif"
    fontWeight: 700
rounded:
  small: "10px"
  card: "16px"
  sheet: "24px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
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

# Design System: AtelierCarven

## Overview

**Creative North Star: "The Avant-Garde Gallery"**

Quiet, editorial, and sophisticated. The interface should feel like an upscale art exhibition. AtelierCarven treats each piece of furniture as a work of art, emphasizing negative space, premium materials, and bold structural forms. The photography and typography must lead; chrome and heavy UI elements should recede.

**Key Characteristics:**
- Content is the interface
- Architectural layouts with abundant negative space
- High-contrast editorial typography
- Minimal chrome

## Colors

A warm, gallery-inspired palette that provides a neutral canvas for photography, anchored by a deep charcoal ink and a refined architectural gold.

### Primary
- **Architectural Gold** (#A87842): The primary accent color. Used sparingly for interactive highlights, overlines, and secondary button borders.
- **Gold Soft** (#E9D8C2): A washed-out gold used for subtle highlights or inverse overlines.

### Neutral
- **Charcoal Ink** (#211A16): The primary text and primary button color. Provides high-contrast legibility.
- **Ink Soft** (#65594F): Secondary text and icons.
- **Ink Muted** (#6B5D52): Tertiary text, disabled states, and subtle metadata.
- **Canvas** (#F8F5F0): The main background color for app views.
- **Surface** (#FFFCF8): The slightly lighter background for cards, bottom sheets, and elevated elements.
- **Surface Muted** (#F1E9DE): A darker surface used for admin navigation and contrast areas.
- **Line** (#DED2C4): Borders and dividers.

### Named Rules
**The Content-First Color Rule.** The primary accent (Architectural Gold) is used on ≤5% of any given screen. The interface must remain predominantly Canvas and Ink to let the furniture photography serve as the true color of the app.

## Typography

**Display Font:** Cormorant Garamond
**Body Font:** Manrope

**Character:** A highly editorial pairing. The elegant, high-contrast serif (Cormorant Garamond) provides a gallery feel, while the geometric sans-serif (Manrope) ensures modern legibility for UI and metadata.

### Hierarchy
- **Display** (600 weight, -0.03em tracking): Page titles, brand names, and major headings.
- **Display Medium** (500 weight): Secondary headings.
- **Body Bold** (700 weight): Primary button labels and emphasized values.
- **Body Semibold** (600 weight): Links, overlines, and secondary emphasis.
- **Body Medium** (500 weight): Navigation labels and standard UI text.
- **Body** (400 weight): Long-form descriptions and paragraph text.
- **Overline** (600 weight, 11px, 2.5px tracking, uppercase): Category labels, brand marks.

### Named Rules
**The Editorial Overline Rule.** Use widely tracked, uppercase overlines in Gold to establish hierarchy above major headings, mimicking print catalogs.

## Layout

A responsive layout that adapts gracefully from mobile screens to desktop browsers. On desktop, content is constrained to a `pageMaxWidth` of 1180px and centered. Mobile navigation uses a bottom tab bar, while desktop switches to a top horizontal navigation bar. 

## Elevation & Depth

Flat by Default: Shadows appear only as a response to state (hover, focus, modals). The interface relies on tonal contrast (Canvas vs Surface) rather than constant elevation.

### Shadow Vocabulary
- **Card Shadow** (`rgba(33, 26, 22, 0.08) 0px 8px 24px`): Used for product cards, bottom sheets, and elevated modals to provide subtle separation from the canvas.

## Shapes

A blend of sharp architectural lines and softened tactile touchpoints.
- **Radius Strategy:** Interactive elements (buttons) use a small 10px radius for a tactile feel. Cards use a slightly softer 16px radius. Bottom sheets and modals use a generous 24px radius. Navigation elements use a fully rounded 999px pill shape.

## Components

Refined and restrained, deferring to the content.

### Buttons
- **Shape:** Small radius (10px).
- **Primary:** Charcoal Ink background, Surface text. 52px height.
- **Secondary:** Transparent background, Architectural Gold border (1px), Charcoal Ink text. 52px height.
- **Hover / Press:** Scale down slightly (`scale: 0.985`) and reduce opacity to 82% for a tactile, responsive feel.

### Text Links
- **Style:** Architectural Gold text, semibold weight, with an underline.

### Navigation
- **Desktop:** A top bar over a muted surface, with pill-shaped tabs that turn Charcoal Ink when selected.
- **Mobile:** A bottom tab bar using minimal icons and a distinctive gold active-indicator dot beneath the selected tab.

## Do's and Don'ts

### Do:
- **Do** use `Design.space.md` (16px) or `lg` (24px) to separate distinct sections, giving the layout room to breathe.
- **Do** wrap desktop content in `ContentFrame` to enforce the 1180px max-width.
- **Do** use `Design.color.canvas` for the main background and `Design.color.surface` for elevated cards.

### Don't:
- **Don't** use standard blue for text links or primary actions; always use the brand's Ink or Gold.
- **Don't** use heavy drop shadows on static elements.
- **Don't** clutter the screen with unnecessary borders; use spacing and tonal background shifts to separate content.
