import type { Cloud, Frame, Settings } from "./types.ts";

type PlayerOptions = {
	clouds: Array<Omit<Cloud, "data"> & { data: Float32Array | string }>;
	settings: Settings;
	current?: number;
	interactive?: boolean;
	autoCycle?: boolean;
	onSelect?: (index: number) => void;
};

// Keep this function self-contained. Exported HTML serializes this exact player.
export function createScatterPlayer(host: HTMLElement, options: PlayerOptions) {
	const settings = structuredClone(options.settings);
	let clouds = options.clouds.map((c) => ({
		...c,
		data: typeof c.data === "string" ? decode(c.data) : c.data,
	}));
	let current = Math.min(clouds.length - 1, Math.max(0, options.current ?? 0)),
		previous = current;
	let start = -100,
		clock = 0,
		raf = 0,
		last = performance.now(),
		disposed = false,
		visible = true,
		cycle = 0,
		exporting = false;
	let sourceOverride: Float32Array | undefined;
	const reduce = matchMedia("(prefers-reduced-motion: reduce)");
	const root = document.createElement("div");
	root.style.cssText =
		"position:relative;width:100%;height:100%;overflow:hidden;";
	const canvas = document.createElement("canvas");
	canvas.style.cssText =
		"display:block;width:100%;height:100%;touch-action:none;cursor:grab;outline-offset:-4px;";
	canvas.tabIndex = 0;
	canvas.setAttribute(
		"aria-label",
		"Interactive point field. Drag or use arrow keys to orbit. Scroll, pinch or press plus and minus to zoom. Press 0 or double-click to reset. Space switches picture, S lights it.",
	);
	const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	overlay.setAttribute("aria-hidden", "true");
	overlay.style.cssText =
		"position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
	root.append(canvas, overlay);
	host.append(root);
	const gl = canvas.getContext("webgl2", {
		alpha: false,
		antialias: false,
		preserveDrawingBuffer: true,
		powerPreference: "high-performance",
	});
	if (!gl) {
		root.remove();
		throw Error(
			"WebGL 2 is unavailable. Enable hardware acceleration or try another browser.",
		);
	}
	const gpu = gl;
	const vertex = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uFrom,uTo,uFromColor,uToColor;
uniform float uTime,uProgress,uDrift,uSplash,uDepth,uSize,uZoom,uYaw,uPitch,uDpr;
uniform vec2 uResolution,uPointer;
uniform vec4 uLine;
uniform vec4 uLamps[3];
uniform vec3 uLightColor,uInk;
uniform int uSwarm,uLight,uNegative,uMono,uStride,uTrail,uCaptureHome;
out vec4 capturePoint;
out vec4 captureColor;
float hash(float n){return fract(sin(n*127.1+311.7)*43758.5453);}
float ease(float t){return t*t*(3.0-2.0*t);}
void main(){
 int vertexId=gl_VertexID;
 int logicalId=(uTrail==1?vertexId/2:vertexId)*uStride;
 int srcId=logicalId%65536;
 int dstId=uSwarm==1?((srcId*40503+2389)%65536):srcId;
 ivec2 a=ivec2(srcId%256,srcId/256),b=ivec2(dstId%256,dstId/256);
 vec4 from=texelFetch(uFrom,a,0),to=texelFetch(uTo,b,0);
 vec4 colorA=texelFetch(uFromColor,a,0),colorB=texelFetch(uToColor,b,0);
 float h=hash(float(logicalId)+1.0),h2=hash(float(logicalId)+72.0),h3=hash(float(logicalId)+278.0);
 float t=uTime-(uTrail==1?float(vertexId%2)*0.065:0.0);
 float delay=uSwarm==1?h*.22:clamp(from.z+.5,0.0,1.0)*.25;
 float mixValue=ease(clamp((uProgress-delay)/(1.0-delay),0.0,1.0));
 vec3 p=mix(from.xyz,to.xyz,mixValue);
 float arc=sin(mixValue*3.14159265)*uSplash;
 p+=vec3(h-.5,h2-.5,h3-.5)*arc*(uSwarm==1?1.4:.25);
 vec3 home=p;
 p.xy+=vec2(h-.5,h2-.5)*.004;
 p.z*=uDepth;
 float signedDistance=dot(p.xy-uLine.xy,vec2(-sin(uLine.z),cos(uLine.z)))*uLine.w;
 float release=smoothstep(-.08,.78,signedDistance)*uDrift;
 float phase=fract(t*(.1+h*.12)+h2);
 float depart=smoothstep(.32,1.0,phase);
 vec2 wind=vec2(-sin(uLine.z),cos(uLine.z))*uLine.w;
 p.xy+=wind*depart*depart*release*1.35;
 p+=vec3(sin(p.y*5.0+t+h*6.0),cos(p.x*4.0-t+h2*6.0),sin(t+p.x*6.0))*release*depart*.11;
 p.z+=(h3-.5)*release*depart*.65;
 p+=vec3(sin(t*.32+h*6.0),cos(t*.26+h2*6.0),sin(t*.3+h3*6.0))*.002;
 vec3 c=mix(colorA.rgb,colorB.rgb,mixValue);
 float lum=dot(c,vec3(.2126,.7152,.0722));
 if(uNegative==1)c=1.0-c;
 if(uMono==1)c=uInk*(.45+.55*lum);
 float alpha=mix(colorA.a,colorB.a,mixValue)*(.82-.57*release*depart);
 for(int j=0;j<3;j++){
  float light=exp(-dot(p-uLamps[j].xyz,p-uLamps[j].xyz)*4.5)*uLamps[j].w;
  c=mix(c,uLightColor,clamp(light*.85,0.0,.9));alpha+=light*.2;
 }
 float cy=cos(uYaw),sy=sin(uYaw),cx=cos(uPitch),sx=sin(uPitch);
 p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);
 p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);
 float perspective=2.7/(2.7-p.z),scale=min(uResolution.x,uResolution.y)*.52*uZoom;
 vec2 screen=vec2(uResolution.x*.5+p.x*scale*perspective,uResolution.y*.5-p.y*scale*perspective);
 vec2 wake=screen-uPointer;float distance=length(wake);
 if(distance>1.0&&distance<100.0)screen+=wake/distance*(1.0-distance/100.0)*18.0;
 float radius=uSize*clamp(perspective,.5,2.0);
 gl_Position=vec4(screen.x/uResolution.x*2.0-1.0,1.0-screen.y/uResolution.y*2.0,0.0,1.0);
 gl_PointSize=max(1.0,radius*uDpr*2.0);
 float tone=uLight==1?1.0-dot(c,vec3(.2126,.7152,.0722)):dot(c,vec3(.2126,.7152,.0722));
 alpha*=.18+.82*clamp(tone*1.4,0.0,1.0);
 capturePoint=uCaptureHome==1?vec4(home,1.0):vec4(screen,radius,p.z);
 captureColor=uCaptureHome==1?mix(colorA,colorB,mixValue):vec4(clamp(c,0.0,1.0),clamp(alpha*.63,0.0,.9));
}`;
	const fragment = `#version 300 es
