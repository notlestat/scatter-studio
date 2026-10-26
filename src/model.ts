import type { Cloud, Project, SerializedCloud, Settings } from "./types.ts";
export const BASE_COUNT = 65536;
export const defaults = (): Settings => ({
	drift: 36,
	splash: 68,
	gather: 45,
	depth: 65,
	size: 1.35,
	count: 131072,
	travel: "swarm",
	paper: "dark",
	negative: false,
	monochrome: false,
	ink: "#d5e868",
	light: "#d5e868",
	dense: false,
	draw: { track: true, links: true, scan: false, trails: false, marks: true },
	line: { x: 0.18, y: 0, angle: 1.8, side: -1 },
	yaw: -0.16,
	pitch: 0.08,
	zoom: 1,
	playing: true,
});
export function random(seed: number) {
	return () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
}
export function spatialOrder(input: Float32Array): Float32Array {
	const spread = (v: number) => {
		v = (v | (v << 4)) & 0x0f0f;
		v = (v | (v << 2)) & 0x3333;
		return (v | (v << 1)) & 0x5555;
	};
	const count = input.length / 7,
		keys = new Uint32Array(count),
		indices = Array.from({ length: count }, (_, i) => i);
	for (let i = 0; i < count; i++) {
		const x = Math.max(
				0,
				Math.min(255, Math.floor((input[i * 7] + 1) * 127.5)),
			),
			y = Math.max(
				0,
				Math.min(255, Math.floor((input[i * 7 + 1] + 1) * 127.5)),
			);
		keys[i] = spread(x) | (spread(y) << 1);
	}
	indices.sort((a, b) => keys[a] - keys[b]);
	const out = new Float32Array(input.length);
	indices.forEach((index, i) =>
		out.set(input.subarray(index * 7, index * 7 + 7), i * 7),
	);
	return out;
}
export function createDemo(kind: number): Cloud {
	const rng = random(197 + kind),
		data = new Float32Array(BASE_COUNT * 7);
	for (let i = 0; i < BASE_COUNT; i++) {
		const u = rng() * Math.PI * 2,
			v = rng() * Math.PI * 2;
		let x = 0,
			y = 0,
			z = 0,
			bright = 0.7;
		if (kind === 0) {
			const ring = 0.57 + 0.18 * Math.cos(v),
				twist = 0.35 * Math.sin(u * 3);
			x = ring * Math.cos(u);
			y = ring * Math.sin(u);
			z = 0.2 * Math.sin(v) + twist;
			const a = 0.6;
			[y, z] = [
				y * Math.cos(a) - z * Math.sin(a),
				y * Math.sin(a) + z * Math.cos(a),
			];
			bright = 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(v + u));
		} else if (kind === 1) {
			const q = 2 * rng() - 1,
				r = Math.sqrt(1 - q * q),
				wrinkle = 1 + 0.08 * Math.sin(u * 7 + q * 12);
			x = 0.67 * r * Math.cos(u) * wrinkle;
			y = 0.67 * q;
			z = 0.67 * r * Math.sin(u) * wrinkle;
			bright = 0.25 + 0.75 * (z / 0.8 + 0.6);
		} else if (kind === 2) {
			x = rng() * 1.5 - 0.75;
			y = rng() * 1.35 - 0.675;
			z = 0.22 * Math.sin(x * 8 + y * 4) + 0.12 * Math.cos(y * 10);
			bright = 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(x * 8 + y * 4));
		} else {
			const radius = 0.35 + 0.25 * Math.cos(u * 5);
			x = radius * Math.cos(u);
			y = radius * Math.sin(u);
			z = 0.32 * Math.sin(u * 3) + 0.1 * Math.sin(v);
			x += 0.055 * Math.cos(v);
			y += 0.055 * Math.sin(v);
			bright = 0.5 + 0.5 * rng();
		}
		const o = i * 7;
		data.set(
			[
				x + (rng() - 0.5) * 0.006,
				y + (rng() - 0.5) * 0.006,
				z,
				0.58 * bright + 0.25,
				0.68 * bright + 0.23,
				0.72 * bright + 0.22,
				0.52 + rng() * 0.48,
			],
			o,
		);
	}
	return {
		name: ["Folded torus", "Crater sphere", "Wave study", "Fivefold"][kind],
		data: spatialOrder(data),
		depthKind: "Procedural 3D",
		demo: true,
	};
}
export function pack(data: Float32Array): string {
	const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
	let binary = "";
	for (let i = 0; i < bytes.length; i += 16384)
		binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
	return btoa(binary);
}
export function unpack(encoded: string): Float32Array {
	if (typeof encoded !== "string" || encoded.length > 4_000_000)
		throw Error("Invalid point data.");
	const binary = atob(encoded),
		bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	if (bytes.length !== BASE_COUNT * 7 * 4)
		throw Error("This project has an unsupported point count.");
	const data = new Float32Array(bytes.buffer);
	for (let i = 0; i < data.length; i++)
		if (!Number.isFinite(data[i]) || Math.abs(data[i]) > 10)
			throw Error("The project contains invalid point values.");
	return data;
}
export const serializeCloud = (cloud: Cloud): SerializedCloud => ({
	...cloud,
	data: pack(cloud.data),
});
export const project = (
	clouds: Cloud[],
	settings: Settings,
	current: number,
): Project => ({
	format: "scatter-project",
	version: 1,
	settings: structuredClone(settings),
	current,
	clouds: clouds.map(serializeCloud),
});
export function validateProject(input: unknown): {
	clouds: Cloud[];
	settings: Settings;
	current: number;
} {
	const p = input as Project;
	if (
		!p ||
		p.format !== "scatter-project" ||
		p.version !== 1 ||
		!Array.isArray(p.clouds) ||
		!p.clouds.length ||
		p.clouds.length > 4
	)
		throw Error(
			"Choose a Scatter .json project containing one to four pictures.",
		);
	const s = defaults(),
		v = p.settings;
	if (!v || typeof v !== "object") throw Error("Project settings are missing.");
	for (const k of ["drift", "splash", "gather", "depth"] as const)
		if (typeof v[k] === "number" && Number.isFinite(v[k]))
			s[k] = Math.max(0, Math.min(100, v[k]));
	for (const [k, lo, hi] of [
		["size", 0.4, 4],
		["yaw", -10, 10],
		["pitch", -1.4, 1.4],
		["zoom", 0.3, 3],
	] as const)
		if (Number.isFinite(v[k])) s[k] = Math.max(lo, Math.min(hi, v[k]));
	if ([32768, 65536, 131072, 262144, 524288].includes(v.count))
		s.count = v.count;
	if (["swarm", "melt"].includes(v.travel)) s.travel = v.travel;
	if (["dark", "light"].includes(v.paper)) s.paper = v.paper;
	for (const k of ["negative", "monochrome", "dense", "playing"] as const)
		if (typeof v[k] === "boolean") s[k] = v[k];
	for (const k of ["ink", "light"] as const)
		if (/^#[\da-f]{6}$/i.test(v[k])) s[k] = v[k];
	for (const k of ["track", "links", "scan", "trails", "marks"] as const)
		if (typeof v.draw?.[k] === "boolean") s.draw[k] = v.draw[k];
	if (
		v.line &&
		["x", "y", "angle", "side"].every((k) =>
			Number.isFinite(v.line[k as keyof typeof v.line]),
		)
	)
		s.line = {
			x: Math.max(-1, Math.min(1, v.line.x)),
			y: Math.max(-1, Math.min(1, v.line.y)),
			angle: v.line.angle,
			side: v.line.side < 0 ? -1 : 1,
		};
	return {
		settings: s,
		current: Number.isInteger(p.current)
			? Math.max(0, Math.min(p.clouds.length - 1, p.current))
			: 0,
		clouds: p.clouds.map((c) => ({
			name: String(c.name).slice(0, 80),
			depthKind: String(c.depthKind).slice(0, 50),
			demo: !!c.demo,
			data: unpack(c.data),
			preview:
				typeof c.preview === "string" &&
				/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(c.preview) &&
				c.preview.length < 2_000_000
					? c.preview
					: undefined,
			source:
				typeof c.source === "string" &&
				/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(c.source) &&
				c.source.length < 3_000_000
					? c.source
					: undefined,
		})),
	};
}
