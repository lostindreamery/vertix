import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Server, Socket } from "socket.io";
import { characterClasses } from "core/src/loadouts.ts";
import type { Projectile } from "core/src/logic/projectile.ts";
import { camos, hats, shirts } from "core/src/skins.ts";
import type { Player, ZoneEvent } from "core/src/types.ts";
import {
	dotInRect,
	getCurrentWeapon,
	getDistance,
	getNextBullet,
	roundNumber,
	shootNextBullet,
	wallCol,
} from "core/src/utils.ts";
import type { Room } from "./room.ts";

export class RoomSocket {
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
		this.io.on("connection", (socket: Socket) => {
			console.log("con", socket.id);

			let player = this.room.newPlayer();

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
				this.room.weapons.map(() => this.cosmetics.camos),
			);

			socket.on("cHat", (id) => {
				player.account.hat = hats[id - 1];
			});
			socket.on("cShirt", (id) => {
				player.account.shirt = shirts[id - 1];
			});
			socket.on("cCamo", (data) => {
				const wep = this.room.weapons[data.weaponID];
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
				}
				player.currentWeapon = 0;
				const currentClass = characterClasses[player.classIndex];
				player.weapons = currentClass.weaponIndexes.map(
					(i) => this.room.weapons[i],
				);
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
				socket.emit(
					"rsd",
					this.room.players.flatMap((pl) => [
						5,
						pl.index,
						pl.x,
						pl.y,
						pl.angle,
					]),
				);
				if (this.room.gameEnded) {
					socket.emit(
						"7",
						player.team,
						this.room.players,
						this.room.modeVotes,
						false,
					);
				} else {
					this.updateScore(0, player);
				}
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
				for (let i = 0; i < currentWeapon.bulletsPerShot; i++) {
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
				//TODO
				if (space === 1) {
					this.io.emit("jum", player.index);
					if (player.jumpY <= 0) {
						player.jumpDelta = player.jumpStrength;
						player.jumpY = player.jumpDelta;
					}
				}
				if (player.jumpCountdown > 0) {
					player.jumpCountdown -= delta;
				}
				if (player.jumpY > 0) {
					player.jumpDelta -= player.gravityStrength * delta;
					player.jumpY += player.jumpDelta * delta;
					if (player.jumpY <= 0) {
						player.jumpY = 0;
						player.jumpDelta = 0;
						player.jumpCountdown = 250;
						if (player.classIndex === 8) {
							const dir = roundNumber(player.targetF + Math.PI, 2);
							this.doExplosion(
								player,
								player.x,
								player.y,
								100,
								100,
								dir,
								false,
							);
						}
					}
					player.jumpY = Math.round(player.jumpY);
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
		if (leaderboardScore >= 100 && !this.room.gameEnded) {
			this.room.gameEnded = true;
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
					this.room.newGame();
					for (const pl of this.room.players) {
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
					this.handleHit(player, this.room.players[i], -bullet.dmg, dir, -1);
				}
			} else if (!bullet.active && bullet.explodeOnDeath) {
				this.doExplosion(
					player,
					bullet.x,
					bullet.y,
					bullet.blastRadius,
					bullet.dmg,
					dir,
					bullet.selfDamage,
				);
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

	handleHit(
		source: Player,
		dest: Player,
		dmg: number,
		dir: number,
		bi?: number,
	) {
		if (dest?.dead) return;
		dest.health += dmg;
		this.io.emit("1", {
			dID: source.index,
			gID: dest.index,
			dir: dir,
			amount: dmg,
			bi: bi ? bi : null,
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

	doExplosion(
		source: Player,
		x: number,
		y: number,
		radius: number,
		maxDmg: number,
		dir: number,
		selfDamage: boolean,
	) {
		this.io.emit("ex", x, y, 3);
		for (const pl of this.room.players) {
			if (!selfDamage && pl.index === source.index) continue;
			const left = pl.x - pl.width / 2;
			const right = pl.x + pl.width / 2;
			const top = pl.y - pl.height;
			const bottom = pl.y;
			const dist = getDistance(
				x,
				y,
				Math.max(left, Math.min(right, x)),
				Math.max(top, Math.min(bottom, y)),
			);
			if (radius > dist) {
				const dmg =
					-radius + Math.round(dist) < -maxDmg
						? -maxDmg
						: -radius + Math.round(dist);
				this.handleHit(source, pl, dmg, dir);
			}
		}
	}

	checkSpecialTiles(player: Player) {
		for (const [i, pkup] of this.room.pickups.entries()) {
			if (
				pkup.active &&
				dotInRect(player.x, player.y, pkup.x, pkup.y, 64, 64)
			) {
				if (
					pkup.type === "healthpack" &&
					player.health < player.maxHealth &&
					!player.isBoss
				) {
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
