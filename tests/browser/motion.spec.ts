import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
test("motion, pause, camera, highest density and responsive embeds", async ({
	page,
	context,
}) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	const before = await page.evaluate(() => {
		const p = (window as any).scatterStudio.player;
		return { time: p.time, points: Array.from(p.snapshot(1024).points) };
	});
	await page.waitForTimeout(350);
	const after = await page.evaluate(() => {
		const p = (window as any).scatterStudio.player;
		return { time: p.time, points: Array.from(p.snapshot(1024).points) };
	});
	expect(after.time).toBeGreaterThan(before.time + 0.1);
	expect(after.points).not.toEqual(before.points);
	await page.locator("#play").click();
	const frozen = await page.evaluate(
		() => (window as any).scatterStudio.player.time,
	);
	await page.waitForTimeout(120);
	expect(
		await page.evaluate(() => (window as any).scatterStudio.player.time),
	).toBe(frozen);
	const box = await page.locator("#field canvas").boundingBox();
	expect(box).toBeTruthy();
	await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		box!.x + box!.width / 2 + 60,
		box!.y + box!.height / 2 + 20,
	);
	await page.mouse.up();
	expect(
		await page.evaluate(
			() => (window as any).scatterStudio.player.settings.yaw,
		),
	).not.toBe(-0.16);
	await page.mouse.wheel(0, 100);
	await page.waitForTimeout(100);
	expect(
		await page.evaluate(
			() => (window as any).scatterStudio.player.settings.zoom,
		),
	).not.toBe(1);
	await page.locator("#density").selectOption("524288");
	const full = await page.evaluate(() => {
		const p = (window as any).scatterStudio.player;
		return {
			count: p.snapshot(524288).points.length / 8,
			error: p.canvas.getContext("webgl2").getError(),
		};
	});
	expect(full.count).toBe(524288);
	expect(full.error).toBe(0);
	await page.locator("#density").selectOption("32768");
	await page.locator("#play").click();
	await page.locator('[data-travel="melt"]').click();
	await page.locator("#next").click();
	await page.waitForTimeout(250);
	await page.locator("#next").click();
	await page.waitForTimeout(250);
	expect(
		await page.evaluate(() =>
			(window as any).scatterStudio.player.canvas
				.getContext("webgl2")
				.getError(),
		),
	).toBe(0);
	const html = await page.evaluate(() => (window as any).scatterStudio.html());
	const embedded = await context.newPage();
	await embedded.route("**/qa-motion.html", (route) =>
		route.fulfill({ contentType: "text/html", body: html }),
	);
	await embedded.emulateMedia({ reducedMotion: "reduce" });
	await embedded.setViewportSize({ width: 390, height: 600 });
	await embedded.goto("/qa-motion.html");
	await embedded.waitForFunction(() => !!(window as any).scatter);
	const t = await embedded.evaluate(() => (window as any).scatter.time);
	await embedded.waitForTimeout(180);
	expect(await embedded.evaluate(() => (window as any).scatter.time)).toBe(t);
	expect(
		await embedded.evaluate(() => document.documentElement.scrollWidth),
	).toBe(390);
	await embedded.close();
});

test("interrupted transitions keep the current in-flight homes", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	const result = await page.evaluate(() => {
		const p = (window as any).scatterStudio.player;
		p.update({ count: 65536, drift: 0 });
		p.select(1);
		p.setTime(p.time + 0.7);
		const before = p.snapshot(65536).points;
		p.select(2);
		const after = p.snapshot(65536).points;
		let max = 0;
		for (let i = 0; i < before.length; i += 8)
			max = Math.max(
				max,
				Math.hypot(before[i] - after[i], before[i + 1] - after[i + 1]),
			);
		return { max, error: p.canvas.getContext("webgl2").getError() };
	});
	expect(result.max).toBeLessThan(0.02);
	expect(result.error).toBe(0);
});
