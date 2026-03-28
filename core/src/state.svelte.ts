import type { Socket } from "socket.io-client";
import type { Player, Sprite } from "./types.ts";

export const st = $state({
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
	sprites: {
		light: null as Sprite | null,
		particles: [] as Sprite[],
	},
	doSounds: false,
	kicked: false,
	startingGame: false,
	gameStart: false,
	gameOver: false,
	mobile: false,
	socket: null as Socket | null,
	settings: Object.assign(
		{
			showNames: true,
			showParticles: true,
			showTrippy: false,
			showSprays: true,
			showFade: true,
			showShadows: true,
			showGlows: true,
			showBTrails: true,
			showChat: true,
			showUI: true,
			showPINGFPS: true,
			showLeader: true,
			selectChat: false,
		},
		JSON.parse(localStorage.getItem("settings") ?? "{}") as object,
	),
});
