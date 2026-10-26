---
name: Scatter
description: A mineral-coloured instrument for shaping pictures into moving point fields.
colors:
  accent: "#d5e868"
  shell: "#e7e8e2"
  panel: "#f0f1eb"
  ink: "#252a24"
  muted: "#62685d"
  line: "#cbd0c3"
  focus: "#547125"
  stage: "#111312"
  stage-text: "#cbd2c6"
  paper: "#eeefe8"
  segment-bed: "#dfe3d6"
  segment-selected: "#f6f8ef"
typography:
  brand:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "29px"
    fontWeight: 800
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "11px"
    lineHeight: 1.65
rounded:
  segment: "2px"
  well: "3px"
  control: "4px"
  dialog: "10px"
spacing:
  tight: "4px"
  control: "8px"
  group: "12px"
  section: "18px"
  panel: "24px"
  dialog: "28px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.control}"
    padding: "0 16px"
  button-outline:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
  button-quiet:
    textColor: "{colors.ink}"
    padding: "0 8px"
  segmented:
    backgroundColor: "{colors.segment-bed}"
    rounded: "{rounded.control}"
    padding: "3px"
  segmented-selected:
    backgroundColor: "{colors.segment-selected}"
    textColor: "{colors.ink}"
    rounded: "{rounded.segment}"
  line-pad:
    rounded: "{rounded.well}"
    width: "100px"
    height: "100px"
---

# Design System: Scatter

## Overview

**Creative North Star: "Image into matter"**

Scatter is a working image instrument. Pale mineral controls surround a charcoal field; the picture supplies the texture, depth and motion. Archivo gives the interface a direct, compact voice. The sulphur accent identifies selection and activity without colouring the whole shell.

This records the implemented system in `src/style.css`, `src/main.ts` and `src/engine.ts`, reviewed 26 October 2026. Corey delegated the original direction. The surface contract remains in `.impeccable/surfaces/index-html.md`; it governs this editor's composition rather than every future screen. The procedural studies are original demonstrations, not user photographs.

**Key Characteristics:**

- Tonal groups and fine rules around an open artwork field.
- Compact, labelled controls with visible values and keyboard focus.
- Artwork motion driven by the rendering engine; quiet interface state changes.
- The field stays visible while mobile controls scroll.

## Colors

The primary accent is muted sulphur. Neutral surfaces carry a slight green cast and maintain a clear separation between controls and artwork. The frontmatter records the source values.

### Primary

Use Accent for live status, picture-selection details and focus on dark artwork. Use Focus for outlines on light controls. The darker input and selection greens in the stylesheet are supporting state colours, not additional brand accents.

### Neutral

Shell frames the workspace. Panel separates the inspector and dialogs. Ink and Muted establish text hierarchy; Line divides related groups. Stage and Stage Text form the dark artwork surround. Paper is the light renderer setting. Segment Bed and Segment Selected distinguish the two travel choices.

**The Artwork Colour Rule.** Picture colours, single ink and light impulses belong to the artwork. Keep the surrounding controls in the mineral palette.

## Typography

Use locally served Archivo for the wordmark, controls, headings and prose. The code textarea uses the monospace stack in the frontmatter because it contains code. Numeric readouts use tabular numerals.

The Brand role belongs to the wordmark. Headline belongs to dialogs, Title to the inspector, and Label to control headings. Regular control copy usually uses 11–12px; prose uses the body line height. These are dense editor styles, not a marketing type scale.

At mobile sizes the wordmark steps down through 24px, 23px and 21px. Tiny auxiliary labels in the current build are not a recommended text scale for future screens. Keep actual instructions and actions readable at the intended viewport.

**The Quiet Label Rule.** Let weight and spacing group the controls. Labels name an action or parameter; they do not become decorative headlines.

## Layout

The desktop toolbar is 68px high. Beneath it, the workspace uses a flexible artwork column and a 304px inspector. The stage expands above transport and picture slots. The inspector scrolls independently. Workspace height follows the dynamic viewport with a 700px minimum.

