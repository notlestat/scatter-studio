# Scatter

A local image-to-particle editor. Shape pictures into moving point fields, export editable SVGs, or embed the animated result in a website.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. The dev and preview servers listen on all network interfaces (`--host 0.0.0.0`), so other devices on your network can open them too. The editor starts with four procedural studies. Add a picture to replace the studies, or double-click a picture slot to replace that slot.

## Understand the build

Read [How Scatter is built](docs/LEARNING.md) for the architecture, every important file and the decisions behind the renderer and exports. Explore the [interactive build map](docs/learning-map.html), then use [Make three visible changes](docs/PRACTICE.md) to apply it in the actual project.

## Make a field

- Load up to four JPEG, PNG, WebP, AVIF, BMP, or GIF files. Each file can be up to 30 MB and 64 megapixels. Animated images use a single frame.
- Drag to orbit. Scroll or pinch to zoom. Double-click the field to reset the camera.
- Shape the transition with Swarm, Melt, Drift, Splash, Gather, and Depth.
- Move the release line by its centre. Rotate it by an end. Select either side to release.
- Toggle trackers, links, depth scan, trails, and frame marks. Sparse and Dense change the tracker count separately from particle density.
- Switch paper, invert the picture, apply a single ink, or add coloured light impulses.
- Save a project to keep pictures and settings. Open that JSON file to resume.

Use **Estimate depth** for a local Depth Anything V2 estimate, or import a grayscale depth map. The model download is about 27 MB, plus the ONNX runtime. Your picture is not sent to the model host. If inference fails, the current depth source stays active. Use **Cancel estimation** to stop a slow download or inference, then retry. Jobs also stop after 90 seconds. Model availability depends on network access and browser support.

## Export

**Export SVG** captures the current point geometry and camera. Lower detail keeps files manageable. SVG contains editable vector circles and paths. **Export PNG** produces a raster at twice the stage's CSS resolution.

**Embed** creates a self-contained HTML player or a JavaScript player with project JSON. See [Put a point field on a website](docs/EMBED.md) for static HTML, React, and hosting instructions.

## Keyboard controls

| Action                   | Key                            |
| ------------------------ | ------------------------------ |
| Next or previous picture | Space, Right Arrow, Left Arrow |
| Select picture           | 1–4                            |
| Light impulse            | S                              |
| Switch Swarm and Melt    | M                              |
| Switch paper             | B                              |
| Pause motion             | P                              |
| Hide interface           | H                              |
| Fullscreen               | F                              |

When the field has focus, Arrow keys orbit the camera and + or − changes zoom. Picture navigation still works with Space and 1–4.

On small screens, the stage stays visible above the controls while you edit. **Add pictures** is available above the picture slots.

When the release-line pad has focus, Left and Right rotate the line, Up and Down move it, and F flips its side. Hold Shift for a larger step. Form controls keep their normal keyboard behaviour.

## Build and verify

```sh
npm run build
npm test
npx playwright test tests/browser/studio.spec.ts tests/browser/motion.spec.ts tests/browser/review-fixes.spec.ts
```

`npm run build` writes the editor and standalone `scatter.js` player to `dist`. Serve that folder to use the production build.

Browser verification uses the installed Google Chrome executable configured in `playwright.config.ts` and a running dev server. Change `executablePath` for another operating system. The optional real-model check is `npx playwright test tests/browser/depth.spec.ts`. It downloads public model files.

For model checks against the production build, run `npm run preview -- --port 5174` after building, then use `SCATTER_URL=http://localhost:5174 npx playwright test tests/browser/depth.spec.ts`. The [verification record](docs/VERIFICATION.md) documents actual coverage and remaining limits. [DESIGN.md](DESIGN.md) records the implemented visual system.

## Implementation

| File                  | Responsibility                                                               |
| --------------------- | ---------------------------------------------------------------------------- |
| `src/engine.ts`       | WebGL2 rendering, camera, movement, lighting, overlays, GPU geometry capture |
| `src/images.ts`       | Local image decoding and point sampling                                      |
| `src/depth.worker.ts` | Local ONNX depth inference                                                   |
| `src/model.ts`        | Procedural studies, spatial ordering, project validation                     |
| `src/exports.ts`      | SVG, PNG support, self-contained HTML, embed snippets                        |
| `src/embed.ts`        | Website player API                                                           |

The renderer uses 65,536 source homes per picture. Higher particle settings add independent jitter and motion samples, up to 524,288 rendered points. Melt follows spatially ordered homes. Swarm uses shuffled correspondence. SVG uses transform feedback from the rendering shader to capture the selected frame. Soft WebGL point edges are approximated by circle opacity in SVG, so raster edges can differ slightly.

## Reference and credits

The capability study is based on [Gather Lite by DAO](https://gather.be-of-dao.com/). Scatter has an original implementation, interface, and procedural studies. Reference code and default artwork are not included in the build. The [research report](docs/research/REFERENCE.md) separates observed controls, static findings, and limitations.

Archivo is by Omnibus-Type under the SIL Open Font License. ONNX Runtime Web is by Microsoft under the MIT License. The quantized Depth Anything V2 Small model is distributed by the ONNX Community under Apache 2.0. See [third-party notices](THIRD_PARTY_NOTICES.md).

This is a local project. No website deployment is configured.
