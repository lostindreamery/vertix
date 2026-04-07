import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Server } from "socket.io";
import { Room } from "./room.ts";

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
