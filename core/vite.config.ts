import { svelte } from "@sveltejs/vite-plugin-svelte";
import type { UserConfig } from "vite";

// todo: when we start not using the dev server
// https://vite.dev/guide/build#multi-page-app
export default {
	appType: "mpa",
	plugins: [svelte()],
	build: {
		target: "esnext",
	},
} satisfies UserConfig;
