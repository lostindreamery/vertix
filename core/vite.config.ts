import { svelte } from "@sveltejs/vite-plugin-svelte";
import type { UserConfig } from "vite";

export default {
	plugins: [
		svelte({
			compilerOptions: {
				runes: true,
				hmr: true,
				preserveComments: true,
				// not ideal
				warningFilter: (w) => !w.code.includes("a11y"),
			},
		}),
	],
	build: {
		target: "esnext",
	},
} satisfies UserConfig;
