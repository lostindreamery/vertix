import { gameModes } from "core/src/gamemodes.ts";
import { characterClasses, weapons } from "core/src/loadouts.ts";
import { Projectile } from "core/src/logic/projectile.ts";
import type {
	Account,
	GameMode,
	GenData,
	MapData,
	MapObject,
	Player,
	Tile,
	ZoneEvent,
} from "core/src/types.ts";
import {
	shootNextBullet,
	getNextBullet,
	wallCol,
	getCurrentWeapon,
	roundNumber,
	getDistance,
	setupMap,
	dotInRect,
	randomInt,
} from "core/src/utils.ts";
import { defaultGenData } from "./maps.ts";
import type { Server, Socket } from "socket.io";
import { hats, camos, shirts } from "core/src/skins.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";

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
	hasBoss = false;
	bullets: Projectile[] = [];
	nextAvailableSid = 0;
	spawnTiles: Tile[] = [];
	scoreTiles: Tile[] = [];
	modeVotes = gameModes.map((mode) => ({
		name: mode.name,
		votes: 0,
	}));

	constructor(io: Server) {
		this.gameMode = gameModes[0];
		this.mapData = this.newMap(defaultGenData[this.gameMode.maps[0]]);
		this.genClutter();
		this.genPickups();
		for (let i = 0; i < 100; i++) {
			this.bullets.push(new Projectile());
		}
		new RoomSocket(io, this);
	}

	newPlayer(playerWeps: typeof weapons) {
		let sid = this.nextAvailableSid;
		this.nextAvailableSid++;
		let team = `${this.players.length}`;
		if (this.gameMode.teams) {
			if (this.gameMode.code === "boss") {
				team = this.hasBoss ? "red" : "blue";
			} else {
				team = this.players.length % 2 === 0 ? "blue" : "red";
			}
		}
		let tmpPlayer: Player = {
			id: sid,
			room: this.room,
			index: sid,
			name: `Guest_${sid}`,
			account: { clan: "DEV" } as Account,
			classIndex: 0,
			currentWeapon: 0,
			weapons: [playerWeps[0], playerWeps[5]],
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
			team: team,
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

	newMap(genData: GenData) {
		this.tiles = [];
		this.clutter = [];
		this.pickups = [];
		let flags = [] as any[];
		let tmpMap = {
			gameMode: this.gameMode,
			genData: genData,
			tiles: this.tiles,
			clutter: this.clutter,
			pickups: this.pickups,
			width: (genData.width - 4) * this.tileScale,
			height: (genData.height - 4) * this.tileScale,
		};
		setupMap(tmpMap, this.tileScale, flags);
		for (const tl of this.tiles) {
			if (tl.spriteIndex === 2) {
				this.spawnTiles.push(tl);
			} else if (
				tl.hardPoint &&
				(this.gameMode.code === "hp" || this.gameMode.code === "zmtch")
			) {
				this.scoreTiles.push(tl);
			}
		}
		return tmpMap;
	}

	getSpawn(player: Player) {
		const mid = this.tileScale / 2;
		let spawn = { x: 0, y: 0 };
		for (const tl of this.spawnTiles) {
			if (this.gameMode.teams) {
				if (tl.objTeam === player.team && !tl.hardPoint) {
					spawn = {
						x: tl.x + mid,
						y: tl.y + mid,
					};
					continue;
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
					continue;
				}
			}
		}
		return spawn;
	}

	genClutter() {
		for (const tl of this.tiles) {
			if (tl.spriteIndex === 0 && !tl.wall) {
				const rand = randomInt(0, 10);
				if (rand > 0) continue;
				let clt = {
					x: tl.x,
					y: tl.y,
					active: true,
					type: "clutter",
					i: 1,
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
				} else if (tl.bottom || tl.top) {
					continue;
				} else {
					clt.x += tl.scale / 2;
					clt.y += tl.scale / 2;
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
			} else if (tl.spriteIndex === 1 && this.gameMode.code === "lc") {
				pkup.type = "lootcrate";
				this.pickups.push(pkup);
			}
		}
	}
}

class RoomSocket {
	io;
	room;
	cosmetics = {
		hats,
		shirts,
		camos,
	};
	constructor(io: Server, room: Room) {
		this.io = io;
		this.room = room;
		this.sortCosmetics();
		this.handleSocket();
	}
	handleSocket() {
		const playerWeps = structuredClone(weapons);
		this.io.on("connection", (socket: Socket) => {
			console.log("con", socket.id);

			let player = this.room.newPlayer(playerWeps);

			socket.emit(
				"welcome",
				{
					id: player.id,
					room: player.room,
					name: player.name,
					classIndex: player.classIndex,
				},
				true,
			);
			socket.emit("updHt", hats.length, this.cosmetics.hats);
			socket.emit("updShrt", shirts.length, this.cosmetics.shirts);
			socket.emit(
				"updCmo",
				camos.length,
				weapons.map(() => this.cosmetics.camos),
			);

			socket.on("cHat", (id) => {
				player.account.hat = hats[id - 1];
			});
			socket.on("cShirt", (id) => {
				player.account.shirt = shirts[id - 1];
			});
			socket.on("cCamo", (data) => {
				const wep = playerWeps[data.weaponID];
				if (wep) wep.camo = data.camoID - 1;
			});

			socket.on("gotit", (client, init, currentTime) => {
				console.log("gotit", client, init, currentTime);
				player.name = client.name ? client.name : player.name;
				player.classIndex = client.classIndex ? client.classIndex : 0;
				if (this.room.gameMode.code === "snipe") {
					player.classIndex = 2;
				} else if (this.room.gameMode.code === "rckt") {
					player.classIndex = 5;
				} else if (this.room.gameMode.code === "pyro") {
					player.classIndex = 7;
				} else if (
					this.room.gameMode.code === "boss" &&
					player.team === "blue"
				) {
					player.classIndex = 10;
					player.isBoss = true;
					this.room.hasBoss = true;
				}
				const currentClass = characterClasses[player.classIndex];
				player.weapons = currentClass.weaponIndexes.map((i) => playerWeps[i]);
				player.health = player.maxHealth = currentClass.maxHealth;
				player.height = currentClass.height;
				player.width = currentClass.width;
				player.speed = currentClass.speed;
				if (init) return;

				player.onScreen = true;
				player.angle = 0;
				const spawn = this.room.getSpawn(player);
				player.x = spawn.x;
				player.y = spawn.y;
				player.dead = false;

				const gameSetup = {
					mapData: this.room.mapData,

					maxScreenWidth: 1920,
					maxScreenHeight: 1080,
					viewMult: 1,
					tileScale: this.room.tileScale,

					usersInRoom: this.room.players,
					you: player,
				};

				socket.emit("gameSetup", JSON.stringify(gameSetup), true, true);

				this.io.emit("add", JSON.stringify(player));
				this.io.emit(
					"rsd",
					this.room.players.flatMap((pl) => [
						5,
						pl.index,
						pl.x,
						pl.y,
						pl.angle,
					]),
				);
				this.updateScore(0, player);
			});
			socket.on("respawn", () => {
				socket.emit(
					"welcome",
					{
						id: player.id,
						room: player.room,
						name: player.name,
						classIndex: player.classIndex,
					},
					false,
				);
			});
			socket.on("disconnect", () => {
				this.io.emit("rem", player.index);
				this.room.players.splice(this.room.players.indexOf(player), 1);
			});
			socket.on("sw", (currentWeapon) => {
				player.currentWeapon = currentWeapon;
				this.io.emit("upd", { i: player.index, wi: player.currentWeapon });
			});
			socket.on("r", () => {
				const currentWeapon = getCurrentWeapon(player);
				const swappedWeapon = player.currentWeapon;
				setTimeout(() => {
					socket.emit("r", swappedWeapon);
				}, currentWeapon.reloadSpeed ?? 0);
			});
			socket.on("0", (targetF) => {
				player.targetF = targetF;
			});
			socket.on("1", (x, y, jumpY, targetF, targetD, currentTime) => {
				const currentWeapon = getCurrentWeapon(player);
				if (!currentWeapon) return;
				currentWeapon.spreadIndex++;
				if (currentWeapon.spreadIndex >= currentWeapon.spread.length) {
					currentWeapon.spreadIndex = 0;
				}
				const spread = currentWeapon.spread[currentWeapon.spreadIndex];
				const dir = roundNumber(targetF + Math.PI + spread, 2);
				const origin = currentWeapon.holdDist + currentWeapon.bDist;
				const newX = Math.round(x + origin * Math.cos(dir));
				const newY = Math.round(
					y - currentWeapon.yOffset - jumpY + origin * Math.sin(dir),
				);
				let bulletData = {
					i: player.index,
					x: newX,
					y: newY,
					d: dir,
					si: -1,
				};
				this.io.emit("2", bulletData);
				for (let i = 0; i < currentWeapon.bulletsPerShot; i++) {
					const bullet = getNextBullet(this.room.bullets);
					shootNextBullet(bulletData, player, targetD, currentTime, bullet);
					this.updateBullet(bullet, player, dir, currentTime);
				}
			});
			socket.on("4", (data) => {
				if (player.dead) return;
				let horizontalDT = data.hdt;
				let verticalDT = data.vdt;
				//let currentTime = data.ts;
				const inputNumber = data.isn;
				const space = data.s;
				player.delta = data.delta;
				const delta = data.delta;
				const lengthDT = Math.sqrt(
					horizontalDT * horizontalDT + verticalDT * verticalDT,
				);
				if (lengthDT !== 0) {
					horizontalDT /= lengthDT;
					verticalDT /= lengthDT;
				}
				player.oldX = player.x;
				player.oldY = player.y;
				player.x += horizontalDT * player.speed * delta;
				player.y += verticalDT * player.speed * delta;
				player.angle =
					((player.targetF + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI) +
					90;
				if (space === 1) {
					this.io.emit("jum", player.index);
				}
				wallCol(player, this.room.tiles, this.room.clutter);
				this.checkSpecialTiles(player);
				player.x = Math.round(player.x);
				player.y = Math.round(player.y);
				socket.emit(
					"rsd",
					this.room.players.flatMap((pl) => [
						6,
						pl.index,
						pl.x,
						pl.y,
						pl.angle,
						pl.index === player.index ? inputNumber : pl.nameYOffset,
					]),
				);
			});
			socket.on("cht", (msg, type) => {
				if (msg.includes("!sync")) {
					this.io.emit(
						"rsd",
						this.room.players.flatMap((pl) => [
							5,
							pl.index,
							pl.x,
							pl.y,
							pl.angle,
						]),
					);
					socket.emit("cht", [-1, "synced"]);
					return;
				}
				this.io.emit("cht", [player.index, msg]);
			});
			socket.on("modeVote", (i) => {
				let vote = this.room.modeVotes[i];
				if (player.lastModeVote !== undefined) {
					let lastVote = this.room.modeVotes[player.lastModeVote];
					lastVote.votes -= 1;
					this.io.emit("vt", {
						i: player.lastModeVote,
						n: lastVote.name,
						v: lastVote.votes,
					});
				}
				player.lastModeVote = i;

				vote.votes += 1;
				this.io.emit("vt", {
					i: i,
					n: vote.name,
					v: vote.votes,
				});
			});
			socket.on("ping1", () => {
				socket.emit("pong1");
			});
			//TODO
			socket.on("cSrv", (data) => {
				if (data.srvMap) {
					this.room.mapData = this.room.newMap(data.srvMap);
				}
			});
			socket.on("crtSpr", () => {
				this.io.emit("crtSpr", player.index, player.x, player.y);
			});
			socket.on("create", (lobby) => {});
		});
	}

	updateScore(scored: number, source: Player) {
		this.io.emit(
			"lb",
			this.room.players
				.toSorted((a, b) => b.score - a.score)
				.flatMap((pl) => [pl.index]),
		);
		let leaderboardScore = scored / (this.room.gameMode.score / 100);
		if (source.team === "red") {
			leaderboardScore = this.room.scoreRed += leaderboardScore;
			this.io.emit("ts", this.room.scoreRed, this.room.scoreBlue);
		} else if (source.team === "blue") {
			leaderboardScore = this.room.scoreBlue += leaderboardScore;
			this.io.emit("ts", this.room.scoreRed, this.room.scoreBlue);
		} else {
			leaderboardScore = source.score / (this.room.gameMode.score / 100);
			this.io.emit("ts");
		}
		if (leaderboardScore >= 100) {
			this.io.emit(
				"7",
				source.team,
				this.room.players,
				this.room.modeVotes,
				false,
			);
			let timeLeft = 15;
			let timer = setInterval(() => {
				if (timeLeft >= 0) {
					this.io.emit("8", timeLeft--);
				} else {
					this.room.scoreRed = 0;
					this.room.scoreBlue = 0;
					//TODO
					let sorted = this.room.modeVotes.toSorted((a, b) => b.votes - a.votes);
					let voted = gameModes.find(gm => gm.name === sorted[0].name);
					this.room.gameMode = voted ? voted : gameModes[0]
					this.room.mapData = this.room.newMap(defaultGenData[this.room.gameMode.maps[0]]);
					this.room.genClutter();
					this.room.genPickups();
					for (const m of this.room.modeVotes) {
						m.votes = 0;
					}
					for (const pl of this.room.players) {
						pl.score = 0;
						pl.kills = 0;
						pl.deaths = 0;
						pl.totalDamage = 0;
						pl.totalHealing = 0;
						pl.totalGoals = 0;
						pl.lastModeVote = undefined;
						//TODO
						this.io.emit(
							"welcome",
							{
								id: pl.id,
								room: pl.room,
								name: pl.name,
								classIndex: pl.classIndex,
							},
							true,
						);
					}
					clearInterval(timer);
				}
			}, 1000);
		}
	}

	updateBullet(
		bullet: Projectile,
		player: Player,
		dir: number,
		currentTime: number,
	) {
		const tick = () => {
			if (bullet.lastHit.length > 0) {
				for (const i of bullet.lastHit) {
					this.updateHit(player, this.room.players[i], -bullet.dmg, dir);
				}
			} else if (!bullet.active && bullet.explodeOnDeath) {
				this.io.emit("ex", bullet.x, bullet.y, 3);
				for (const pl of this.room.players) {
					const left = pl.x - pl.width / 2;
					const right = pl.x + pl.width / 2;
					const top = pl.y - pl.height;
					const bottom = pl.y;
					const dist = getDistance(
						bullet.x,
						bullet.y,
						Math.max(left, Math.min(right, bullet.x)),
						Math.max(top, Math.min(bottom, bullet.y)),
					);
					if (bullet.blastRadius > dist) {
						const dmg =
							-bullet.blastRadius + Math.round(dist) < -bullet.dmg
								? -bullet.dmg
								: -bullet.blastRadius + Math.round(dist);
						this.updateHit(player, pl, dmg, dir);
					}
				}
			} else {
				bullet.update(
					player.delta,
					currentTime,
					this.room.clutter,
					this.room.tiles,
					this.room.players,
				);
				setTimeout(tick, player.delta);
				return;
			}
			bullet.deactivate();
		};
		tick();
	}

	updateHit(source: Player, dest: Player, dmg: number, dir: number) {
		if (dest?.dead) return;
		dest.health += dmg;
		this.io.emit("1", {
			dID: source.index,
			gID: dest.index,
			dir: dir,
			amount: dmg,
			bi: -1,
			h: dest.health,
		});
		this.io.emit("upd", {
			i: source.index,
			dmg: (source.totalDamage += -dmg),
		});
		const dead = dest.health <= 0;
		if (!dead) return;
		dest.dead = true;
		dest.onScreen = false;
		const scored = dest.isBoss ? 2000 : 100;
		this.io.emit("3", {
			dID: source.index,
			gID: dest.index,
			sS: scored,
			kB: dest.isBoss,
		});
		source.score += scored * this.room.gameMode.killScoreMult;
		source.kills += 1;
		this.io.emit("upd", {
			i: source.index,
			s: source.score,
			kil: source.kills,
		});
		dest.deaths += 1;
		this.io.emit("upd", {
			i: dest.index,
			dea: dest.deaths,
		});
		this.updateScore(scored, source);
	}

	checkSpecialTiles(player: Player) {
		for (const [i, pkup] of this.room.pickups.entries()) {
			if (
				pkup.active &&
				dotInRect(player.x, player.y, pkup.x, pkup.y, 64, 64)
			) {
				if (pkup.type === "healthpack" && player.health < player.maxHealth) {
					this.io.emit("upd", {
						i: player.index,
						hea: (player.totalHealing += player.maxHealth - player.health),
					});
					this.io.emit("1", {
						gID: player.index,
						h: (player.health += player.maxHealth - player.health),
					});
				} else if (
					pkup.type === "lootcrate" &&
					this.room.gameMode.code === "lc"
				) {
					this.io.emit("upd", {
						i: player.index,
						s: (player.score += 50),
					});
					this.updateScore(50, player);
				} else {
					return;
				}
				pkup.active = false;
				this.io.emit("4", pkup, i, 0);
				setTimeout(() => {
					pkup.active = true;
					this.io.emit("4", pkup, i, 0);
				}, 15000);
			}
		}
		if (this.room.gameMode.code == "hp" || this.room.gameMode.code == "zmtch") {
			for (const tl of this.room.scoreTiles) {
				if (
					dotInRect(player.x, player.y, tl.x, tl.y, tl.scale, tl.scale) &&
					tl.objTeam !== player.team
				) {
					if (player.scoreCountdown <= 0) {
						player.scoreCountdown = 1000;
						const scored = this.room.gameMode.code === "hp" ? 10 : 100;
						let tprt: ZoneEvent = { indx: player.index, scor: scored };
						if (this.room.gameMode.code == "zmtch") {
							const spawn = this.room.getSpawn(player);
							player.x = tprt.newX = spawn.x;
							player.y = tprt.newY = spawn.y;
							player.totalGoals += 1;
						}
						this.io.emit("tprt", tprt);
						player.score += scored;
						this.io.emit("upd", {
							i: player.index,
							s: player.score,
							goa: player.totalGoals,
						});
						this.updateScore(scored, player);
					}
				}
			}
			if (player.scoreCountdown >= 0) {
				player.scoreCountdown -= player.delta;
			}
		}
	}

	sortCosmetics() {
		const hatPathBase = join(import.meta.dirname, "../core/public/images/hats");
		this.cosmetics.hats = hats
			.filter((h) => !h.hide)
			.map((h) => ({
				id: h.id,
				name: h.name,
				desc: h.desc,
				chance: h.chance,
				count: 0,
				creator: h.creator,
				left: existsSync(join(hatPathBase, h.id.toString(), "l.png")),
				up: existsSync(join(hatPathBase, h.id.toString(), "u.png")),
			}))
			.toSorted((a, b) => a.chance - b.chance);

		const shirtPathBase = join(
			import.meta.dirname,
			"../core/public/images/shirts",
		);
		this.cosmetics.shirts = shirts
			.filter((h) => !h.hide)
			.map((s) => ({
				id: s.id,
				name: s.name,
				desc: s.desc,
				chance: s.chance,
				count: 0,
				left: existsSync(join(shirtPathBase, s.id.toString(), "l.png")),
				up: existsSync(join(shirtPathBase, s.id.toString(), "u.png")),
			}))
			.toSorted((a, b) => a.chance - b.chance);

		this.cosmetics.camos = camos
			.filter((h) => !h.hide)
			.map((p) => ({
				id: p.id,
				name: p.name,
				chance: p.chance,
				count: 0,
			}))
			.toSorted((a, b) => a.chance - b.chance);
	}
}
