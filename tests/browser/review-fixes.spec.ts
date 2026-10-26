import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test("paused selection settles to the selected picture in both travel modes and exports", async ({
	page,
	context,
}) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	await page.locator("#play").click();
	await page.locator("#drift").fill("0");
	for (const travel of ["melt", "swarm"]) {
		await page.locator(`[data-travel="${travel}"]`).click();
		await page.keyboard.press("Escape");
		await page.locator("#field canvas").focus();
		await page.keyboard.press("1");
		const before = await page.evaluate(() =>
			Array.from((window as any).scatterStudio.player.snapshot(512).points),
		);
		await page
			.locator('[aria-label="Select picture 2, Crater sphere"]')
			.click();
		await expect(page.locator("#artwork-name")).toHaveText("Crater sphere");
		const after = await page.evaluate(() => ({
			points: Array.from(
				(window as any).scatterStudio.player.snapshot(512).points,
			),
			svg: (window as any).scatterStudio.svg(512),
		}));
		expect(after.points).not.toEqual(before);
		expect(after.svg).toContain("<title>Crater sphere</title>");
	}
	const html = await page.evaluate(() => (window as any).scatterStudio.html());
	const embedded = await context.newPage();
	await embedded.route("**/paused.html", (r) =>
		r.fulfill({ contentType: "text/html", body: html }),
	);
	await embedded.goto("/paused.html");
	await embedded.waitForFunction(() => !!(window as any).scatter);
	const result = await embedded.evaluate(() => {
		const p = (window as any).scatter;
		p.update({ playing: false, drift: 0 });
		p.select(0);
		const before = Array.from(p.snapshot(128).points);
		p.select(1);
		return { before, after: Array.from(p.snapshot(128).points) };
	});
	expect(result.after).not.toEqual(result.before);
	await embedded.close();
});

test("keyboard controls orbit and zoom without switching the focused picture", async ({
	page,
}) => {
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	const before = await page.evaluate(() => {
		const p = (window as any).scatterStudio.player;
		return {
			index: p.current,
			yaw: p.settings.yaw,
			pitch: p.settings.pitch,
			zoom: p.settings.zoom,
			points: Array.from(p.snapshot(256).points),
		};
	});
	await page.locator("#field canvas").focus();
	await page.keyboard.press("ArrowRight");
	await page.keyboard.press("ArrowUp");
	await page.keyboard.press("+");
	const after = await page.evaluate(() => {
		const p = (window as any).scatterStudio.player;
		return {
			index: p.current,
			yaw: p.settings.yaw,
			pitch: p.settings.pitch,
			zoom: p.settings.zoom,
			points: Array.from(p.snapshot(256).points),
		};
	});
	expect(after.index).toBe(before.index);
	expect(after.yaw).not.toBe(before.yaw);
	expect(after.pitch).not.toBe(before.pitch);
	expect(after.zoom).not.toBe(before.zoom);
	expect(after.points).not.toEqual(before.points);
	await page.keyboard.press("0");
	expect(
		await page.evaluate(
			() => (window as any).scatterStudio.player.settings.zoom,
		),
	).toBe(1);
});

test("mobile upload, live preview during edits and separate removal targets", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	await expect(page.locator("#mobile-load-images")).toBeVisible();
	const chooserPromise = page.waitForEvent("filechooser");
	await page.locator("#mobile-load-images").click();
	const chooser = await chooserPromise;
	await chooser.setFiles(resolve("tests/fixtures/depth-study.png"));
	await expect(page.locator("#artwork-name")).toHaveText("depth-study");
	await page.locator("#depth").scrollIntoViewIfNeeded();
	await page.locator("#depth").fill("25");
	const during = await page.evaluate(() => {
		const r = document.querySelector("#stage")!.getBoundingClientRect(),
			c = document.querySelector("#depth")!.getBoundingClientRect();
		return {
			stageTop: r.top,
			stageBottom: r.bottom,
			stageHeight: r.height,
			controlY: c.top,
			width: innerWidth,
		};
	});
	expect(during.stageTop).toBeGreaterThanOrEqual(60);
	expect(during.stageBottom).toBeLessThan(450);
	expect(during.stageHeight).toBeGreaterThan(200);
	expect(during.controlY).toBeGreaterThan(during.stageBottom);
	await page
		.locator("#line-pad")
		.evaluate((e) => e.scrollIntoView({ block: "end" }));
	const pad = await page.locator("#line-centre").boundingBox();
	const before = await page.evaluate(
		() => (window as any).scatterStudio.player.settings.line.x,
	);
	await page.mouse.move(pad!.x + pad!.width / 2, pad!.y + pad!.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		pad!.x + pad!.width / 2 + 10,
		pad!.y + pad!.height / 2 + 5,
	);
	await page.mouse.up();
	expect(
		await page.evaluate(
			() => (window as any).scatterStudio.player.settings.line.x,
		),
	).not.toBe(before);
	await page.screenshot({ path: ".impeccable/review/mobile-controls.png" });
	await page.locator(".images").scrollIntoViewIfNeeded();
	const remove = await page.locator(".remove-image").first().boundingBox(),
		select = await page.locator(".image-select").first().boundingBox();
	expect(remove!.width).toBeGreaterThanOrEqual(24);
	expect(remove!.height).toBeGreaterThanOrEqual(24);
	expect(remove!.y).toBeGreaterThanOrEqual(select!.y + select!.height);
});

