import { store } from "@simplestack/store";
import type { Player } from "./types.ts";

export const appStore = store({
	gameMap: null as any,
	maxScreenWidth: 1920,
	maxScreenHeight: 1080,
	viewMult: 1,
	startX: 0,
	startY: 0,
	// hack, since maybe this is accessed before gameSetup?
	player: {
		dead: true,
		weapons: [],
	} as Player,
	shake: {
		x: 0,
		y: 0,
		scale: 0,
		dir: 0,
	},
	// typescript breaks when any part of the (main?) store is typed as an html element
	sprites: {
		light: null as object | null,
		particles: []
	}
});
