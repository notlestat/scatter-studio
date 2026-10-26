import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
test("real ONNX model estimates image depth locally", async ({ page }) => {
	test.setTimeout(100000);
	const requests: Array<{ url: string; method: string; type: string }> = [];
	const errors: string[] = [];
	page.on("request", (r) =>
		requests.push({ url: r.url(), method: r.method(), type: r.resourceType() }),
	);
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("/");
	await page.waitForFunction(() => !!(window as any).scatterStudio);
	await page
		.locator("#file-images")
		.setInputFiles(resolve("tests/fixtures/depth-study.png"));
	await expect(page.locator("#artwork-name")).toHaveText("depth-study");
	await page.locator("#estimate-depth").click();
	try {
		await expect(page.locator("#model-status")).toContainText(
			/processed on your device|unavailable|could not start/,
			{ timeout: 85000 },
		);
	} finally {
		await writeFile(
			"artifacts/depth-debug.json",
			JSON.stringify(
				{
					status: await page.locator("#model-status").textContent(),
					requests,
					errors,
				},
				null,
				2,
			),
		);
	}
	const result = {
		status: await page.locator("#model-status").textContent(),
		kind: await page.locator("#depth-kind").textContent(),
		requests,
		errors,
	};
	await writeFile(
		"artifacts/depth-results.json",
		JSON.stringify(result, null, 2),
	);
	expect(result.status).toContain("processed on your device");
	expect(result.kind).toBe("Depth Anything V2");
	expect(
		requests.filter(
			(r) => !r.url.startsWith("http://localhost:5173") && r.method !== "GET",
		),
	).toEqual([]);
	expect(errors).toEqual([]);
});
