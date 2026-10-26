import { createScatterPlayer } from "./engine.ts";
import type { Frame, Project, Settings } from "./types.ts";
export function escapeXml(value: string) {
	return value.replace(
		/[<>&"']/g,
		(c) =>
			({
				"<": "&lt;",
				">": "&gt;",
				"&": "&amp;",
				'"': "&quot;",
				"'": "&apos;",
			})[c]!,
	);
}
export function frameSvg(
	frame: Frame,
	settings: Settings,
	{ transparent = false, overlays = true, title = "Scatter point study" } = {},
) {
	const { width, height, points } = frame,
		parts = [
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(2)} ${height.toFixed(2)}" width="${Math.round(width)}" height="${Math.round(height)}" role="img"><title>${escapeXml(title)}</title><desc>Vector point field made with Scatter. Snapshot at ${frame.time.toFixed(3)} seconds. ${points.length / 8} sampled points.</desc>`,
		];
	if (!transparent)
		parts.push(
			`<rect width="100%" height="100%" fill="${settings.paper === "dark" ? "#111312" : "#eeefe8"}"/>`,
		);
	for (let i = 0; i < points.length; i += 8) {
		const x = points[i],
			y = points[i + 1],
			r = points[i + 2];
		if (
			x + r < 0 ||
			y + r < 0 ||
			x - r > width ||
			y - r > height ||
			points[i + 7] < 0.015
		)
			continue;
		const c = [4, 5, 6]
			.map((o) =>
				Math.round(Math.max(0, Math.min(1, points[i + o])) * 255)
					.toString(16)
					.padStart(2, "0"),
			)
			.join("");
		parts.push(
			`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${Math.max(0.25, r * 0.8).toFixed(2)}" fill="#${c}" opacity="${points[i + 7].toFixed(3)}"/>`,
		);
	}
	if (frame.trails)
		for (let i = 0; i + 15 < frame.trails.length; i += 16) {
			const p = frame.trails,
				c = [4, 5, 6]
					.map((o) =>
						Math.round(Math.max(0, Math.min(1, p[i + o])) * 255)
							.toString(16)
							.padStart(2, "0"),
					)
					.join("");
			parts.push(
				`<path d="M${p[i].toFixed(2)} ${p[i + 1].toFixed(2)}L${p[i + 8].toFixed(2)} ${p[i + 9].toFixed(2)}" fill="none" stroke="#${c}" stroke-width=".75" opacity="${(p[i + 7] * 0.16).toFixed(3)}"/>`,
			);
		}
	if (overlays) parts.push(`<g>${frame.overlays}</g>`);
	parts.push("</svg>");
	return parts.join("\n");
}
export function download(
	data: Blob | string,
	name: string,
	type = "text/plain",
) {
	const url = URL.createObjectURL(
		data instanceof Blob ? data : new Blob([data], { type }),
	);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function safeJson(value: unknown) {
	return JSON.stringify(value)
		.replace(/</g, "\\u003c")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");
}
export function playerHtml(project: Project, autoplay = true) {
	const p = structuredClone(project);
	p.settings.playing = autoplay;
	p.clouds = p.clouds.map(({ preview, source, ...cloud }) => cloud);
	return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>Scatter point field</title><style>html,body,#scatter{margin:0;width:100%;height:100%;overflow:hidden}body{background:${p.settings.paper === "dark" ? "#111312" : "#eeefe8"}}canvas:focus-visible{outline:2px solid #91a73c}#error{font:16px system-ui;padding:24px;color:${p.settings.paper === "dark" ? "white" : "black"}}</style></head><body><div id="scatter"></div><script>const project=${safeJson(p)};try{const createPlayer=${createScatterPlayer.toString()};window.scatter=createPlayer(document.getElementById('scatter'),{clouds:project.clouds,settings:project.settings,current:project.current,autoCycle:${autoplay}});}catch(error){document.getElementById('scatter').remove();const message=document.createElement('p');message.id='error';message.textContent='This browser could not draw the point field. '+error.message;document.body.append(message);}</script></body></html>`;
}
export function iframeSnippet(filename = "scatter.html") {
	return `<iframe\n  src="./${filename}"\n  title="Interactive point field"\n  style="width:100%;height:640px;border:0;display:block"\n  loading="lazy"\n  sandbox="allow-scripts"\n></iframe>`;
}
export function jsSnippet() {
	return `<div id="point-field" style="width:100%;height:640px"></div>\n<script src="./scatter.js"></script>\n<script>\n  const field = Scatter.mount('#point-field', {\n    project: './scatter-project.json',\n    autoCycle: true\n  });\n  // field.ready.then(player => player.light());\n  // field.destroy();\n</script>`;
}
