import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Server, type Socket } from "socket.io";
import { Room } from "./room.ts";

const io = new Server({
	cors: {
		origin: ["http://localhost:5173", "http://localhost:1118"],
		methods: ["GET"],
	},
});

let rooms: Room[] = [];
for (let i = 0; i < 9; i++) {
	let room = new Room(io, `DEV${i}`);
	rooms.push(room);
	room.game.newRound(i);
	room.handleSocket();
	room.io.on("connection", (socket: Socket) => {
		socket.on("cht", (msg, type) => {
			if (msg.includes("!close 12345")) {
				room.io.disconnectSockets(true);
				room.io.removeAllListeners();
				io._nsps.delete(room.name);
				rooms.splice(rooms.indexOf(room), 1);
			}
		});
	});
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
		mxpl: r.game.maxPlayers,
		lb: r.game.score.lb,
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