test("depth failure retains the actual source and cancelling a stalled worker releases uploads", async ({
	page,
}) => {
	await page.addInitScript(() => {
		class WorkerStub {
			onmessage: any;
			onerror: any;
			constructor() {
				(window as any).qaWorker = this;
			}
			postMessage(message: any) {
				(window as any).qaDepthId = message.id;
			}
			terminate() {
				(window as any).qaTerminated = true;
			}
		}
		(window as any).Worker = WorkerStub;
	});
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	await page
		.locator("#file-images")
		.setInputFiles(resolve("tests/fixtures/depth-study.png"));
	await expect(page.locator("#artwork-name")).toHaveText("depth-study");
	await page.locator("#estimate-depth").click();
	await expect(page.locator("#cancel-depth")).toBeVisible();
	await page.evaluate(() =>
		(window as any).qaWorker.onmessage({
			data: { type: "error", id: 1, error: "Simulated failed download" },
		}),
	);
	await expect(page.locator("#model-status")).toContainText(
		"brightness relief",
	);
	await page
		.locator("#file-depth")
		.setInputFiles(resolve("tests/fixtures/depth-study.png"));
	await expect(page.locator("#depth-kind")).toHaveText("Imported depth map");
	await page.locator("#estimate-depth").click();
	await page.evaluate(() =>
		(window as any).qaWorker.onmessage({
			data: { type: "error", id: 2, error: "Simulated failed download" },
		}),
	);
	await expect(page.locator("#model-status")).toContainText(
		"imported depth map",
	);
	await expect(page.locator("#depth-kind")).toHaveText("Imported depth map");
	await page.locator("#estimate-depth").click();
	await page.waitForFunction(() => (window as any).qaDepthId === 3);
	await page.evaluate(() =>
		(window as any).qaWorker.onmessage({
			data: {
				type: "depth",
				id: 3,
				data: new Float32Array([0, 0.4, 0.7, 1]),
				width: 2,
				height: 2,
			},
		}),
	);
	await expect(page.locator("#depth-kind")).toHaveText("Depth Anything V2");
	await page.locator("#estimate-depth").click();
	await page.waitForFunction(() => (window as any).qaDepthId === 4);
	await page.evaluate(() =>
		(window as any).qaWorker.onmessage({
			data: { type: "error", id: 4, error: "Simulated retry failure" },
		}),
	);
	await expect(page.locator("#model-status")).toContainText(
		"depth Anything V2",
	);
	await expect(page.locator("#depth-kind")).toHaveText("Depth Anything V2");
	await page.locator("#estimate-depth").click();
	await expect(page.locator("#cancel-depth")).toBeVisible();
	await page.locator("#cancel-depth").click();
	await expect(page.locator("#model-status")).toContainText("cancelled");
	expect(await page.evaluate(() => (window as any).qaTerminated)).toBe(true);
	await expect(page.locator("#estimate-depth")).toBeEnabled();
	await page
		.locator("#file-images")
		.setInputFiles(resolve("tests/fixtures/depth-study.png"));
	await expect(page.locator("#slot-count")).toHaveText("2 / 4");
	await page.locator("#estimate-depth").click();
	await expect(page.locator("#cancel-depth")).toBeVisible();
	await page.locator("#cancel-depth").click();
});

test("cancelling while preparing pixels cannot restart the depth job", async ({
	page,
}) => {
	await page.addInitScript(() => {
		class WorkerStub {
			onmessage: any;
			onerror: any;
			postMessage() {
				(window as any).qaDepthPosted = true;
			}
			terminate() {
				(window as any).qaDepthTerminated = true;
			}
		}
		(window as any).Worker = WorkerStub;
	});
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	await page
		.locator("#file-images")
		.setInputFiles(resolve("tests/fixtures/depth-study.png"));
	await expect(page.locator("#artwork-name")).toHaveText("depth-study");
	await page.evaluate(() => {
		const original = window.createImageBitmap.bind(window);
		(window as any).createImageBitmap = async (...args: any[]) => {
			await new Promise<void>((resolve) => {
				(window as any).qaResumePixels = resolve;
			});
			return (original as any)(...args);
		};
	});
	await page.locator("#estimate-depth").click();
	await page.waitForFunction(() => !!(window as any).qaResumePixels);
	await page.locator("#cancel-depth").click();
	await page.evaluate(() => (window as any).qaResumePixels());
	await expect(page.locator("#estimate-depth")).toBeEnabled();
	await expect(page.locator("#cancel-depth")).toBeHidden();
	await expect(page.locator("#model-status")).toContainText("cancelled");
	expect(await page.evaluate(() => !!(window as any).qaDepthPosted)).toBe(
		false,
	);
	expect(await page.evaluate(() => (window as any).qaDepthTerminated)).toBe(
		true,
	);
});

test("a stalled depth job times out and allows another upload", async ({
	page,
}) => {
	await page.addInitScript(() => {
		class WorkerStub {
			onmessage: any;
			onerror: any;
			postMessage() {
				(window as any).qaDepthStarted = true;
			}
			terminate() {
				(window as any).qaDepthTerminated = true;
			}
		}
		(window as any).Worker = WorkerStub;
	});
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	await page
		.locator("#file-images")
		.setInputFiles(resolve("tests/fixtures/depth-study.png"));
	await expect(page.locator("#artwork-name")).toHaveText("depth-study");
	await page.clock.install();
	await page.locator("#estimate-depth").click();
	await page.waitForFunction(() => !!(window as any).qaDepthStarted);
	await page.clock.fastForward(90001);
	await expect(page.locator("#model-status")).toContainText("timed out");
	await expect(page.locator("#estimate-depth")).toBeEnabled();
	await expect(page.locator("#cancel-depth")).toBeHidden();
	expect(await page.evaluate(() => (window as any).qaDepthTerminated)).toBe(
		true,
	);
	await page
		.locator("#file-images")
		.setInputFiles(resolve("tests/fixtures/depth-study.png"));
	await expect(page.locator("#slot-count")).toHaveText("2 / 4");
});