precision highp float;
precision highp int;
in vec4 captureColor;
uniform int uTrail;
out vec4 outColor;
void main(){float coverage=uTrail==1?1.0:1.0-smoothstep(.35,.5,length(gl_PointCoord-.5));outColor=vec4(captureColor.rgb,captureColor.a*coverage*(uTrail==1?.16:1.0));}`;
	function shader(type: number, source: string) {
		const s = gpu.createShader(type)!;
		gpu.shaderSource(s, source);
		gpu.compileShader(s);
		if (!gpu.getShaderParameter(s, gpu.COMPILE_STATUS))
			throw Error(
				gpu.getShaderInfoLog(s) || "Could not compile point renderer.",
			);
		return s;
	}
	const vs = shader(gpu.VERTEX_SHADER, vertex),
		fs = shader(gpu.FRAGMENT_SHADER, fragment),
		program = gpu.createProgram()!;
	gpu.attachShader(program, vs);
	gpu.attachShader(program, fs);
	gpu.transformFeedbackVaryings(
		program,
		["capturePoint", "captureColor"],
		gpu.INTERLEAVED_ATTRIBS,
	);
	gpu.linkProgram(program);
	if (!gpu.getProgramParameter(program, gpu.LINK_STATUS))
		throw Error(gpu.getProgramInfoLog(program) || "Could not start renderer.");
	gpu.useProgram(program);
	gpu.enable(gpu.BLEND);
	gpu.blendFunc(gpu.SRC_ALPHA, gpu.ONE_MINUS_SRC_ALPHA);
	const locations = new Map<string, WebGLUniformLocation | null>();
	const loc = (n: string) => {
		if (!locations.has(n)) locations.set(n, gpu.getUniformLocation(program, n));
		return locations.get(n)!;
	};
	const textures = new Map<Float32Array, [WebGLTexture, WebGLTexture]>();
	const lamps = [
		{ x: 0, y: 0, z: 0, born: -100 },
		{ x: 0, y: 0, z: 0, born: -100 },
		{ x: 0, y: 0, z: 0, born: -100 },
	];
	let lampIndex = 0;
	let width = 1,
		height = 1,
		dpr = 1,
		lastOverlay = -1,
		overlayMarkup = "",
		overlayPoints = new Float32Array(),
		pointer = { x: -1000, y: -1000 };
	const tf = gpu.createTransformFeedback()!,
		captureBuffer = gpu.createBuffer()!;
	let captureCapacity = 0;
	function decode(value: string) {
		const s = atob(value);
		if (s.length !== 65536 * 7 * 4) throw Error("Unsupported point data.");
		const b = new Uint8Array(s.length);
		for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
		return new Float32Array(b.buffer);
	}
	function color(hex: string) {
		return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	}
	function texture(data: Float32Array) {
		const cached = textures.get(data);
		if (cached) return cached;
		const pos = new Float32Array(65536 * 4),
			col = new Float32Array(65536 * 4);
		for (let i = 0; i < 65536; i++) {
			const o = i * 7,
				p = i * 4;
			pos.set([data[o], data[o + 1], data[o + 2], 1], p);
			col.set([data[o + 3], data[o + 4], data[o + 5], data[o + 6]], p);
		}
		const result = [pos, col].map((array) => {
			const tex = gpu.createTexture()!;
			gpu.bindTexture(gpu.TEXTURE_2D, tex);
			gpu.texParameteri(gpu.TEXTURE_2D, gpu.TEXTURE_MIN_FILTER, gpu.NEAREST);
			gpu.texParameteri(gpu.TEXTURE_2D, gpu.TEXTURE_MAG_FILTER, gpu.NEAREST);
			gpu.texParameteri(gpu.TEXTURE_2D, gpu.TEXTURE_WRAP_S, gpu.CLAMP_TO_EDGE);
			gpu.texParameteri(gpu.TEXTURE_2D, gpu.TEXTURE_WRAP_T, gpu.CLAMP_TO_EDGE);
			gpu.texImage2D(
				gpu.TEXTURE_2D,
				0,
				gpu.RGBA32F,
				256,
				256,
				0,
				gpu.RGBA,
				gpu.FLOAT,
				array,
			);
			return tex;
		}) as [WebGLTexture, WebGLTexture];
		textures.set(data, result);
		return result;
	}
	function uniforms(stride = 1, trail = 0, homes = false) {
		gpu.useProgram(program);
		const from = texture(sourceOverride ?? clouds[previous].data),
			to = texture(clouds[current].data);
		[from[0], to[0], from[1], to[1]].forEach((tex, i) => {
			gpu.activeTexture(gpu.TEXTURE0 + i);
			gpu.bindTexture(gpu.TEXTURE_2D, tex);
		});
		["uFrom", "uTo", "uFromColor", "uToColor"].forEach((n, i) =>
			gpu.uniform1i(loc(n), i),
		);
		const duration = 0.55 + (1 - settings.gather / 100) * 3.8;
		for (const [n, value] of Object.entries({
			uTime: clock,
			uProgress: reduce.matches
				? 1
				: Math.min(1, Math.max(0, (clock - start) / duration)),
			uDrift: settings.drift / 100,
			uSplash: settings.splash / 100,
			uDepth: (settings.depth / 100) * 1.7,
			uSize: settings.size,
			uZoom: settings.zoom,
			uYaw: settings.yaw,
			uPitch: settings.pitch,
			uDpr: dpr,
		}))
			gpu.uniform1f(loc(n), value);
		gpu.uniform2f(loc("uResolution"), width, height);
		gpu.uniform2f(loc("uPointer"), pointer.x, pointer.y);
		gpu.uniform4f(
			loc("uLine"),
			settings.line.x,
			settings.line.y,
			settings.line.angle,
			settings.line.side,
		);
		for (const [n, value] of Object.entries({
			uSwarm: settings.travel === "swarm" ? 1 : 0,
			uLight: settings.paper === "light" ? 1 : 0,
			uNegative: settings.negative ? 1 : 0,
			uMono: settings.monochrome ? 1 : 0,
			uStride: stride,
			uTrail: trail,
			uCaptureHome: homes ? 1 : 0,
		}))
			gpu.uniform1i(loc(n), value);
		gpu.uniform3fv(loc("uLightColor"), color(settings.light));
		gpu.uniform3fv(loc("uInk"), color(settings.ink));
		lamps.forEach((l, i) =>
			gpu.uniform4f(
				loc("uLamps[" + i + "]"),
				l.x,
				l.y,
				l.z,
				Math.exp(-(clock - l.born) * 3.6) * 2.4,
			),
		);
	}
	function resize() {
		const r = host.getBoundingClientRect();
		width = Math.max(1, r.width);
		height = Math.max(1, r.height);
		dpr = Math.min(2, devicePixelRatio || 1);
		const w = Math.round(width * dpr),
			h = Math.round(height * dpr);
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
			gpu.viewport(0, 0, w, h);
		}
		overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
	}
	function capture(limit: number, trail = 0, homes = false) {
		const stride = homes ? 1 : Math.max(1, Math.ceil(settings.count / limit)),
			count = homes
				? 65536
				: Math.ceil(settings.count / stride) * (trail ? 2 : 1),
			size = count * 8 * 4;
		gpu.bindBuffer(gpu.ARRAY_BUFFER, captureBuffer);
		if (size > captureCapacity) {
			gpu.bufferData(gpu.ARRAY_BUFFER, size, gpu.DYNAMIC_READ);
			captureCapacity = size;
		}
		gpu.bindBuffer(gpu.ARRAY_BUFFER, null);
		uniforms(stride, trail, homes);
		gpu.bindTransformFeedback(gpu.TRANSFORM_FEEDBACK, tf);
		gpu.bindBufferBase(gpu.TRANSFORM_FEEDBACK_BUFFER, 0, captureBuffer);
		gpu.enable(gpu.RASTERIZER_DISCARD);
		gpu.beginTransformFeedback(gpu.POINTS);
		gpu.drawArrays(gpu.POINTS, 0, count);
		gpu.endTransformFeedback();
		gpu.disable(gpu.RASTERIZER_DISCARD);
		gpu.bindBufferBase(gpu.TRANSFORM_FEEDBACK_BUFFER, 0, null);
		gpu.bindTransformFeedback(gpu.TRANSFORM_FEEDBACK, null);
		const result = new Float32Array(count * 8);
		gpu.bindBuffer(gpu.ARRAY_BUFFER, captureBuffer);
		gpu.getBufferSubData(gpu.ARRAY_BUFFER, 0, result);
		gpu.bindBuffer(gpu.ARRAY_BUFFER, null);
		return result;
	}
	function overlays(points: Float32Array) {
		const lineColor = settings.paper === "dark" ? "#b7c2b6" : "#434a40",
			accent = settings.light;
		let out = "";
		const attrs = `fill="none" stroke="${lineColor}" stroke-width="0.65"`;
		const candidates: Array<{ x: number; y: number; z: number; id: number }> =
			[];
		for (let i = 0; i < points.length; i += 8)
			if (
				points[i] > 45 &&
				points[i] < width - 45 &&
				points[i + 1] > 55 &&
				points[i + 1] < height - 55 &&
				points[i + 7] > 0.13
			)
				candidates.push({
					x: points[i],
					y: points[i + 1],
					z: points[i + 3],
					id: i / 8,
				});
		candidates.sort((a, b) => b.z - a.z);
		const chosen: Array<{ x: number; y: number; z: number; id: number }> = [];
		for (const p of candidates) {
			if (
				chosen.every(
					(q) => Math.hypot(q.x - p.x, q.y - p.y) > (settings.dense ? 40 : 95),
				)
			)
				chosen.push(p);
			if (chosen.length >= (settings.dense ? 26 : 8)) break;
		}
		if (settings.draw.links)
			for (let i = 0; i < chosen.length; i++) {
				let nearest = -1,
					dist = Infinity;
				for (let j = i + 1; j < chosen.length; j++) {
					const d = Math.hypot(
						chosen[j].x - chosen[i].x,
						chosen[j].y - chosen[i].y,
					);
					if (d < dist) {
						dist = d;
						nearest = j;
					}
				}
				if (nearest >= 0 && dist < width * 0.35)
					out += `<path ${attrs} opacity=".28" d="M${chosen[i].x.toFixed(2)} ${chosen[i].y.toFixed(2)}L${chosen[nearest].x.toFixed(2)} ${chosen[nearest].y.toFixed(2)}"/>`;
			}
		if (settings.draw.track)
			chosen.forEach((p, i) => {
				const x = p.x,
					y = p.y,
					r = 7;
				out += `<path ${attrs} opacity=".85" d="M${x - r} ${y - r + 4}v-4h4m${2 * r - 8} 0h4v4m0 ${2 * r - 8}v4h-4m${-2 * r + 8} 0h-4v-4"/><text x="${x + 11}" y="${y - 9}" font-family="monospace" font-size="8" fill="${lineColor}" opacity=".85">${String(i + 1).padStart(2, "0")} / ${p.z.toFixed(2)}</text>`;
			});
		if (settings.draw.scan) {
			const y = height * (0.2 + 0.6 * ((Math.sin(clock * 0.6) + 1) / 2));
			out += `<path d="M32 ${y}H${width - 32}" stroke="${accent}" stroke-width="1" opacity=".6"/><text x="38" y="${y - 8}" font-family="monospace" font-size="9" fill="${lineColor}">DEPTH SCAN ${((y / height) * 100).toFixed(0)}%</text>`;
		}
		if (settings.draw.marks) {
			out += `<g ${attrs} opacity=".5"><path d="M32 58V32H58M${width - 58} 32h26v26M32 ${height - 58}v26h26M${width - 58} ${height - 32}h26v-26"/>`;
			for (let x = 82; x < width - 60; x += 40)
				out += `<path d="M${x} 32v4M${x} ${height - 32}v-4"/>`;
			out += "</g>";
		}
		return out;
	}
	function render() {
		if (disposed || !clouds.length || gpu.isContextLost()) return;
		resize();
		const bg =
			settings.paper === "dark" ? [0.065, 0.075, 0.07] : [0.932, 0.936, 0.91];
		gpu.clearColor(bg[0], bg[1], bg[2], 1);
		gpu.clear(gpu.COLOR_BUFFER_BIT);
		uniforms();
		gpu.drawArrays(gpu.POINTS, 0, settings.count);
		if (settings.draw.trails) {
			uniforms(5, 1);
			gpu.drawArrays(gpu.LINES, 0, Math.floor(settings.count / 5) * 2);
		}
		if (
			clock - lastOverlay > 0.09 ||
			lastOverlay < 0 ||
			!settings.playing ||
			reduce.matches
		) {
			overlayPoints = capture(320);
			overlayMarkup = overlays(overlayPoints);
			overlay.innerHTML = overlayMarkup;
			lastOverlay = clock;
		}
	}
	function loop(now: number) {
		if (disposed) return;
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		if (visible && !document.hidden) {
			if (settings.playing && !reduce.matches) {
				clock += dt;
				if (options.autoCycle && (cycle += dt) > 7) {
					cycle = 0;
					select((current + 1) % clouds.length);
				}
			}
			if (!exporting && settings.playing && !reduce.matches) render();
		}
		raf = requestAnimationFrame(loop);
	}
	function select(index: number) {
		if (index < 0 || index >= clouds.length) return;
		let rebased: Float32Array | undefined;
		const duration = 0.55 + (1 - settings.gather / 100) * 3.8;
		if (settings.playing && !reduce.matches && clock - start < duration) {
			const frame = capture(65536, 0, true);
			rebased = new Float32Array(65536 * 7);
			for (let i = 0; i < 65536; i++)
				rebased.set(
					[
						frame[i * 8],
						frame[i * 8 + 1],
						frame[i * 8 + 2],
						frame[i * 8 + 4],
						frame[i * 8 + 5],
						frame[i * 8 + 6],
						frame[i * 8 + 7],
					],
					i * 7,
				);
		}
		if (sourceOverride) {
			const old = textures.get(sourceOverride);
			old?.forEach((t) => gpu.deleteTexture(t));
			textures.delete(sourceOverride);
		}
		sourceOverride = rebased;
		previous = current;
		current = index;
		start = !settings.playing || reduce.matches ? -100 : clock;
		cycle = 0;
		options.onSelect?.(index);
		render();
	}
	function light() {
		const l = lamps[lampIndex++ % 3];
		Object.assign(l, {
			x: Math.random() * 1.2 - 0.6,
			y: Math.random() - 0.5,
			z: Math.random() - 0.5,
			born: clock,
		});
		render();
	}
	function reset() {
		settings.yaw = 0;
		settings.pitch = 0;
		settings.zoom = 1;
		pointer = { x: -1000, y: -1000 };
		render();
	}
	const abort = new AbortController(),
		signal = abort.signal,
		pointers = new Map<number, { x: number; y: number }>();
	let pinch = 0;
	if (options.interactive !== false) {
		canvas.addEventListener(
			"pointerdown",
			(e) => {
				pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
				canvas.setPointerCapture(e.pointerId);
				canvas.style.cursor = "grabbing";
				pointer = { x: -1000, y: -1000 };
				if (pointers.size === 2) {
					const [a, b] = [...pointers.values()];
					pinch = Math.hypot(a.x - b.x, a.y - b.y);
				}
			},
			{ signal },
		);
		canvas.addEventListener(
			"pointermove",
			(e) => {
				const old = pointers.get(e.pointerId);
				if (old) {
					const dx = e.clientX - old.x,
						dy = e.clientY - old.y;
					old.x = e.clientX;
					old.y = e.clientY;
					if (pointers.size === 1) {
						settings.yaw += dx * 0.006;
						settings.pitch = Math.max(
							-1.3,
							Math.min(1.3, settings.pitch + dy * 0.006),
						);
					} else {
						const [a, b] = [...pointers.values()],
							distance = Math.hypot(a.x - b.x, a.y - b.y);
						if (pinch > 0)
							settings.zoom = Math.max(
								0.3,
								Math.min(3, (settings.zoom * distance) / pinch),
							);
						pinch = distance;
					}
				} else {
					const r = canvas.getBoundingClientRect();
					pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
				}
				render();
			},
			{ signal },
		);
		const release = (e: PointerEvent) => {
			pointers.delete(e.pointerId);
			if (!pointers.size) canvas.style.cursor = "grab";
		};
		canvas.addEventListener("pointerup", release, { signal });
		canvas.addEventListener("pointercancel", release, { signal });
		canvas.addEventListener(
			"pointerleave",
			() => {
				if (!pointers.size) pointer = { x: -1000, y: -1000 };
			},
			{ signal },
		);
		canvas.addEventListener(
			"wheel",
			(e) => {
				e.preventDefault();
				settings.zoom = Math.max(
					0.3,
					Math.min(3, settings.zoom * Math.exp(-e.deltaY * 0.001)),
				);
				render();
			},
			{ passive: false, signal },
		);
		canvas.addEventListener("dblclick", reset, { signal });
		canvas.addEventListener(
			"keydown",
			(e) => {
				if (e.ctrlKey || e.metaKey || e.altKey) return;
				let handled = true;
				const step = e.shiftKey ? 3 : 1;
				if (e.key === "ArrowLeft") settings.yaw -= 0.08 * step;
				else if (e.key === "ArrowRight") settings.yaw += 0.08 * step;
				else if (e.key === "ArrowUp")
					settings.pitch = Math.max(-1.3, settings.pitch - 0.06 * step);
				else if (e.key === "ArrowDown")
					settings.pitch = Math.min(1.3, settings.pitch + 0.06 * step);
				else if (e.key === "+" || e.key === "=")
					settings.zoom = Math.min(3, settings.zoom * 1.12);
				else if (e.key === "-" || e.key === "_")
					settings.zoom = Math.max(0.3, settings.zoom / 1.12);
				else if (e.key === "0") reset();
				else if (e.key === " ") select((current + 1) % clouds.length);
				else if (e.key.toLowerCase() === "s") light();
				else handled = false;
				if (handled) {
					e.preventDefault();
					e.stopPropagation();
					render();
				}
			},
			{ signal },
		);
	}
	const observer = new ResizeObserver(() => render());
	observer.observe(host);
	const intersection = new IntersectionObserver((entries) => {
		visible = entries[0]?.isIntersecting ?? true;
	});
	intersection.observe(host);
	canvas.addEventListener(
		"webglcontextlost",
		(e) => {
			e.preventDefault();
			host.dispatchEvent(
				new CustomEvent("scatter-error", {
					detail:
						"The graphics context was lost. Reload to restore your picture field.",
				}),
			);
		},
		{ signal },
	);
	raf = requestAnimationFrame(loop);
	render();
	return {
		canvas,
		settings,
		select,
		light,
		reset,
		render,
		get current() {
			return current;
		},
		get time() {
			return clock;
		},
		setTime(time: number) {
			clock = Math.max(0, time);
			lastOverlay = -1;
			render();
		},
		update(patch: Partial<Settings>) {
			Object.assign(settings, patch);
			lastOverlay = -1;
			render();
		},
		setClouds(next: Cloud[], index = 0) {
			const keep = new Set(next.map((c) => c.data));
			for (const [data, tex] of textures)
				if (!keep.has(data)) {
					tex.forEach((t) => gpu.deleteTexture(t));
					textures.delete(data);
				}
			sourceOverride = undefined;
			clouds = next;
			current = previous = Math.max(0, Math.min(index, next.length - 1));
			start = -100;
			lastOverlay = -1;
			render();
		},
		snapshot(limit = settings.count): Frame {
			exporting = true;
			try {
				resize();
				const points = capture(limit);
				const markup = overlays(capture(320));
				const trails = settings.draw.trails
					? capture(Math.ceil(Math.min(limit, settings.count) / 5), 1)
					: undefined;
				render();
				return { width, height, time: clock, points, trails, overlays: markup };
			} finally {
				exporting = false;
			}
		},
		destroy() {
			disposed = true;
			cancelAnimationFrame(raf);
			abort.abort();
			observer.disconnect();
			intersection.disconnect();
			for (const pair of textures.values())
				pair.forEach((t) => gpu.deleteTexture(t));
			gpu.deleteBuffer(captureBuffer);
			gpu.deleteTransformFeedback(tf);
			gpu.deleteProgram(program);
			gpu.deleteShader(vs);
			gpu.deleteShader(fs);
			gpu.getExtension("WEBGL_lose_context")?.loseContext();
			root.remove();
		},
	};
}
export type ScatterPlayer = ReturnType<typeof createScatterPlayer>;
