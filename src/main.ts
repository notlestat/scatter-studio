import "@fontsource/archivo/400.css";
import "@fontsource/archivo/500.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/800.css";
import "./style.css";
import { createScatterPlayer } from "./engine.ts";
import { createDemo, defaults, project, validateProject } from "./model.ts";
import { readImage, sampleImage, type ImageSource } from "./images.ts";
import {
	download,
	frameSvg,
	iframeSnippet,
	jsSnippet,
	playerHtml,
} from "./exports.ts";
import type { Cloud, Overlay, Settings } from "./types.ts";

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
	document.querySelector<T>(selector)!;
const icon = (name: string) => {
	const paths: Record<string, string> = {
		plus: "M12 5v14M5 12h14",
		next: "m8 5 8 7-8 7",
		play: "m8 5 11 7-11 7Z",
		pause: "M8 5v14M16 5v14",
		arrow: "M12 4v15m-5-5 5 5 5-5M5 21h14",
		code: "m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16",
		expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
		reset: "M4 10a8 8 0 1 1 1 7M4 4v6h6",
		light: "M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
		close: "m6 6 12 12M6 18 18 6",
		eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z",
		help: "M9 8a3 3 0 1 1 4 3c-1 .6-1 1-1 3M12 18v1",
		file: "M5 3h10l4 4v14H5ZM14 3v6h5",
		flip: "M12 3v18M5 8l-3 4 3 4m14-8 3 4-3 4",
	};
	return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.plus}"/></svg>`;
};
const range = (id: string, label: string, value: number, hint: string) =>
	`<label class="range-row" for="${id}"><span>${label}</span><output for="${id}" id="${id}-value">${value}</output><input id="${id}" type="range" min="0" max="100" value="${value}" title="${hint}"></label>`;
const toggle = (id: string, label: string, on = false) =>
	`<button type="button" class="toggle" data-overlay="${id}" aria-pressed="${on}"><span class="checkmark" aria-hidden="true"></span>${label}</button>`;
