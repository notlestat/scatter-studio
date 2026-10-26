import { BASE_COUNT, random, spatialOrder } from "./model.ts";
import type { Cloud } from "./types.ts";
export type ImageSource = {
	width: number;
	height: number;
	pixels: Uint8ClampedArray;
	source: string;
	preview: string;
};
export async function readImage(file: File): Promise<ImageSource> {
	if (file.size > 30 * 1024 * 1024)
		throw Error("This picture is over 30 MB. Try a smaller JPEG, PNG or WebP.");
	if (!/^image\/(png|jpeg|webp|avif|bmp|gif)$/.test(file.type))
		throw Error("Choose a JPEG, PNG, WebP, AVIF, BMP or GIF picture.");
	const bitmap = await createImageBitmap(file);
	try {
		if (bitmap.width * bitmap.height > 64_000_000)
			throw Error("This picture exceeds 64 megapixels. Resize it first.");
		const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale)),
			height = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
		ctx.drawImage(bitmap, 0, 0, width, height);
		const pixels = ctx.getImageData(0, 0, width, height).data;
		const source = canvas.toDataURL("image/png");
		const thumb = document.createElement("canvas");
		thumb.width = thumb.height = 96;
		const t = thumb.getContext("2d")!;
		t.fillStyle = "#181b1a";
		t.fillRect(0, 0, 96, 96);
		const fit = 96 / Math.max(width, height);
		t.drawImage(
			canvas,
			(96 - width * fit) / 2,
			(96 - height * fit) / 2,
			width * fit,
			height * fit,
		);
		return {
			width,
			height,
			pixels,
			source,
			preview: thumb.toDataURL("image/png"),
		};
	} finally {
		bitmap.close();
	}
}
export function sampleImage(
	image: ImageSource,
	name: string,
	depth?: Float32Array,
	depthSize?: [number, number],
): Cloud {
	const { width, height, pixels } = image,
		n = width * height,
		brightness = new Float32Array(n),
		cdf = new Float64Array(n);
	let total = 0;
	for (let i = 0; i < n; i++)
		brightness[i] =
			(0.2126 * pixels[i * 4] +
				0.7152 * pixels[i * 4 + 1] +
				0.0722 * pixels[i * 4 + 2]) /
			255;
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const i = y * width + x,
				edge =
					Math.abs(brightness[i] - brightness[y * width + Math.max(0, x - 1)]) +
					Math.abs(brightness[i] - brightness[Math.max(0, y - 1) * width + x]);
			total +=
				(0.065 + brightness[i] * 0.7 + Math.min(1, edge * 3)) *
				(pixels[i * 4 + 3] / 255);
			cdf[i] = total;
		}
	if (total < 0.001)
		throw Error(
			"This image is fully transparent. Choose a picture with visible pixels.",
		);
	const data = new Float32Array(BASE_COUNT * 7),
		rng = random(8917),
		aspect = width / height;
	let dMin = Infinity,
		dMax = -Infinity;
	if (depth)
		for (const d of depth) {
			if (Number.isFinite(d)) {
				dMin = Math.min(dMin, d);
				dMax = Math.max(dMax, d);
			}
		}
	for (let i = 0; i < BASE_COUNT; i++) {
		const target = ((i + rng()) / BASE_COUNT) * total;
		let lo = 0,
			hi = n - 1;
		while (lo < hi) {
			const mid = (lo + hi) >>> 1;
			if (cdf[mid] < target) lo = mid + 1;
			else hi = mid;
		}
		const x = lo % width,
			y = Math.floor(lo / width),
			o = i * 7;
		let z = (brightness[lo] - 0.5) * 0.5;
		if (depth && depthSize) {
			const dx = Math.min(
					depthSize[0] - 1,
					Math.floor((x / width) * depthSize[0]),
				),
				dy = Math.min(
					depthSize[1] - 1,
					Math.floor((y / height) * depthSize[1]),
				);
			z =
				((depth[dy * depthSize[0] + dx] - dMin) / Math.max(1e-6, dMax - dMin) -
					0.5) *
				0.85;
		}
		data.set(
			[
				((x + rng()) / width - 0.5) * 1.65 * Math.min(1, aspect),
				(0.5 - (y + rng()) / height) * 1.65 * Math.min(1, 1 / aspect),
				z,
				pixels[lo * 4] / 255,
				pixels[lo * 4 + 1] / 255,
				pixels[lo * 4 + 2] / 255,
				0.4 + brightness[lo] * 0.6,
			],
			o,
		);
	}
	return {
		name,
		data: spatialOrder(data),
		preview: image.preview,
		source: image.source,
		demo: false,
		depthKind: depth ? "Depth Anything V2" : "Brightness relief",
	};
}