At 1600px and above, the inspector expands to 336px and artwork padding to 24px. At 1080px and below, the inspector narrows to 280px. At 760px and below, the toolbar becomes a sticky 60px row and the workspace stacks. Inspector groups use two columns until 440px, then one.

The mobile field sticks below the toolbar at 72px. Its height follows `clamp(240px, 34dvh, 320px)`. Scroll padding and control scroll margins reserve space for that preview. Picture upload remains visible above four equal slots; removal buttons sit separately below the thumbnails. Presentation mode and fullscreen use the viewport for artwork.

**The Visible Result Rule.** A person moving a control must be able to see its effect on the field. Preserve the sticky mobile preview and its scroll offsets when changing layout.

## Elevation & Depth

Tonal surfaces and thin rules provide most interface separation. A selected segment has a small downward shadow. Dialogs use a larger soft shadow and a dark blurred backdrop to protect focused export, embed and help tasks. Notifications use a smaller downward shadow. Avoid extending these floating treatments to ordinary inspector sections.

The artwork has actual projected particle depth, camera rotation, lights and motion. Its point texture comes from rendered geometry. SVG snapshots preserve projected geometry while approximating the renderer's soft point edges with circle opacity.

## Shapes

Most controls and wells use slight rounding. Dialogs have softer corners. Circular shapes belong to particles, status dots, slider thumbs and colour swatches. Fine borders divide sections and mark inputs; they do not wrap each control group in a card.

Icons are authored inline SVGs with a consistent stroke. The release-line diagram is functional vector geometry, with visible endpoints, centre and a tinted active side.

## Components

### Buttons and selection groups

Primary export uses Ink against Panel. Outline actions retain a thin neutral border; quiet actions are text and SVG. Default buttons have a 36px minimum height and primary export uses 38px. Mobile toolbar actions use 34px. Hover darkens controls slightly; disabled actions have reduced opacity and a waiting cursor.

Travel segments and overlay toggles expose `aria-pressed`. A selected segment gains a lighter fill and heavier type. Keep selection visible without relying only on colour. Light swatches retain their artwork colour and a separate selected ring.

### Inputs and focus

Ranges have a fine track and a small circular thumb. Labels and numeric outputs stay next to each slider. Native selects and colour inputs keep their standard operation. Light controls use a 2px focus outline with a 4px offset; dark-stage focus uses Accent. Preserve native keyboard behaviour in forms.

### Pictures

Four wells show contained images or original procedural previews. The selected well has a green border. Empty slots explicitly invite loading. Desktop removal appears on hover or focus; mobile removal is always available as a separate 28px target. The mobile Add pictures action is visible even when all four demonstration wells are filled.

### Release line and artwork

The line pad is 100px square, reducing to 85px in the intermediate mobile layout. Drag the centre to move it and endpoints to rotate it. Keyboard arrows move or rotate; F flips the active side. The field supports pointer orbit, zoom and wake. With field focus, arrows orbit, +/− zoom and 0 resets. Picture selection settles immediately when paused or reduced motion is enabled.

### Dialogs, file menu and feedback

Use native dialogs with a close control and scrollable content. Embed code is selectable in a resizable monospace textarea. Mobile project actions stay in the file menu while Embed and SVG stay visible. Depth feedback names the actual retained source on failure; estimation has cancellation and bounded recovery. Do not hide recoverable errors behind a console message.

Interface colour transitions last 140ms and use ease-out. Reduced motion removes them. The engine also respects reduced motion for artwork playback; pausing retains an exportable composition.

## Do's and Don'ts

- Do preserve visible artwork feedback during control edits.
- Do use the mineral shell and reserve picture colour for the field and its colour controls.
- Do retain native input behaviour, visible focus and explicit pressed states.
- Do keep upload, export and embedding discoverable at mobile sizes.
- Don't turn ordinary inspector sections into floating cards.
- Don't substitute decorative texture for actual picture geometry.
- Don't describe brightness relief, imported maps and estimated depth as the same source.
- Don't inherit tiny auxiliary text as a general-purpose body scale.
