import type { weapons } from "./loadouts.ts";

export type Player = {
	id: number;
	room: string;
	index: number;
	name: string;
	account: Account;
	classIndex: number;
	currentWeapon: number;
	weapons: (typeof weapons)[number][];
	health: number;
	maxHealth: number;
	height: number;
	width: number;
	speed: number;
	jumpY: number;
	jumpDelta: number;
	jumpStrength: number;
	gravityStrength: number;
	jumpCountdown: number;
	frameCountdown: number;
	kills: number;
	deaths: number;
	score: number;
	angle: number;
	x: number;
	y: number;
	oldX: number;
	oldY: number;
	spawnProtection: number;
	nameYOffset: number;
	dead: boolean;
	onScreen: boolean;
	type: string;
	delta: number;
	targetF: number;
	animIndex: number;
	team: string;
	loggedIn?: boolean;
	likes?: number;
	totalDamage?: number;
	totalHealing?: number;
	xSpeed?: number;
	ySpeed?: number;
	isn?: number;
	firstReceive?: boolean; // unused?
	spray?: any; // todo
};

// todo
export type Account = any;

export type InputSendData = {
		hdt: number,
		vdt: number,
		ts: number,
		isn: number,
		s: number,
		delta: number,
}

export interface Sprite extends HTMLImageElement {
  index: number;
  isLoaded: boolean;
  flipped: boolean;
  //SPRAY
  owner?: Player;
  active?: boolean;
  xPos?: number;
  yPos?: number;
  scale?: number;
  alpha?: number;
  resolution?: number;
  //WEAPON
  wpnImg?: any;
  flip?: boolean;
  tmpInx?: string;
}

export interface SpriteCanvas extends HTMLCanvasElement {
	index?: number;
	flipped?: boolean;
	isLoaded?: boolean;
}
