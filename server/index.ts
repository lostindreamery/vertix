import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Server } from "socket.io";
import { Room } from "./room.ts";

const io = new Server({
	cors: {
		origin: ["http://localhost:5173", "http://localhost:1118"],
		methods: ["GET"],
	},
});

let rooms: Room[] = [];
for (let i = 0; i < 3; i++) {
	let room = new Room(io, `DEV${i}`);
	room.handleSocket();
	rooms.push(room);
}

io.listen(1119);

const app = new Hono();
app.use(
	cors({
		origin: ["http://localhost:5173"],
	}),
);
app.get("/getIP", (c) => {
	let room: Room;
	if (c.req.query("room") !== "") {
		room = rooms.find((r) => r.name === c.req.query("room")) || rooms[0];
	} else {
		room = rooms[0];
	}
	return c.json({
		ip: "localhost",
		region: "...",
		port: "1119",
		room: room.name,
	});
});
app.get("/getRooms", (c) => {
	const list = rooms.map((r) => ({
		n: r.name,
		m: r.game.mode.code,
		pl: r.game.players.length,
	}));
	return c.json(list);
});

const server = serve({
	fetch: app.fetch,
	port: 1118,
});

process.on("SIGINT", () => {
	server.close();
	io.close();
	process.exit(0);
});
