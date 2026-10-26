# Local verification

Reviewed 26 October 2026. This is local Chromium verification, not cross-browser or production acceptance. The final production build passes four unit tests and all twelve browser scenarios, including the real-model check.

## Confirmed

- TypeScript check and editor/player production builds pass.
- Unit checks cover project byte roundtrips, invalid project geometry, executable-source stripping, XML escaping, and standalone-script data escaping.
- Chromium confirms a nonblank WebGL2 field, finite captured geometry, and no GL error after capture.
- Movement, line keyboard controls, tracker density, scan, trails, paper and tone update the actual renderer state.
- Downloaded SVG parses as XML and contains vector circles and paths without raster images. Transparent export omits the background rectangle.
- Downloaded standalone HTML starts an independent player and captures geometry without editor imports.
- The JavaScript player fetches a project, renders, and releases its canvas on destruction.
- Interrupting a transition rebases the in-flight source homes; a same-clock 65,536-point check differs by less than 0.02 CSS px.
- Motion advances geometry; Pause freezes time. Mouse orbit and wheel zoom change the camera. The 524,288-point mode captures all points with no GL error. A mobile standalone player respects reduced motion.
- Image upload, invalid-image recovery, imported depth map and project restoration pass.
- Paused picture selection settles immediately in both travel modes and in an independent player. Keyboard camera controls change export geometry without switching pictures.
- Mobile upload stays visible from the initial studies; the sticky stage remains visible during slider and line editing. Removal targets are separate from selection.
- Simulated depth failure retains the correct existing label for brightness, imported and estimated depth. Cancelling a stalled worker releases the upload path and permits retry. Cancellation during asynchronous pixel preparation cannot restart a stale job. A virtual-clock check exercises the 90-second timeout and confirms that another image can be uploaded afterward.
- Layout checks pass at 320, 390, 760, 1024, 1440 and 1920 pixels. Mobile project file actions remain available from the file menu.
- A real Depth Anything V2 quantized ONNX model runs in the production build and returns a depth map for the uploaded test picture. The check observed external GET requests for model and ONNX runtime files, with no external non-GET request. No image is submitted to an external endpoint by this workflow.
- The Impeccable mechanical detector reported no findings on the editor HTML, CSS and UI source. This does not replace the finish review.

## Final commands

```sh
npm run build
npm test
# Run this server in another terminal after building:
npm run preview -- --port 5174
# Run all twelve browser scenarios, including public model downloads:
SCATTER_URL=http://localhost:5174 npx playwright test
```

The final browser suite passed on 26 October 2026. Model requests fetched the pinned model and runtime assets. The checked image is the documented generated fixture, not a private photograph.

## Review provenance

The original independent finish review returned `fix` with seven findings. All seven have implementation responses and passing regression checks. The delegated second verdict and documentation tasks failed with the provider's Subscription Sharing usage limit. The implementing agent completed a scoped manual verdict and the documentation using the degraded-role instructions. This is not independent second-review approval.

The manual local-readiness disposition is `ship`; it grants no publication authority. See `.impeccable/review/verdict.md`, `responses.md` and `documenter-report.md`. `DESIGN.md` records actual tokens and behaviour, and `.impeccable/design.json` contains schemaVersion 2 extensions and component examples. Generated colour ramps in the sidecar are documentation previews, not additional implemented CSS tokens. The original mechanical detector ran once; it was not repeated.

Corey's creative acceptance, difficult real-image classes, sustained GPU performance, assistive-technology review and non-Chromium browsers remain open. The Notion project stays in Testing.

## Evidence locations

- `artifacts/browser-results.json`: latest browser test report.
- `artifacts/depth-results.json`: production-model status and request inventory.
- `artifacts/responsive.json`: measured responsive bounds.
- `artifacts/test-export.svg`: downloaded vector file.
- `artifacts/scatter-export.html`: downloaded independent player.
- `artifacts/test-project.json`: downloaded editable project.
- `.impeccable/review/desktop.png` and `mobile.png`: inspected renders.
- `docs/research/REFERENCE.md`: upstream evidence and capability map.

Generated test artifacts and raw reference captures are ignored by Git and excluded from the final build. They remain available locally for inspection.

## Limits

The implementation matches the observed Lite control set with its own algorithms. It does not claim identical point matching, motion curves, depth postprocessing, or pixel output. Source homes are spatially ordered with Morton keys, rather than Gather's Hilbert walk. Higher rendering densities use jittered samples of 65,536 homes per picture. SVG captures geometry exactly but approximates soft raster point edges with circle opacity.

The ONNX model test uses a generated test image. Quality across portraits, complex scenes, transparent artwork and difficult lighting still needs creative judgement. Model and runtime availability depend on public hosts. The original reference's real-model upload path was inspected statically, not executed with private source pictures.
