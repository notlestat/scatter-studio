import test from "node:test";
import assert from "node:assert/strict";
import {
	defaults,
	createDemo,
	validateProject,
	project,
} from "../src/model.ts";
import { frameSvg, safeJson, playerHtml } from "../src/exports.ts";

test("SVG preserves geometry, bounds, alpha and hostile title as text", () => {
	const settings = defaults();
	const svg = frameSvg(
		{
			width: 100,
			height: 80,
			time: 1.25,
			overlays: "",
			points: new Float32Array([
				50, 40, 2, 0, 1, 0.5, 0, 0.4, -10, 0, 1, 0, 1, 1, 1, 1,
			]),
		},
		settings,
		{ transparent: true, title: "</title><script>alert(1)</script>" },
	);
	assert.equal((svg.match(/<circle /g) || []).length, 1);
	assert.ok(svg.includes('cx="50.00"'));
	assert.ok(svg.includes('opacity="0.400"'));
	assert.ok(svg.includes('fill="#ff8000"'));
	assert.ok(!svg.includes("<rect"));
	assert.ok(!svg.includes("<script>"));
});
test("a saved project round-trips exact point data and camera settings", () => {
	const settings = defaults();
	settings.zoom = 1.7;
	settings.line.side = 1;
	const cloud = createDemo(0),
		saved = project([cloud], settings, 0),
		restored = validateProject(saved);
	assert.deepEqual(restored.clouds[0].data, cloud.data);
	assert.equal(restored.settings.zoom, 1.7);
	assert.equal(restored.settings.line.side, 1);
});
test("untrusted projects reject invalid binary geometry and strip executable sources", () => {
	const saved = project([createDemo(1)], defaults(), 0);
	assert.throws(() =>
		validateProject({
			...saved,
			clouds: [{ ...saved.clouds[0], data: "AAAA" }],
		}),
	);
	saved.clouds[0].source = "javascript:alert(1)";
	saved.clouds[0].preview = "data:image/svg+xml,<svg onload=alert(1)>";
	const p = validateProject(saved);
	assert.equal(p.clouds[0].source, undefined);
	assert.equal(p.clouds[0].preview, undefined);
});
test("standalone HTML embeds escaped data and the self-contained engine", () => {
	const saved = project([createDemo(0)], defaults(), 0);
	saved.clouds[0].name = "</script><script>alert(1)</script>";
	const html = playerHtml(saved);
	assert.ok(!html.includes("</script><script>alert(1)"));
	assert.ok(html.includes("createScatterPlayer"));
	assert.ok(!html.includes('src="http'));
	assert.ok(safeJson({ x: "<script>" }).includes("\\u003c"));
});
