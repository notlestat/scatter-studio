# How Scatter is built

Scatter is a browser program that converts a picture into coloured points, moves those points, and exports the result. You can understand its structure without starting with the shader mathematics.

This walkthrough applies the approved build-and-learning preference in [Learning & development](https://app.notion.com/p/3f67794de80e8144aaa2d8d957c205be), read on 26 October 2026. It explains the actual implementation. It does not record learner completion or independent engineering proficiency.

Open the [interactive build map](learning-map.html) to explore the stages visually.

## The architecture

The normal picture path is:

```text
Picture selected in the editor
        ↓
main.ts coordinates the work
        ↓
images.ts reads pixels and samples points
        ↓
Cloud data: position, colour, opacity
        ↓
engine.ts draws and moves the points
        ↓
SVG / PNG / saved project / interactive player
```

The controls send settings directly to the player. Depth estimation is an optional branch: a worker estimates a depth map, then `images.ts` samples the picture again using that map.

There is no application server or database. Image processing and rendering happen in the browser. The optional depth feature fetches a public model and runtime, then processes the picture locally. Node.js runs the development and build tools; the finished website does not need a Node.js server.

## Why these technologies

| Technology       | Job in Scatter                                                   | Why it is here                                                                     |
| ---------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| HTML             | Supplies the page and application mount point                    | The browser needs a document to start from.                                        |
| CSS              | Defines layout, typography, controls, focus and mobile behaviour | These are appearance and layout decisions.                                         |
| TypeScript       | Coordinates images, settings, controls and files                 | Types check that these parts agree about their data before the app runs.           |
| Vite             | Starts the local server and bundles the release files            | It provides the development loop without a custom build system.                    |
| WebGL 2          | Draws the point field using the graphics processor               | Hundreds of thousands of points are a graphics task.                               |
| SVG              | Stores one exported frame as editable shapes                     | A vector editor or website can use the result without running the particle engine. |
| ONNX Runtime Web | Runs the optional trained depth model                            | It adds estimated scene depth without sending the picture to an inference API.     |

TypeScript becomes JavaScript during the build. The browser executes that JavaScript. Type annotations help development; they do not run as an additional browser language.

Scatter uses native web controls rather than React or Vue. For this single editor, direct event handlers are enough. A framework could organise a larger interface, but the particle rendering would still need its own renderer. Adding a backend, account system or global state library would not help the requested local workflow.

## A point is a group of numbers

An uploaded picture is a grid of pixels. `sampleImage()` in `src/images.ts` chooses locations in that grid and turns them into a `Cloud`.

Each source point has seven values:

```text
[x, y, z, red, green, blue, opacity]
```

`x` and `y` locate the point across the picture. `z` gives it depth. The colour values and opacity describe its appearance. These numbers are packed into a `Float32Array`, a compact array of decimal values that the graphics system can use.

The sampler gives brighter areas and edges more weight, while alpha controls whether a pixel contributes. It rejects a fully transparent picture. It creates 65,536 source homes per picture. Larger render settings reuse these homes with independently varied motion and jitter, up to 524,288 visible samples. That is a performance and detail trade-off, not 524,288 separate source locations.

The initial depth is brightness relief: lighter and darker pixels receive different depth. This is a visual treatment, not recognition of a real object's shape.

## What each source file owns

### `src/main.ts`: the editor coordinator

This file creates the interface, starts the player and connects controls to actions. It handles picture slots, uploads, the release-line pad, project loading, export dialogs and depth-job recovery.

Follow `addImages()` to trace an upload. It calls `readImage()`, then `sampleImage()`, stores the resulting cloud, calls `player.setClouds()`, and refreshes the visible labels. A file is not a point field until those conversion steps have happened.

The player owns its settings object. The editor reads it and changes it through control handlers. `refresh()` brings controls and labels back into agreement with current state. This direct relationship keeps the app small, but it also makes stale labels a possible bug if a handler forgets to refresh.

### `src/types.ts`: the data agreements

`Settings` describes controls such as drift, zoom, colours and overlay toggles. `Cloud` describes one picture's point data and metadata. `Project` describes a saved session. `Frame` describes a captured result for export.

A type tells the developer what shape a value has. It does not validate a downloaded JSON file at runtime. That is why the project also has `validateProject()`.

### `src/images.ts`: pictures become point data

`readImage()` checks file type and size, decodes the image, and resizes its longest edge to at most 768 pixels for sampling. It also makes a thumbnail. `sampleImage()` creates the point data and applies brightness or supplied depth.

This separates image conversion from drawing. A future image-sampling change belongs here; it should not require rewriting toolbar controls or export formatting.

### `src/model.ts`: defaults, studies and project files

`defaults()` supplies the starting control values. `createDemo()` builds the four original mathematical studies. They are generated geometry, not photographs.

`spatialOrder()` sorts homes so nearby areas tend to stay near each other in the data. Melt follows that ordering. Swarm uses shuffled correspondence to produce a different passage between pictures. The spatial ordering uses Morton keys; it does not reproduce Gather's Hilbert method.

`project()` serializes the current session. `validateProject()` checks an opened project's format, picture count, settings and point data before the editor trusts it. It limits numeric settings and accepts only constrained image-data URLs for stored previews and sources.

### `src/engine.ts`: the reusable drawing player

`createScatterPlayer()` creates the canvas, graphics resources and animation loop. It also handles camera movement, pointer interaction, light impulses and overlays. Both the editor and exported players use this function.

The vertex shader is a small GLSL program that runs across the points on the GPU. It blends picture homes, adds motion, applies the release line, rotates the camera, and calculates screen positions and colours. The fragment shader controls each point's soft visible edge. Some overlay linework is SVG layered above the canvas.

Controls reach the shader as shared values called uniforms. For example, `settings.drift` becomes `uDrift`, scaled from a 0–100 control to a 0–1 value. The slider itself does not move particles; it changes a number that the shader uses when it draws.

`requestAnimationFrame()` schedules drawing with the browser. The player's clock drives motion. Pause freezes that clock. Reduced motion also suppresses playback, and off-screen visibility prevents unnecessary drawing.

`select()` changes pictures. A paused selection settles immediately, because waiting for an animation clock that is frozen would leave the previous picture visible. During an interrupted transition, the engine captures the current homes before choosing the next target, which avoids jumping back to an earlier picture.

`snapshot()` captures a frame. `destroy()` cancels animation, removes listeners and observers, releases GPU resources, and removes the player. Cleanup matters when a website removes an embedded field.

### `src/depth.worker.ts`: optional model work

A Web Worker runs code separately from the main interface thread. This worker downloads the pinned Depth Anything V2 model, prepares the pixel input, runs ONNX inference and returns a depth map.

The model is trained elsewhere; Scatter runs it. Running a model is different from training one.

The editor starts this job only when requested. It keeps the current depth on failure. Cancellation terminates the worker, and a 90-second timeout covers preparation and execution. An operation counter prevents an old asynchronous preparation from restarting after cancellation. That counter is a practical example of managing work that finishes later than the user expects.

### `src/exports.ts`: vector output and portable HTML

`frameSvg()` turns captured points into circles, adds line paths and overlays, and returns SVG text. Text is escaped so an image name cannot become executable markup.

The captured point layout has eight values:

```text
[screen x, screen y, radius, depth, red, green, blue, opacity]
```

It differs from the seven-value source layout because the camera and motion have already been applied.

The engine uses WebGL transform feedback to read the shader's results back into an array. Export therefore uses the renderer's calculated positions rather than a second movement algorithm. SVG circles still approximate the soft point edges, so exact raster appearance is not promised.

`playerHtml()` packages point data and the self-contained player into one HTML file. It strips source-image and preview payloads from that export. The unusual self-contained player function is intentional: the HTML exporter serializes it with `toString()`. Moving its runtime helpers outside the function without changing the exporter would break standalone HTML.

PNG export is coordinated in `main.ts`: it captures the current frame, converts its SVG into an image, draws that image at twice the stage dimensions, and writes a PNG. PNG is a pixel result; it does not preserve editable vector circles.

### `src/embed.ts`: the website entry point

`mount()` accepts a container and a project value or JSON URL. It loads and validates the project, then creates the shared player. Its `ready` promise resolves when that player is available. Its `destroy()` method cancels loading and removes the running player.

This is the boundary another website uses. That website needs the player and point data, not Scatter's inspector or upload controls. See [Put a point field on a website](EMBED.md) for the actual markup.

### `src/style.css`: the visible interface

The stylesheet defines the mineral shell, charcoal stage, Archivo typography, compact controls and focus states. Media queries change the desktop inspector into a stacked mobile layout.

The sticky mobile stage is a workflow decision: you can watch the artwork while editing controls further down the page. Layout that merely fits a narrow width would not be enough for this instrument.

## The files around the application

| File                                            | What it controls                                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `index.html`                                    | Page metadata, the `#app` element and the first script.                                         |
| `package.json`                                  | Dependencies and named commands such as `dev`, `build` and `test`.                              |
| `package-lock.json`                             | Exact resolved dependency versions for repeatable installation.                                 |
| `tsconfig.json`                                 | TypeScript's checking rules.                                                                    |
| `vite.config.ts`                                | The editor build and local development server.                                                  |
| `vite.embed.config.ts`                          | A second build that emits `scatter.js` as a browser script exposing `Scatter`.                  |
| `playwright.config.ts`                          | Browser-test settings, Chrome path and the optional production URL override.                    |
| `.gitignore`                                    | Files kept out of Git, including dependencies, generated builds and private reference captures. |
| `PRODUCT.md`                                    | What the tool is for and its agreed capabilities.                                               |
| `DESIGN.md` and `.impeccable/design.json`       | The implemented visual rules and their machine-readable companion.                              |
| `docs/research/REFERENCE.md`                    | What was observed in Gather and where Scatter uses different methods.                           |
| `docs/VERIFICATION.md`                          | What was actually tested and the limits of that evidence.                                       |
| `THIRD_PARTY_NOTICES.md` and `public/licenses/` | Dependency, font and model notices.                                                             |
| `AGENTS.md`                                     | Instructions for future coding agents working in this project.                                  |

## Why the tests are split

`tests/exports.test.ts` checks data roundtrips, project rejection rules and safe output text without opening a browser. These checks are fast, but they cannot prove that a GPU draws anything.

The browser tests cover different risks:

- `studio.spec.ts` checks rendering, controls, downloads, project restoration, uploads and embeddings.
- `motion.spec.ts` checks time, pause, camera changes, maximum point count and interrupted transitions.
- `review-fixes.spec.ts` checks the seven review findings and recovery cases, including cancellation during preparation.
- `depth.spec.ts` downloads and runs the actual model. A simulated worker test cannot replace this evidence.

A successful build means TypeScript and bundling pass. A passing browser check means its tested scenario works in the configured browser. Neither establishes every device, image class or assistive-technology experience.

## The most useful next step

Start with a visible setting change before shader mathematics. Follow the [practice exercises](PRACTICE.md), then explain the path from control to setting to renderer in your own words. Your changed output and explanation are evidence of application. Reading this walkthrough alone is not evidence of independent completion.
