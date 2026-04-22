import { io, type Socket } from "socket.io-client";

// WAIT FOR WINDOW TO LOAD:
var socket: Socket;
var userNameVar = window.location.search.substring(1);
var userName = document.getElementById("userName")!;
var userClanName = document.getElementById("userClanName")!;
var userRank = document.getElementById("userRank")!;
var userHats = document.getElementById("userHats")!;
var userWorldRank = document.getElementById("userWorldRank")!;
var userKDR = document.getElementById("userKDR")!;
var userLikes = document.getElementById("userLikes")!;
var userScore = document.getElementById("userScore")!;
var serverMessage = document.getElementById("serverMessage")!;
var userKills = document.getElementById("userKills")!;
var userDeaths = document.getElementById("userDeaths")!;
if (!userNameVar) {
	serverMessage.innerHTML = "No profile Found.";
	throw new Error("No profile Found.");
}
window.onload = async () => {
	const resp = await fetch("http://localhost:1118/getIP");
	const { ip, port } = await resp.json();
	if (socket) return;
	socket = io(`http://${ip}:${port}`, {
		autoConnect: false, // temporary
		reconnection: false,
		forceNew: true,
		query: {
			statUser: userNameVar,
		},
	});
	socket.on("getStats", (stats, worked) => {
		if (worked) {
			let tmpClan: string;
			if (!stats.clan) {
				tmpClan = "NO CLAN";
			} else {
				tmpClan = `[${stats.clan.toUpperCase()}]`;
			}
			userName.innerHTML = stats.name;
			userClanName.innerHTML = tmpClan;
			userRank.innerHTML = stats.rank;
			userWorldRank.innerHTML = `#${stats.world}`;
			userKDR.innerHTML = (Math.max(1, stats.kills) / Math.max(1, stats.deaths)).toFixed(2);
			userScore.innerHTML = abbreviateNumber(stats.score);
			userLikes.innerHTML = abbreviateNumber(stats.likes);
			userKills.innerHTML = abbreviateNumber(stats.kills);
			userHats.innerHTML = stats.hatsTotal;
			userDeaths.innerHTML = abbreviateNumber(stats.deaths);
			// loadSocialButtons(stats);
		} else {
			serverMessage.innerHTML = stats;
		}
		socket.disconnect();
	});
	socket.on("connect_failed", () => {
		serverMessage.innerHTML = "Connection Failed. Try again later.";
	});
};

// function loadSocialButtons(user) {
// 	twttr.widgets.createShareButton(
// 		encodeURI("http://vertix.io/profile.html?" + user.name),
// 		document.getElementById("twitterContainer"),
// 		{
// 			text: "Check out my stats on Vertix Online:",
// 			hashtags: "vertix.io",
// 			size: "large",
// 		},
// 	);
// 	if (user.channel != "") {
// 		gapi.ytsubscribe.render(document.getElementById("youtuberReplace"), {
// 			channel: user.channel,
// 			layout: "default",
// 		});
// 	}
// }

function abbreviateNumber(value: number) {
	if (value < 1000) return value.toString();

	const suffixes = ["", "k", "m", "b", "t"];
	const suffixIndex = Math.floor(Math.log10(value) / 3);
	const shortValue = value / 1000 ** suffixIndex;

	const formatted = parseFloat(shortValue.toPrecision(2)).toString();

	return `${formatted}${suffixes[suffixIndex]}`;
}