const swatches = [
	"#d5e868",
	"#e2e8df",
	"#b1d1ee",
	"#ffbc69",
	"#f77961",
	"#89c6b0",
];
$("#app").innerHTML = `
<header class="toolbar">
 <a class="brand" href="./" aria-label="Scatter home"><svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><g fill="currentColor"><circle cx="5" cy="6" r="3"/><circle cx="18" cy="4" r="2"/><circle cx="12" cy="16" r="3"/><circle cx="23" cy="14" r="1.5"/><circle cx="4" cy="24" r="1"/><circle cx="22" cy="24" r="2"/></g></svg><span>Scatter</span></a>
 <span class="app-purpose">Image into matter.</span>
 <div class="toolbar-actions"><details class="project-menu"><summary aria-label="Project files">${icon("file")}</summary><div><button id="mobile-open-project">Open project</button><button id="mobile-save-project">Save project</button></div></details><button id="open-project" class="quiet" title="Open a saved Scatter project">${icon("file")}<span>Open</span></button><button id="save-project" class="quiet">Save project</button><button id="embed-open" class="outline">${icon("code")}<span>Embed</span></button><button id="export-open" class="primary">${icon("arrow")}<span class="export-label-full">Export SVG</span><span class="export-label-small">SVG</span></button></div>
</header>
<main class="workspace">
 <section class="work-area" aria-label="Artwork workspace">
  <div class="stage" id="stage">
   <div id="field" class="field"></div>
   <div class="stage-top"><div><h1 id="artwork-name">Folded torus</h1><span id="depth-kind">Procedural 3D</span></div><div class="stage-info"><span class="live-dot"></span><span id="point-count">131,072 points</span></div></div>
   <div class="stage-side"><button id="paper" class="stage-icon" aria-label="Switch paper colour" title="Switch paper (B)"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/></svg></button><button id="fullscreen" class="stage-icon" aria-label="Full screen" title="Full screen (F)">${icon("expand")}</button><button id="hide-ui" class="stage-icon" aria-label="Hide interface" title="Hide interface (H)">${icon("eye")}</button></div>
   <div class="stage-bottom"><span id="stage-hint">Drag to orbit <span class="dot-separator">·</span> Scroll to zoom</span><button id="reset-view" class="stage-text">Reset view ${icon("reset")}</button></div>
   <div class="drop-cover" id="drop-cover"><span>${icon("plus")}</span><strong>Drop your pictures here.</strong><p>Up to four. They stay on your device.</p></div>
   <div class="stage-error" id="stage-error" hidden></div>
  </div>
  <div class="transport"><div class="transport-actions"><button id="play" class="icon-button" aria-label="Pause motion" title="Pause motion (P)">${icon("pause")}</button><button id="next" class="next-button">Next picture ${icon("next")}<kbd>Space</kbd></button><button id="light" class="light-button">${icon("light")}<span>Light</span><kbd>S</kbd></button></div><span id="transport-time" class="time-readout">00:00.00</span></div>
  <div class="image-strip"><div class="strip-label"><h2>Pictures</h2><span id="slot-count">4 / 4</span><button id="mobile-load-images" class="mobile-upload">${icon("plus")}Add pictures</button></div><div id="images" class="images"></div><div class="strip-note">Your pictures.<br>Your material.<br><button id="load-images">Add or replace ${icon("plus")}</button></div></div>
  <div class="workspace-foot"><span>Local processing. No image uploads.</span><button id="help-open">Shortcuts & about ${icon("help")}</button></div>
 </section>
 <aside class="inspector" aria-label="Field controls"><div class="inspector-heading"><h2>Field controls</h2><button id="reset-settings" class="text-button">Reset</button></div>
  <section class="control-section"><div class="section-heading"><h3>Movement</h3><span>Shape the passage</span></div><div class="segmented" role="group" aria-label="Transition mode"><button data-travel="swarm" aria-pressed="true">Swarm</button><button data-travel="melt" aria-pressed="false">Melt</button></div>${range("drift", "Drift", 36, "How far the released side blows away")}${range("splash", "Splash", 68, "The outward impulse between pictures")}${range("gather", "Gather", 45, "How quickly particles find their next picture")}${range("depth", "Depth", 65, "How far the picture stands out in 3D")}</section>
  <section class="control-section"><div class="section-heading"><h3>Release line</h3><button id="flip-line" class="text-button">Flip side ${icon("flip")}</button></div><div class="line-layout"><svg id="line-pad" viewBox="-1.3 -1.3 2.6 2.6" tabindex="0" role="slider" aria-label="Release line. Left and right rotate, up and down move, F flips the side." aria-valuemin="0" aria-valuemax="360" aria-valuenow="103"><path class="pad-cross" d="M-1 0H1M0-1V1"/><path id="line-side"/><line id="line-drawing"/><circle id="line-a" r=".055"/><circle id="line-b" r=".055"/><circle id="line-centre" r=".065"/></svg><div class="line-copy"><p>Keep one side.<br>Let the other go.</p><span>Drag the centre to move.<br>Drag an end to rotate.</span><output id="line-angle">103°</output></div></div></section>
  <section class="control-section"><div class="section-heading"><h3>Draw over the field</h3></div><div class="overlay-toggles">${toggle("track", "Trackers", true)}${toggle("links", "Links", true)}${toggle("scan", "Scan")}${toggle("trails", "Trails")}${toggle("marks", "Frame marks", true)}</div><div class="inline-control"><label>Trackers</label><div class="small-segment" role="group" aria-label="Tracker density"><button data-dense="false" aria-pressed="true">Sparse</button><button data-dense="true" aria-pressed="false">Dense</button></div></div></section>
  <section class="control-section"><div class="section-heading"><h3>Material</h3></div><label class="select-row" for="density">Points<select id="density"><option value="32768">32,768</option><option value="65536">65,536</option><option value="131072" selected>131,072</option><option value="262144">262,144</option><option value="524288">524,288</option></select></label><label class="range-row" for="size"><span>Point size</span><output id="size-value">1.35</output><input id="size" type="range" min="0.4" max="3" step="0.05" value="1.35"></label><div class="inline-control"><label>Tone</label><div class="small-segment" role="group" aria-label="Image tone"><button data-negative="false" aria-pressed="true">True</button><button data-negative="true" aria-pressed="false">Negative</button></div></div><div class="inline-control"><label for="monochrome">Single ink</label><input type="checkbox" id="monochrome"><input id="ink" type="color" value="#d5e868" aria-label="Single ink colour"></div></section>
  <section class="control-section"><div class="section-heading"><h3>Light colour</h3><span>Press S to light it</span></div><div class="swatches">${swatches.map((c, i) => `<button data-color="${c}" style="--swatch:${c}" class="swatch" aria-label="${["Sulphur", "Bone", "Ice", "Amber", "Ember", "Sage"][i]} light" aria-pressed="${i === 0}"></button>`).join("")}<label class="custom-color" title="Custom light colour"><input id="light-color" type="color" value="#d5e868" aria-label="Custom light colour">${icon("plus")}</label></div></section>
  <section class="control-section depth-section"><div class="section-heading"><h3>Image depth</h3></div><p>Start with brightness relief, or estimate the shapes in your picture with a local depth model.</p><button id="estimate-depth" class="outline full">Estimate depth</button><button id="cancel-depth" class="outline full" hidden>Cancel estimation</button><p class="small-note" id="model-status">Downloads a 27 MB model once. Your image stays local.</p><button id="depth-map" class="text-button">Import a depth map</button></section>
 </aside>
</main>
<dialog id="export-dialog"><form method="dialog" class="dialog-head"><h2>Take the field with you.</h2><button class="icon-button" aria-label="Close export">${icon("close")}</button></form><p class="dialog-intro">A vector snapshot of this exact moment. Every point stays editable.</p><div class="dialog-fields"><label for="export-points">Vector detail<select id="export-points"><option value="8192">Light · up to 8,192 points</option><option value="32768" selected>Balanced · up to 32,768 points</option><option value="131072">Detailed · up to 131,072 points</option><option value="524288">Full · all rendered points</option></select></label><label class="checkbox-line"><input id="transparent" type="checkbox">Transparent background</label><label class="checkbox-line"><input id="export-overlays" type="checkbox" checked>Include tracking & frame overlays</label></div><p class="small-note">SVG freezes movement. Use an interactive embed to keep it moving. Full detail can create a large file.</p><div class="dialog-actions"><button id="export-png" class="outline">Export PNG</button><button id="export-svg" class="primary">${icon("arrow")}Download SVG</button></div><p id="export-status" class="action-status" role="status"></p></dialog>
<dialog id="embed-dialog" class="wide-dialog"><form method="dialog" class="dialog-head"><h2>A field for your website.</h2><button class="icon-button" aria-label="Close embed">${icon("close")}</button></form><p class="dialog-intro">Keep the movement, pictures and controls you set here. No dependency on this editor.</p><div class="embed-tabs" role="group" aria-label="Embed method"><button data-embed="html" aria-pressed="true">Standalone HTML</button><button data-embed="js" aria-pressed="false">JavaScript player</button></div><p id="embed-instruction">Download the self-contained HTML file, put it beside your website, then paste this iframe.</p><textarea id="embed-code" readonly aria-label="Website embed code" spellcheck="false"></textarea><label class="checkbox-line"><input id="embed-autoplay" type="checkbox" checked>Play motion and cycle pictures automatically</label><p class="small-note">Respects reduced motion and pauses rendering off screen. Requires WebGL 2. Match the frame height to your layout.</p><div class="dialog-actions"><button id="copy-embed" class="outline">Copy code</button><button id="embed-download" class="primary">${icon("arrow")}Download HTML</button><button id="embed-project" class="outline" hidden>Download project</button></div><p id="embed-status" class="action-status" role="status"></p></dialog>
<dialog id="help-dialog"><form method="dialog" class="dialog-head"><h2>Make something from the air.</h2><button class="icon-button" aria-label="Close help">${icon("close")}</button></form><p>Scatter is an original image-to-particle instrument, informed by <a href="https://gather.be-of-dao.com/" target="_blank" rel="noopener noreferrer">Gather Lite by DAO</a>. The built-in studies are procedural geometry made for this tool.</p><dl class="shortcuts"><div><dt>Next picture</dt><dd>Space / →</dd></div><div><dt>Previous picture</dt><dd>←</dd></div><div><dt>Select a picture</dt><dd>1–4</dd></div><div><dt>Light impulse</dt><dd>S</dd></div><div><dt>Swarm / melt</dt><dd>M</dd></div><div><dt>Paper / pause</dt><dd>B / P</dd></div><div><dt>Hide interface / fullscreen</dt><dd>H / F</dd></div><div><dt>Orbit focused field</dt><dd>Arrow keys</dd></div><div><dt>Zoom focused field</dt><dd>+ / −</dd></div><div><dt>Reset camera</dt><dd>0 / double-click</dd></div></dl><p class="small-note">Image and depth processing happens on your device. Depth estimation downloads public ONNX model/runtime files. SVG is a static vector snapshot; HTML and JavaScript exports preserve motion.</p></dialog>
<input id="file-images" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/bmp,image/gif" multiple><input id="file-project" class="visually-hidden" type="file" accept=".json,application/json"><input id="file-depth" class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp"><div class="notification" role="status" id="notification" hidden></div><button id="show-ui" class="outline" hidden>Show controls <kbd>H</kbd></button>`;

