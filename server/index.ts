import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Server, type Socket } from "socket.io";
import {
	shootNextBullet,
	getNextBullet,
	setupMap,
	wallCol,
	getCurrentWeapon,
	roundNumber,
	getDistance,
} from "core/src/utils.ts";
import { ServerProjectile } from "./utils.ts";
import { characterClasses, weapons } from "core/src/loadouts.ts";
import type { Player, Tile, MapObjects } from "core/src/types.ts";
import { genData } from "./genData.ts";

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

let nextAvailableSid = 0;
function getNewSid() {
	const toret = nextAvailableSid;
	nextAvailableSid++;
	return toret;
}

const io = new Server({
	cors: {
		origin: "http://localhost:1118",
		methods: ["GET"],
	},
});

let bullets = [];
let players: Player[] = [];
let mapTileScale = genData.width * genData.height;
let tiles: Tile[] = [];
let clutter: MapObjects[] = [];
let pickups: MapObjects[] = [];
let mapData = {
	gameMode: {
		code: "tdm",
		name: "Team Deathmatch",
		score: 100,
		desc1: "Eliminate the enemy team",
		desc2: "Eliminate the enemy team",
		teams: true,
	},
	clutter: clutter,
	genData: genData,
	pickups: pickups,
	tiles: tiles,
	width: (genData.width - 4) * mapTileScale,
	height: (genData.height - 4) * mapTileScale,
};
setupMap(mapData, mapTileScale);
let scoreRed = 0;
let scoreBlue = 0;
for (let i = 0; i < 100; i++) {
	bullets.push(new ServerProjectile());
}

io.on("connection", (socket: Socket) => {
	console.log("con", socket.id);

	const sid = getNewSid();
	let player: Player = {
		id: 0,
		room: "DEV",
		index: sid,
		name: `Guest_${sid}`,
		account: { clan: "" },
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
		team: players.length % 2 === 0 ? "blue" : "red",
	};
	players.push(player);

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

	socket.on("cSrv", (data) => {
		if (data.srvMap) {
			mapData.tiles = tiles = [];
			mapData.genData = data.srvMap;
			mapTileScale = data.srvMap.width * data.srvMap.height;
			mapData.width = (data.srvMap.width - 4) * mapTileScale;
			mapData.height = (data.srvMap.height - 4) * mapTileScale;
			setupMap(mapData, mapTileScale);
			tiles = mapData.tiles;
		}
	});

	socket.on("gotit", (client, init, currentTime) => {
		console.log("gotit", client, init, currentTime);
		player.name = client.name ? client.name : player.name;
		player.classIndex = client.classIndex ? client.classIndex : 0;
		const currentClass = characterClasses[player.classIndex];
		player.weapons = currentClass.weaponIndexes.map((i) =>
			structuredClone(weapons[i]),
		);
		player.health = player.maxHealth = currentClass.maxHealth;
		player.height = currentClass.height;
		player.width = currentClass.width;
		player.speed = currentClass.speed;
		if (init) return;

		player.dead = false;
		player.onScreen = true;
		player.angle = 0;
		player.x = 0;
		player.y = 0;
		for (let i = 0; i < tiles.length; i++) {
			let tl = tiles[i];
			let mid = tl.scale / 2;
			if (tl.spriteIndex === 2) {
				player.x = tl.x + mid;
				player.y = tl.y + mid;
			}
		}

		const gameSetup = {
			mapData: mapData,

			maxScreenWidth: 1920,
			maxScreenHeight: 1080,
			viewMult: 1,
			tileScale: mapTileScale,

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
			players.flatMap((pl) => [pl.index]),
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
		setTimeout(() => {
			socket.emit("r", player.currentWeapon);
		}, weapons[player.currentWeapon].reloadSpeed ?? 0);
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
		for (let b = 0; b < currentWeapon.bulletsPerShot; b++) {
			const bullet = getNextBullet(bullets);
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
					for (let i = 0; i < bullet.lastHit.length; i++) {
						updateHit(player, players[bullet.lastHit[i]], -bullet.dmg);
					}
				} else if (bullet.explodeOnDeath) {
					io.emit("ex", bullet.x, bullet.y, 3);
					for (let p = 0; p < players.length; p++) {
						const tmpPlayer = players[p];
						//TODO
						const dist = getDistance(
							bullet.x,
							bullet.y,
							tmpPlayer.x,
							tmpPlayer.y - tmpPlayer.height / 2,
						);
						if (bullet.blastRadius > dist) {
							const dmg =
								-bullet.blastRadius + Math.round(dist) < -bullet.dmg
									? -bullet.dmg
									: -bullet.blastRadius + Math.round(dist);
							updateHit(player, tmpPlayer, dmg);
						}
					}
				} else {
					bullet.update(player.delta, currentTime, clutter, tiles, players);
					setTimeout(updateBullet, player.delta);
					return;
				}
				bullet.deactivate();
			};
			updateBullet();

			const updateHit = (source: Player, dest: Player, dmg: number) => {
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
					players.flatMap((pl) => [pl.index]),
				);

				source.team === "red" ? (scoreRed += 20) : (scoreBlue += 20);

				io.emit("ts", scoreRed, scoreBlue);
				if (
					scoreRed >= mapData.gameMode.score ||
					scoreBlue >= mapData.gameMode.score
				) {
					io.emit(
						"7",
						scoreRed > scoreBlue ? "red" : "blue",
						players,
						{},
						false,
					);
					let timeLeft = 15;
					let timer = setInterval(() => {
						if (timeLeft >= 0) {
							io.emit("8", timeLeft--);
						} else {
							scoreRed = 0;
							scoreBlue = 0;
							for (let i = 0; i < players.length; i++) {
								players[i].score = 0;
								players[i].kills = 0;
								players[i].deaths = 0;
								io.emit(
									"welcome",
									{
										id: players[i].id,
										room: players[i].room,
										name: players[i].name,
										classIndex: players[i].classIndex,
									},
									true,
								);
							}
							io.emit(
								"lb",
								players.flatMap((pl) => [pl.index]),
							);
							io.emit(
								"ts",
								dest.team === "red" ? scoreRed : scoreBlue,
								source.team === "red" ? scoreRed : scoreBlue,
							);
							clearInterval(timer);
						}
					}, 1000);
				}
			};
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
		wallCol(player, { tiles }, { clutter });
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
