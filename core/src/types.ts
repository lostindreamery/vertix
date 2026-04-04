export type Player = {
	id: number;
	room: string;
	index: number;
	name: string;
	account: Account;
	classIndex: number;
	currentWeapon: number;
	weapons: Weapon[];
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
	scoreCountdown: number;
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
	totalDamage: number;
	totalHealing: number;
	xSpeed?: number;
	ySpeed?: number;
	isn?: number;
	firstReceive?: boolean; // unused?
	spray?: any; // todo

	// properties for removed gamemodes?
	totalGoals?: number;
	lastItem?: any;
};

export type Weapon = {
	name: string;
	weaponIndex: number;
	dmg: number;
	ammo: number;
	maxAmmo: number;
	reloadSpeed: number;
	fireRate: number;
	spread: number[];
	width: number;
	length: number;
	yOffset: number;
	holdDist: number;

	bSpeed: number;
	bWidth: number;
	bHeight: number;
	bRandScale: [number, number];
	cAcc: number;
	maxLife: number | null;
	bulletsPerShot: number;
	pierce: number;
	pierceCount: number;
	blastRadius?: number;
	bounce: boolean;
	distBased: boolean;
	explodeOnDeath: boolean;
	bDist: number;
	bTrail: number;
	bSprite: number;
	glowWidth: number;
	glowHeight: number;
	shake: number;

	reloadTime: number;
	spreadIndex: number;
	lastShot: number;

	// added at runtime
	front?: boolean;
	camo?: number;
};

// todo
export type Account = any;

export type InputSendData = {
	hdt: number;
	vdt: number;
	ts: number;
	isn: number;
	s: number;
	delta: number;
};

export interface Sprite extends HTMLImageElement {
	index: number;
	isLoaded: boolean;
	flipped: boolean;
	//SPRAY
	owner?: number;
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

export type Tile = {
	index: number;
	scale: number;
	x: number;
	y: number;
	wall: boolean;
	spriteIndex: number;
	left: number;
	right: number;
	top: number;
	bottom: number;
	topLeft: number;
	topRight: number;
	bottomLeft: number;
	bottomRight: number;
	neighbours: number;
	hasCollision: boolean;
	hardPoint: boolean;
	objTeam: string;
	edgeTile: boolean;
};

export type GameMode = {
	code: string;
	name: string;
	score: number;
	desc1: string;
	desc2: string;
	teams: boolean;
	maps: number[];
	killScoreMult: number;
};

export type MapObject = {
	x: number;
	y: number;
	active: boolean;
	//CLUTTER
	i?: number;
	w?: number;
	h?: number;
	hc?: boolean; //?
	tp?: number; //?
	//PICKUPS
	scale?: number;
	type?: string;
};

export type GenData = {
	width: number;
	height: number;
	data: Uint8ClampedArray;
};

export type MapData = {
	gameMode: GameMode;
	genData: GenData;
	tiles: Tile[];
	clutter: MapObject[];
	pickups: MapObject[];
	width: number;
	height: number;
};

// todo gather types for socket events/packets together
export type ShootEvent = {
	i: number;
	x: number;
	y: number;
	d: number;
	si: number;
};