let clouds: Cloud[] = Array.from({ length: 4 }, (_, i) => createDemo(i));
let player: ReturnType<typeof createScatterPlayer>;
try {
	player = createScatterPlayer($("#field"), {
		clouds,
		settings: defaults(),
		onSelect: () => refresh(),
	});
} catch (e) {
	$("#stage-error").hidden = false;
	$("#stage-error").textContent = e instanceof Error ? e.message : String(e);
	throw e;
}
const state = player.settings;
let busy = false,
	noticeTimer = 0,
	replaceIndex: number | undefined,
	embedMethod = "html",
	depthWorker: Worker | undefined,
	depthSeq = 0;
const sourceImages = new Map<Cloud, ImageSource>();
const jobs = new Map<number, { cloud: Cloud; image: ImageSource }>();
let depthTimer: number | undefined;
let depthRun = 0;
let depthJobCloud: Cloud | undefined;
function retainedDepth(cloud = clouds[player.current]) {
	return cloud?.depthKind
		? cloud.depthKind.charAt(0).toLowerCase() + cloud.depthKind.slice(1)
		: "current depth";
}
function stopDepth(message = "Estimation cancelled") {
	const cloud = depthJobCloud ?? clouds[player.current];
	depthRun++;
	depthJobCloud = undefined;
	depthWorker?.terminate();
	depthWorker = undefined;
	clearTimeout(depthTimer);
	depthTimer = undefined;
	jobs.clear();
	busy = false;
	$("#model-status").textContent =
		message + ". Kept " + retainedDepth(cloud) + ".";
	refresh();
}

