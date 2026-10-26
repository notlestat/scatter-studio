# Gather Lite investigation

Reviewed 25 October 2026. Target: https://gather.be-of-dao.com/. This document describes a public browser application, not its private server or unreleased versions.

## Evidence

- OBSERVATION: fetched page is a self-contained HTML application with a WebGL2 canvas, a 2D overlay and two inline scripts. Raw page and scripts remain in ignored `reference/`; they are analysis material and are not included in the new app.
- REA static analysis parent: `ev_cb744a2adbf533c2cb6bf158154c2c77a53334dfa5f6efd09c61e64f17eaa148`. Two scripts, 57,199 source bytes, 18,771 visited AST nodes, no parse failures. HTML not selected in this analysis; manually inspected separately. Static graph coverage is partial, with 3,958 unresolved semantic relationships. These counts are not proof of behavioural completeness.
- REA controlled browser capture: `ev_4c8ef482f9cfacb228d55411911ccdcb4ae4cbf02533642a502ecc8d5b9dcf2e`: ready, next picture and paper switch completed. Browser owned by REA was terminated afterwards.
- REA expanded control capture: `ev_bdcb67b410f1111a96363e7d2c1c1bea42aa2740dbe331561c6e4154165bd0ae`: next, light, paper, scan, trails, tracks, links, marks and melt controls completed with no retained page-error events. A successful click proves interaction dispatch, not every visual consequence.
- Browser accessibility and DOM inventory corroborate the visible feature list below. Original `window.__gather` exposes diagnostic state. No writes to external application data were attempted.

## Mechanism observations

WebGL2 point rendering uses data textures for per-image point homes and colours. Device-dependent 131,072/262,144/524,288 particles are selected, then lowered when early frame timings are slow. Weighted image sampling favours edges, visible brightness and depth. A Hilbert traversal supplies spatial ordering. Melt uses spatial correspondence; swarm permutes it. Transition flights add an outward impulse then gather points into their next homes. A directional line selects how strongly points release, with individually phased release/reformation. Camera supports orbit, wheel/pinch zoom and reset. A six-sample pointer wake displaces nearby points. Three short-lived lights shade the field.

The 2D overlay projects selected feature points, brackets, labels and nearby links. Dense/sparse changes tracked feature count, separately from GPU point count. Scan is a moving depth plane; trails draw segments from earlier particle positions; marks add frame rulers/readouts.

Depth loads only on first picture upload. The supplied worker can load FastDepth locally or quantized Depth Anything V2 Small from Hugging Face, through ONNX Runtime Web. The Lite page requests its CDN route. Brightness relief is used first and retained when inference fails. FastDepth estimates are blended with brightness, and depth estimates are edge-guided and percentile-normalized. This is estimated depth, not photogrammetry.

## Feature contract for Scatter

| Reference capability | Required original implementation |
| --- | --- |
| Up to four pictures, drag/drop, select/remove, 1–4 | Four local slots with removal and keyboard selection |
| Next / Space, arrows | Next/previous picture and interrupted-transition handling |
| Swarm / melt / M | Random correspondence or spatial correspondence |
| Drift | Releasing/reforming particles on selected side of a cut line |
| Splash | Outward transition impulse |
| Gather | Time and delay of reassembly |
| Depth | Strength of image relief, with semantic inference and fallback |
| Track, links, scan, trails, marks | Independently toggled overlays |
| Sparse / dense trackers | Separate overlay density |
| Drag line centre/end, choose side; arrow keys/F | Move, rotate and flip with pointer and keyboard |
| Light impulse/S, six colours and custom | Coloured local impulses |
| Paper/B, negative/true | Independent paper and image-tone interpretation |
| Drag orbit, scroll/pinch zoom, double-click reset | Camera and hover wake |
| Fullscreen/F, hide interface/H | Presentation controls |
| Responsive controls | Usable small-screen inspector and stage |
| Added exports | SVG point geometry, PNG, saved editable project, standalone HTML and JavaScript player |

The source contains audio-related fields but replaces playback/time functions with constants. The observed Lite UI has no audio upload or playback control. Audio-reactivity is not an observed Lite capability and is not represented as one. UI upload messages mention eight pictures in places while the actual `s` limit is four; Scatter consistently uses four.

## Independence and rights

Corey asked for the same capabilities and an original tool. Scatter must not copy the reference's implementation, default artwork, name or attribution mark. The source's credits permit artwork made with Gather and list third-party MIT components; they do not establish a licence for Gather's application code. Scatter uses its own shaders, sampling, geometry, overlays and interface. ONNX Runtime and the chosen public depth model retain their own licences and provenance.
