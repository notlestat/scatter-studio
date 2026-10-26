import { defineConfig } from "vite";
export default defineConfig({
	build: {
		emptyOutDir: false,
		lib: {
			entry: "src/embed.ts",
			name: "Scatter",
			formats: ["iife"],
			fileName: () => "scatter.js",
		},
		target: "es2022",
	},
});