function notify(message: string, error = false) {
	const n = $("#notification");
	n.hidden = false;
	n.textContent = message;
	n.classList.toggle("error", error);
	clearTimeout(noticeTimer);
	noticeTimer = window.setTimeout(
		() => {
			n.hidden = true;
		},
		error ? 8500 : 4200,
	);
}
function refresh() {
	const index = player?.current ?? 0,
		cloud = clouds[index];
	if (!cloud) return;
	$("#artwork-name").textContent = cloud.name;
	$("#depth-kind").textContent = cloud.depthKind;
	$("#point-count").textContent = state.count.toLocaleString() + " points";
	$("#slot-count").textContent = clouds.length + " / 4";
	const images = $("#images");
	images.replaceChildren();
	for (let i = 0; i < 4; i++) {
		const item = document.createElement("div");
		item.className = "image-slot" + (i === index ? " selected" : "");
		const select = document.createElement("button");
		select.className = "image-select";
		select.type = "button";
		select.setAttribute(
			"aria-label",
			clouds[i]
				? "Select picture " + (i + 1) + ", " + clouds[i].name
				: "Add picture " + (i + 1),
		);
		select.setAttribute("aria-pressed", String(i === index));
		if (clouds[i]) {
			const preview = document.createElement("span");
			preview.className = "image-preview";
			if (clouds[i].preview) {
				const img = document.createElement("img");
				img.src = clouds[i].preview!;
				img.alt = "";
				preview.append(img);
			} else preview.innerHTML = demoPreview(i);
			const number = document.createElement("span");
			number.className = "image-number";
			number.textContent = String(i + 1).padStart(2, "0");
			const label = document.createElement("span");
			label.className = "image-name";
			label.textContent = clouds[i].name;
			select.append(preview, number, label);
			select.onclick = () => player.select(i);
			item.append(select);
			const remove = document.createElement("button");
			remove.className = "remove-image";
			remove.setAttribute("aria-label", "Remove " + clouds[i].name);
			remove.innerHTML = icon("close");
			remove.onclick = () => {
				sourceImages.delete(clouds[i]);
				clouds.splice(i, 1);
				if (!clouds.length) clouds = [createDemo(0)];
				player.setClouds(clouds, Math.min(index, clouds.length - 1));
				refresh();
			};
			item.append(remove);
			select.addEventListener("dblclick", () => {
				replaceIndex = i;
				$("#file-images").click();
			});
		} else {
			select.innerHTML = icon("plus") + "<span>Add picture</span>";
			select.onclick = () => {
				replaceIndex = undefined;
				$("#file-images").click();
			};
			item.append(select);
		}
		images.append(item);
	}
	for (const key of ["drift", "splash", "gather", "depth", "size"] as const) {
		$<HTMLInputElement>("#" + key).value = String(state[key]);
		$("#" + key + "-value").textContent = String(state[key]);
	}
	$<HTMLSelectElement>("#density").value = String(state.count);
	$<HTMLInputElement>("#monochrome").checked = state.monochrome;
	$<HTMLInputElement>("#ink").value = state.ink;
	$<HTMLInputElement>("#light-color").value = state.light;
	document
		.querySelectorAll<HTMLElement>("[data-travel]")
		.forEach((b) =>
			b.setAttribute("aria-pressed", String(b.dataset.travel === state.travel)),
		);
	for (const key of ["dense", "negative"] as const)
		document
			.querySelectorAll<HTMLElement>("[data-" + key + "]")
			.forEach((b) =>
				b.setAttribute(
					"aria-pressed",
					String(b.dataset[key] === String(state[key])),
				),
			);
	document
		.querySelectorAll<HTMLElement>("[data-overlay]")
		.forEach((b) =>
			b.setAttribute(
				"aria-pressed",
				String(state.draw[b.dataset.overlay as Overlay]),
			),
		);
	document
		.querySelectorAll<HTMLElement>("[data-color]")
		.forEach((b) =>
			b.setAttribute("aria-pressed", String(b.dataset.color === state.light)),
		);
	$("#stage").classList.toggle("light-paper", state.paper === "light");
	$("#play").innerHTML = icon(state.playing ? "pause" : "play");
	$("#play").setAttribute(
		"aria-label",
		state.playing ? "Pause motion" : "Play motion",
	);
	$(".live-dot").classList.toggle("paused", !state.playing);
	$("#cancel-depth").hidden = !depthJobCloud;
	$("#mobile-load-images").innerHTML =
		icon("plus") +
		(clouds.length === 4 && !clouds.every((c) => c.demo)
			? "Replace picture"
			: "Add pictures");
	$("#estimate-depth").toggleAttribute("disabled", cloud.demo || busy);
	$("#depth-map").toggleAttribute("disabled", cloud.demo || busy);
	drawLine();
}
function demoPreview(kind: number) {
	const paths = [
		"M12 31C2 9 43 2 51 24S25 56 12 31ZM17 28C16 15 37 12 42 27S21 42 17 28Z",
		"M7 28a22 22 0 1 0 44 0a22 22 0 1 0-44 0M7 28h44M29 6c-15 11-15 33 0 44M29 6c15 11 15 33 0 44",
		"M4 15q9-13 18 0t18 0t18 0M4 23q9-13 18 0t18 0t18 0M4 31q9-13 18 0t18 0t18 0M4 39q9-13 18 0t18 0t18 0",
		"m29 6 6 14 15 1-11 10 4 16-14-8-14 8 4-16L8 21l15-1Z",
	];
	return `<svg viewBox="0 0 58 56" aria-hidden="true"><path d="${paths[kind % 4]}" fill="none" stroke="currentColor" stroke-width=".8"/></svg>`;
}
async function addImages(files: File[]) {
	if (busy) return;
	busy = true;
	refresh();
	let success = 0;
	const initialReplace = replaceIndex;
	replaceIndex = undefined;
	try {
		const replacingDemos =
			clouds.every((c) => c.demo) && initialReplace === undefined;
		const room =
			initialReplace !== undefined ? 1 : replacingDemos ? 4 : 4 - clouds.length;
		if (!room) {
			notify(
				"Four pictures are loaded. Remove one, or double-click a picture to replace it.",
				true,
			);
			return;
		}
		if (files.length > room)
			notify("Only the first " + room + " pictures fit.");
		for (const file of files.slice(0, room)) {
			try {
				const image = await readImage(file),
					cloud = sampleImage(image, file.name.replace(/\.[^.]+$/, ""));
				if (success === 0 && replacingDemos) clouds = [];
				if (initialReplace !== undefined) clouds[initialReplace] = cloud;
				else clouds.push(cloud);
				sourceImages.set(cloud, image);
				success++;
				player.setClouds(clouds, initialReplace ?? clouds.length - 1);
				refresh();
				await new Promise((r) => setTimeout(r, 0));
			} catch (e) {
				notify(
					e instanceof Error ? e.message : "Could not read this picture.",
					true,
				);
			}
		}
		if (success)
			notify(
				success === 1
					? "Picture ready. Adjust the field or estimate its depth."
					: success + " pictures ready. Press Space to move between them.",
			);
	} finally {
		busy = false;
		refresh();
	}
}
function drawLine() {
	const { x, y, angle, side } = state.line,
		dx = Math.cos(angle) * 0.8,
		dy = Math.sin(angle) * 0.8,
		nx = -Math.sin(angle) * side,
		ny = Math.cos(angle) * side;
	const set = (id: string, attrs: Record<string, number | string>) => {
		for (const [k, v] of Object.entries(attrs))
			$("#" + id).setAttribute(k, String(v));
	};
	set("line-drawing", { x1: x - dx, y1: -y + dy, x2: x + dx, y2: -y - dy });
	set("line-a", { cx: x - dx, cy: -y + dy });
	set("line-b", { cx: x + dx, cy: -y - dy });
	set("line-centre", { cx: x, cy: -y });
	set("line-side", {
		d: `M${x - dx} ${-y + dy}L${x + dx} ${-y - dy}l${nx * 3} ${-ny * 3}l${-dx * 2} ${dy * 2}Z`,
	});
	const degrees = ((((angle * 180) / Math.PI) % 360) + 360) % 360;
	$("#line-angle").textContent = Math.round(degrees) + "°";
	$("#line-pad").setAttribute("aria-valuenow", String(Math.round(degrees)));
}
let lineDrag:
	| {
			mode: "move" | "turn";
			x: number;
			y: number;
			sx: number;
			sy: number;
			flip: boolean;
	  }
	| undefined;
