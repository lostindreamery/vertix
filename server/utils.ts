import { gameModes } from "core/src/gamemodes.ts";
import { weapons } from "core/src/loadouts.ts";
import { Projectile } from "core/src/logic/projectile.ts";
import { defaultGenData } from "./maps.ts";
import type {
	GameMode,
	GenData,
	MapData,
	MapObject,
	Player,
	Tile,
} from "core/src/types.ts";
import { getDistance, setupMap } from "core/src/utils.ts";

export class Room {
	id = 0;
	room = "DEV";
	players: Player[] = [];
	mapData: MapData;
	tileScale = 256;
	tiles: Tile[] = [];
	clutter: MapObject[] = [];
	pickups: MapObject[] = [];
	gameMode: GameMode;
	scoreRed = 0;
	scoreBlue = 0;
	bullets: Projectile[] = [];
	nextAvailableSid = 0;

	constructor() {
		this.gameMode = gameModes[1];
		this.mapData = this.newMap(defaultGenData[this.gameMode.maps[0]]);
		for (let i = 0; i < 100; i++) {
			this.bullets.push(new Projectile());
		}
	}

	newPlayer() {
		let sid = this.nextAvailableSid;
		this.nextAvailableSid++;
		let tmpPlayer = {
			id: this.id,
			room: this.room,
			index: sid,
			name: `Guest_${sid}`,
			account: { clan: "DEV" },
			classIndex: 0,
			currentWeapon: 0,
			weapons: structuredClone([weapons[0], weapons[5]]),
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
			kills: 0,
			deaths: 0,
			score: 0,
			angle: 0,
			x: 0,
			y: 0,
			oldX: 0,
			oldY: 0,
			spawnProtection: 0,
			nameYOffset: 0,
			dead: true,
			onScreen: false,
			type: "player",
			delta: 0,
			targetF: 0,
			animIndex: 0,
			team: this.players.length % 2 === 0 ? "blue" : "red",
		};
		this.players.push(tmpPlayer);
		return tmpPlayer;
	}

	newMap(genData: GenData) {
		this.tiles = [];
		this.clutter = [];
		this.pickups = [];
		let tmpMap = {
			gameMode: this.gameMode,
			genData: genData,
			tiles: this.tiles,
			clutter: this.clutter,
			pickups: this.pickups,
			width: (genData.width - 4) * this.tileScale,
			height: (genData.height - 4) * this.tileScale,
		};
		setupMap(tmpMap, this.tileScale);
		return tmpMap;
  }

  getSpawn() {
    let mid = this.tileScale / 2;
    let spawn = { x: 0, y: 0 };
    for (const tl of this.tiles) {
      if (tl.spriteIndex === 2) {
        let valid = this.players.every((pl: Player) => {
          const dist = getDistance(pl.x, pl.y + pl.width / 2, tl.x + mid, tl.y + mid);
          return dist > this.tileScale * 4 || pl.dead;
        })
        if (valid) {
          spawn = {
            x: tl.x + mid,
            y: tl.y + mid
          }
        }
      }
    }
    return spawn;
  }
}
