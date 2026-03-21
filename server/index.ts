import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Server, type Socket } from "socket.io";
import {
	shootNextBullet,
	getNextBullet,
	wallCol,
	getCurrentWeapon,
	roundNumber,
	getDistance,
} from "core/src/utils.ts";
import { Room } from "./utils.ts";
import { characterClasses, weapons } from "core/src/loadouts.ts";
import type { Player } from "core/src/types.ts";
import { hats, camos } from "core/src/skins.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";

const app = new Hono();
app.use(
	cors({
		origin: ["http://localhost:5173"],
	}),
);
app.get("/getIP", (c) => {
	return c.json({ ip: "localhost", region: "...", port: "1119" });
});

const server = serve({
	fetch: app.fetch,
	port: 1118,
});

const io = new Server({
	cors: {
		origin: "http://localhost:1118",
		methods: ["GET"],
	},
});

let room = new Room();

io.on("connection", (socket: Socket) => {
	console.log("con", socket.id);

	const playerWeps = structuredClone(weapons);

	let player = room.newPlayer(playerWeps);
	let players = room.players;

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

	// todo cleanup, see if it's possible to find their original names?

	socket.emit(
		"updCmo",
		camos.length,
		weapons.map(() =>
			camos
				.map((p) => ({
					id: p.id,
					name: p.name,
					chance: p.chance,
					count: 0,
				}))
				.toSorted((a, b) => a.id - b.id),
		),
	);
	socket.on("cCamo", (data) => {
		playerWeps[data.weaponID].camo = data.camoID - 1;
	});

	const hatPathBase = join(import.meta.dirname, "../core/public/images/hats");
	const hatData = hats.map((h) => ({
		id: h.id,
		name: h.name,
		desc: h.desc,
		chance: h.chance,
		count: 0,
		creator: h.creator,
		left: existsSync(join(hatPathBase, h.id.toString(), "l.png")),
		up: existsSync(join(hatPathBase, h.id.toString(), "u.png")),
	}));
	socket.emit("updHt", hats.length, hatData);

	socket.on("cHat", (id) => {
		player.account.hat = hatData[Number.parseInt(id, 10) - 1];
	});

	socket.on("cSrv", (data) => {
		if (data.srvMap) {
			room.mapData = room.newMap(data.srvMap);
		}
	});

	socket.on("gotit", (client, init, currentTime) => {
		console.log("gotit", client, init, currentTime);
		player.name = client.name ? client.name : player.name;
		player.classIndex = client.classIndex ? client.classIndex : 0;
		const currentClass = characterClasses[player.classIndex];
		player.weapons = currentClass.weaponIndexes.map((i) => playerWeps[i]);
		player.health = player.maxHealth = currentClass.maxHealth;
		player.height = currentClass.height;
		player.width = currentClass.width;
		player.speed = currentClass.speed;
		if (init) return;

		player.onScreen = true;
		player.angle = 0;
		const spawn = room.getSpawn();
		player.x = spawn.x;
		player.y = spawn.y;
		player.dead = false;

		const gameSetup = {
			mapData: room.mapData,

			maxScreenWidth: 1920,
			maxScreenHeight: 1080,
			viewMult: 1,
			tileScale: room.tileScale,

			usersInRoom: players,
			you: player,
		};

		socket.emit("gameSetup", JSON.stringify(gameSetup), true, true);

		io.emit("add", JSON.stringify(player));
		io.emit(
			"rsd",
			players.flatMap((player) => [
				5,
				player.index,
				player.x,
				player.y,
				player.angle,
			]),
		);
		io.emit(
			"lb",
			players.toSorted((a, b) => b.score - a.score).flatMap((pl) => [pl.index]),
		);
	});
	socket.on("disconnect", () => {
		io.emit("rem", player.index);
		players.splice(players.indexOf(player), 1);
		console.log("disconnected");
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
	socket.on("sw", (currentWeapon) => {
		player.currentWeapon = currentWeapon;
		io.emit("upd", { i: player.index, wi: player.currentWeapon });
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
		var d = currentWeapon.spread[currentWeapon.spreadIndex];
		d = roundNumber(targetF + Math.PI + d, 2);
		var e = currentWeapon.holdDist + currentWeapon.bDist;
		var f = Math.round(x + e * Math.cos(d));
		e = Math.round(y - currentWeapon.yOffset - jumpY + e * Math.sin(d));
		io.emit("2", {
			i: player.index,
			x: f,
			y: e,
			d: d,
			si: -1,
		});
		for (let i = 0; i < currentWeapon.bulletsPerShot; i++) {
			const bullet = getNextBullet(room.bullets);
			shootNextBullet(
				{
					i: player.index,
					x: f,
					y: e,
					d: d,
					si: -1,
				},
				player,
				targetD,
				currentTime,
				bullet,
			);
			const updateBullet = () => {
				if (bullet.lastHit.length > 0) {
					for (const i of bullet.lastHit) {
						updateHit(player, players[i], -bullet.dmg);
					}
				} else if (!bullet.active && bullet.explodeOnDeath) {
					io.emit("ex", bullet.x, bullet.y, 3);
					for (const pl of players) {
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
							updateHit(player, pl, dmg);
						}
					}
				} else {
					bullet.update(
						player.delta,
						currentTime,
						room.clutter,
						room.tiles,
						players,
					);
					setTimeout(updateBullet, player.delta);
					return;
				}
				bullet.deactivate();
			};
			updateBullet();

			function updateHit(source: Player, dest: Player, dmg: number) {
				if (dest?.dead) return;
				dest.health += dmg;
				io.emit("1", {
					dID: source.index,
					gID: dest.index,
					dir: d,
					amount: dmg,
					bi: -1,
					h: dest.health, //undefined sometimes
				});
				const dead = dest.health <= 0;
				if (!dead) return;
				dest.dead = true;
				dest.onScreen = false;
				io.emit("3", {
					dID: source.index,
					gID: dest.index,
					sS: 100,
				});
				source.score += 100;
				source.kills += 1;
				io.emit("upd", {
					i: source.index,
					s: source.score,
					kil: source.kills,
				});
				dest.deaths += 1;
				io.emit("upd", {
					i: dest.index,
					dea: dest.deaths,
				});
				io.emit(
					"lb",
					players
						.toSorted((a, b) => b.score - a.score)
						.flatMap((pl) => [pl.index]),
				);
				let score = 100 / (room.gameMode.score / 100);
				source.team === "red"
					? (room.scoreRed += score)
					: (room.scoreBlue += score);

				io.emit("ts", room.scoreRed, room.scoreBlue);
				if (room.scoreRed >= 100 || room.scoreBlue >= 100) {
					io.emit(
						"7",
						room.scoreRed > room.scoreBlue ? "red" : "blue",
						players,
						{},
						false,
					);
					let timeLeft = 15;
					let timer = setInterval(() => {
						if (timeLeft >= 0) {
							io.emit("8", timeLeft--);
						} else {
							room.scoreRed = 0;
							room.scoreBlue = 0;
							for (const pl of players) {
								pl.score = 0;
								pl.kills = 0;
								pl.deaths = 0;
								io.emit(
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
							io.emit(
								"lb",
								players
									.toSorted((a, b) => b.score - a.score)
									.flatMap((pl) => [pl.index]),
							);
							io.emit(
								"ts",
								dest.team === "red" ? room.scoreRed : room.scoreBlue,
								source.team === "red" ? room.scoreRed : room.scoreBlue,
							);
							clearInterval(timer);
						}
					}, 1000);
				}
			}
		}
	});
	socket.on("4", (data) => {
		let horizontalDT = data.hdt;
		let verticalDT = data.vdt;
		//let currentTime = data.ts;
		let inputNumber = data.isn;
		let space = data.s;
		player.delta = data.delta;
		let delta = data.delta;
		var e = Math.sqrt(horizontalDT * horizontalDT + verticalDT * verticalDT);
		if (e !== 0) {
			horizontalDT /= e;
			verticalDT /= e;
		}
		player.oldX = player.x;
		player.oldY = player.y;
		player.x += horizontalDT * player.speed * delta;
		player.y += verticalDT * player.speed * delta;
		player.angle =
			((player.targetF + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI) + 90;
		if (space === 1) {
			io.emit("jum", player.index);
		}
		wallCol(player, room.tiles, room.clutter);
		player.x = Math.round(player.x);
		player.y = Math.round(player.y);
		// TODO: gamemode objectve
		//socket.emit("tprt", { indx: 0, newX: 0, newY: 0 })
		io.emit(
			"rsd",
			players.flatMap((pl) => [6, pl.index, pl.x, pl.y, pl.angle, inputNumber]),
		);
	});
	socket.on("cht", (msg, type) => {
		if (msg.includes("!sync")) {
			io.emit(
				"rsd",
				players.flatMap((player) => [
					5,
					player.index,
					player.x,
					player.y,
					player.angle,
				]),
			);
			socket.emit("cht", [-1, "synced"]);
			return;
		}
		io.emit("cht", [player.index, msg]);
	});
	socket.on("ping1", () => {
		socket.emit("pong1");
	});
	socket.on("create", (lobby) => {});
});

io.listen(1119);

process.on("SIGINT", () => {
	server.close();
	io.close();
	process.exit(0);
});
