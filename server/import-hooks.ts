import { registerHooks } from "node:module";

registerHooks({
	load(url, context, nextLoad) {
		if (url.includes("state.svelte.ts")) {
			return {
				source: "export const st = null;",
				format: "module",
				shortCircuit: true,
			};
		}
		return nextLoad(url, context);
	},
});
