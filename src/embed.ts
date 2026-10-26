import { createScatterPlayer, type ScatterPlayer } from "./engine.ts";
import { validateProject } from "./model.ts";
export { createScatterPlayer };
export function mount(
	target: string | HTMLElement,
	options: {
		project: string | unknown;
		autoCycle?: boolean;
		interactive?: boolean;
	},
) {
	const element =
		typeof target === "string"
			? document.querySelector<HTMLElement>(target)
			: target;
	if (!element) throw Error("Scatter mount element was not found.");
	const abort = new AbortController();
	let player: ScatterPlayer | undefined,
		destroyed = false,
		cloudCount = 0;
	const ready = (async () => {
		const input =
			typeof options.project === "string"
				? await fetch(options.project, { signal: abort.signal }).then((r) => {
						if (!r.ok) throw Error("Could not fetch Scatter project.");
						return r.json();
					})
				: options.project;
		const project = validateProject(input);
		cloudCount = project.clouds.length;
		if (destroyed)
			throw new DOMException("Player was destroyed.", "AbortError");
		player = createScatterPlayer(element, {
			...project,
			interactive: options.interactive,
			autoCycle: options.autoCycle,
		});
		return player;
	})();
	return {
		ready,
		destroy() {
			destroyed = true;
			abort.abort();
			player?.destroy();
		},
		next() {
			if (player) player.select((player.current + 1) % cloudCount);
		},
		light() {
			player?.light();
		},
	};
}
