export type Overlay = "track" | "links" | "scan" | "trails" | "marks";
export type Settings = {
	drift: number;
	splash: number;
	gather: number;
	depth: number;
	size: number;
	count: number;
	travel: "swarm" | "melt";
	paper: "dark" | "light";
	negative: boolean;
	monochrome: boolean;
	ink: string;
	light: string;
	dense: boolean;
	draw: Record<Overlay, boolean>;
	line: { x: number; y: number; angle: number; side: number };
	yaw: number;
	pitch: number;
	zoom: number;
	playing: boolean;
};
export type Cloud = {
	name: string;
	data: Float32Array;
	preview?: string;
	source?: string;
	depthKind: string;
	demo: boolean;
};
export type SerializedCloud = Omit<Cloud, "data"> & { data: string };
export type Project = {
	format: "scatter-project";
	version: 1;
	settings: Settings;
	current: number;
	clouds: SerializedCloud[];
};
export type Frame = {
	width: number;
	height: number;
	time: number;
	points: Float32Array;
	trails?: Float32Array;
	overlays: string;
};
