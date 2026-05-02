import type { Socket } from "socket.io-client";
import { characterClasses } from "./loadouts.ts";
import * as cosmetics from "./skins.ts";
import type { MapData, Player, Sprite } from "./types.ts";

function getPref<T extends { id: number }>(data: T[], key: string): T | null {
	const value = localStorage.getItem(key);
	console.debug(`loading ${value} from ${key}`);
	if (value && !Number.isNaN(parseInt(value)))
		return data.find((item) => item.id === parseInt(value)) ?? null;
	return null;
}

export const st = $state({
	gameMap: null as any as MapData,
	maxScreenWidth: 1920,
	maxScreenHeight: 1080,
	viewMult: 1,
	startX: 0,
	startY: 0,
	// hack, since maybe this is accessed before gameSetup?
	player: {
		dead: true,
		weapons: [],
	} as any as Player,
	loggedIn: false,
	clanData: {} as Record<string, string | number>,
	playerName: "", // content of the player name input box
	loadout: {
		class: characterClasses[0] as (typeof characterClasses)[number],
		primaryCamo: getPref(cosmetics.camos, "prevPrimaryCamo"),
		secondaryCamo: getPref(cosmetics.camos, "prevSecondaryCamo"),
		hat: getPref(cosmetics.hats, "prevHat"),
		shirt: getPref(cosmetics.shirts, "prevShirt"),
		spray: 1 as number, // we have no spray data? :(
	},
	cosmetics: {
		hats: [] as typeof cosmetics.hats & { count: 0 }[],
		shirts: [] as typeof cosmetics.shirts & { count: 0 }[],
		camos: [] as (typeof cosmetics.camos)[] & { count: 0 }[][],
	},
	characterClasses,
	shake: {
		x: 0,
		y: 0,
		scale: 0,
		dir: 0,
	},
	sprites: {
		light: null as Sprite | null,
		particles: [] as Sprite[],
		weapons: [] as {
			upSprite: Sprite;
			downSprite: Sprite;
			leftSprite: Sprite;
			rightSprite: Sprite;
			icon: HTMLImageElement;
		}[],
	},
	doSounds: false,
	kicked: false,
	startingGame: false,
	changingLobby: false,
	gameStart: false,
	gameOver: false,
	mobile: false,
	socket: null as Socket | null,
	room: null as string | null,
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
	keysList: Object.assign(
		{
			upKey: "KeyW",
			downKey: "KeyS",
			leftKey: "KeyA",
			rightKey: "KeyD",
			reloadKey: "KeyR",
			jumpKey: "Space",
			sprayKey: "KeyF",
			leaderboardKey: "ShiftLeft",
			chatToggleKey: "Enter",
			incWeapKey: "KeyE",
			decWeapKey: "KeyQ",
		},
		JSON.parse(localStorage.getItem("keysList") ?? "{}") as object,
	),
	chatLines: [] as {
		text: string;
		source: "system" | "notif" | "me" | "blue" | "red";
		author: string;
	}[],
});

declare global {
	interface Window {
		st: typeof st;
	}
}
window.st = st;