const pad = $("#line-pad");
const linePoint = (e: PointerEvent) => {
	const r = pad.getBoundingClientRect();
	return {
		x: ((e.clientX - r.left) / r.width) * 2.6 - 1.3,
		y: 1.3 - ((e.clientY - r.top) / r.height) * 2.6,
	};
};
pad.addEventListener("pointerdown", (e) => {
	const p = linePoint(e),
		l = state.line,
		along = (p.x - l.x) * Math.cos(l.angle) + (p.y - l.y) * Math.sin(l.angle),
		across = -(p.x - l.x) * Math.sin(l.angle) + (p.y - l.y) * Math.cos(l.angle);
	if (Math.abs(across) > 0.25) {
		l.side = across < 0 ? -1 : 1;
		player.update({ line: l });
		drawLine();
		return;
	}
	lineDrag = {
		mode: Math.abs(along) > 0.38 ? "turn" : "move",
		x: p.x,
		y: p.y,
		sx: l.x,
		sy: l.y,
		flip: along < 0,
	};
	pad.setPointerCapture(e.pointerId);
	e.preventDefault();
});
pad.addEventListener("pointermove", (e) => {
	if (!lineDrag) return;
	const p = linePoint(e),
		l = state.line;
	if (lineDrag.mode === "move") {
		l.x = Math.max(-1, Math.min(1, lineDrag.sx + p.x - lineDrag.x));
		l.y = Math.max(-1, Math.min(1, lineDrag.sy + p.y - lineDrag.y));
	} else
		l.angle = Math.atan2(p.y - l.y, p.x - l.x) + (lineDrag.flip ? Math.PI : 0);
	player.update({ line: l });
	drawLine();
});
for (const event of ["pointerup", "pointercancel"])
	pad.addEventListener(event, () => {
		lineDrag = undefined;
	});
pad.addEventListener("keydown", (e) => {
	let handled = true;
	const l = state.line,
		step = e.shiftKey ? 3 : 1;
	if (e.key === "ArrowLeft") l.angle += 0.05 * step;
	else if (e.key === "ArrowRight") l.angle -= 0.05 * step;
	else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
		const d = (e.key === "ArrowUp" ? 1 : -1) * 0.04 * step;
		l.x -= Math.sin(l.angle) * d;
		l.y += Math.cos(l.angle) * d;
	} else if (e.key.toLowerCase() === "f") l.side *= -1;
	else handled = false;
	if (handled) {
		e.preventDefault();
		e.stopPropagation();
		player.update({ line: l });
		drawLine();
	}
});
for (const key of ["drift", "splash", "gather", "depth", "size"] as const)
	$<HTMLInputElement>("#" + key).addEventListener("input", (e) => {
		player.update({ [key]: Number((e.target as HTMLInputElement).value) });
		$("#" + key + "-value").textContent = String(state[key]);
	});
document.querySelectorAll<HTMLButtonElement>("[data-overlay]").forEach(
	(b) =>
		(b.onclick = () => {
			const key = b.dataset.overlay as Overlay;
			state.draw[key] = !state.draw[key];
			player.update({ draw: state.draw });
			refresh();
		}),
);
document.querySelectorAll<HTMLButtonElement>("[data-travel]").forEach(
	(b) =>
		(b.onclick = () => {
			player.update({ travel: b.dataset.travel as Settings["travel"] });
			refresh();
		}),
);
for (const key of ["dense", "negative"] as const)
	document.querySelectorAll<HTMLButtonElement>("[data-" + key + "]").forEach(
		(b) =>
			(b.onclick = () => {
				player.update({ [key]: b.dataset[key] === "true" });
				refresh();
			}),
	);
