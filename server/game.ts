import { gameModes } from "core/src/gamemodes.ts";
import { weapons } from "core/src/loadouts.ts";
import { Projectile } from "core/src/logic/projectile.ts";
import type {
	Account,
	GameMode,
	GenData,
	MapData,
	MapObject,
	Player,
	Tile,
} from "core/src/types.ts";
import { getDistance, randomInt, setupMap } from "core/src/utils.ts";
import { defaultGenData } from "./maps.ts";

export class Game {
	roomName = "";
	players: Player[] = [];
	mode: GameMode;
	mapData: MapData;
	tileScale = 256;
	tiles: Tile[] = [];
	spawnTiles: Tile[] = [];
	scoreTiles: Tile[] = [];
	clutter: MapObject[] = [];
	pickups: MapObject[] = [];
	bullets: Projectile[] = [];
	weapons = structuredClone(weapons);
	nextSid = 0;
	scoreRed = 0;
	scoreBlue = 0;
	modeVotes = gameModes.map((m, i) => ({
		name: m.name,
		indx: i,
		votes: 0,
	}));
	roundEnd = false;

	constructor(name: string) {
		this.roomName = name;
		this.mode = gameModes[0];
		this.mapData = this.newMap(defaultGenData[this.mode.maps[0]]);
		this.newRound();
	}

	newPlayer() {
		let sid = this.nextSid;
		this.nextSid++;
		let tmpPlayer: Player = {
			id: sid,
			room: this.roomName,
			index: sid,
			name: `Guest_${sid}`,
			account: { clan: "DEV" } as Account,
			classIndex: 0,
			currentWeapon: 0,
			weapons: [this.weapons[0], this.weapons[5]],
			health: 0,
			maxHealth: 0,
			height: 100,
			width: 50,
			speed: 0.5,
			jumpY: 0,
			jumpDelta: 0,
			jumpStrength: 0.72,
			gravityStrength: 0.0058,
			jumpCountdown: 0,
			frameCountdown: 0,
			scoreCountdown: 0,
			kills: 0,
			deaths: 0,
			score: 0,
			angle: 0,
			x: 0,
			y: 0,
			oldX: 0,
			oldY: 0,
			totalDamage: 0,
			totalHealing: 0,
			totalGoals: 0,
			spawnProtection: 0,
			nameYOffset: 0,
			dead: true,
			onScreen: false,
			type: "player",
			delta: 0,
			targetF: 0,
			animIndex: 0,
			team: this.getTeam(sid),
			isBoss: false,
			spray: {
				src: "/assets/sprays/1.png",
				info: {
					scale: 64,
					alpha: 1,
					resolution: 30,
				},
			},
		};
		this.players.push(tmpPlayer);
		return tmpPlayer;
	}

	getTeam(sid: number) {
		let team = "";
		if (this.mode.teams) {
			const red = this.players.filter((pl) => pl.team === "red").length;
			const blue = this.players.filter((pl) => pl.team === "blue").length;
			if (this.mode.code === "boss") {
				team = blue > 0 ? "red" : "blue";
			} else {
				team = red >= blue ? "blue" : "red";
			}
		} else {
			team = `${sid}`;
		}
		return team;
	}

	newMap(genData: GenData) {
		this.tiles = [];
		this.clutter = [];
		this.pickups = [];
		this.spawnTiles = [];
		this.scoreTiles = [];
		let tmpMap = {
			gameMode: this.mode,
			genData: genData,
			tiles: this.tiles,
			clutter: this.clutter,
			pickups: this.pickups,
			width: (genData.width - 4) * this.tileScale,
			height: (genData.height - 4) * this.tileScale,
		};
		setupMap(tmpMap, this.tileScale, []);
		for (const tl of this.tiles) {
			if (this.mode.teams) {
				if (!tl.hardPoint && (tl.objTeam === "red" || tl.objTeam === "blue")) {
					this.spawnTiles.push(tl);
				} else if (
					tl.hardPoint &&
					(this.mode.code === "hp" || this.mode.code === "zmtch")
				) {
					this.scoreTiles.push(tl);
				}
			} else if (tl.spriteIndex === 2) {
				this.spawnTiles.push(tl);
			}
		}
		return tmpMap;
	}

	getSpawn(player: Player) {
		const mid = this.tileScale / 2;
		let spawn = { x: 0, y: 0 };
		for (const tl of this.spawnTiles) {
			if (this.mode.teams) {
				if (tl.objTeam === player.team) {
					spawn = {
						x: tl.x + mid,
						y: tl.y + mid,
					};
				}
			} else {
				let valid = this.players.every((pl: Player) => {
					const dist = getDistance(
						pl.x,
						pl.y + pl.width / 2,
						tl.x + mid,
						tl.y + mid,
					);
					return dist > this.tileScale * 4 || pl.dead;
				});
				if (valid) {
					spawn = {
						x: tl.x + mid,
						y: tl.y + mid,
					};
				}
			}
		}
		return spawn;
	}

	genClutter() {
		let nextID = 0;
		for (const tl of this.tiles) {
			if (tl.spriteIndex === 0 && !tl.wall) {
				const rand = randomInt(0, 5);
				if (rand > 0) continue;
				let clt = {
					x: tl.x,
					y: tl.y,
					active: true,
					indx: nextID++,
					type: "clutter",
					i: 2,
					w: 48,
					h: 84,
					hc: true,
					tp: 1,
				};
				const randY = randomInt(tl.scale / 4, (tl.scale / 4) * 3);
				if (tl.left) {
					clt.y += randY;
				} else if (tl.right) {
					clt.x += tl.scale - clt.w;
					clt.y += randY;
				} else {
					continue;
				}
				this.clutter.push(clt);
			}
		}
	}

	genPickups() {
		const mid = this.tileScale / 2;
		for (const tl of this.tiles) {
			let pkup = {
				x: tl.x + mid,
				y: tl.y + mid,
				active: true,
				scale: 64,
				type: "",
			};
			if (tl.spriteIndex === 2) {
				pkup.type = "healthpack";
				this.pickups.push(pkup);
			} else if (tl.spriteIndex === 1 && this.mode.code === "lc") {
				pkup.type = "lootcrate";
				this.pickups.push(pkup);
			}
		}
	}

	newRound() {
		this.bullets = [];
		this.scoreRed = 0;
		this.scoreBlue = 0;
		let sorted = this.modeVotes.toSorted((a, b) => b.votes - a.votes);
		this.mode = gameModes[sorted[0].indx];
		this.mapData = this.newMap(defaultGenData[this.mode.maps[0]]);
		for (const m of this.modeVotes) {
			m.votes = 0;
		}
		for (const pl of this.players) {
			pl.x = 0;
			pl.y = 0;
			pl.score = 0;
			pl.kills = 0;
			pl.deaths = 0;
			pl.totalDamage = 0;
			pl.totalHealing = 0;
			pl.totalGoals = 0;
			pl.isBoss = false;
			pl.onScreen = false;
			pl.dead = true;
			pl.lastModeVote = undefined; //TODO
			pl.team = "";
			pl.team = this.getTeam(pl.index);
		}
		this.genClutter();
		this.genPickups();
		for (let i = 0; i < 100; i++) {
			this.bullets.push(new Projectile());
		}
		this.roundEnd = false;
	}
}
