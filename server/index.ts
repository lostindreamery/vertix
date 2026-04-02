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
import { hats, camos, shirts } from "core/src/skins.ts";
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

new Room(io);

io.listen(1119);

process.on("SIGINT", () => {
	server.close();
	io.close();
	process.exit(0);
});