document.querySelectorAll<HTMLButtonElement>("[data-color]").forEach(
	(b) =>
		(b.onclick = () => {
			player.update({ light: b.dataset.color! });
			player.light();
			refresh();
		}),
);
$<HTMLInputElement>("#light-color").oninput = (e) => {
	player.update({ light: (e.target as HTMLInputElement).value });
	refresh();
};
$<HTMLInputElement>("#ink").oninput = (e) =>
	player.update({ ink: (e.target as HTMLInputElement).value });
$<HTMLInputElement>("#monochrome").onchange = (e) =>
	player.update({ monochrome: (e.target as HTMLInputElement).checked });
$<HTMLSelectElement>("#density").onchange = (e) => {
	player.update({ count: Number((e.target as HTMLSelectElement).value) });
	refresh();
};
$("#play").onclick = () => {
	player.update({ playing: !state.playing });
	refresh();
};
$("#next").onclick = () => player.select((player.current + 1) % clouds.length);
$("#light").onclick = () => player.light();
$("#paper").onclick = () => {
	player.update({ paper: state.paper === "dark" ? "light" : "dark" });
	refresh();
};
$("#reset-view").onclick = () => player.reset();
$("#reset-settings").onclick = () => {
	player.update(defaults());
	refresh();
	notify("Field settings reset. Your pictures are kept.");
};
$("#flip-line").onclick = () => {
	state.line.side *= -1;
	player.update({ line: state.line });
	drawLine();
};
$("#fullscreen").onclick = async () => {
	try {
		if (document.fullscreenElement) await document.exitFullscreen();
		else await $("#stage").requestFullscreen();
	} catch {
		notify(
			"Fullscreen is unavailable in this browser. Use the browser’s fullscreen command.",
			true,
		);
	}
};
function hideUi() {
	const hidden = document.body.classList.toggle("presentation");
	$("#show-ui").hidden = !hidden;
}
$("#hide-ui").onclick = hideUi;
$("#show-ui").onclick = hideUi;
function choosePictures() {
	replaceIndex =
		clouds.length === 4 && !clouds.every((c) => c.demo)
			? player.current
			: undefined;
	$("#file-images").click();
}
$("#load-images").onclick = choosePictures;
$("#mobile-load-images").onclick = choosePictures;
$<HTMLInputElement>("#file-images").onchange = (e) => {
	const input = e.target as HTMLInputElement;
	void addImages([...(input.files ?? [])]);
	input.value = "";
};
let dragDepth = 0;
document.addEventListener("dragenter", (e) => {
	if (e.dataTransfer?.types.includes("Files")) {
		dragDepth++;
		$("#drop-cover").classList.add("active");
	}
});
document.addEventListener("dragleave", () => {
	if (--dragDepth <= 0) {
		dragDepth = 0;
		$("#drop-cover").classList.remove("active");
	}
});
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => {
	e.preventDefault();
	dragDepth = 0;
	$("#drop-cover").classList.remove("active");
	replaceIndex = undefined;
	void addImages([...(e.dataTransfer?.files ?? [])]);
});
for (const [open, dialog] of [
	["export-open", "export-dialog"],
	["embed-open", "embed-dialog"],
	["help-open", "help-dialog"],
])
	$("#" + open).onclick = () => {
		if (open === "embed-open") updateEmbed();
		$<HTMLDialogElement>("#" + dialog).showModal();
	};
