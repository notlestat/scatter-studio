/// <reference lib="webworker" />
import * as ort from "onnxruntime-web/wasm";
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths =
	"https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/";
let session: Promise<ort.InferenceSession> | undefined;
const MODEL =
	"https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/4472b7362082ad9968fee890ca0f1e5aca36b93d/onnx/model_quantized.onnx";
async function init() {
	self.postMessage({ type: "status", text: "Downloading depth model…" });
	const response = await fetch(MODEL);
	if (!response.ok) throw Error("Depth model download failed.");
	const bytes = await response.arrayBuffer();
	self.postMessage({ type: "status", text: "Starting local depth model…" });
	return ort.InferenceSession.create(bytes, {
		executionProviders: ["wasm"],
		graphOptimizationLevel: "all",
	});
}
let queue = Promise.resolve();
self.onmessage = (
	event: MessageEvent<{
		id: number;
		pixels: Uint8ClampedArray;
		width: number;
		height: number;
	}>,
) => {
	queue = queue.then(async () => {
		const { id, pixels, width, height } = event.data;
		try {
			session ??= init().catch((e) => {
				session = undefined;
				throw e;
			});
			const model = await session;
			const n = width * height,
				input = new Float32Array(n * 3),
				means = [0.485, 0.456, 0.406],
				std = [0.229, 0.224, 0.225];
			for (let c = 0; c < 3; c++)
				for (let i = 0; i < n; i++)
					input[c * n + i] = (pixels[i * 4 + c] / 255 - means[c]) / std[c];
			self.postMessage({ type: "status", text: "Estimating picture depth…" });
			const result = await model.run({
				[model.inputNames[0]]: new ort.Tensor("float32", input, [
					1,
					3,
					height,
					width,
				]),
			});
			const tensor = result[model.outputNames[0]],
				data = new Float32Array(tensor.data as Float32Array);
			self.postMessage(
				{
					type: "depth",
					id,
					data,
					width: tensor.dims[tensor.dims.length - 1],
					height: tensor.dims[tensor.dims.length - 2],
				},
				[data.buffer],
			);
		} catch (e) {
			self.postMessage({
				type: "error",
				id,
				error: e instanceof Error ? e.message : String(e),
			});
		}
	});
};
