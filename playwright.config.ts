import { defineConfig } from "@playwright/test";
export default defineConfig({
	testDir: "tests/browser",
	timeout: 90000,
	workers: 1,
	use: {
		baseURL: process.env.SCATTER_URL || "http://localhost:5173",
		browserName: "chromium",
		launchOptions: {
			executablePath:
				"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		},
		viewport: { width: 1440, height: 1000 },
		reducedMotion: "reduce",
		acceptDownloads: true,
	},
	reporter: [
		["list"],
		["json", { outputFile: "artifacts/browser-results.json" }],
	],
});