document.querySelectorAll<HTMLDialogElement>("dialog").forEach((d) =>
	d.addEventListener("click", (e) => {
		if (e.target === d) {
			const r = d.getBoundingClientRect();
			if (
				(e as MouseEvent).clientX < r.left ||
				(e as MouseEvent).clientX > r.right ||
				(e as MouseEvent).clientY < r.top ||
				(e as MouseEvent).clientY > r.bottom
			)
				d.close();
		}
	}),
);
$("#export-svg").onclick = async () => {
	const button = $<HTMLButtonElement>("#export-svg");
	button.disabled = true;
	$("#export-status").textContent = "Preparing vector points…";
	await new Promise((r) => setTimeout(r, 30));
	try {
		const frame = player.snapshot(
				Number($<HTMLSelectElement>("#export-points").value),
			),
			svg = frameSvg(frame, state, {
				transparent: $<HTMLInputElement>("#transparent").checked,
				overlays: $<HTMLInputElement>("#export-overlays").checked,
				title: clouds[player.current].name,
			});
		download(
			svg,
			"scatter-" + Math.round(frame.time * 1000) + ".svg",
			"image/svg+xml",
		);
		$("#export-status").textContent =
			(frame.points.length / 8).toLocaleString() + " vector points exported.";
	} catch (e) {
		$("#export-status").textContent =
			e instanceof Error ? e.message : String(e);
	} finally {
		button.disabled = false;
	}
};
$("#export-png").onclick = async () => {
	try {
		const frame = player.snapshot(),
			svg = frameSvg(frame, state, {
				transparent: $<HTMLInputElement>("#transparent").checked,
				overlays: $<HTMLInputElement>("#export-overlays").checked,
			}),
			url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
		try {
			const image = new Image();
			image.src = url;
			await image.decode();
			const out = document.createElement("canvas");
			out.width = Math.round(frame.width * 2);
			out.height = Math.round(frame.height * 2);
			out.getContext("2d")!.drawImage(image, 0, 0, out.width, out.height);
			out.toBlob((blob) => {
				if (blob) {
					download(blob, "scatter.png");
					$("#export-status").textContent =
						`PNG exported at ${out.width} × ${out.height}.`;
				} else
					$("#export-status").textContent =
						"Could not create PNG. Try SVG export.";
			}, "image/png");
		} finally {
			URL.revokeObjectURL(url);
		}
	} catch (e) {
		$("#export-status").textContent =
			"Could not export PNG. " + (e instanceof Error ? e.message : String(e));
	}
};
$("#save-project").onclick = () => {
	download(
		JSON.stringify(project(clouds, state, player.current)),
		"scatter-project.json",
		"application/json",
	);
	notify("Project saved with pictures and field settings.");
};
$("#open-project").onclick = () => $("#file-project").click();
$("#mobile-open-project").onclick = () => {
	$("#open-project").click();
	$<HTMLDetailsElement>(".project-menu").open = false;
};
$("#mobile-save-project").onclick = () => {
	$("#save-project").click();
	$<HTMLDetailsElement>(".project-menu").open = false;
};
$<HTMLInputElement>("#file-project").onchange = async (e) => {
	const input = e.target as HTMLInputElement,
		file = input.files?.[0];
	input.value = "";
	if (!file) return;
	try {
		if (file.size > 40 * 1024 * 1024)
			throw Error("This project is over 40 MB.");
		const p = validateProject(JSON.parse(await file.text()));
		sourceImages.clear();
		clouds = p.clouds;
		player.update(p.settings);
		player.setClouds(clouds, p.current);
		refresh();
		notify("Project restored.");
	} catch (e) {
		notify(
			e instanceof Error ? e.message : "Could not open the project.",
			true,
		);
	}
};
function updateEmbed() {
	document
		.querySelectorAll<HTMLElement>("[data-embed]")
		.forEach((b) =>
			b.setAttribute("aria-pressed", String(b.dataset.embed === embedMethod)),
		);
	$<HTMLTextAreaElement>("#embed-code").value =
		embedMethod === "html" ? iframeSnippet() : jsSnippet();
	$("#embed-instruction").textContent =
		embedMethod === "html"
			? "Download the self-contained HTML file, put it beside your website, then paste this iframe."
			: "Download the JavaScript player and project JSON. Put both beside your website, then paste this code.";
	$("#embed-download").innerHTML =
		icon("arrow") +
		(embedMethod === "html" ? "Download HTML" : "Download player JS");
	$("#embed-project").hidden = embedMethod === "html";
}
document.querySelectorAll<HTMLButtonElement>("[data-embed]").forEach(
	(b) =>
		(b.onclick = () => {
			embedMethod = b.dataset.embed!;
			updateEmbed();
		}),
);
$("#copy-embed").onclick = async () => {
	try {
		await navigator.clipboard.writeText(
			$<HTMLTextAreaElement>("#embed-code").value,
		);
		$("#embed-status").textContent = "Code copied.";
	} catch {
		$<HTMLTextAreaElement>("#embed-code").select();
		$("#embed-status").textContent = "Select and copy the code above.";
	}
};
$("#embed-download").onclick = async () => {
	try {
		if (embedMethod === "html") {
			download(
				playerHtml(
					project(clouds, state, player.current),
					$<HTMLInputElement>("#embed-autoplay").checked,
				),
				"scatter.html",
				"text/html",
			);
			$("#embed-status").textContent =
				"Self-contained HTML downloaded. No external image or model files required.";
		} else {
			const response = await fetch(
				import.meta.env.DEV ? "/dist/scatter.js" : "./scatter.js",
			);
			if (!response.ok)
				throw Error("The player bundle is missing. Run npm run build first.");
			download(await response.text(), "scatter.js", "text/javascript");
			$("#embed-status").textContent =
				"Player downloaded. Download your project next.";
		}
	} catch (e) {
		$("#embed-status").textContent = e instanceof Error ? e.message : String(e);
	}
};
$("#embed-project").onclick = () => {
	const p = project(clouds, state, player.current);
	p.settings.playing = $<HTMLInputElement>("#embed-autoplay").checked;
	p.clouds = p.clouds.map(({ preview, source, ...c }) => c);
	download(JSON.stringify(p), "scatter-project.json", "application/json");
	$("#embed-status").textContent =
		"Project downloaded. Put it beside scatter.js and your website.";
};
async function imageFor(cloud: Cloud) {
	let image = sourceImages.get(cloud);
	if (!image && cloud.source) {
		const blob = await fetch(cloud.source).then((r) => r.blob());
		image = await readImage(
			new File([blob], "source.png", { type: blob.type }),
		);
		sourceImages.set(cloud, image);
	}
	return image;
}
$("#cancel-depth").onclick = () => stopDepth();
$("#estimate-depth").onclick = async () => {
	const cloud = clouds[player.current];
	if (cloud.demo || busy) return;
	const run = ++depthRun;
	depthJobCloud = cloud;
	busy = true;
	refresh();
	depthTimer = window.setTimeout(() => {
		stopDepth("Depth estimation timed out");
		notify(
			"The depth job took too long. You can try again or keep the existing depth.",
			true,
		);
	}, 90000);
	try {
		const image = await imageFor(cloud);
		if (run !== depthRun) return;
		if (!image) throw Error("Reimport this picture to estimate its depth.");
		if (!depthWorker) {
			depthWorker = new Worker(new URL("./depth.worker.ts", import.meta.url), {
				type: "module",
			});
			const worker = depthWorker;
			depthWorker.onmessage = (event) => {
				if (worker !== depthWorker) return;
				const message = event.data;
				if (message.type === "status") {
					$("#model-status").textContent = message.text;
					return;
				}
				const job = jobs.get(message.id);
				jobs.delete(message.id);
				clearTimeout(depthTimer);
				depthTimer = undefined;
				depthJobCloud = undefined;
				busy = false;
				if (message.type === "depth" && job && clouds.includes(job.cloud)) {
					const next = sampleImage(job.image, job.cloud.name, message.data, [
						message.width,
						message.height,
					]);
					const index = clouds.indexOf(job.cloud);
					clouds[index] = next;
					sourceImages.delete(job.cloud);
					sourceImages.set(next, job.image);
					player.setClouds(clouds, player.current);
					$("#model-status").textContent =
						"Depth Anything V2 · processed on your device.";
					notify("Picture depth estimated. Drag the field to see its relief.");
				} else if (message.type === "error") {
					$("#model-status").textContent =
						"Depth estimation unavailable. Kept " +
						retainedDepth(job?.cloud) +
						".";
					notify("Could not estimate depth. " + message.error, true);
				}
				refresh();
			};
			depthWorker.onerror = () => {
				if (worker === depthWorker) stopDepth("Depth model could not start");
			};
		}
		const target = 378,
			w = Math.max(
				56,
				Math.round(
					((image.width / Math.max(image.width, image.height)) * target) / 14,
				) * 14,
			),
			h = Math.max(
				56,
				Math.round(
					((image.height / Math.max(image.width, image.height)) * target) / 14,
				) * 14,
			),
			canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext("2d")!,
			bitmap = await createImageBitmap(
				new ImageData(
					new Uint8ClampedArray(image.pixels),
					image.width,
					image.height,
				),
			);
		if (run !== depthRun) {
			bitmap.close();
			return;
		}
		ctx.drawImage(bitmap, 0, 0, w, h);
		bitmap.close();
		const pixels = ctx.getImageData(0, 0, w, h).data,
			id = ++depthSeq;
		jobs.set(id, { cloud, image });
		busy = true;
		refresh();
		$("#model-status").textContent = "Loading local depth estimation…";
		depthWorker.postMessage({ id, pixels, width: w, height: h }, [
			pixels.buffer,
		]);
	} catch (e) {
		if (run !== depthRun) return;
		stopDepth("Depth model could not start");
		notify(e instanceof Error ? e.message : String(e), true);
	}
};
$("#depth-map").onclick = () => $("#file-depth").click();
$<HTMLInputElement>("#file-depth").onchange = async (e) => {
	const input = e.target as HTMLInputElement,
		file = input.files?.[0];
	input.value = "";
	if (!file) return;
	try {
		const cloud = clouds[player.current],
			image = await imageFor(cloud);
		if (!image) throw Error("Add a picture before importing its depth map.");
		const map = await readImage(file),
			depth = new Float32Array(map.width * map.height);
		for (let i = 0; i < depth.length; i++) depth[i] = map.pixels[i * 4] / 255;
		const next = sampleImage(image, cloud.name, depth, [map.width, map.height]);
		next.depthKind = "Imported depth map";
		sourceImages.delete(cloud);
		sourceImages.set(next, image);
		clouds[player.current] = next;
		player.setClouds(clouds, player.current);
		refresh();
		notify("Depth map applied. Light pixels sit closer to you.");
	} catch (e) {
		notify(e instanceof Error ? e.message : String(e), true);
	}
};
document.addEventListener("keydown", (e) => {
	if (
		e.metaKey ||
		e.ctrlKey ||
		e.altKey ||
		document.querySelector("dialog[open]") ||
		(e.target as HTMLElement).closest("input,textarea,select,button,#line-pad")
	)
		return;
	const key = e.key.toLowerCase();
	if (key === " ") {
		e.preventDefault();
		if (e.target !== player.canvas) $("#next").click();
	} else if (key === "arrowright") {
		e.preventDefault();
		$("#next").click();
	} else if (key === "arrowleft") {
		e.preventDefault();
		player.select((player.current - 1 + clouds.length) % clouds.length);
	} else if (key >= "1" && key <= "4") player.select(Number(key) - 1);
	else if (key === "s") {
		if (e.target !== player.canvas) player.light();
	} else if (key === "m") {
		player.update({ travel: state.travel === "swarm" ? "melt" : "swarm" });
		refresh();
	} else if (key === "p") $("#play").click();
	else if (key === "b") $("#paper").click();
	else if (
		key === "h" ||
		(key === "escape" && document.body.classList.contains("presentation"))
	)
		hideUi();
	else if (key === "f") $("#fullscreen").click();
});
$("#field").addEventListener("scatter-error", (e) => {
	const error = $("#stage-error");
	error.hidden = false;
	error.textContent = (e as CustomEvent).detail;
});
let timeAnimation = 0;
function readTime() {
	const t = player.time;
	$("#transport-time").textContent =
		String(Math.floor(t / 60)).padStart(2, "0") +
		":" +
		(t % 60).toFixed(2).padStart(5, "0");
	timeAnimation = requestAnimationFrame(readTime);
}
readTime();
window.addEventListener("pagehide", () => {
	cancelAnimationFrame(timeAnimation);
	clearTimeout(depthTimer);
	depthWorker?.terminate();
	player.destroy();
});
refresh();
// Developer-facing hooks used by the browser verification and integration example.
Object.assign(window, {
	scatterStudio: {
		player,
		get clouds() {
			return clouds;
		},
		project: () => project(clouds, state, player.current),
		svg: (limit = 32768) =>
			frameSvg(player.snapshot(limit), state, {
				title: clouds[player.current].name,
			}),
		html: () => playerHtml(project(clouds, state, player.current)),
	},
});
