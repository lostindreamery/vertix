import { io, type Socket } from "socket.io-client";

// WAIT FOR WINDOW TO LOAD:
var socket: Socket;
var fetchedBoards = ",";
var rankLeaderboard = document.getElementById("rankLeaderboard")!;
var rankButton = document.getElementById("rankButton")!;
var kdrLeaderboard = document.getElementById("kdrLeaderboard")!;
var kdrButton = document.getElementById("kdrButton")!;
var kdrLeaderboard2 = document.getElementById("kdr2Leaderboard")!;
var kdrButton2 = document.getElementById("kdr2Button")!;
var killsLeaderboard = document.getElementById("killsLeaderboard")!;
var killsButton = document.getElementById("killsButton")!;
var clnRankLeaderboard = document.getElementById("clnRankLeaderboard")!;
var clnRankButton = document.getElementById("clnRankButton")!;
var clnKdrLeaderboard = document.getElementById("clnKdrLeaderboard")!;
var clnKdrButton = document.getElementById("clnKdrButton")!;
var linkedBoard = location.hash.replace("#", "");
window.onload = async () => {
	const resp = await fetch("http://localhost:1118/getIP");
	const { ip, port } = await resp.json();
	// for now
	socket = io(`https://${ip}:${port}`, {
		autoConnect: false, // temporary
		reconnection: false,
		forceNew: true,
		query: {
			fetchLeaderboards: true,
		},
	});
	socket.on("getLeaderboards", (response, lType, worked) => {
		if (!worked) {
			document.getElementById(`${lType}Leaderboard`)!.innerHTML =
				`<div class='leaderMessage'><b>${response}</b></div>`;
			return;
		}
		var tmpHTML = "";
		var leaderList = response;
		if (lType === "rank") {
			for (const [i, item] of leaderList.entries()) {
				tmpHTML +=
					"<div onclick='showUserStatPage(\"" +
					item.user_name +
					"\")' class='leaderboardItemWrapper'>" +
					(i + 1) +
					". <span class='clanDisplay'>" +
					(item.user_clan ? `[${item.user_clan.toUpperCase()}] ` : "") +
					"</span><span class='leaderNameDisplay'>" +
					item.user_name +
					" RNK " +
					item.user_rank +
					"</span></div>";
			}
			rankLeaderboard.innerHTML = tmpHTML;
		} else if (lType.indexOf("cln") >= 0) {
			for (const [i, item] of leaderList.entries()) {
				tmpHTML +=
					"<div class='leaderboardItemWrapper'>" +
					(i + 1) +
					". <span class='clanDisplay'>[" +
					item.clan_name +
					"] (" +
					item.clan_members +
					" members)</span><span class='leaderNameDisplay'> RNK " +
					item.clan_level +
					" KDR " +
					item.clan_kd +
					"</span></div>";
			}
			if (lType === "clnRank") {
				clnRankLeaderboard.innerHTML = tmpHTML;
			} else if (lType === "clnKdr") {
				clnKdrLeaderboard.innerHTML = tmpHTML;
			}
		} else if (lType === "kills") {
			for (const [i, item] of leaderList.entries()) {
				tmpHTML +=
					"<div onclick='showUserStatPage(\"" +
					item.user_name +
					"\")' class='leaderboardItemWrapper'>" +
					(i + 1) +
					". <span class='clanDisplay'>" +
					(item.user_clan ? `[${item.user_clan.toUpperCase()}] ` : "") +
					"</span><span class='leaderNameDisplay'>" +
					item.user_name +
					" " +
					item.user_kills +
					" KILLS</span></div>";
			}
			killsLeaderboard.innerHTML = tmpHTML;
		} else {
			for (const [i, item] of leaderList.entries()) {
				let tmpKD = (Math.max(1, item.user_kills) / Math.max(1, item.user_deaths)).toFixed(2);
				tmpHTML +=
					"<div onclick='showUserStatPage(\"" +
					item.user_name +
					"\")' class='leaderboardItemWrapper'>" +
					(i + 1) +
					". <span class='clanDisplay'>" +
					(item.user_clan ? `[${item.user_clan.toUpperCase()}] ` : "") +
					"</span><span class='leaderNameDisplay'>" +
					item.user_name +
					" KDR " +
					tmpKD +
					" (" +
					item.user_kills +
					"/" +
					item.user_deaths +
					")</span></div>";
			}
			if (lType === "kdr") {
				kdrLeaderboard.innerHTML = tmpHTML;
			} else if (lType === "kdr2") {
				kdrLeaderboard2.innerHTML = tmpHTML;
			}
		}
	});
	// socket.on("connect_failed", () => {
	// 	serverMessage.textContent = "Connection Failed. Try again later.";
	// });
	toggleLeaderboardDisplay(linkedBoard === "" ? "rank" : linkedBoard);
};

// CHANGE DISPLAY:
function toggleLeaderboardDisplay(board: string) {
	// HIDE ALL:
	rankLeaderboard.style.display = "none";
	rankButton.className = "changeLeaderbordButton";
	kdrLeaderboard.style.display = "none";
	kdrButton.className = "changeLeaderbordButton";
	kdrLeaderboard2.style.display = "none";
	kdrButton2.className = "changeLeaderbordButton";
	killsLeaderboard.style.display = "none";
	killsButton.className = "changeLeaderbordButton";
	clnRankLeaderboard.style.display = "none";
	clnRankButton.className = "changeLeaderbordButton";
	clnKdrLeaderboard.style.display = "none";
	clnKdrButton.className = "changeLeaderbordButton";

	// FETCH DATA:
	if (socket && fetchedBoards.indexOf(`,${board},`) < 0) {
		fetchedBoards += `${board},`;
		socket.emit("ftchLead", board);
	}

	// SHOW BOARD:
	document.getElementById(`${board}Leaderboard`)!.style.display = "block";
	document.getElementById(`${board}Button`)!.className += " activeButton";
}

// CLICK ON USER:
function showUserStatPage(userName: string) {
	window.open(`/profile.html?${userName}`, "_blank");
}

declare global {
	interface Window {
		toggleLeaderboardDisplay: typeof toggleLeaderboardDisplay;
		showUserStatPage: typeof showUserStatPage;
	}
}
window.toggleLeaderboardDisplay = toggleLeaderboardDisplay;
window.showUserStatPage = showUserStatPage;
