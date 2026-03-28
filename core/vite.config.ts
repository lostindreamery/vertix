import { svelte } from "@sveltejs/vite-plugin-svelte";
import type { UserConfig } from "vite";

export default {
	plugins: [
		svelte({
			compilerOptions: {
				runes: true,
				hmr: true,
				preserveComments: true,
			},
		}),
	],
	build: {
		target: "esnext",
	},
} satisfies UserConfig;
