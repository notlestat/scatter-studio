import { test, expect } from "@playwright/test";
import { writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";

test("GPU field renders, all controls affect the actual scene, SVG and HTML exports work", async ({
	page,
	context,
}) => {
	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	const result = await page.evaluate(() => {
		const p = (window as any).scatterStudio.player;
		p.update({ playing: false, drift: 0 });
		p.setTime(0);
		const f = p.snapshot(8192),
			gl = p.canvas.getContext("webgl2"),
			bytes = new Uint8Array(p.canvas.width * p.canvas.height * 4);
		gl.readPixels(
			0,
			0,
			p.canvas.width,
			p.canvas.height,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			bytes,
		);
		let lit = 0;
		for (let i = 0; i < bytes.length; i += 4)
			if (bytes[i] > 60 || bytes[i + 1] > 60 || bytes[i + 2] > 60) lit++;
		return {
			error: gl.getError(),
			count: f.points.length / 8,
			finite: [...f.points].every(Number.isFinite),
			visible: [...f.points].filter((_, i) => i % 8 === 7 && f.points[i] > 0.1)
				.length,
			lit,
		};
	});
	expect(result.error).toBe(0);
	expect(result.finite).toBe(true);
	expect(result.count).toBe(8192);
	expect(result.visible).toBeGreaterThan(1000);
	expect(result.lit).toBeGreaterThan(5000);
	await page.evaluate(() =>
		(window as any).scatterStudio.player.update({ drift: 36 }),
	);
	await page.screenshot({ path: ".impeccable/review/desktop.png" });
	await page.evaluate(() =>
		(window as any).scatterStudio.player.update({ drift: 0 }),
	);
	const before = await page.evaluate(() =>
		Array.from((window as any).scatterStudio.player.snapshot(512).points),
	);
	await page.locator("#depth").fill("15");
	await page.locator("#drift").fill("90");
	await page.locator("#splash").fill("20");
	await page.locator("#gather").fill("80");
	await page.getByRole("button", { name: "Melt", exact: true }).click();
	await page.getByRole("button", { name: "Dense", exact: true }).click();
	await page.getByRole("button", { name: "Scan", exact: true }).click();
	await page.getByRole("button", { name: "Trails", exact: true }).click();
	await page.locator("#line-pad").focus();
	await page.keyboard.press("ArrowRight");
	await page.keyboard.press("ArrowUp");
	await page.keyboard.press("f");
	await page.locator("#paper").click();
	await page.getByRole("button", { name: "Negative", exact: true }).click();
	const after = await page.evaluate(() => {
		const p = (window as any).scatterStudio.player;
		return {
			points: Array.from(p.snapshot(512).points),
			settings: p.settings,
			svg: (window as any).scatterStudio.svg(8192),
			gl: p.canvas.getContext("webgl2").getError(),
		};
	});
	expect(after.points).not.toEqual(before);
	expect(after.settings.drift).toBe(90);
	expect(after.settings.travel).toBe("melt");
	expect(after.settings.draw.trails).toBe(true);
	expect(after.settings.draw.scan).toBe(true);
	expect(after.gl).toBe(0);
	expect(after.svg).toContain("<path");
	await page.locator("#export-open").click();
	await page.locator("#transparent").check();
	const svgDownload = page.waitForEvent("download");
	await page.locator("#export-svg").click();
	const svgFile = await svgDownload;
	await svgFile.saveAs("artifacts/test-export.svg");
	const svgText = await readFile("artifacts/test-export.svg", "utf8");
	expect(svgText).toContain("<circle");
	expect(svgText).not.toContain("<image");
	expect(svgText).not.toContain('<rect width="100%"');
	const xml = await page.evaluate((svg) => {
		const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
		return {
			errors: doc.querySelectorAll("parsererror").length,
			circles: doc.querySelectorAll("circle").length,
		};
	}, svgText);
	expect(xml.errors).toBe(0);
	expect(xml.circles).toBeGreaterThan(5000);
	const pngPromise = page.waitForEvent("download");
	await page.locator("#export-png").click();
	const png = await pngPromise;
	await png.saveAs("artifacts/test-export.png");
	const pngBytes = await readFile("artifacts/test-export.png");
	expect(pngBytes.subarray(1, 4).toString()).toBe("PNG");
	expect(pngBytes.readUInt32BE(16)).toBeGreaterThan(1000);
	expect(pngBytes.readUInt32BE(20)).toBeGreaterThan(500);
	await page.getByRole("button", { name: "Close export", exact: true }).click();
	await page.locator("#embed-open").click();
	const htmlDownload = page.waitForEvent("download");
	await page.locator("#embed-download").click();
	const file = await htmlDownload;
	await file.saveAs("artifacts/scatter-export.html");
	await page.getByRole("button", { name: "Close embed", exact: true }).click();
	const html = await readFile("artifacts/scatter-export.html", "utf8");
	const embedded = await context.newPage();
	await embedded.route("**/qa-export.html", (route) =>
		route.fulfill({ contentType: "text/html", body: html }),
	);
	const embedErrors: string[] = [];
	embedded.on("pageerror", (e) => embedErrors.push(e.message));
	await embedded.goto("/qa-export.html");
	await embedded.waitForFunction(() => !!(window as any).scatter);
	const embeddedState = await embedded.evaluate(() => {
		const p = (window as any).scatter;
		return {
			count: p.snapshot(1024).points.length / 8,
			error: p.canvas.getContext("webgl2").getError(),
		};
	});
	expect(embeddedState.count).toBe(1024);
	expect(embeddedState.error).toBe(0);
	expect(embedErrors).toEqual([]);
	await embedded.close();
	expect(errors).toEqual([]);
});

test("upload, bad input recovery, project roundtrip, imported depth and JS embed", async ({
	page,
	context,
}) => {
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	const data = await page.evaluate(() => {
		const c = document.createElement("canvas");
		c.width = 400;
		c.height = 500;
		const ctx = c.getContext("2d")!;
		ctx.fillStyle = "#15191c";
		ctx.fillRect(0, 0, 400, 500);
		const g = ctx.createRadialGradient(165, 160, 10, 200, 250, 160);
		g.addColorStop(0, "#e2e8e1");
		g.addColorStop(0.55, "#889a9c");
		g.addColorStop(1, "#101d25");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.ellipse(200, 250, 135, 190, 0, 0, Math.PI * 2);
		ctx.fill();
		return c.toDataURL("image/png").split(",")[1];
	});
	await writeFile("artifacts/upload-test.png", Buffer.from(data, "base64"));
	await page
		.locator("#file-images")
		.setInputFiles(resolve("artifacts/upload-test.png"));
	await expect(page.locator("#artwork-name")).toHaveText("upload-test");
	await expect(page.locator("#slot-count")).toHaveText("1 / 4");
	expect(
		await page.evaluate(() => (window as any).scatterStudio.clouds[0].demo),
	).toBe(false);
	await page
		.locator("#file-depth")
		.setInputFiles(resolve("artifacts/upload-test.png"));
	await expect(page.locator("#depth-kind")).toHaveText("Imported depth map");
	const downloadPromise = page.waitForEvent("download");
	await page.locator("#save-project").click();
	const download = await downloadPromise;
	await download.saveAs("artifacts/test-project.json");
	await page.locator("#reset-settings").click();
	await page
		.locator("#file-project")
		.setInputFiles(resolve("artifacts/test-project.json"));
	await expect(page.locator("#notification")).toHaveText("Project restored.");
	const p = await readFile("artifacts/test-project.json", "utf8");
	const jsHtml =
		'<!doctype html><html><div id="field" style="width:800px;height:500px"></div><script src="/dist/scatter.js"></script><script>window.handle=Scatter.mount("#field",{project:"/qa-project.json"});window.handle.ready.then(p=>window.qaPlayer=p);</script></html>';
	const embedded = await context.newPage();
	await embedded.route("**/qa-js.html", (route) =>
		route.fulfill({ contentType: "text/html", body: jsHtml }),
	);
	await embedded.route("**/qa-project.json", (route) =>
		route.fulfill({ contentType: "application/json", body: p }),
	);
	await embedded.route("**/dist/scatter.js", (route) =>
		route.fulfill({
			contentType: "text/javascript",
			path: resolve("dist/scatter.js"),
		}),
	);
	await embedded.goto("/qa-js.html");
	await embedded.waitForFunction(() => !!(window as any).qaPlayer);
	expect(
		await embedded.evaluate(
			() => (window as any).qaPlayer.snapshot(1024).points.length / 8,
		),
	).toBe(1024);
	await embedded.evaluate(() => (window as any).handle.destroy());
	expect(await embedded.locator("canvas").count()).toBe(0);
	await embedded.close();
	await page.locator("#file-images").setInputFiles({
		name: "bad.png",
		mimeType: "image/png",
		buffer: Buffer.from("not an image"),
	});
	await expect(page.locator("#notification")).toContainText(
		/decode|picture|image/i,
	);
});

test("responsive layout and keyboard presentation", async ({ page }) => {
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	const layouts = [];
	for (const width of [320, 390, 760, 1024, 1440, 1920]) {
		await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
		await page.waitForTimeout(100);
		const result = await page.evaluate(() => ({
			width: innerWidth,
			scroll: document.documentElement.scrollWidth,
			canvas: !!document.querySelector("#field canvas"),
			buttons: [...document.querySelectorAll("header button")]
				.filter((b) => b.getBoundingClientRect().width > 0)
				.map((b) => ({
					text: b.textContent,
					right: b.getBoundingClientRect().right,
				})),
		}));
		expect(result.scroll).toBeLessThanOrEqual(width + 1);
		expect(result.buttons.every((b) => b.right <= width + 1)).toBe(true);
		layouts.push(result);
		if (width === 390)
			await page.screenshot({
				path: ".impeccable/review/mobile.png",
				fullPage: true,
			});
	}
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.keyboard.press("h");
	await expect(page.locator("#show-ui")).toBeVisible();
	await page.keyboard.press("h");
	await expect(page.locator("header")).toBeVisible();
	await page.keyboard.press("2");
	await expect(page.locator("#artwork-name")).toHaveText("Crater sphere");
	await page.keyboard.press("m");
	expect(
		await page.evaluate(
			() => (window as any).scatterStudio.player.settings.travel,
		),
	).toBe("melt");
	await writeFile(
		"artifacts/responsive.json",
		JSON.stringify(layouts, null, 2),
	);
});
