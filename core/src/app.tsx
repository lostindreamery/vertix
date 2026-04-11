import * as zip from "@zip.js/zip.js";
import $ from "jquery";
import { io, type Socket } from "socket.io-client";
import { mount } from "svelte";
import Controls from "./components/controls.svelte";
import Settings from "./components/settings.svelte";
import { characterClasses, setCharacterClasses, specialClasses, weaponNames } from "./loadouts.ts";
import { Projectile } from "./logic/projectile.ts";
import { loadSounds, playSound, startSoundTrack, stopAllSounds } from "./sound.ts";
import { st } from "./state.svelte.ts";
import type {
	Account,
	GameMode,
	GenData,
	InputSendData,
	MapObject,
	Player,
	ShootEvent,
	Sprite,
	SpriteCanvas,
	Tile,
} from "./types.ts";
import * as utils from "./utils.ts";
import {
	deactiveAllAnimTexts,
	renderShadedAnimText,
	showNotification,
	startBigAnimText,
	startMovingAnimText,
	updateAnimTexts,
	updateNotifications,
} from "./visual/animtext.ts";
import { ChatManager } from "./visual/chat.tsx";
import { updateFlashGlows } from "./visual/flash.ts";
import {
	createExplosion,
	createLiquid,
	createSmokePuff,
	particleCone,
	stillDustParticle,
	updateParticles,
} from "./visual/particle.ts";
import { screenShake, updateScreenShake } from "./visual/shake.ts";

const { shootNextBullet, getNextBullet, setupMap, wallCol, getCurrentWeapon, randomInt, canSee } =
	utils;

let playerName: string | undefined;
var playerClassIndex: number | undefined;
var playerNameInput = document.getElementById("playerNameInput") as HTMLInputElement;
var socket: Socket | undefined;
var reason: string | undefined;
var room: any;
var currentFPS = 0;
var fillCounter = 0;
var currentLikeButton: number = null;
var delta = 0;
var currentTime = Date.now();
var oldTime = Date.now();
var count = -1;
var clientPrediction = true;
var inputNumber = 0;
var clientSpeed = 12;
var thisInput: InputSendData[] = [];
var timeOfLastUpdate = 0;

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
	st.mobile = true;
	hideMenuUI();
	hideUI(true);
	alert("tried to open google play");
	// openGooglePlay(false);
}
var previousClass = 0;
var previousHat = 0;
var previousShirt = 0;
var previousSpray = 0;
var changingLobby = false;
var inMainMenu = true;
var loggedIn = false;
function startGame() {
	if (!st.startingGame && !changingLobby) {
		st.startingGame = true;
		playerName = playerNameInput.value.replace(/(<([^>]+)>)/gi, "").substring(0, 25);
		enterGame();
		if (inMainMenu) {
			$("#loadingWrapper").fadeIn(0, () => {});
			document.getElementById("loadText").textContent = "CONNECTING";
		}
	}
}
var devTest = false;
function enterGame() {
	startSoundTrack(2);
	playerClassIndex = currentClassID;
	screenWidth = window.innerWidth;
	screenHeight = window.innerHeight;
	document.getElementById("startMenuWrapper").style.display = "none";
	if (!room) {
		socket.emit("create");
	}
	socket.emit("respawn");
	hideMenuUI();
	animateOverlay = true;
	updateGameLoop();
}
var clanDBMessage = document.getElementById("clanDBMessage");
var clanStats = document.getElementById("clanStats");
var clanSignUp = document.getElementById("clanSignUp");
var clanHeader = document.getElementById("clanHeader");
var clanAdminPanel = document.getElementById("clanAdminPanel");
var clanInviteInput = document.getElementById("clanInviteInput") as HTMLInputElement;
var leaveClanButton = document.getElementById("leaveClanButton");
var clanInvMessage = document.getElementById("clanInvMessage");
var clanChtMessage = document.getElementById("clanChtMessage");
var clanChatLink = document.getElementById("clanChatLink");
var loginWrapper = document.getElementById("loginWrapper");
var loggedInWrapper = document.getElementById("loggedInWrapper");
var loginMessage = document.getElementById("loginMessage");
var userNameInput = document.getElementById("usernameInput") as HTMLInputElement;
var userEmailInput = document.getElementById("emailInput") as HTMLInputElement;
var userPassInput = document.getElementById("passwordInput") as HTMLInputElement;
var loginUserNm = "";
var loginUserPs = "";
var settings = document.getElementById("settings");
var controls = document.getElementById("controls");
var lobbyInput = document.getElementById("lobbyKey") as HTMLInputElement;
var lobbyPass = document.getElementById("lobbyPass") as HTMLInputElement;
var lobbyMessage = document.getElementById("lobbyMessage");
var serverCreateMessage = document.getElementById("serverCreateMessage");
var serverKeyTxt = document.getElementById("serverKeyTxt");

let dropUpLinksCount = 5;
let activeIndex = -1;
Array.from(document.getElementsByClassName("dropUpLink") as HTMLCollectionOf<HTMLElement>).map(
	(elem) =>
		elem.addEventListener("click", () => {
			clickDropUpLink(Number.parseInt(elem.attributes.getNamedItem("data-drop-idx").value));
		}),
);
function clickDropUpLink(index: number) {
	for (let i = 0; i < dropUpLinksCount; ++i) {
		const tmpIndex = i + 1;
		if (tmpIndex === index && activeIndex !== index) {
			activeIndex = index;
			document.getElementById(`di${tmpIndex}`).style.opacity = "1";
			document.getElementById(`di${tmpIndex}`).style.pointerEvents = "auto";
		} else {
			document.getElementById(`di${tmpIndex}`).style.opacity = "0";
			document.getElementById(`di${tmpIndex}`).style.pointerEvents = "none";
			if (tmpIndex === index) activeIndex = -1;
		}
	}
}

function startLogin() {
	if (!socket) return;
	socket.emit("dbLogin", {
		userName: userNameInput.value,
		userPass: userPassInput.value,
	});
	loginUserNm = userNameInput.value;
	loginUserPs = userPassInput.value;
	loginMessage.style.display = "block";
	loginMessage.textContent = "Please Wait...";
}
var customMap: GenData | null = null;

(document.getElementById("customMapFile") as HTMLInputElement).addEventListener(
	"change",
	function () {
		clearCustomMap();
		if (!this?.files[0]) return;
		var name = this.value.split("\\");
		document.getElementById("customMapButton").textContent = name[name.length - 1];
		let reader = new FileReader();
		reader.onload = (e) => {
			const img = document.createElement("img");
			img.onload = () => {
				let tmpCanvas = document.createElement("canvas");
				tmpCanvas.width = img.width;
				tmpCanvas.height = img.height;
				tmpCanvas.getContext("2d").drawImage(img, 0, 0, img.width, img.height);
				customMap = {
					width: img.width,
					height: img.height,
					data: tmpCanvas.getContext("2d").getImageData(0, 0, img.width, img.height).data,
				};
			};
			img.src = e.target.result as string;
		};
		reader.readAsDataURL(this.files[0]);
	},
);
function clearCustomMap() {
	customMap = null;
	document.getElementById("customMapButton").textContent = "Select Map";
}

window.onload = async () => {
	if (st.mobile) {
		document.getElementById("loadText").textContent = "MOBILE VERSION COMING SOON";
		return;
	}
	document.documentElement.style.overflow = "hidden";
	document.getElementById("gameAreaWrapper").style.opacity = "1";
	drawMenuBackground();
	document.getElementById("settingsButton").onclick = () => {
		if (settings.style.maxHeight === "200px") {
			settings.style.maxHeight = "0px";
		} else {
			settings.style.maxHeight = "200px";
			controls.style.maxHeight = "0px";
		}
	};
	document.getElementById("instructionButton").onclick = () => {
		if (controls.style.maxHeight === "200px") {
			controls.style.maxHeight = "0px";
		} else {
			controls.style.maxHeight = "200px";
			settings.style.maxHeight = "0px";
		}
	};
	document.getElementById("leaderButton").onclick = () => {
		window.open("/leaderboards.html", "_blank");
	};
	hideUI(true);
	$(".noRightClick").on("contextmenu", (_) => false);
	resize();
	$("#loadingWrapper").fadeOut(200, () => {});

	const roomName = window.location.pathname.split("/")[1] || "";
	const resp = await fetch(`http://localhost:1118/getIP?room=${roomName}`);
	const { ip, port, room } = await resp.json();
	if (!socket) {
		socket = io(`http://${devTest ? "localhost" : ip}:${port}/${room}`, {
			reconnection: true,
			transports: ["websocket"],
			forceNew: false,
		});
		st.socket = socket;
		setupSocket(socket);
	}
	socket.once("connect", () => {
		var logKey = localStorage.getItem("logKey");
		var userName = localStorage.getItem("userName");
		if (logKey && logKey !== "" && userName && userName !== "") {
			socket.emit("dbLogin", {
				lgKey: logKey,
				userName: userName,
				userPass: false,
			});
			loginMessage.style.display = "block";
			loginMessage.textContent = "Logging in...";
		} else {
			loadSavedClass();
		}
		document.getElementById("startButton").onclick = () => {
			startGame();
		};
		playerNameInput.addEventListener("keypress", (event) => {
			if (event.code === "Enter") {
				startGame();
			}
		});
		document.getElementById("texturePackButton").onclick = () => {
			loadModPack((document.getElementById("textureModInput") as HTMLInputElement).value, false);
		};
		document.getElementById("registerButton").onclick = () => {
			socket.emit("dbReg", {
				userName: userNameInput.value,
				userEmail: userEmailInput.value,
				userPass: userPassInput.value,
			});
			loginUserNm = userNameInput.value;
			loginUserPs = userPassInput.value;
			loginMessage.style.display = "block";
			loginMessage.textContent = "Registering...";
		};
		document.getElementById("loginButton").onclick = () => {
			startLogin();
		};
		document.getElementById("logoutButton").onclick = () => {
			loggedInWrapper.style.display = "none";
			loginWrapper.style.display = "block";
			loginMessage.textContent = "";
			loggedIn = false;
			resetHatList();
			resetShirtList();
			userName = logKey = "";
			localStorage.setItem("logKey", "");
			localStorage.setItem("userName", "");
			socket.emit("dbLogout");
		};
		document.getElementById("recoverButton").onclick = () => {
			socket.emit("dbRecov", {
				userMail: userEmailInput.value,
			});
			loginMessage.style.display = "block";
			loginMessage.textContent = "Please Wait...";
		};
		document.getElementById("createClanButton").onclick = () => {
			socket.emit("dbClanCreate", {
				clanName: (document.getElementById("clanNameInput") as HTMLInputElement).value,
			});
			clanDBMessage.style.display = "block";
			clanDBMessage.textContent = "Please Wait...";
		};
		document.getElementById("joinClanButton").onclick = () => {
			socket.emit("dbClanJoin", {
				clanKey: (document.getElementById("clanKeyInput") as HTMLInputElement).value,
			});
			clanDBMessage.style.display = "block";
			clanDBMessage.textContent = "Please Wait...";
		};
		document.getElementById("inviteClanButton").onclick = () => {
			socket.emit("dbClanInvite", {
				userName: clanInviteInput.value,
			});
			clanInvMessage.style.display = "block";
			clanInvMessage.textContent = "Please Wait...";
		};
		document.getElementById("kickClanButton").onclick = () => {
			socket.emit("dbClanKick", {
				userName: clanInviteInput.value,
			});
			clanInvMessage.style.display = "block";
			clanInvMessage.textContent = "Please Wait...";
		};
		leaveClanButton.onclick = () => {
			socket.emit("dbClanLeave");
		};
		document.getElementById("setChatClanButton").onclick = () => {
			socket.emit("dbClanChatURL", {
				chUrl: (document.getElementById("clanChatInput") as HTMLInputElement).value,
			});
			clanChtMessage.style.display = "inline-block";
			clanChtMessage.textContent = "Please Wait...";
		};
		document.getElementById("createServerButton").onclick = () => {
			var modes = [];
			for (let i = 0; i < 9; ++i) {
				if ((document.getElementById(`serverMode${i}`) as HTMLInputElement).checked) {
					modes.push(i);
				}
			}
			socket.emit("cSrv", {
				srvPlayers: (document.getElementById("serverPlayers") as HTMLInputElement).value,
				srvHealthMult: (document.getElementById("serverHealthMult") as HTMLInputElement).value,
				srvSpeedMult: (document.getElementById("serverSpeedMult") as HTMLInputElement).value,
				srvPass: (document.getElementById("serverPass") as HTMLInputElement).value,
				srvMap: customMap,
				srvClnWr: (document.getElementById("clanWarEnabled") as HTMLInputElement).checked,
				srvModes: modes,
			});
		};
		document.getElementById("joinLobbyButton").onclick = () => {
			if (changingLobby) return;
			if (!lobbyInput.value.split("/")[0].trim()) {
				lobbyMessage.style.display = "block";
				lobbyMessage.textContent = "Please enter a valid IP";
				return;
			}
			lobbyMessage.style.display = "block";
			lobbyMessage.textContent = "Please wait...";
			changingLobby = true;
			const s = io(`http://${lobbyInput.value.split("/")[0]}:${port}`, {
				reconnection: true,
				forceNew: true,
			});
			s.once("connect", () => {
				s.emit("create", {
					room: lobbyInput.value.split("/")[1],
					servPass: lobbyPass.value,
					lgKey: logKey,
					userName: userName,
				});
				s.once("lobbyRes", (a, d) => {
					lobbyMessage.textContent = a.resp || a;
					if (d) {
						socket.removeListener("disconnect");
						socket.once("disconnect", () => {
							socket.close();
							changingLobby = false;
							socket = s;
							st.socket = s;
							setupSocket(socket);
						});
						socket.disconnect();
					} else {
						changingLobby = false;
						s.disconnect();
						s.close();
					}
				});
			});
			s.on("connect_error", (_) => {
				lobbyMessage.textContent = "No Server Found.";
				changingLobby = false;
				s.close();
			});
		};
	});
};

var newUsernameInput = document.getElementById("newUsernameInput") as HTMLInputElement;
var youtubeChannelInput = document.getElementById("youtubeChannelInput") as HTMLInputElement;
var editProfileMessage = document.getElementById("editProfileMessage");
function updateAccountPage(a: Account) {
	st.player.account = a;
	document.getElementById("accStatRank").replaceChildren(
		<>
			<b>Rank: </b>
			{a.rank}
		</>,
	);
	document.getElementById("rankProgress").style.width = `${a.rankPercent}%`;
	document.getElementById("accStatKills").replaceChildren(
		<>
			<b>Kills: </b>
			{a.kills}
		</>,
	);
	document.getElementById("accStatDeaths").replaceChildren(
		<>
			<b>Deaths: </b>
			{a.deaths}
		</>,
	);
	document.getElementById("accStatKD").replaceChildren(
		<>
			<b>KD: </b>
			{a.kd}
		</>,
	);
	document.getElementById("accStatWorldRank").replaceChildren(
		<>
			<b>World Rank: </b>
			{a.worldRank}
		</>,
	);
	document.getElementById("accStatLikes").replaceChildren(
		<>
			<b>Likes: </b>
			{a.likes}
		</>,
	);
	document.getElementById("profileButton").onclick = () => {
		showUserStatPage(st.player.account.user_name);
	};
	newUsernameInput.value = st.player.account.user_name;
	youtubeChannelInput.value = st.player.account.channel;
	document.getElementById("saveAccountData").onclick = () => {
		socket.emit("dbEditUser", {
			userName: newUsernameInput.value,
			userChannel: youtubeChannelInput.value,
		});
		editProfileMessage.textContent = "Please Wait...";
	};
	clanAdminPanel.style.display = "none";
	leaveClanButton.style.display = "none";
	if (a.clan !== "") {
		clanSignUp.style.display = "none";
		clanStats.style.display = "block";
		leaveClanButton.style.display = "inline-block";
		leaveClanButton.textContent = "LEAVE CLAN";
		clanHeader.textContent = `[${a.clan}] CLAN:`;
		if (a.clan_owner === "1") {
			clanAdminPanel.style.display = "block";
			leaveClanButton.textContent = "DELETE CLAN";
		}
	} else {
		clanSignUp.style.display = "block";
		clanStats.style.display = "none";
		clanHeader.textContent = "Clans";
	}
}
function updateClanPage(clanData: any) {
	document.getElementById("clanStatRank").replaceChildren(
		<>
			<b>Rank: </b>
			{clanData.level}
		</>,
	);
	document.getElementById("clanStatKD").replaceChildren(
		<>
			<b>Avg KD: </b>
			{clanData.kd}
		</>,
	);
	document.getElementById("clanStatFounder").replaceChildren(
		<>
			<b>Founder: </b>
			{clanData.founder}
		</>,
	);
	document.getElementById("clanStatMembers").replaceChildren(
		<>
			<b>Roster:</b>
			{clanData.members}
		</>,
	);
	let chatURL = clanData.chatURL;
	if (chatURL !== "") {
		if (!chatURL.match(/^https?:\/\//i)) {
			chatURL = `http://${clanData}`;
		}
		clanChatLink.replaceChildren(
			<a target="_blank" href={chatURL}>
				Clan Chat
			</a>,
		);
	}
}
function showUserStatPage(userName: string) {
	window.open(`/profile.html?${userName}`, "_blank");
}
var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;
var gameWidth = 0;
var gameHeight = 0;
var uiScale = 1;
calculateUIScale();
var gameOverFade = false;
var disconnected = false;
var textSizeMult = 0.55;
var gameMode: GameMode = null;

var target = {
	f: 0,
	d: 0,
	dOffset: 0,
};
let players: Player[] = [];
let clutter: MapObject[] = [];
let flags: any[] = []; // todo
let bullets: Projectile[] = [];

var mapTileScale = 0;
var leaderboard = [];
const keys = {
	u: false,
	d: false,
	l: false,
	r: false,
	lm: false,
	s: false,
	rl: false,
};
var reenviar = true;
var directionLock = false;
var directions = [];
var mainCanvas = document.getElementById("cvs") as HTMLCanvasElement;
mainCanvas.width = screenWidth;
mainCanvas.height = screenHeight;
mainCanvas.addEventListener("mousemove", gameInput, false);
mainCanvas.addEventListener("mousedown", mouseDown, false);
mainCanvas.addEventListener("drag", mouseDown, false);
mainCanvas.addEventListener("click", focusGame, false);
mainCanvas.addEventListener("mouseup", mouseUp, false);
var lastAngle = 0;
var lastDist = 0;
var targetChanged = true;
function focusGame() {
	mainCanvas.focus();
}
function gameInput(event: MouseEvent) {
	event.preventDefault();
	event.stopPropagation();
	var b = getCurrentWeapon(st.player)?.yOffset ?? 0;
	let mouseX = event.clientX;
	let mouseY = event.clientY;
	lastAngle = target.f;
	lastDist = target.d;
	target.d = Math.sqrt(
		(mouseY - (screenHeight / 2 - b / 2)) ** 2 + (mouseX - screenWidth / 2) ** 2,
	);
	target.d *= Math.min(st.maxScreenWidth / screenWidth, st.maxScreenHeight / screenHeight);
	target.f = Math.atan2(screenHeight / 2 - b / 2 - mouseY, screenWidth / 2 - mouseX);
	target.f = utils.roundNumber(target.f, 2);
	target.d = utils.roundNumber(target.d, 2);
	target.dOffset = utils.roundNumber(target.d / 4, 1);
	if (lastAngle != target.f || lastDist != target.d) {
		targetChanged = true;
	}
	// lastTarget = target.f;
}
function mouseDown(event: MouseEvent) {
	event.preventDefault();
	event.stopPropagation();
	keys.lm = true;
}
function mouseUp(event: MouseEvent) {
	event.preventDefault();
	event.stopPropagation();
	keys.lm = false;
}
var userScroll = 0;
mainCanvas.addEventListener("wheel", (event) => {
	event.preventDefault();
	event.stopPropagation();
	userScroll = Math.max(-1, Math.min(1, event.deltaY));
});
var keyMap: Record<string, boolean> = {};
var showingScoreBoard = false;

window.addEventListener("keydown", keyDown, false);
function keyDown(event: KeyboardEvent) {
	if (event.repeat) {
		event.preventDefault();
		return;
	}
	if (mainCanvas === document.activeElement) {
		event.preventDefault();
		keyMap[event.code] = event.type === "keydown";
		if (event.code === "Escape" && st.gameStart) {
			showESCMenu();
		}
		if (keyMap[st.keysList.upKey] && !keys.u) {
			keys.u = true;
			keys.d = false;
			keyMap[st.keysList.downKey] = false;
		}
		if (keyMap[st.keysList.downKey] && !keys.d) {
			keys.d = true;
			keys.u = false;
			keyMap[st.keysList.upKey] = false;
		}
		if (keyMap[st.keysList.leftKey] && !keys.l) {
			keys.l = true;
			keys.r = false;
			keyMap[st.keysList.rightKey] = false;
		}
		if (keyMap[st.keysList.rightKey] && !keys.r) {
			keys.r = true;
			keys.l = false;
			keyMap[st.keysList.leftKey] = false;
		}
		if (keyMap[st.keysList.jumpKey] && !keys.s) {
			keys.s = true;
		}
		if (keyMap[st.keysList.reloadKey] && !keys.rl) {
			keys.rl = true;
		}
		if (keyMap[st.keysList.chatToggleKey]) {
			document.getElementById("chatInput").focus();
		}
		if (
			!!keyMap[st.keysList.leaderboardKey] &&
			!!st.gameStart &&
			!showingScoreBoard &&
			!st.player.dead &&
			!st.gameOver
		) {
			showingScoreBoard = true;
			showStatTable(getUsersList(), null, null, true, true, true);
		}
	}
}
mainCanvas.addEventListener("keyup", keyUp, false);
function keyUp(event: KeyboardEvent) {
	event.preventDefault();
	keyMap[event.code] = event.type === "keydown";
	if (event.code === st.keysList.upKey) {
		keys.u = false;
	}
	if (event.code === st.keysList.downKey) {
		keys.d = false;
	}
	if (event.code === st.keysList.leftKey) {
		keys.l = false;
	}
	if (event.code === st.keysList.rightKey) {
		keys.r = false;
	}
	if (event.code === st.keysList.jumpKey) {
		keys.s = false;
	}
	if (event.code === st.keysList.reloadKey) {
		keys.rl = false;
	}
	if (event.code === st.keysList.incWeapKey) {
		playerSwapWeapon(findUserByIndex(st.player.index), 1);
	}
	if (event.code === st.keysList.decWeapKey) {
		playerSwapWeapon(findUserByIndex(st.player.index), -1);
	}
	if (event.code === st.keysList.sprayKey) {
		sendSpray();
	}
	if (
		event.code === st.keysList.leaderboardKey &&
		!!showingScoreBoard &&
		!st.player.dead &&
		!st.gameOver &&
		!st.gameOver
	) {
		hideStatTable();
	}
}
var chat = new ChatManager();
function messageFromServer(a: [userIdx: number, userMsg: string]) {
	try {
		let tmpChatUser = findUserByIndex(a[0]);
		if (tmpChatUser != null) {
			if (tmpChatUser.index === st.player.index) return;
			chat.addChatLine(
				tmpChatUser.name,
				a[1],
				tmpChatUser.index === st.player.index,
				tmpChatUser.team,
			);
		} else if (a[0] === -1) {
			chat.addChatLine("", a[1], false, "system");
		} else {
			chat.addChatLine("", a[1], false, "notif");
		}
	} catch (b) {
		console.log(b);
	}
}
var context = mainCanvas.getContext("2d");
var graph = context;
window.graph = graph;
declare global {
	interface Window {
		graph: CanvasRenderingContext2D;
	}
}
var mapCanvas = document.getElementById("mapc") as HTMLCanvasElement;
var mapContext = mapCanvas.getContext("2d");
mapCanvas.width = 200;
mapCanvas.height = 200;
mapContext.imageSmoothingEnabled = false;

mount(Settings, {
	target: document.getElementById("settings"),
});
mount(Controls, {
	target: document.getElementById("controls"),
});

Array.from(document.getElementsByClassName("tablinks") as HTMLCollectionOf<HTMLElement>).map(
	(elem) =>
		elem.addEventListener("click", (event) => {
			changeMenuTab(event, elem.attributes.getNamedItem("data-menu-tab").value);
		}),
);
function changeMenuTab(event: MouseEvent, tabId: string) {
	const tabContents = document.getElementsByClassName("tabcontent");
	for (let i = 0; i < tabContents.length; i++) {
		let tc = tabContents[i];
		if (tc instanceof HTMLElement) {
			tc.style.display = "none";
		}
	}
	const tabLinks = document.getElementsByClassName("tablinks");
	for (let i = 0; i < tabContents.length; i++) {
		tabLinks[i].className = tabLinks[i].className.replace(" active", "");
	}
	document.getElementById(tabId).style.display = "block";
	(event.currentTarget as HTMLElement).className += " active";
}
function kickPlayer(secondReason: string) {
	if (disconnected) return;
	hideStatTable();
	hideUI(true);
	hideMenuUI();
	document.getElementById("startMenuWrapper").style.display = "none";
	disconnected = true;
	st.gameOver = true;
	if (reason === undefined) {
		reason = secondReason;
	}
	st.kicked = true;
	socket.close();
	updateGameLoop();
	stopAllSounds();
}
var classSelector = document.getElementById("classSelector");
var spraySelector = document.getElementById("spraySelector");
var hatSelector = document.getElementById("hatSelector");
var lobbySelector = document.getElementById("lobbySelector");
var camoSelector = document.getElementById("camoSelector");
var shirtSelector = document.getElementById("shirtSelector");
var lobbyCSelector = document.getElementById("lobbyCSelector");
var charSelectorCont = document.getElementById("charSelectorCont");
var lobbySelectorCont = document.getElementById("lobbySelectorCont");
function showLobbySelector() {
	charSelectorCont.style.display = "none";
	lobbySelectorCont.style.display = "none";
	classSelector.style.display = "none";
	lobbyCSelector.style.display = "none";
	camoSelector.style.display = "none";
	shirtSelector.style.display = "none";
	lobbySelector.style.display = "block";
}
//@ts-expect-error
window.showLobbySelector = showLobbySelector;
function hideLobbySelector() {
	charSelectorCont.style.display = "block";
	lobbySelectorCont.style.display = "block";
	lobbySelector.style.display = "none";
}
//@ts-expect-error
window.hideLobbySelector = hideLobbySelector;
function showLobbyCSelector() {
	charSelectorCont.style.display = "none";
	lobbySelectorCont.style.display = "none";
	classSelector.style.display = "none";
	lobbySelector.style.display = "none";
	camoSelector.style.display = "none";
	shirtSelector.style.display = "none";
	lobbyCSelector.style.display = "block";
}
//@ts-expect-error
window.showLobbyCSelector = showLobbyCSelector;
function hideLobbyCSelector() {
	charSelectorCont.style.display = "block";
	lobbySelectorCont.style.display = "block";
	lobbyCSelector.style.display = "none";
}
//@ts-expect-error
window.hideLobbyCSelector = hideLobbyCSelector;
var timeOutCheck = null;
var tmpPingTimer = null;
var pingText = document.getElementById("pingText");
var fpsText = document.getElementById("fpsText");
var pingStart = 0;
function receivePing() {
	var a = Date.now() - pingStart;
	pingText.replaceChildren(<>PING {a}</>);
}
var pingInterval: ReturnType<typeof setInterval> | null = null;
function setupSocket(sock: Socket) {
	// logging, ignoring packets that are spammy
	sock.onAny((event, ...args) => {
		if (["pong1", "rsd"].includes(event)) return;
		console.info("%c <= ", "background:#FF6A19;color:#000", event, args);
	});
	sock.onAnyOutgoing((event, ...args) => {
		if (["ping1", "0", "4"].includes(event)) return;
		console.info("%c => ", "background:#7F7;color:#000", event, args);
	});
	sock.on("pong1", receivePing);
	if (pingInterval != null) {
		clearInterval(pingInterval);
	}
	pingInterval = setInterval(() => {
		pingStart = Date.now();
		sock.emit("ping1");
	}, 2000);
	sock.on("yourRoom", (a, d) => {
		room = a;
		serverKeyTxt.textContent = d;
	});
	sock.on("connect_failed", () => {
		kickPlayer("Connection failed. Please check your internet connection.");
	});
	sock.on("disconnect", (a) => {
		kickPlayer("Disconnected. Your connection timed out.");
		console.log(a);
	});
	sock.on("error", (errorMsg) => {
		console.log("PLEASE NOTIFY THE DEVELOPER OF THE FOLLOWING ERROR");
		console.error(`ERROR: ${errorMsg}`);
	});
	sock.on("welcome", (b, d) => {
		st.player.id = b.id;
		st.player.room = b.room;
		room = st.player.room;
		st.player.name = playerName;
		st.player.classIndex = playerClassIndex;
		b.name = st.player.name;
		b.classIndex = playerClassIndex;
		sock.emit("gotit", b, d, Date.now(), false);
		st.player.dead = true;
		if (d) {
			deactiveAllAnimTexts();
			st.gameStart = false;
			hideUI(false);
			document.getElementById("startMenuWrapper").style.display = "block";
		}
		if (st.gameOver) {
			document.getElementById("gameStatWrapper").style.display = "none";
		}
		st.gameOver = false;
		gameOverFade = false;
		targetChanged = true;
		if (st.mobile) {
			hideMenuUI();
			hideUI(true);
			document.getElementById("startMenuWrapper").style.display = "none";
		}
		resize();
	});
	sock.on("cSrvRes", (a, d) => {
		if (d) {
			serverKeyTxt.textContent = a;
			serverCreateMessage.textContent = `Success. Created server with IP: ${a}`;
		} else {
			serverCreateMessage.textContent = a;
		}
	});
	sock.on("regRes", (a, d) => {
		if (!d) {
			loginMessage.style.display = "block";
		}
		loginMessage.textContent = a;
	});
	sock.on("logRes", (a, d) => {
		if (d) {
			loginMessage.style.display = "none";
			loginMessage.textContent = "";
			loginWrapper.style.display = "none";
			loggedInWrapper.style.display = "block";
			(document.getElementById("playerNameInput") as HTMLInputElement).value = a.text;
			localStorage.setItem("logKey", a.logKey);
			localStorage.setItem("userName", a.text);
			loggedIn = true;
			st.player.loggedIn = true;
			const user = findUserByIndex(st.player.index);
			if (user) {
				user.loggedIn = true;
			}
		} else {
			loginMessage.style.display = "block";
			loginMessage.textContent = a;
		}
		loadSavedClass();
	});
	sock.on("recovRes", (b, d) => {
		loginMessage.style.display = "block";
		loginMessage.textContent = b;
		if (!d) return;
		document.getElementById("recoverForm").style.display = "block";
		const chngPassKey = document.getElementById("chngPassKey") as HTMLInputElement;
		const chngPassPass = document.getElementById("chngPassPass") as HTMLInputElement;
		document.getElementById("chngPassButton").onclick = () => {
			loginMessage.style.display = "block";
			loginMessage.textContent = "Please Wait...";
			sock.emit("dbCngPass", {
				passKey: chngPassKey.value,
				newPass: chngPassPass.value,
			});
			sock.on("cngPassRes", (a, b) => {
				loginMessage.style.display = "block";
				loginMessage.textContent = a;
				if (b) {
					document.getElementById("recoverForm").style.display = "none";
				}
			});
		};
	});
	sock.on("dbClanCreateR", (a, d) => {
		if (d) {
			clanSignUp.style.display = "none";
			clanStats.style.display = "block";
			clanHeader.textContent = `[${a}] Clan:`;
			clanAdminPanel.style.display = "block";
			leaveClanButton.style.display = "inline-block";
			leaveClanButton.textContent = "DELETE CLAN";
		} else {
			clanDBMessage.style.display = "block";
			clanDBMessage.textContent = a;
		}
	});
	sock.on("dbClanJoinR", (a, d) => {
		if (d) {
			clanSignUp.style.display = "none";
			clanStats.style.display = "block";
			clanHeader.textContent = `[${a}] Clan:`;
			st.player.account.clan = a;
			const user = findUserByIndex(st.player.index);
			if (user) {
				user.account.clan = a;
			}
			leaveClanButton.style.display = "inline-block";
			leaveClanButton.textContent = "Leave Clan";
		} else {
			clanDBMessage.style.display = "block";
			clanDBMessage.textContent = a;
		}
	});
	sock.on("dbClanInvR", (a, _) => {
		clanInvMessage.style.display = "block";
		clanInvMessage.textContent = a;
	});
	sock.on("dbKickInvR", (a, _) => {
		clanInvMessage.style.display = "block";
		clanInvMessage.textContent = a;
	});
	sock.on("dbClanLevR", (a, d) => {
		if (!d) return;
		clanSignUp.style.display = "block";
		clanStats.style.display = "none";
		clanHeader.textContent = "Clans";
		clanDBMessage.style.display = "block";
		clanDBMessage.textContent = a;
		leaveClanButton.style.display = "none";
	});
	sock.on("dbChatR", (a, d) => {
		clanChtMessage.style.display = "inline-block";
		clanChtMessage.textContent = a.text;
		if (!d) return;
		if (!a.newURL.match(/^https?:\/\//i)) {
			a.newURL = `http://${a.newURL}`;
		}
		clanChatLink.replaceChildren(
			<a target="_blank" href={a.newURL}>
				Clan Chat
			</a>,
		);
	});
	sock.on("dbChangeUserR", (a, d) => {
		if (d) {
			localStorage.setItem("userName", a);
			st.player.account.user_name = a;
			editProfileMessage.textContent = "Success. Account Updated.";
		} else {
			editProfileMessage.textContent = a;
		}
	});
	sock.on("dbClanStats", (a) => {
		updateClanPage(a);
	});
	sock.on("updAccStat", (a) => {
		updateAccountPage(a);
	});
	sock.on("gameSetup", (a, d, e) => {
		a = JSON.parse(a);
		if (d) {
			st.gameMap = a.mapData;
			st.gameMap.tiles = [];
			gameWidth = st.gameMap.width;
			gameHeight = st.gameMap.height;
			mapTileScale = a.tileScale;
			players = a.usersInRoom;
			gameMode = st.gameMap.gameMode;
			if (a.you.team === "blue") {
				document.getElementById("gameModeText").textContent = gameMode.desc2;
			} else {
				document.getElementById("gameModeText").textContent = gameMode.desc1;
			}
			currentLikeButton = null;
			for (const clt of st.gameMap.clutter) {
				clutter.push(clt);
			}
			setupMap(st.gameMap, mapTileScale, flags);
			cachedMiniMap = null;
			deactivateSprays();
			for (let i = 0; i < 100; i++) {
				bullets.push(new Projectile());
			}
		}
		if (e) {
			st.gameStart = true;
			showUI();
			document.getElementById("cvs").focus();
		}
		keys.lm = false;
		st.maxScreenHeight = a.maxScreenHeight * a.viewMult;
		st.maxScreenWidth = a.maxScreenWidth * a.viewMult;
		st.viewMult = a.viewMult;
		st.player = a.you;
		e = findUserByIndex(a.you.index);
		if (e != null) {
			players[players.indexOf(e)] = st.player;
		} else {
			players.push(st.player);
		}
		updateWeaponUI(st.player, true);
		if (inMainMenu) {
			$("#loadingWrapper").fadeOut(0, () => {});
			inMainMenu = false;
		}
		st.startingGame = false;
		resize();
	});
	sock.on("lb", updateLeaderboard);
	sock.on("ts", updateTeamScores);
	sock.on("rsd", receiveServerData);
	sock.on("upd", updateUserValue);
	sock.on("vt", updateVoteStats);
	sock.on("add", addUser);
	sock.on("updHt", updateHatList);
	sock.on("updShrt", updateShirtList);
	sock.on("updCmo", updateCamosList);
	sock.on("updSprs", updateSpraysList);
	sock.on("crtSpr", createSpray);
	sock.on("rem", removeUser);
	sock.on("cht", messageFromServer);
	sock.on("kick", (a) => {
		kickPlayer(a);
	});
	sock.on("1", (a) => {
		var b = findUserByIndex(a.gID);
		var e = Math.abs(a.amount);
		if (
			(a.dID != st.player.index || a.gID == st.player.index) &&
			a.amount <= 0 &&
			a.gID == st.player.index &&
			e != 0
		) {
			screenShake(e / 2, a.dir);
		}
		if (a.dID != null && a.dID == st.player.index && b != null && e > 0 && b.onScreen) {
			if (a.amount < 0) {
				startMovingAnimText(`${e}`, b.x - b.width / 2, b.y - b.height, "#d95151", e / 10);
			} else {
				startMovingAnimText(`${e}`, b.x - b.width / 2, b.y - b.height, "#5ed951", e / 10);
			}
		}
		if (a.bi != null) {
			let svb = findServerBullet(a.bi);
			if (svb?.owner.index !== st.player.index) {
				if (b.onScreen && a.amount < 0) {
					particleCone(
						12,
						b.x,
						b.y - b.height / 2 - b.jumpY,
						svb.dir + Math.PI,
						Math.PI / randomInt(5, 7),
						0.5,
						16,
						0,
						true,
					);
					createLiquid(b.x, b.y, svb.dir, 4);
				}
				svb.active = false;
			}
		}
		if (b != null) {
			b.health = a.h;
			if (b.index == st.player.index) {
				updatePlayerInfo(b);
				updateUiStats(b);
			}
		}
	});
	sock.on("2", someoneShot);
	sock.on("jum", otherJump);
	sock.on("ex", createExplosion);
	sock.on("r", (a) => {
		var b = findUserByIndex(st.player.index);
		if (b != null) {
			/*
      if (b.weapons[a].ammo == b.weapons[a].maxAmmo) {
        showNotification("Ammo Full");
      }
      */
			b.weapons[a].reloadTime = 0;
			b.weapons[a].ammo = b.weapons[a].maxAmmo;
			setCooldownAnimation(a, b.weapons[a].reloadTime, false);
			updateUiStats(b);
		}
	});
	sock.on("3", (event) => {
		var destPlayer = findUserByIndex(event.gID);
		var sourcePlayer = findUserByIndex(event.dID);
		destPlayer.dead = true;
		if (event.kB && event.gID !== st.player.index) {
			if (event.dID === st.player.index) {
				startBigAnimText(
					"BOSS SLAIN",
					`${event.sS} POINTS`,
					2000,
					true,
					"#ffffff",
					"#5151d9",
					true,
					1.25,
				);
			} else {
				showNotification(`${sourcePlayer.name} slayed the boss`);
			}
		} else if (event.dID === st.player.index && event.gID !== st.player.index) {
			playSound("kill1", sourcePlayer.x, sourcePlayer.y);
			let killMsg = "";
			if (destPlayer.team != sourcePlayer.team) {
				event.sS = `+${event.sS}`;
				killMsg =
					event.kd <= 1 || event.kd === undefined
						? "Enemy Killed"
						: event.kd === 2
							? "Double Kill"
							: event.kd === 3
								? "Triple Kill"
								: event.kd === 4
									? "Multi Kill"
									: event.kd === 5
										? "Ultra Kill"
										: event.kd === 6
											? "No Way!"
											: event.kd === 7
												? "Stop!"
												: "Godlike!";
			} else {
				killMsg = "Team Kill";
				event.sS = "no";
			}
			if (event.ast) {
				killMsg = "Kill Assist";
			}
			startBigAnimText(killMsg, `${event.sS} POINTS`, 2000, true, "#ffffff", "#5151d9", true, 1.25);
		}
		if (event.gID === st.player.index) {
			hideStatTable();
			st.gameStart = false;
			hideUI(false);
			st.player.dead = true;
			window.setTimeout(() => {
				if (!st.gameOver) {
					document.getElementById("startMenuWrapper").style.display = "block";
					document.getElementById("linkBox").style.display = "block";
				}
			}, 1300);
			playSound("death1", st.player.x, st.player.y);
			startSoundTrack(1);
		}
	});
	sock.on("4", (a, d, e) => {
		if (e == 0) {
			if (st.gameMap != null && a.active != undefined) {
				st.gameMap.pickups[d].active = a.active;
			}
		} else if (clutter[d]) {
			let clt = clutter[d];
			if (a.active != undefined) {
				clt.active = a.active;
			}
			if (a.x != undefined) {
				clt.x = a.x;
			}
			if (a.y != undefined) {
				clt.y = a.y;
			}
		}
	});
	sock.on("tprt", (a) => {
		var user = findUserByIndex(a.indx);
		if (!user) return;
		user.x = a.newX;
		user.y = a.newY;
		createSmokePuff(user.x, user.y, 5, false, 1);
		if (a.indx === st.player.index) {
			st.player.x = a.newX;
			st.player.y = a.newY;
			startBigAnimText(
				"ZONE ENTERED",
				`+${a.scor} POINTS`,
				2000,
				true,
				"#ffffff",
				"#5151d9",
				true,
				1.3,
			);
		} else {
			createSmokePuff(a.oldX, a.oldY, 5, false, 1);
			showNotification(`${user.name} scored`);
		}
	});
	sock.on("5", (a) => {
		showNotification(a);
	});
	sock.on("6", (a, d, e) => {
		if (!st.player.dead) {
			startBigAnimText(a, d, 2000, true, "#ffffff", "#5151d9", true, e);
		}
	});
	sock.on("7", (winner, userList, modeVoteData, isFading) => {
		try {
			st.gameOver = true;
			document.getElementById("startMenuWrapper").style.display = "none";
			showStatTable(userList, modeVoteData, winner, false, isFading, true);
			startSoundTrack(1);
		} catch (h) {
			console.log(h);
		}
	});
	sock.on("8", (a) => {
		document.getElementById("nextGameTimer").textContent = `${a}: UNTIL NEXT ROUND`;
	});
}
function likePlayerStat(a: any) {
	socket.emit("like", a);
}
function updateVoteStats(a: any) {
	document.getElementById(`votesText${a.i}`).textContent = `${a.n}: ${a.v}`;
}
function showESCMenu() {
	deactiveAllAnimTexts();
	st.gameStart = false;
	hideUI(false);
	document.getElementById("startMenuWrapper").style.display = "block";
}
var buttonCount = 0;
function showStatTable(
	userList: Player[],
	modeVoteData: any,
	winner: string | number | null,
	reset: boolean,
	isFading: boolean,
	isEnd: boolean,
) {
	buttonCount = 0;
	if (isEnd) {
		hideUI(false);
		if (reset) {
			document.getElementById("nextGameTimer").textContent = "GAME STATS";
			document.getElementById("winningTeamText").textContent = "";
			document.getElementById("voteModeContainer").textContent = "";
		} else {
			let isWinner = st.player.team === winner || st.player.id === winner;
			if (!isFading) {
				if (isWinner) {
					startBigAnimText("Victory", "Well Played!", 2500, true, "#5151d9", "#ffffff", false, 2);
					document.getElementById("winningTeamText").textContent = "VICTORY";
					document.getElementById("winningTeamText").style.color = "#5151d9";
				} else if (st.player.team != "") {
					startBigAnimText("Defeat", "Bad Luck!", 2500, true, "#d95151", "#ffffff", false, 2);
					document.getElementById("winningTeamText").textContent = "DEFEAT";
					document.getElementById("winningTeamText").style.color = "#d95151";
				}
			}
			if (modeVoteData != null) {
				document.getElementById("voteModeContainer").textContent = "";
				for (let i = 0; i < modeVoteData.length; ++i) {
					let modeVoteBtn = document.createElement("button");
					modeVoteBtn.className = "modeVoteButton";
					modeVoteBtn.setAttribute("id", `votesText${i}`);
					modeVoteBtn.textContent = `${modeVoteData[i].name}: ${modeVoteData[i].votes}`;
					document.getElementById("voteModeContainer").appendChild(modeVoteBtn);
					modeVoteBtn.onclick = () => {
						mainCanvas.focus();
						socket.emit("modeVote", i);
						for (let j = 0; j < modeVoteData.length; ++j) {
							if (
								i === j &&
								document.getElementById(`votesText${j}`).className === "modeVoteButton"
							) {
								document.getElementById(`votesText${j}`).className = "modeVoteButtonA";
							} else {
								document.getElementById(`votesText${j}`).className = "modeVoteButton";
							}
						}
					};
				}
			}
		}
	}
	document.getElementById("gameStatBoard").textContent = "";
	addRowToStatTable(
		[
			{
				text: "NAME",
				className: "headerL",
				color: "#fff",
			},
			{
				text: "SCORE",
				className: "headerC",
				color: "#fff",
			},
			{
				text: "KILLS",
				className: "headerC",
				color: "#fff",
			},
			{
				text: "DEATHS",
				className: "headerC",
				color: "#fff",
			},
			{
				text: "DAMAGE",
				className: "headerC",
				color: "#fff",
			},
			{
				text: gameMode.code === "zmtch" ? "GOALS" : "HEALING",
				className: "headerC",
				color: "#fff",
			},
			{
				text: "REWARD",
				className: "headerC",
				color: "#fff",
			},
			{
				text: "",
				className: "headerC",
				color: "#fff",
			},
		],
		true,
	);
	for (const user of userList) {
		if (!user.team) continue;
		addRowToStatTable(
			[
				{
					text: user.name,
					className: "contL",
					canClick: user.loggedIn,
					color:
						user.index === st.player.index
							? "#fff"
							: user.team !== st.player.team
								? "#d95151"
								: "#5151d9",
					id: null,
					userInfo: findUserByIndex(user.index),
				},
				{
					text: user.score || 0,
					className: "contC",
					color: "#fff",
					id: null,
				},
				{
					text: user.kills || 0,
					className: "contC",
					color: "#fff",
					id: null,
				},
				{
					text: user.deaths || 0,
					className: "contC",
					color: "#fff",
					id: null,
				},
				{
					text: user.totalDamage || 0,
					className: "contC",
					color: "#fff",
					id: null,
				},
				{
					text: gameMode.code == "zmtch" ? user.totalGoals || 0 : user.totalHealing || 0,
					className: "contC",
					color: "#fff",
					id: null,
				},
				{
					text: user.lastItem != null ? user.lastItem.name : "No Reward",
					className: "rewardText",
					color: user.lastItem != null ? getItemRarityColor(user.lastItem.chance) : "#fff",
					id: null,
					hoverInfo: user.lastItem,
				},
				{
					text: user.likes || 0,
					className: "contC",
					color: "#fff",
					pos: user.index,
					id: `likeStat${user.index}`,
					uID: user.id,
				},
			],
			false,
		);
	}
	if (isEnd) {
		if (isFading) {
			overlayAlpha = overlayMaxAlpha;
			animateOverlay = false;
			gameOverFade = true;
			deactiveAllAnimTexts();
			document.getElementById("gameStatWrapper").style.display = "block";
		} else {
			hideStatTable();
			hideUI(false);
			animateOverlay = true;
			window.setTimeout(() => {
				gameOverFade = true;
			}, 2500);
			window.setTimeout(() => {
				document.getElementById("gameStatWrapper").style.display = "block";
			}, 4500);
		}
	}
}
function hideStatTable() {
	showUI();
	overlayAlpha = 0;
	showingScoreBoard = false;
	animateOverlay = true;
	drawOverlay(graph, false, true);
	document.getElementById("gameStatWrapper").style.display = "none";
	document.getElementById("linkBox").style.display = "none";
}
type StatTableRow = {
	text: string | number;
	className: string;
	canClick?: boolean;
	color: string;
	id?: string;
	uID?: number;
	hoverInfo?: any;
	pos?: number;
	userInfo?: Player;
};
function addRowToStatTable(data: StatTableRow[], b: boolean) {
	let trow = document.createElement("tr");
	for (let i = 0; i < data.length; ++i) {
		let tcell = document.createElement("td");
		if (b || i !== data.length - 1) {
			tcell.appendChild(document.createTextNode(data[i].text.toString()));
			tcell.className = data[i].className;
			tcell.style.color = data[i].color;
			if (data[i].hoverInfo) {
				const info = data[i].hoverInfo;
				const tooltip = (
					<div className="hoverTooltip">
						{info.type === "hat" ? (
							<>
								<img className="itemDisplayImage" src={`/images/hats/${info.id}/d.png`} />
								<div style={{ color: data[i].color, fontSize: "16px", marginTop: "5px" }}>
									{info.name}
								</div>
								<div style={{ color: "#ffd100", fontSize: "12px", marginTop: "0px" }}>
									droprate {info.chance}%
								</div>
								{info.duplicate ? (
									<div style={{ fontSize: "8px", color: "#e04141", marginTop: "1px" }}>
										<i>Duplicate</i>
									</div>
								) : (
									<div style={{ fontSize: "8px", color: "#d8d8d8", marginTop: "1px" }}>
										<i>wearable</i>
									</div>
								)}
								<div style={{ fontSize: "12px", marginTop: "5px" }}>{info.desc}</div>
								{info.creator !== "EatMyApples" && (
									<div style={{ fontSize: "8px", color: "#d8d8d8", marginTop: "5px" }}>
										<i>Artist: {info.creator}</i>
									</div>
								)}
							</>
						) : info.type === "shirt" ? (
							<>
								<img className="shirtDisplayImage" src={`/images/shirts/${info.id}/d.png`} />
								<div style={{ color: data[i].color, fontSize: "16px", marginTop: "5px" }}>
									{info.name}
								</div>
								<div style={{ color: "#ffd100", fontSize: "12px", marginTop: "0px" }}>
									droprate {info.chance}%
								</div>
								{info.duplicate ? (
									<div style={{ fontSize: "8px", color: "#e04141", marginTop: "1px" }}>
										<i>Duplicate</i>
									</div>
								) : (
									<div style={{ fontSize: "8px", color: "#d8d8d8", marginTop: "1px" }}>
										<i>shirt</i>
									</div>
								)}
								<div style={{ fontSize: "12px", marginTop: "5px" }}>{info.desc}</div>
							</>
						) : (
							<>
								<img className="camoDisplayImage" src={`/images/camos/${info.id + 1}.png`} />
								<div style={{ color: data[i].color, fontSize: "16px", marginTop: "5px" }}>
									{info.name}
								</div>
								<div style={{ color: "#ffd100", fontSize: "12px", marginTop: "0px" }}>
									droprate {info.chance}%
								</div>
								{info.duplicate ? (
									<div style={{ fontSize: "8px", color: "#e04141", marginTop: "1px" }}>
										<i>Duplicate</i>
									</div>
								) : (
									<div style={{ fontSize: "8px", color: "#d8d8d8", marginTop: "1px" }}>
										<i>weapon camo</i>
									</div>
								)}
								<div style={{ fontSize: "12px", marginTop: "5px" }}>{info.weaponName}</div>
							</>
						)}
					</div>
				);
				tcell.appendChild(tooltip);
			}
			if (tcell.className === "contL" && data[i].canClick) {
				tcell.addEventListener("click", () => {
					showUserStatPage(data[i].text.toString());
				});
			}
		} else {
			let btn = document.createElement("button");
			let btnText = document.createTextNode(" NICE");
			btn.appendChild(btnText);
			btn.setAttribute("type", "button");
			let m = data[i];
			btn.onclick = () => {
				mainCanvas.focus();
				likePlayerStat(m.pos);
				for (let i = 0; i < buttonCount; ++i) {
					document
						.getElementById(`gameStatLikeButton${i}`)
						.setAttribute("class", "gameStatLikeButton");
				}
				if (currentLikeButton !== m.uID) {
					currentLikeButton = m.uID;
					btn.setAttribute("class", "gameStatLikeButtonA");
				} else {
					currentLikeButton = null;
				}
			};
			btn.setAttribute("id", `gameStatLikeButton${buttonCount}`);
			buttonCount++;
			if (m.uID === currentLikeButton) {
				btn.setAttribute("class", "gameStatLikeButtonA");
			} else {
				btn.setAttribute("class", "gameStatLikeButton");
			}
			btn.style.display = m.pos === st.player.index ? "none" : "block";
			trow.appendChild(btn);
			let tmpDiv = document.createElement("div");
			tmpDiv.textContent = data[i].text.toString();
			if (data[i].id != null) {
				tmpDiv.setAttribute("id", data[i].id);
			}
			tcell.appendChild(btn);
			tcell.className = data[i].className;
			tcell.style.color = data[i].color;
		}
		trow.appendChild(tcell);
	}
	document.getElementById("gameStatBoard").appendChild(trow);
}
function addUser(userString: string) {
	let parsed = JSON.parse(userString);
	if (parsed.index !== st.player.index) {
		const b = findUserByIndex(parsed.index);
		if (b == null) {
			players.push(parsed);
		} else {
			players[players.indexOf(b)] = parsed;
		}
	}
}
function removeUser(userIndex: number) {
	if (userIndex !== st.player.index) {
		let tmpUser = findUserByIndex(userIndex);
		if (tmpUser != null) {
			players.splice(players.indexOf(tmpUser), 1);
		}
	}
}
function updateUiStats(player: Player) {
	document.getElementById("scoreValue").textContent = player.score.toString();
	if (player.weapons.length > 0) {
		document.getElementById("ammoValue").textContent = getCurrentWeapon(player).ammo.toString();
	}
	document.getElementById("healthValue").textContent = player.health.toString();
	if (player.health <= 10) {
		document.getElementById("healthValue").style.color = "#e06363";
	} else {
		document.getElementById("healthValue").style.color = "#fff";
	}
}
function getItemRarityColor(chance: number) {
	if (chance <= 1) {
		return "#ff8000";
	} else if (chance <= 6) {
		return "#a335ee";
	} else if (chance <= 18) {
		return "#0070dd";
	} else if (chance <= 45) {
		return "#1eff00";
	} else {
		return "#9d9d9d";
	}
}
function updateUserValue(data: any) {
	var updated = false;
	const tmpUser = findUserByIndex(data.i);
	if (!tmpUser) {
		fetchUserWithIndex(data.i);
		return;
	}
	if (data.s != undefined) {
		tmpUser.score = data.s;
		updated = true;
	}
	if (data.sp != undefined) {
		tmpUser.spawnProtection = data.sp;
	}
	if (data.wi != undefined && data.i != st.player.index) {
		playerEquipWeapon(tmpUser, data.wi);
	}
	if (data.l != undefined) {
		tmpUser.likes = data.l;
		updated = true;
	}
	if (data.dea != undefined) {
		tmpUser.deaths = data.dea;
		updated = true;
	}
	if (data.kil != undefined) {
		tmpUser.kills = data.kil;
		updated = true;
	}
	if (data.dmg != undefined) {
		tmpUser.totalDamage = data.dmg;
		updated = true;
	}
	if (data.hea != undefined) {
		tmpUser.totalHealing = data.hea;
		updated = true;
	}
	if (data.goa != undefined) {
		tmpUser.totalGoals = data.goa;
		updated = true;
	}
	if (tmpUser.index == st.player.index) {
		updatePlayerInfo(tmpUser);
		updateUiStats(tmpUser);
	}
	if (updated) {
		if (st.gameOver) {
			if (data.l != undefined) {
				document
					.getElementById(`likeStat${tmpUser.index}`)
					.replaceChildren(tmpUser.likes.toString());
			}
		} else {
			showStatTable(getUsersList(), null, null, true, true, false);
		}
	}
}
function fetchUserWithIndex(a: number) {
	socket.emit("ftc", a);
}
function receiveServerData(data: number[]) {
	timeOfLastUpdate = Date.now();
	if (!st.gameOver) {
		players.forEach((obj) => {
			obj.onScreen = false;
		});
		for (let d = 0; d < data.length; ) {
			let b = data[0 + d];
			const tmpUser = findUserByIndex(data[1 + d]);
			if (data[1 + d] === st.player.index && tmpUser != null) {
				if (b > 2) {
					tmpUser.x = data[2 + d];
				}
				if (b > 3) {
					tmpUser.y = data[3 + d];
				}
				if (b > 4) {
					tmpUser.angle = data[4 + d];
				}
				if (b > 5) {
					tmpUser.isn = data[5 + d];
				}
				tmpUser.onScreen = true;
			} else if (tmpUser != null) {
				if (b > 2) {
					tmpUser.xSpeed = Math.abs(tmpUser.x - data[2 + d]);
					tmpUser.x = data[2 + d];
				}
				if (b > 3) {
					tmpUser.ySpeed = Math.abs(tmpUser.y - data[3 + d]);
					tmpUser.y = data[3 + d];
				}
				if (b > 4) {
					tmpUser.angle = data[4 + d];
				}
				if (getCurrentWeapon(tmpUser)) {
					const wepAngle = Math.round((tmpUser.angle % 360) / 90) * 90;
					if (wepAngle === 0 || wepAngle === 360) {
						getCurrentWeapon(tmpUser).front = true;
					} else if (wepAngle === 180) {
						getCurrentWeapon(tmpUser).front = false;
					} else {
						getCurrentWeapon(tmpUser).front = true;
					}
				}
				if (b > 5) {
					tmpUser.nameYOffset = data[5 + d];
				}
				tmpUser.onScreen = true;
			} else {
				fetchUserWithIndex(data[1 + d]);
			}
			d += b;
		}
	}
	for (const plr of players) {
		if (plr.index !== st.player.index) continue;
		if (plr.dead || st.gameOver || thisInput.length > 80) {
			thisInput = [];
		}
		if (plr.dead) continue;
		let i = 0;
		while (i < thisInput.length) {
			if (thisInput[i].isn <= plr.isn) {
				thisInput.splice(i, 1);
				continue;
			}
			let hdt = thisInput[i].hdt;
			let vdt = thisInput[i].vdt;
			const e = Math.sqrt(
				thisInput[i].hdt * thisInput[i].hdt + thisInput[i].vdt * thisInput[i].vdt,
			);
			if (e !== 0) {
				hdt /= e;
				vdt /= e;
			}
			plr.oldX = plr.x;
			plr.oldY = plr.y;
			plr.x += hdt * plr.speed * thisInput[i].delta;
			plr.y += vdt * plr.speed * thisInput[i].delta;
			wallCol(plr, st.gameMap.tiles, clutter);
			i++;
		}
		plr.x = Math.round(plr.x);
		plr.y = Math.round(plr.y);
		updatePlayerInfo(plr);
	}
}
function updatePlayerInfo(data: Partial<Player>) {
	st.player.x = data.x;
	st.player.y = data.y;
	st.player.dead = data.dead;
	if (st.player.score < data.score) {
		playSound("score", st.player.x, st.player.y);
	}
	st.player.score = data.score;
	st.player.health = data.health;
}
var currentHat = document.getElementById("currentHat");
var hatList = document.getElementById("hatList");
var hatHeader = document.getElementById("hatHeader");
function updateHatList(totalCount: number, hats: any[]) {
	hatHeader.textContent = `SELECT HAT: (${hats.length}/${totalCount})`;
	let content: Node[] = [];
	content.push(
		<div class="hatSelectItem" id="hatItem-1" onClick={() => changeHat(-1)}>
			Default
		</div>,
	);
	for (const hat of hats) {
		content.push(
			<div
				className="hatSelectItem"
				id={`hatItem${hat.id}`}
				style={{ color: getItemRarityColor(hat.chance) }}
				onClick={() => changeHat(hat.id)}
			>
				{hat.name} x{parseInt(hat.count) + 1}
				<div className="hoverTooltip">
					<img className="itemDisplayImage" src={`/images/hats/${hat.id}/d.png`} />
					<div
						style={{ color: getItemRarityColor(hat.chance), fontSize: "16px", marginTop: "5px" }}
					>
						{hat.name}
					</div>
					<div style={{ color: "#ffd100", fontSize: "12px", marginTop: "0px" }}>
						droprate {hat.chance}%
					</div>
					<div style={{ fontSize: "8px", color: "#d8d8d8", marginTop: "1px" }}>
						<i>wearable</i>
					</div>
					<div style={{ fontSize: "12px", marginTop: "5px" }}>{hat.desc}</div>
					{hat.creator !== "EatMyApples" && (
						<div style={{ fontSize: "8px", color: "#d8d8d8", marginTop: "5px" }}>
							<i>Artist: {hat.creator}</i>
						</div>
					)}
				</div>
			</div>,
		);
	}
	hatList.replaceChildren(...content);
}
function resetHatList() {
	hatHeader.textContent = "SELECT HAT";
	hatList.replaceChildren(
		<div class="hatSelectItem" id="hatItem-1" onClick={() => changeHat(-1)}>
			Default
		</div>,
	);
	changeHat(-1);
}
document.getElementById("currentHat").addEventListener("click", showHatselector);
function showHatselector() {
	charSelectorCont.style.display = "none";
	lobbySelectorCont.style.display = "none";
	camoSelector.style.display = "none";
	shirtSelector.style.display = "none";
	classSelector.style.display = "none";
	lobbySelector.style.display = "none";
	lobbyCSelector.style.display = "none";
	spraySelector.style.display = "none";
	hatSelector.style.display = "block";
}
//@ts-expect-error
window.changeHat = changeHat;
function changeHat(a: number) {
	if (!socket) return;
	socket.emit("cHat", a);
	localStorage.setItem("previousHat", a.toString());
	currentHat.innerHTML = document.getElementById(`hatItem${a}`).innerHTML.replace(/ x\d/, "");
	currentHat.style.color = document.getElementById(`hatItem${a}`).style.color;
	charSelectorCont.style.display = "block";
	lobbySelectorCont.style.display = "block";
	classSelector.style.display = "none";
	camoSelector.style.display = "none";
	shirtSelector.style.display = "none";
	hatSelector.style.display = "none";
	lobbySelector.style.display = "none";
	lobbyCSelector.style.display = "none";
}
var currentShirt = document.getElementById("currentShirt");
var shirtList = document.getElementById("shirtList");
var shirtHeader = document.getElementById("shirtHeader");
function updateShirtList(totalCount: number, shirts: any[]) {
	shirtHeader.textContent = `SELECT SHIRT: (${shirts.length}/${totalCount})`;

	let test: Node[] = [];
	test.push(
		<div class="hatSelectItem" id="shirtItem-1" onClick={() => changeShirt(-1)}>
			Default
		</div>,
	);
	for (const shirt of shirts) {
		test.push(
			<div
				className="hatSelectItem"
				id={`shirtItem${shirt.id}`}
				style={{ color: getItemRarityColor(shirt.chance) }}
				onClick={() => changeShirt(shirt.id)}
			>
				{shirt.name} x{parseInt(shirt.count) + 1}
				<div className="hoverTooltip">
					<img className="shirtDisplayImage" src={`/images/shirts/${shirt.id}/d.png`} />
					<div
						style={{ color: getItemRarityColor(shirt.chance), fontSize: "16px", marginTop: "5px" }}
					>
						{shirt.name}
					</div>
					<div style={{ color: "#ffd100", fontSize: "12px", marginTop: "0px" }}>
						droprate {shirt.chance}%
					</div>
					<div style={{ fontSize: "8px", color: "#d8d8d8", marginTop: "1px" }}>
						<i>shirt</i>
					</div>
					<div style={{ fontSize: "12px", marginTop: "5px" }}>{shirt.desc}</div>
				</div>
			</div>,
		);
	}
	shirtList.replaceChildren(...test);
}
function resetShirtList() {
	shirtHeader.textContent = "SELECT SHIRT";
	shirtList.replaceChildren(
		<div class="hatSelectItem" id="shirtItem-1" onClick={() => changeShirt(-1)}>
			Default
		</div>,
	);
	changeShirt(-1);
}
document.getElementById("currentShirt").addEventListener("click", showShirtselector);
function showShirtselector() {
	charSelectorCont.style.display = "none";
	lobbySelectorCont.style.display = "none";
	camoSelector.style.display = "none";
	classSelector.style.display = "none";
	lobbySelector.style.display = "none";
	lobbyCSelector.style.display = "none";
	spraySelector.style.display = "none";
	hatSelector.style.display = "none";
	shirtSelector.style.display = "block";
}
//@ts-expect-error
window.changeShirt = changeShirt;
function changeShirt(shirtId: number) {
	if (!socket) return;
	socket.emit("cShirt", shirtId);
	localStorage.setItem("previousShirt", shirtId.toString());
	currentShirt.innerHTML = document
		.getElementById(`shirtItem${shirtId}`)
		.innerHTML.replace(/ x\d/, "");
	currentShirt.style.color = document.getElementById(`shirtItem${shirtId}`).style.color;
	charSelectorCont.style.display = "block";
	lobbySelectorCont.style.display = "block";
	classSelector.style.display = "none";
	camoSelector.style.display = "none";
	shirtSelector.style.display = "none";
	hatSelector.style.display = "none";
	lobbySelector.style.display = "none";
	lobbyCSelector.style.display = "none";
}
var currentSpray = document.getElementById("currentSpray");
var sprayList = document.getElementById("sprayList");
function updateSpraysList(sprays: any[]) {
	let listContent: Node[] = [];
	for (let i = 0; i < sprays.length; ++i) {
		listContent.push(
			<div
				class="hatSelectItem"
				id={`sprayItem${i + 1}`}
				onClick={() => changeSpray(i + 1, sprays[i].id)}
			>
				{sprays[i].name}
				<div
					id={`sprayHoverImage${i + 1}`}
					class="hoverTooltip"
					style={{ width: "90px", height: "90px" }}
				></div>
			</div>,
		);
	}
	sprayList.replaceChildren(...listContent);
	if (localStorage.getItem("previousSpray")) {
		previousSpray = Number.parseInt(localStorage.getItem("previousSpray"));
		try {
			changeSpray(previousSpray, sprays[previousSpray - 1].id);
		} catch (_) {
			changeSpray(1, sprays[1].id);
		}
	} else {
		changeSpray(1, sprays[1].id);
	}
}
document.getElementById("currentSpray").addEventListener("click", showSprayselector);
function showSprayselector() {
	charSelectorCont.style.display = "none";
	lobbySelectorCont.style.display = "none";
	classSelector.style.display = "none";
	lobbySelector.style.display = "none";
	lobbyCSelector.style.display = "none";
	camoSelector.style.display = "none";
	shirtSelector.style.display = "none";
	hatSelector.style.display = "none";
	spraySelector.style.display = "block";
}
function changeSpray(dir: number, sprayId: number) {
	if (!socket) return;
	socket.emit("cSpray", dir);
	localStorage.setItem("previousSpray", dir.toString());
	currentSpray.innerHTML = document.getElementById(`sprayItem${dir}`).innerHTML.replace(/ x\d/, "");
	currentSpray.style.color = document.getElementById(`sprayItem${dir}`).style.color;
	let hoverElem = document.getElementById(`sprayHoverImage${dir}`);
	hoverElem?.replaceChildren(
		<img class="sprayDisplayImage" src={`/images/sprays/${sprayId}.png`} />,
	);
	charSelectorCont.style.display = "block";
	lobbySelectorCont.style.display = "block";
	classSelector.style.display = "none";
	camoSelector.style.display = "none";
	shirtSelector.style.display = "none";
	hatSelector.style.display = "none";
	spraySelector.style.display = "none";
	lobbySelector.style.display = "none";
	lobbyCSelector.style.display = "none";
}
//@ts-expect-error
window.changeSpray = changeSpray;
function findUserByIndex(index: number): Player {
	return players.find((obj) => obj.index === index) ?? null;
}
function getUsersList(): Player[] {
	return players.sort(sortUsersByScore);
}
function sortUsersByScore(a: Player, b: Player) {
	if (b.score === a.score) {
		if (a.id < b.id) {
			return -1;
		} else if (a.id > b.id) {
			return 1;
		} else {
			return 0;
		}
	} else if (a.score > b.score) {
		return -1;
	} else if (a.score < b.score) {
		return 1;
	} else {
		return 0;
	}
}
function sortUsersByPosition(a: (typeof players)[number], b: (typeof players)[number]) {
	if (a.y < b.y) {
		return -1;
	} else if (a.y > b.y) {
		return 1;
	} else {
		return 0;
	}
}
function updateLeaderboard(data: number[]) {
	let test: Node[] = [];
	test.push(<span class="title">LEADERBOARD</span>);

	for (let i = 0; i < data.length; i++) {
		let tmpPlayer = findUserByIndex(data[0 + i]);
		if (tmpPlayer == null) continue;
		test.push(<br />);
		if (tmpPlayer.index === st.player.index) {
			test.push(
				<span class="me">
					{i + 1}. {st.player.name}
					{st.player.account.clan && ` [${st.player.account.clan}]`}
				</span>,
			);
		} else if (tmpPlayer.name) {
			test.push(
				<>
					<span class={tmpPlayer.team !== st.player.team ? "red" : "blue"}>
						{i + 1}. {tmpPlayer.name}
					</span>
					{tmpPlayer.account.clan && <span class="me"> [{tmpPlayer.account.clan}]</span>}
				</>,
			);
		}
	}
	document.getElementById("status").replaceChildren(...test);
}
function updateTeamScores(scoreRed: number, scoreBlue: number) {
	var redProgress = document.getElementById("redProgress");
	var blueText = document.getElementById("blueText");
	var blueProgress = document.getElementById("blueProgress");
	var redProgCont = document.getElementById("redProgCont");
	if (!gameMode) return;
	if (gameMode.teams) {
		blueText.textContent = "A";
		redProgCont.style.display = "";
		if (st.player.team === "red") {
			redProgress.setAttribute("style", `display:block;width:${scoreBlue}%`);
			redProgress.style.width = `${scoreBlue}%`;
			blueProgress.setAttribute("style", `display:block;width:${scoreRed}%`);
			blueProgress.style.width = `${scoreRed}%`;
		} else {
			redProgress.setAttribute("style", `display:block;width:${scoreRed}%`);
			redProgress.style.width = `${scoreRed}%`;
			blueProgress.setAttribute("style", `display:block;width:${scoreBlue}%`);
			blueProgress.style.width = `${scoreBlue}%`;
		}
	} else {
		//scoreBlue = Math.round((st.player.score / scoreRed) * 100);
		scoreBlue = (st.player.score / gameMode.score) * 100;
		blueProgress.setAttribute("style", `display:block;width:${scoreBlue}%`);
		blueProgress.style.width = `${scoreBlue}%`;
		blueText.textContent = "YOU";
		redProgCont.style.display = "none";
	}
}
function showUI() {
	if (st.settings.showUI) {
		document.getElementById("status").style.display = "block";
		document.getElementById("statContainer2").style.display = "block";
		document.getElementById("actionBar").style.display = "block";
		document.getElementById("statContainer").style.display = "block";
		document.getElementById("score").style.display = "block";
		if (st.settings.showPINGFPS) {
			document.getElementById("conStatContainer").style.display = "block";
		}
		if (!st.settings.showLeader) {
			document.getElementById("status").style.display = "none";
		}
	}
	if (st.settings.showChat) {
		document.getElementById("chatbox").style.display = "block";
	}
}
function hideMenuUI() {
	document.getElementById("namesBox").style.display = "none";
	document.getElementById("linkBox").style.display = "none";
}
function hideUI(hideChatbox: boolean) {
	document.getElementById("status").style.display = "none";
	document.getElementById("statContainer2").style.display = "none";
	document.getElementById("actionBar").style.display = "none";
	document.getElementById("conStatContainer").style.display = "none";
	document.getElementById("score").style.display = "none";
	document.getElementById("statContainer").style.display = "none";
	if (hideChatbox) {
		document.getElementById("chatbox").style.display = "none";
	}
}
// $(window).focus(function () {
//   if (socket != undefined) {
//     socket.emit("5", 1);
//   }
//   tabbed = 0;
// });
// $(window).blur(function () {
//   if (socket != undefined) {
//     socket.emit("5", 0);
//   }
//   tabbed = 1;
// });
let fpsUpdateDelta = 0;
let fpsSamples: number[] = [];
function updateGameLoop() {
	delta = currentTime - oldTime;

	currentFPS = delta ? 1000 / delta : 0;
	fpsSamples.push(currentFPS);

	fpsUpdateDelta += delta;
	if (fpsUpdateDelta >= 1000) {
		const average = fpsSamples.reduce((a, b) => a + b) / fpsSamples.length;
		fpsText.textContent = `FPS ${Math.round(average)}`;
		fpsUpdateDelta = 0;
		fpsSamples = [];
	}
	oldTime = currentTime;
	let horizontalDT = 0;
	let verticalDT = 0;
	count++;
	var doJump = 0;
	if (keys.u) {
		verticalDT = -1;
		// temp = 0;
	}
	if (keys.d) {
		verticalDT = 1;
		// temp = 0;
	}
	if (keys.r) {
		horizontalDT = 1;
		// temp = 0;
	}
	if (keys.l) {
		horizontalDT = -1;
		// temp = 0;
	}
	if (keys.s) {
		doJump = 0;
		// temp = 0;
	}
	var b = horizontalDT;
	var d = verticalDT;
	var e = Math.sqrt(horizontalDT * horizontalDT + verticalDT * verticalDT);
	if (e !== 0) {
		b /= e;
		d /= e;
	}
	if (clientPrediction) {
		for (const plr of players) {
			if (plr.index === st.player.index) {
				plr.oldX = plr.x;
				plr.oldY = plr.y;
				if (!plr.dead && !st.gameOver) {
					plr.x += b * plr.speed * delta;
					plr.y += d * plr.speed * delta;
				}
				wallCol(plr, st.gameMap.tiles, clutter);
				plr.x = Math.round(plr.x);
				plr.y = Math.round(plr.y);
				plr.angle = ((target.f + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI) + 90;
				if (getCurrentWeapon(plr)) {
					let f = Math.round((plr.angle % 360) / 90) * 90;
					if (f === 0 || f === 360) {
						getCurrentWeapon(plr).front = true;
					} else if (f === 180) {
						getCurrentWeapon(plr).front = false;
					} else {
						getCurrentWeapon(plr).front = true;
					}
				}
				if (plr.jumpCountdown > 0) {
					plr.jumpCountdown -= delta;
				}
				if (keys.s && plr.jumpCountdown <= 0 && !st.gameOver) {
					playerJump(plr);
					doJump = 1;
				}
			}
			if (plr.jumpY !== 0) {
				plr.jumpDelta -= plr.gravityStrength * delta;
				plr.jumpY += plr.jumpDelta * delta;
				if (plr.jumpY > 0) {
					plr.animIndex = 1;
				} else {
					plr.jumpY = 0;
					plr.jumpDelta = 0;
					plr.jumpCountdown = 250;
				}
				plr.jumpY = Math.round(plr.jumpY);
			}
			if (plr.index == st.player.index && !st.gameOver) {
				let sendData = {
					hdt: b,
					vdt: d,
					ts: currentTime,
					isn: inputNumber,
					s: doJump,
					delta,
				};
				inputNumber++;
				thisInput.push(sendData);
				socket.emit("4", sendData);
				if (userScroll != 0 && !st.gameOver) {
					playerSwapWeapon(plr, userScroll);
					userScroll = 0;
				}
				if (keys.rl && !st.gameOver) {
					playerReload(plr, true);
				}
				if (keys.lm && !st.gameOver && st.player.weapons.length > 0) {
					if (
						currentTime - getCurrentWeapon(plr).lastShot >=
						getCurrentWeapon(plr).fireRate
					) {
						shootBullet(plr);
					}
				}
			}
			if (st.gameOver) {
				plr.animIndex = 0;
			} else {
				let f = Math.abs(b) + Math.abs(d);
				if (plr.index != st.player.index) {
					f = Math.abs(plr.xSpeed) + Math.abs(plr.ySpeed);
				}
				if (f > 0) {
					plr.frameCountdown -= delta / 4;
					if (plr.frameCountdown <= 0) {
						plr.animIndex++;
						if (plr.jumpY == 0 && plr.onScreen && !plr.dead) {
							stillDustParticle(plr.x, plr.y, false);
						}
						if (plr.animIndex >= 3) {
							plr.animIndex = 1;
						} else if (plr.animIndex == 2 && plr.jumpY <= 0) {
							playSound("step1", plr.x, plr.y);
						}
						plr.frameCountdown = 40;
					}
				} else if (plr.animIndex != 0) {
					plr.animIndex = 0;
				}
				if (plr.jumpY > 0) {
					plr.animIndex = 1;
				}
			}
		}
	}
	players.sort(sortUsersByPosition);
	if (!st.kicked) {
		if (st.gameOver) {
			doGame(delta);
			if (gameOverFade && st.settings.showFade) {
				drawOverlay(graph, true, false);
			}
		} else if (st.player.dead && !inMainMenu) {
			doGame(delta);
			drawOverlay(graph, true, false);
		} else if (st.gameStart) {
			doGame(delta);
			drawOverlay(graph, false, true);
			if (!st.mobile && targetChanged) {
				targetChanged = false;
				socket.emit("0", target.f);
			}
		} else if (!st.kicked) {
			drawMenuBackground();
			drawOverlay(graph, false, false);
		}
	}
	if (disconnected || st.kicked) {
		drawOverlay(graph, false, false);
		const renderedReason = st.kicked
			? reason !== ""
				? renderShadedAnimText(reason, st.viewMult * 48, "#ffffff", 6, "")
				: renderShadedAnimText("You were kicked", st.viewMult * 48, "#ffffff", 6, "")
			: renderShadedAnimText("Disconnected", st.viewMult * 48, "#ffffff", 6, "");
		if (renderedReason !== undefined) {
			graph.drawImage(
				renderedReason,
				st.maxScreenWidth / 2 - renderedReason.width / 2,
				st.maxScreenHeight / 2 - renderedReason.height / 2,
				renderedReason.width,
				renderedReason.height,
			);
		}
	}
	if (st.settings.showTrippy) {
		context.globalAlpha = 0.25;
	}
}
function otherJump(userIdx: number) {
	var tmpPlayer = findUserByIndex(userIdx);
	if (tmpPlayer && st.player.index !== userIdx) {
		playerJump(tmpPlayer);
	}
}
function playerJump(plr: Player) {
	if (plr.jumpY <= 0) {
		playSound("jump1", plr.x, plr.y);
		plr.jumpDelta = plr.jumpStrength;
		plr.jumpY = plr.jumpDelta;
	}
}
var overlayMaxAlpha = 0.5;
var overlayAlpha = overlayMaxAlpha;
var overlayFadeUp = 0.01;
var overlayFadeDown = 0.04;
var animateOverlay = true;
function drawOverlay(ctx: CanvasRenderingContext2D, fadeUp: boolean, fadeDown: boolean) {
	if (animateOverlay) {
		if (fadeUp) {
			overlayAlpha += overlayFadeUp;
			if (overlayAlpha >= overlayMaxAlpha) {
				overlayAlpha = overlayMaxAlpha;
			}
		} else if (fadeDown) {
			overlayAlpha -= overlayFadeDown;
			if (overlayAlpha <= 0) {
				overlayAlpha = 0;
			}
		} else {
			overlayAlpha = overlayMaxAlpha;
		}
	}
	if (overlayAlpha > 0) {
		ctx.fillStyle = "#2e3031";
		ctx.globalAlpha = overlayAlpha;
		ctx.fillRect(0, 0, st.maxScreenWidth, st.maxScreenHeight);
		ctx.globalAlpha = 1;
	}
}
var drawMiniMapFPS = 4;
var drawMiniMapCounter = 0;
function doGame(delta: number) {
	updateScreenShake(/*delta*/);
	if (target != null) {
		st.startX =
			st.player.x -
			st.maxScreenWidth / 2 +
			-st.shake.x +
			target.dOffset * Math.cos(target.f + Math.PI);

		st.startY =
			st.player.y -
			20 -
			st.maxScreenHeight / 2 +
			-st.shake.y +
			target.dOffset * Math.sin(target.f + Math.PI);

		if (fillCounter > 1 && socket) {
			socket.emit("kil");
		}
	}
	drawBackground();
	drawMap(0);
	drawMap(1);
	drawSprays();
	updateParticles(delta, 0);
	drawGameObjects(delta);
	updateBullets(delta);
	updateParticles(delta, 1);
	drawMap(2);
	drawPlayerNames();
	drawEdgeShader();
	drawGameLights(delta);
	updateAnimTexts(delta);
	updateNotifications(delta);
	drawUI();
	drawMiniMapCounter--;
	if (drawMiniMapCounter <= 0 && st.gameStart) {
		fillCounter = 0;
		drawMiniMapCounter = drawMiniMapFPS;
		drawMiniMap();
	}
}
window.addEventListener("resize", resize);
function resize() {
	screenWidth = Math.round(window.innerWidth);
	screenHeight = Math.round(window.innerHeight);
	calculateUIScale();
	var a = Math.max(screenWidth / st.maxScreenWidth, screenHeight / st.maxScreenHeight);
	mainCanvas.width = screenWidth;
	mainCanvas.height = screenHeight;
	graph.setTransform(
		a,
		0,
		0,
		a,
		(screenWidth - st.maxScreenWidth * a) / 2,
		(screenHeight - st.maxScreenHeight * a) / 2,
	);
	document.getElementById("startMenuWrapper").style.transform =
		`perspective(1px) translate(-50%, -50%) scale(${uiScale})`;
	document.getElementById("gameStatWrapper").style.transform =
		`perspective(1px) translate(-50%, -50%) scale(${uiScale})`;
	graph.imageSmoothingEnabled = false;
	drawMenuBackground();
}
resize();
var grd: CanvasGradient | null = null;
function drawEdgeShader() {
	try {
		if (grd == null) {
			grd = graph.createRadialGradient(
				st.player.x - st.startX,
				st.player.y - st.startY,
				0,
				st.player.x - st.startX,
				st.player.y - st.startY,
				st.maxScreenWidth / 2,
			);
			grd.addColorStop(0, "rgba(0,0,0,0.0)");
			grd.addColorStop(1, "rgba(0,0,0,0.4");
		}
		graph.fillStyle = grd;
		graph.fillRect(0, 0, st.maxScreenWidth, st.maxScreenHeight);
	} catch (err) {
		console.error(err);
	}
}

function drawGameLights(delta: number) {
	if (!st.sprites.light) return;
	graph.globalCompositeOperation = "lighter";
	graph.globalAlpha = 0.2;
	for (const tmpObject of bullets) {
		if (!st.settings.showGlows || tmpObject.spriteIndex === 2 || !tmpObject.active) continue;
		let tmpBulletGlowWidth = tmpObject.glowWidth || Math.min(200, tmpObject.width * 14);
		let tmpBulletGlowHeight = tmpObject.glowHeight || tmpObject.height * 2.5;
		let lightX = tmpObject.x - st.startX;
		let lightY = tmpObject.y - st.startY;
		if (!canSee(lightX, lightY, tmpBulletGlowWidth, tmpBulletGlowHeight)) continue;
		graph.save();
		graph.translate(lightX, lightY);
		drawSprite(
			graph,
			st.sprites.light,
			-(tmpBulletGlowWidth / 2),
			-(tmpBulletGlowHeight / 2) + tmpObject.height / 2,
			tmpBulletGlowWidth,
			tmpBulletGlowHeight,
			tmpObject.dir - Math.PI / 2,
			false,
			0,
			0,
			0,
		);
		graph.restore();
	}
	if (st.settings.showGlows) {
		graph.globalAlpha = 0.2;
		updateFlashGlows(delta);
	}
	graph.globalCompositeOperation = "source-over";
}
var mapScale = mapCanvas.width;
var pingScale = mapScale / 80;
mapContext.lineWidth = pingScale / 2;
var pingFade = 0.085;
var pingGrow = 0.4;
var cachedMiniMap: HTMLCanvasElement | null = null;
function getCachedMiniMap() {
	fillCounter++;
	if (cachedMiniMap == null && st.gameMap?.tiles.length > 0) {
		let baseCanvasElem = document.createElement("canvas");
		let baseCtx = baseCanvasElem.getContext("2d");
		baseCanvasElem.width = mapScale;
		baseCanvasElem.height = mapScale;
		baseCtx.fillStyle = "#fff";
		for (const tile of st.gameMap.tiles) {
			if (!tile.wall) continue;
			baseCtx.fillRect(
				(tile.x / gameWidth) * mapScale,
				(tile.y / gameHeight) * mapScale,
				((mapTileScale * 1.08) / gameWidth) * mapScale,
				((mapTileScale * 1.08) / gameWidth) * mapScale,
			);
		}
		let finalCanvasElem = document.createElement("canvas");
		let finalCtx = finalCanvasElem.getContext("2d");
		finalCanvasElem.width = mapScale;
		finalCanvasElem.height = mapScale;
		finalCtx.globalAlpha = 0.1;
		finalCtx.drawImage(baseCanvasElem, 0, 0);
		finalCtx.globalAlpha = 1;
		for (const tile of st.gameMap.tiles) {
			if (!tile.hardPoint) continue;
			finalCtx.fillStyle = tile.objTeam === st.player.team ? "#5151d9" : "#d95151";
			finalCtx.fillRect(
				(tile.x / gameWidth) * mapScale,
				(tile.y / gameHeight) * mapScale,
				((mapTileScale * 1.08) / gameWidth) * mapScale,
				((mapTileScale * 1.08) / gameWidth) * mapScale,
			);
		}
		cachedMiniMap = finalCanvasElem;
	}
	return cachedMiniMap;
}
function drawMiniMap() {
	mapContext.reset(); // I had to add this - the minimap 'caching' system seems weird
	var cachedMiniMap = getCachedMiniMap();
	if (cachedMiniMap != null) {
		mapContext.drawImage(cachedMiniMap, 0, 0, mapScale, mapScale);
	}
	mapContext.globalAlpha = 1;
	for (const plr of players) {
		if (
			plr.onScreen &&
			(plr.index === st.player.index || plr.team === st.player.team || plr.isBoss)
		) {
			mapContext.fillStyle =
				plr.index === st.player.index ? "#fff" : plr.isBoss ? "#db4fcd" : "#5151d9";
			mapContext.beginPath();
			mapContext.arc(
				(plr.x / gameWidth) * mapScale,
				(plr.y / gameHeight) * mapScale,
				pingScale,
				0,
				Math.PI * 2,
				true,
			);
			mapContext.closePath();
			mapContext.fill();
		}
	}
	if (!st.gameMap) return;
	mapContext.globalAlpha = 1;
	for (const pickup of st.gameMap.pickups) {
		if (!pickup.active) continue;
		if (pickup.type === "lootcrate") {
			mapContext.fillStyle = "#ffd100";
		} else if (pickup.type === "healthpack") {
			mapContext.fillStyle = "#5ed951";
		}
		mapContext.beginPath();
		mapContext.arc(
			(pickup.x / gameWidth) * mapScale,
			(pickup.y / gameHeight) * mapScale,
			pingScale,
			0,
			Math.PI * 2,
			true,
		);
		mapContext.closePath();
		mapContext.fill();
	}
}
function calculateUIScale() {
	uiScale = ((screenHeight + screenWidth) / (1920 + 1080)) * 1.25;
}
function drawMenuBackground() {}
function drawUI() {}
var userSprays: Sprite[] = [];
var cachedSprays: Record<string, SpriteCanvas> = {};
function createSpray(plrIdx: number, x: number, y: number) {
	let tmpPlayer = findUserByIndex(plrIdx);
	if (!tmpPlayer) return;
	let tmpSpray = userSprays.find((s) => s.owner === plrIdx);
	if (!tmpSpray) {
		const img = new Image() as Sprite;
		img.owner = plrIdx;
		img.active = false;
		img.xPos = 0;
		img.yPos = 0;
		img.onload = () => {
			cacheSpray(img);
		};
		userSprays.push(img);
		tmpSpray = img;
	}
	tmpSpray.active = true;
	tmpSpray.scale = tmpPlayer.spray.info.scale;
	tmpSpray.alpha = tmpPlayer.spray.info.alpha;
	tmpSpray.resolution = tmpPlayer.spray.info.resolution;
	tmpSpray.xPos = x - tmpSpray.scale / 2;
	tmpSpray.yPos = y - tmpSpray.scale / 2;
	if (tmpSpray.src !== tmpPlayer.spray.src) {
		tmpSpray.src = tmpPlayer.spray.src;
	}
}
function sendSpray() {
	socket.emit("crtSpr");
}
function deactivateSprays() {
	userSprays.forEach((spray) => {
		spray.active = false;
	});
}
function cacheSpray(img: Sprite) {
	const tmpIndex = `${img.src}`;
	let tmpSpray = cachedSprays[tmpIndex];
	if (tmpSpray || img.width === 0) return;

	let initialCanvas = document.createElement("canvas");
	let initialCtx = initialCanvas.getContext("2d");
	initialCanvas.width = img.resolution;
	initialCanvas.height = img.resolution;
	initialCtx.drawImage(img, 0, 0, img.resolution, img.resolution);
	let finalCanvas = document.createElement("canvas");
	let finalCtx = finalCanvas.getContext("2d");
	finalCanvas.width = img.scale;
	finalCanvas.height = img.scale;
	finalCtx.imageSmoothingEnabled = false;
	finalCtx.globalAlpha = img.alpha;
	finalCtx.drawImage(initialCanvas, 0, 0, img.scale, img.scale);
	tmpSpray = finalCanvas;
	cachedSprays[tmpIndex] = tmpSpray;
}
function drawSprays() {
	if (!st.settings.showSprays) return;
	for (const sp of userSprays) {
		if (!sp.active) continue;
		let tmpSpray = cachedSprays[`${sp.src}`];
		if (!tmpSpray) continue;
		graph.drawImage(tmpSpray, sp.xPos - st.startX, sp.yPos - st.startY);
	}
}
var spritesLoaded = false;
var spriteIndex = 0;
function getSprite(fileName: string) {
	var b = new Image() as Sprite;
	b.index = spriteIndex;
	b.flipped = false;
	b.isLoaded = false;
	b.onload = () => {
		b.isLoaded = true;
		b.onload = null;
	};
	b.onerror = () => {
		b.isLoaded = false;
		console.error(`File not Found: ${fileName}.png`);
	};
	try {
		let tmpPicture = localStorage.getItem(`${fileName}.png`);
		b.src = tmpPicture ? tmpPicture : "";
		b.crossOrigin = "anonymous";
	} catch (d) {
		console.log(d);
	}
	spriteIndex++;
	return b;
}
function flipSprite(sprite: Sprite, horizontal: boolean): Sprite {
	let canvasElem = document.createElement("canvas") as any; // todo cursed
	let ctx = canvasElem.getContext("2d");
	canvasElem.width = sprite.width;
	canvasElem.height = sprite.height;
	ctx.imageSmoothingEnabled = false;
	if (horizontal) {
		ctx.scale(-1, 1);
		ctx.drawImage(sprite, -canvasElem.width, 0, canvasElem.width, canvasElem.height);
	} else {
		ctx.scale(1, -1);
		ctx.drawImage(sprite, 0, -canvasElem.height, canvasElem.width, canvasElem.height);
	}
	canvasElem.index = sprite.index;
	canvasElem.flipped = true;
	canvasElem.isLoaded = true;
	return canvasElem;
}
function playerSwapWeapon(tmpPlayer: Player, change: number) {
	if (!tmpPlayer || tmpPlayer.dead) return;
	tmpPlayer.currentWeapon += change;
	if (tmpPlayer.currentWeapon < 0) {
		tmpPlayer.currentWeapon = tmpPlayer.weapons.length - 1;
	}
	if (tmpPlayer.currentWeapon >= tmpPlayer.weapons.length) {
		tmpPlayer.currentWeapon = 0;
	}
	playerEquipWeapon(tmpPlayer, tmpPlayer.currentWeapon);
	updateWeaponUI(tmpPlayer, false);
	socket.emit("sw", tmpPlayer.currentWeapon);
}
function playerEquipWeapon(tmpPlayer: Player, weaponId: number) {
	tmpPlayer.currentWeapon = weaponId;
}
var actionBar = document.getElementById("actionBar");
function updateWeaponUI(tmpPlayer: Player, force: boolean) {
	if (weaponSpriteSheet[0] == undefined || tmpPlayer.weapons == undefined) {
		return false;
	}
	if (!actionBar.childNodes.length || force) {
		actionBar.replaceChildren();
		for (let i = 0; i < tmpPlayer.weapons.length; ++i) {
			let actionContainer = document.createElement("div");
			actionContainer.id = `actionContainer${i}`;
			actionContainer.className =
				i === tmpPlayer.currentWeapon ? "actionContainerActive" : "actionContainer";
			let tmpDiv = weaponSpriteSheet[tmpPlayer.weapons[i].weaponIndex].icon;
			if (tmpDiv) {
				tmpDiv.className = "actionItem";
				let actionCooldown = document.createElement("div");
				actionCooldown.id = `actionCooldown${i}`;
				actionCooldown.className = "actionCooldown";
				actionContainer.appendChild(actionCooldown);
				actionContainer.appendChild(tmpDiv);
				actionBar.appendChild(actionContainer);
			}
		}
	} else {
		for (let i = 0; i < tmpPlayer.weapons.length; ++i) {
			let tmpDiv = document.getElementById(`actionContainer${i}`);
			tmpDiv.className =
				i === tmpPlayer.currentWeapon ? "actionContainerActive" : "actionContainer";
		}
	}
	updateUiStats(tmpPlayer);
}
function setCooldownAnimation(weaponIdx: number, time: number, d: boolean) {
	// for some reason, the action cooldown elements sometimes aren't created?
	if (!document.getElementById(`actionCooldown${weaponIdx}`)) {
		updateWeaponUI(st.player, false);
	}
	let tmpDiv = document.getElementById(`actionCooldown${weaponIdx}`);
	if (d) {
		tmpDiv.style.height = "100%";
		$(`#actionCooldown${weaponIdx}`).animate(
			{
				height: "0%",
			},
			time,
		);
	} else {
		tmpDiv.style.height = "0%";
	}
}
function shootBullet(source: Player) {
	let sourceWep = getCurrentWeapon(source);
	if (
		source.dead ||
		!sourceWep ||
		source.spawnProtection !== 0 ||
		sourceWep.weaponIndex < 0 ||
		sourceWep.reloadTime > 0 ||
		sourceWep.ammo <= 0
	)
		return;

	screenShake(sourceWep.shake, target.f);
	for (let b = 0; b < sourceWep.bulletsPerShot; ++b) {
		sourceWep.spreadIndex++;
		if (sourceWep.spreadIndex >= sourceWep.spread.length) {
			sourceWep.spreadIndex = 0; // ???
		}
		let spread = sourceWep.spread[sourceWep.spreadIndex];
		spread = utils.roundNumber(target.f + Math.PI + spread, 2);
		let dist = sourceWep.holdDist + sourceWep.bDist;
		let x = Math.round(source.x + dist * Math.cos(spread));
		dist = Math.round(source.y - sourceWep.yOffset - source.jumpY + dist * Math.sin(spread));
		shootNextBullet(
			{
				x: x,
				y: dist,
				d: spread,
				si: -1,
			},
			source,
			target.d,
			currentTime,
			getNextBullet(bullets),
		);
	}
	socket.emit("1", source.x, source.y, source.jumpY, target.f, target.d, currentTime);
	sourceWep.lastShot = currentTime;
	sourceWep.ammo--;
	if (sourceWep.ammo <= 0) {
		playerReload(source, true);
	}
	updateUiStats(source);
}
function playerReload(player: Player, shouldEmit: boolean) {
	if (
		getCurrentWeapon(player).reloadTime <= 0 &&
		getCurrentWeapon(player).ammo !== getCurrentWeapon(player).maxAmmo
	) {
		getCurrentWeapon(player).reloadTime = getCurrentWeapon(player).reloadSpeed;
		getCurrentWeapon(player).spreadIndex = 0;
		showNotification("Reloading");
		if (shouldEmit) {
			socket.emit("r");
		}
		setCooldownAnimation(player.currentWeapon, getCurrentWeapon(player).reloadTime, true);
	}
}
function findServerBullet(bulletIndex: number) {
	return bullets.find((b) => b.serverIndex === bulletIndex);
}
function someoneShot(evt: ShootEvent) {
	if (evt.i !== st.player.index) {
		let tmpPlayer = findUserByIndex(evt.i);
		if (tmpPlayer != null) {
			shootNextBullet(evt, tmpPlayer, target.d, currentTime, getNextBullet(bullets));
		}
	}
}
function updateBullets(delta: number) {
	graph.globalAlpha = 1;
	for (const bullet of bullets) {
		bullet.update(delta, currentTime, clutter, st.gameMap.tiles, players);
		if (bullet.active) {
			let b = bullet.x - st.startX;
			let d = bullet.y - st.startY;
			if (canSee(b, d, bullet.height, bullet.height)) {
				graph.save();
				graph.translate(b, d);
				if (bullet.spriteIndex === 2) {
					graph.globalCompositeOperation = "lighter";
					graph.globalAlpha = 0.3;
					drawSprite(
						graph,
						bulletSprites[bullet.spriteIndex],
						-(bullet.glowWidth / 2),
						-(bullet.glowHeight / 2) + bullet.height / 2,
						bullet.glowWidth,
						bullet.glowHeight,
						bullet.dir - Math.PI / 2,
						false,
						0,
						0,
						0,
					);
				} else {
					drawSprite(
						graph,
						bulletSprites[bullet.spriteIndex],
						-(bullet.width / 2),
						0,
						bullet.width,
						bullet.height + 8,
						bullet.dir - Math.PI / 2,
						false,
						0,
						0,
						0,
					);
				}
				graph.restore();
			}
		}
		if (st.settings.showBTrails && bullet.trailAlpha > 0) {
			graph.save();
			let x = Math.round(bullet.startX - st.startX);
			let y = Math.round(bullet.startY - st.startY);
			let x2 = Math.round(bullet.x - st.startX);
			let y2 = Math.round(bullet.y - st.startY);
			let trailGrad = graph.createLinearGradient(x, y, x2, y2);
			trailGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
			trailGrad.addColorStop(1, `rgba(255, 255, 255, ${bullet.trailAlpha})`);
			graph.strokeStyle = trailGrad;
			graph.lineWidth = bullet.trailWidth;
			graph.beginPath();
			graph.moveTo(x, y);
			graph.lineTo(x2, y2);
			graph.closePath();
			graph.stroke();
			graph.restore();
		}
	}
}

var currentClassID = 0;
var currentClass = document.getElementById("currentClass");
var classList = document.getElementById("classList");
var characterWepnDisplay = document.getElementById("charWpn");
var characterWepnDisplay2 = document.getElementById("charWpn2");
function createClassList() {
	let res: Node[] = [];
	for (const [i, cl] of characterClasses.entries()) {
		if (cl.classN === "???") continue;
		res.push(
			<div class="hatSelectItem" id={`classItem${i}`} onClick={() => pickedCharacter(i)}>
				{cl.classN}
			</div>,
		);
	}
	classList.replaceChildren(...res);
}
createClassList();
document.getElementById("currentClass").addEventListener("click", showClassselector);
function showClassselector() {
	charSelectorCont.style.display = "none";
	lobbySelectorCont.style.display = "none";
	classSelector.style.display = "block";
}
function loadSavedClass() {
	if (localStorage.getItem("previousClass")) {
		previousClass = Number.parseInt(localStorage.getItem("previousClass"));
		pickedCharacter(previousClass);
	} else {
		pickedCharacter(0);
	}
}
function pickedCharacter(classId: number) {
	currentClassID = classId;
	currentClass.textContent = document.getElementById(`classItem${classId}`).textContent;
	currentClass.style.color = document.getElementById(`classItem${classId}`).style.color;
	characterWepnDisplay.replaceChildren(
		<>
			<b>Primary:</b>
			<div class="hatSelectItem" style="display:inline-block">
				{characterClasses[classId].pWeapon}
			</div>
		</>,
	);
	characterWepnDisplay2.replaceChildren(
		<>
			<b>Secondary:</b>
			<div class="hatSelectItem" style="display:inline-block">
				{characterClasses[classId].sWeapon}
			</div>
		</>,
	);
	localStorage.setItem("previousClass", classId.toString());
	if (loggedIn) {
		for (const wepIdx of characterClasses[classId].weaponIndexes) {
			let skinPref = localStorage.getItem(`wpnSkn${wepIdx}`);
			if (skinPref) {
				changeCamo(wepIdx, parseInt(skinPref), false);
			}
		}
		if (localStorage.getItem("previousHat")) {
			previousHat = Number.parseInt(localStorage.getItem("previousHat"));
			changeHat(previousHat);
		}
		if (localStorage.getItem("previousShirt")) {
			previousShirt = Number.parseInt(localStorage.getItem("previousShirt"));
			changeShirt(previousShirt);
		}
	}
	charSelectorCont.style.display = "block";
	lobbySelectorCont.style.display = "block";
	classSelector.style.display = "none";
	lobbySelector.style.display = "none";
	lobbyCSelector.style.display = "none";
	hatSelector.style.display = "none";
	spraySelector.style.display = "none";
	camoSelector.style.display = "none";
	shirtSelector.style.display = "none";
}
var camoDataList: any[] | null = null;
var maxCamos = 0;
var camoList = document.getElementById("camoList");
characterWepnDisplay.addEventListener("click", () => showWeaponSelector(0));
characterWepnDisplay2.addEventListener("click", () => showWeaponSelector(1));
function showWeaponSelector(wepType: 0 | 1) {
	charSelectorCont.style.display = "none";
	lobbySelectorCont.style.display = "none";
	classSelector.style.display = "none";
	camoSelector.style.display = "block";
	let classWeapon = characterClasses[currentClassID].weaponIndexes[wepType];
	let list: Node[] = [];
	list.push(
		<div class="hatSelectItem" onClick={() => changeCamo(classWeapon, 0, true)}>
			Default
		</div>,
	);
	if (/*loggedIn && */ camoDataList?.[classWeapon]) {
		for (const camo of camoDataList[classWeapon]) {
			list.push(
				<div
					class="hatSelectItem"
					style={{ color: getItemRarityColor(camo.chance) }}
					onClick={() => changeCamo(classWeapon, camo.id, true)}
				>
					{camo.name} x{parseInt(camo.count) + 1}
				</div>,
			);
		}
		document.getElementById("camoHeaderAmount").textContent =
			`SELECT CAMO (${camoDataList[classWeapon].length + 1}/${maxCamos + 1})`;
	} else {
		document.getElementById("camoHeaderAmount").textContent = "SELECT CAMO";
	}
	camoList.replaceChildren(...list);
}
function getCamoURL(id: number) {
	return `/images/camos/${id + 1}.png`;
}
function changeCamo(weaponId: number, camoId: number, save: boolean) {
	if (!socket) return;
	socket.emit("cCamo", {
		weaponID: weaponId,
		camoID: camoId,
	});
	if (!save) return;
	localStorage.setItem(`wpnSkn${weaponId}`, camoId.toString());
	charSelectorCont.style.display = "block";
	lobbySelectorCont.style.display = "block";
	camoSelector.style.display = "none";
	shirtSelector.style.display = "none";
	classSelector.style.display = "none";
	hatSelector.style.display = "none";
	lobbySelector.style.display = "none";
	lobbyCSelector.style.display = "none";
}
function updateCamosList(max: number, data: any[]) {
	camoDataList = data;
	maxCamos = max;
}
var animLength = 3;
var classSpriteSheets: {
	upSprites: Sprite[];
	downSprites: Sprite[];
	leftSprites: Sprite[];
	rightSprites: Sprite[];
	arm: Sprite;
	hD: Sprite;
	hU: Sprite;
	hL: Sprite;
	hR: Sprite;
}[] = [];
function loadPlayerSprites(base: string) {
	classSpriteSheets = [];
	loadPlayerSpriteArray(base, characterClasses);
	loadPlayerSpriteArray(base, specialClasses);
	resize();
}
function loadPlayerSpriteArray(
	base: string,
	classes: typeof characterClasses | typeof specialClasses,
) {
	for (const { folderName, hasDown } of classes) {
		let upSprites: Sprite[] = [];
		let downSprites: Sprite[] = [];
		let leftSprites: Sprite[] = [];
		let rightSprites: Sprite[] = [];
		upSprites.push(getSprite(`${base}characters/${folderName}/up`));
		downSprites.push(getSprite(`${base}characters/${folderName}/down`));
		leftSprites.push(getSprite(`${base}characters/${folderName}/left`));
		rightSprites.push(getSprite(`${base}characters/${folderName}/left`));
		for (let i = 0; i < animLength; ++i) {
			let tmpIndex = i;
			upSprites.push(getSprite(`${base}characters/${folderName}/up${tmpIndex + 1}`));
			let tmpSprite = hasDown
				? getSprite(`${base}characters/${folderName}/down${tmpIndex + 1}`)
				: getSprite(`${base}characters/${folderName}/up${tmpIndex + 1}`);
			downSprites.push(tmpSprite);
			if (tmpIndex >= 2) {
				tmpIndex = 0;
			}
			leftSprites.push(getSprite(`${base}characters/${folderName}/left${tmpIndex + 1}`));
			rightSprites.push(getSprite(`${base}characters/${folderName}/left${tmpIndex + 1}`));
		}
		classSpriteSheets.push({
			upSprites,
			downSprites,
			leftSprites,
			rightSprites,
			arm: getSprite(`${base}characters/${folderName}/arm`),
			hD: getSprite(`${base}characters/${folderName}/hd`),
			hU: getSprite(`${base}characters/${folderName}/hu`),
			hL: getSprite(`${base}characters/${folderName}/hl`),
			hR: getSprite(`${base}characters/${folderName}/hl`),
		});
	}
}
var flagSprites: Sprite[] = [];
var clutterSprites: Sprite[] = [];
var cachedWalls: Record<string, SpriteCanvas> = {};
var floorSprites: Sprite[] = [];
var cachedFloors: Record<string, SpriteCanvas> = {};
var sideWalkSprite: Sprite | null = null;
var ambientSprites: Sprite[] = [];
var wallSpritesSeg: Sprite[] = [];
var weaponSpriteSheet: {
	upSprite: Sprite;
	downSprite: Sprite;
	leftSprite: Sprite;
	rightSprite: Sprite;
	icon: HTMLImageElement;
}[] = [];
var bulletSprites: Sprite[] = [];
var cachedShadows: SpriteCanvas[] = [];
var cachedWeaponSprites: Record<string, SpriteCanvas> = {};
var wallSprite: Sprite | null = null;
var darkFillerSprite: Sprite | null = null;
var healthPackSprite: Sprite | null = null;
var lootCrateSprite: Sprite | null = null;
var weaponWidth = 27;
var weaponHeight = 54;
function loadDefaultSprites(base: string) {
	cachedShadows = [];
	flagSprites = [];
	clutterSprites = [];
	cachedWalls = {};
	cachedFloors = {};
	floorSprites = [];
	ambientSprites = [];
	wallSpritesSeg = [];
	bulletSprites = [];
	cachedWeaponSprites = {};
	flagSprites.push(getSprite(`${base}flags/flagb1`));
	flagSprites.push(getSprite(`${base}flags/flagb2`));
	flagSprites.push(getSprite(`${base}flags/flagb3`));
	flagSprites.push(getSprite(`${base}flags/flagr1`));
	flagSprites.push(getSprite(`${base}flags/flagr2`));
	flagSprites.push(getSprite(`${base}flags/flagr3`));
	clutterSprites.push(getSprite(`${base}clutter/crate1`));
	clutterSprites.push(getSprite(`${base}clutter/barrel1`));
	clutterSprites.push(getSprite(`${base}clutter/barrel2`));
	clutterSprites.push(getSprite(`${base}clutter/bottle1`));
	clutterSprites.push(getSprite(`${base}clutter/spike1`));
	wallSprite = getSprite(`${base}wall1`);
	ambientSprites.push(getSprite(`${base}ambient1`));
	darkFillerSprite = getSprite(`${base}darkfiller`);
	st.sprites.light = getSprite(`${base}lighting`);
	floorSprites.push(getSprite(`${base}ground1`));
	floorSprites.push(getSprite(`${base}ground2`));
	floorSprites.push(getSprite(`${base}ground3`));
	sideWalkSprite = getSprite(`${base}sidewalk1`);
	wallSpritesSeg.push(getSprite(`${base}wallSegment1`));
	wallSpritesSeg.push(getSprite(`${base}wallSegment2`));
	wallSpritesSeg.push(getSprite(`${base}wallSegment3`));
	st.sprites.particles = [
		getSprite(`${base}particles/blood/blood`),
		getSprite(`${base}particles/oil/oil`),
		getSprite(`${base}particles/wall`),
		getSprite(`${base}particles/hole`),
		getSprite(`${base}particles/blood/splatter1`),
		getSprite(`${base}particles/blood/splatter2`),
		getSprite(`${base}particles/explosion`),
	];
	healthPackSprite = getSprite(`${base}healthpack`);
	lootCrateSprite = getSprite(`${base}lootCrate1`);
	weaponSpriteSheet = [];
	for (const name of weaponNames) {
		weaponSpriteSheet.push({
			upSprite: getSprite(`${base}weapons/${name}/up`),
			downSprite: getSprite(`${base}weapons/${name}/up`),
			leftSprite: getSprite(`${base}weapons/${name}/left`),
			rightSprite: getSprite(`${base}weapons/${name}/left`),
			icon: getSprite(`${base}weapons/${name}/icon`),
		});
	}
	bulletSprites.push(getSprite(`${base}weapons/bullet`));
	bulletSprites.push(getSprite(`${base}weapons/grenade`));
	bulletSprites.push(getSprite(`${base}weapons/flame`));
	resize();
}

var mainTitleText = document.getElementById("mainTitleText");
function updateMenuInfo(info: string) {
	// active security risk
	mainTitleText.innerHTML = info;
}

var linkedMod = location.hash.replace("#", "");
loadModPack(linkedMod, linkedMod == "");
var loadingTexturePack = false;

var modInfo = document.getElementById("modInfo");
function setModInfoText(info: string) {
	if (modInfo) {
		// active security risk
		modInfo.innerHTML = info;
	}
}
//@ts-expect-error
window.loadModPack = loadModPack;
async function loadModPack(url: string, isBaseAssets: boolean) {
	try {
		if (loadingTexturePack) return;
		let modPath = "";
		if (isBaseAssets) {
			st.doSounds = false;
			modPath = "/res.zip";
		} else {
			if (url === "") {
				setModInfoText("Please enter a mod Key/URL");
				return false;
			}
			st.doSounds = true;
			loadingTexturePack = true;
			if (url.includes(".")) {
				modPath = url;
				if (!modPath.match(/^https?:\/\//i)) {
					modPath = `http://${modPath}`;
				}
			} else {
				modPath = `https://dl.dropboxusercontent.com/s/${url}/vertixmod.zip`;
			}
		}
		if (!isBaseAssets) {
			setModInfoText("Loading...");
		}

		const reader = new zip.ZipReader(new zip.HttpReader(modPath));

		const entries = await reader.getEntries();
		for (const entry of entries) {
			if (entry.directory) continue;
			entry.filename = entry.filename.replace("vertixmod/", "");
			let fileFormat = entry.filename.split(".")[entry.filename.split(".").length - 1];
			let basePath = entry.filename.split("/")[0];
			if (basePath === "scripts") {
				let data = await (entry as zip.FileEntry).getData(new zip.TextWriter());
				if (entry.filename.includes("modinfo")) {
					setModInfoText(data);
				} else if (entry.filename.includes("cssmod")) {
					let styleElem = document.createElement("style");
					styleElem.textContent = data;
				} else if (entry.filename.includes("gameinfo")) {
					data = data.replace(/(\r\n|\n|\r)/gm, "");
					let parsed = JSON.parse(data);
					updateMenuInfo(parsed.name);
				} else if (entry.filename.includes("charinfo")) {
					let split = data.replace(/(\r\n|\n|\r)/gm, "").split("|");
					let tmp = split.map((s) => JSON.parse(s));
					setCharacterClasses(tmp);
					createClassList();
					pickedCharacter(currentClassID);
				}
			} else if (basePath === "sprites") {
				let data = await (entry as zip.FileEntry).getData(new zip.BlobWriter("image/png"));
				let imgAsDataURL = URL.createObjectURL(data);
				localStorage.setItem(entry.filename, imgAsDataURL);
			} else if (basePath === "sounds") {
				entry.filename = entry.filename.replace(`.${fileFormat}`, "");
				let data = await (entry as zip.FileEntry).getData(
					new zip.BlobWriter(`audio/${fileFormat}`),
				);
				let soundAsDataURL = URL.createObjectURL(data);
				localStorage.setItem(`${entry.filename}data`, soundAsDataURL);
				localStorage.setItem(`${entry.filename}format`, fileFormat);
			}
		}
		spriteIndex = 0;
		loadPlayerSprites("sprites/");
		loadDefaultSprites("sprites/");
		loadSounds("sounds/");
		loadingTexturePack = false;
	} catch (err) {
		console.error(err);
		loadingTexturePack = false;
		setModInfoText("Mod could not be loaded");
	}
}
function getPlayerSprite(classIdx: number, angle: number, animIdx: number) {
	let tmpSpriteCollection = classSpriteSheets[classIdx];
	if (!tmpSpriteCollection) {
		return null;
	}
	let tmpSprite: Sprite;
	if (angle === 90) {
		tmpSprite = tmpSpriteCollection.leftSprites[animIdx];
	} else if (angle === 180) {
		tmpSprite = tmpSpriteCollection.upSprites[animIdx];
	} else if (angle === 270) {
		if (
			!tmpSpriteCollection.rightSprites[animIdx].flipped &&
			tmpSpriteCollection.rightSprites[animIdx].isLoaded
		) {
			tmpSpriteCollection.rightSprites[animIdx] = flipSprite(
				tmpSpriteCollection.rightSprites[animIdx],
				true,
			);
		}
		tmpSprite = tmpSpriteCollection.rightSprites[animIdx];
	} else {
		tmpSprite = tmpSpriteCollection.downSprites[animIdx];
	}
	return tmpSprite;
}
var cachedHats: any[] = [];
function getHatSprite(playerObj: Player, dir: number) {
	let tmpAcc = playerObj.account;
	if (!tmpAcc) return null;
	if (tmpAcc.hat != null) {
		let tmpSprite = cachedHats[tmpAcc.hat.id];
		if (!tmpSprite) {
			let hat = {
				lS: new Image() as Sprite,
				uS: new Image() as Sprite,
				rS: new Image() as Sprite,
				dS: new Image() as Sprite,
				imgToLoad: 0,
			};
			if (tmpAcc.hat.left) {
				hat.imgToLoad++;
				hat.lS.index = spriteIndex;
				spriteIndex++;
				hat.lS.src = `/images/hats/${tmpAcc.hat.id}/l.png`;
				hat.lS.onload = () => {
					hat.imgToLoad--;
					hat.lS.isLoaded = true;
					hat.lS.onload = null;
				};
				hat.imgToLoad++;
				hat.rS.index = spriteIndex;
				spriteIndex++;
				hat.rS.src = `/images/hats/${tmpAcc.hat.id}/l.png`;
				hat.rS.onload = () => {
					hat.rS = flipSprite(hat.rS, true);
					hat.imgToLoad--;
					hat.rS.isLoaded = true;
					hat.rS.onload = null;
				};
			}
			if (tmpAcc.hat.up) {
				hat.imgToLoad++;
				hat.uS.index = spriteIndex;
				spriteIndex++;
				hat.uS.src = `/images/hats/${tmpAcc.hat.id}/u.png`;
				hat.uS.onload = () => {
					hat.imgToLoad--;
					hat.uS.isLoaded = true;
					hat.uS.onload = null;
				};
			}
			hat.imgToLoad++;
			hat.dS.index = spriteIndex;
			spriteIndex++;
			hat.dS.src = `/images/hats/${tmpAcc.hat.id}/d.png`;
			hat.dS.onload = () => {
				hat.imgToLoad--;
				hat.dS.isLoaded = true;
				hat.dS.onload = null;
			};
			cachedHats[tmpAcc.hat.id] = hat;
		} else if (tmpSprite.imgToLoad <= 0) {
			if (tmpAcc.hat.left && dir === 90) {
				return tmpSprite.lS;
			} else if (tmpAcc.hat.up && dir === 180) {
				return tmpSprite.uS;
			} else if (tmpAcc.hat.left && dir === 270) {
				return tmpSprite.rS;
			} else {
				return tmpSprite.dS;
			}
		}
	} else {
		let tmpSprite: Sprite;
		let tmpSpriteCollection = classSpriteSheets[playerObj.classIndex];
		if (!tmpSpriteCollection) {
			return null;
		}
		if (dir === 90) {
			tmpSprite = tmpSpriteCollection.hL;
		} else if (dir === 180) {
			tmpSprite = tmpSpriteCollection.hU;
		} else if (dir === 270) {
			if (!tmpSpriteCollection.hR.flipped && tmpSpriteCollection.hR.isLoaded) {
				tmpSpriteCollection.hR = flipSprite(tmpSpriteCollection.hR, true);
			}
			tmpSprite = tmpSpriteCollection.hR;
		} else {
			tmpSprite = tmpSpriteCollection.hD;
		}
		return tmpSprite;
	}
}
var cachedShirts: any[] = [];
function getShirtSprite(playerObj: Player, dir: number) {
	let tmpAcc = playerObj.account;
	if (!tmpAcc?.shirt || playerObj.classIndex === 8) return null;
	let tmpSprite = cachedShirts[tmpAcc.shirt.id];
	if (!tmpSprite) {
		let d = {
			lS: new Image() as Sprite,
			uS: new Image() as Sprite,
			rS: new Image() as Sprite,
			dS: new Image() as Sprite,
			imgToLoad: 0,
		};
		if (tmpAcc.shirt.left) {
			d.imgToLoad++;
			d.lS = new Image() as Sprite;
			d.lS.index = spriteIndex;
			spriteIndex++;
			d.lS.src = `/images/shirts/${tmpAcc.shirt.id}/l.png`;
			d.lS.onload = () => {
				d.imgToLoad--;
				d.lS.isLoaded = true;
				d.lS.onload = null;
			};
			d.imgToLoad++;
			d.rS = new Image() as Sprite;
			d.rS.index = spriteIndex;
			spriteIndex++;
			d.rS.src = `/images/shirts/${tmpAcc.shirt.id}/l.png`;
			d.rS.onload = () => {
				d.rS = flipSprite(d.rS, true);
				d.imgToLoad--;
				d.rS.isLoaded = true;
				d.rS.onload = null;
			};
		}
		if (tmpAcc.shirt.up) {
			d.imgToLoad++;
			d.uS = new Image() as Sprite;
			d.uS.index = spriteIndex;
			spriteIndex++;
			d.uS.src = `/images/shirts/${tmpAcc.shirt.id}/u.png`;
			d.uS.onload = () => {
				d.imgToLoad--;
				d.uS.isLoaded = true;
				d.uS.onload = null;
			};
		}
		d.imgToLoad++;
		d.dS = new Image() as Sprite;
		d.dS.index = spriteIndex;
		spriteIndex++;
		d.dS.src = `/images/shirts/${tmpAcc.shirt.id}/d.png`;
		d.dS.onload = () => {
			d.imgToLoad--;
			d.dS.isLoaded = true;
			d.dS.onload = null;
		};
		cachedShirts[tmpAcc.shirt.id] = d;
	} else if (tmpSprite.imgToLoad <= 0) {
		if (tmpAcc.shirt.left && dir === 90) {
			return tmpSprite.lS;
		} else if (tmpAcc.shirt.up && dir === 180) {
			return tmpSprite.uS;
		} else if (tmpAcc.shirt.left && dir === 270) {
			return tmpSprite.rS;
		} else {
			return tmpSprite.dS;
		}
	}
}
function getWeaponSprite(weaponIndex: number, camo: number, angle: number) {
	let tmpIndex = `${weaponIndex}${camo}${angle}`;
	let tmpSprite = cachedWeaponSprites[tmpIndex];
	if (!tmpSprite) {
		let wepSprites = weaponSpriteSheet[weaponIndex];
		if (!wepSprites) return;
		let wepSprite: Sprite;
		if (angle === 90) {
			wepSprite = wepSprites.leftSprite;
		} else if (angle === 180) {
			wepSprite = wepSprites.upSprite;
		} else if (angle === 270) {
			if (!wepSprites.rightSprite.flipped && wepSprites.rightSprite.isLoaded) {
				wepSprites.rightSprite = flipSprite(wepSprites.rightSprite, true);
			}
			wepSprite = wepSprites.rightSprite;
		} else {
			wepSprite = wepSprites.downSprite;
		}
		let canvasElem = document.createElement("canvas");
		let ctx = canvasElem.getContext("2d");
		ctx.imageSmoothingEnabled = false;
		canvasElem.width = wepSprite.width;
		canvasElem.height = wepSprite.height;
		ctx.drawImage(wepSprite, 0, 0, canvasElem.width, canvasElem.height);
		tmpSprite = canvasElem;
		cachedWeaponSprites[tmpIndex] = tmpSprite;
		if (camo >= 0) {
			let img = new Image() as Sprite;
			img.wpnImg = tmpSprite;
			img.flip = wepSprite.flipped;
			img.tmpInx = tmpIndex;
			img.onload = () => {
				var canvas = document.createElement("canvas");
				var ctx = canvas.getContext("2d");
				ctx.imageSmoothingEnabled = false;
				canvas.width = img.width;
				canvas.height = img.height;
				img.onload = null;
				ctx.drawImage(img.wpnImg, 0, 0, img.width, img.height);
				ctx.globalCompositeOperation = "source-atop";
				ctx.globalAlpha = 0.75;
				ctx.drawImage(img.flip ? flipSprite(img, true) : img, 0, 0, img.width, img.height);
				cachedWeaponSprites[img.tmpInx] = canvas;
			};
			img.src = getCamoURL(camo);
		}
	}
	return cachedWeaponSprites[tmpIndex];
}
var playerCanvas = document.createElement("canvas") as SpriteCanvas;
var playerContext = playerCanvas.getContext("2d");
var initPlayerCanv = false;
function drawGameObjects(delta: number) {
	if (!initPlayerCanv) {
		playerCanvas.width = Math.round(300);
		playerCanvas.height = Math.round(500);
		playerContext.imageSmoothingEnabled = false;
		initPlayerCanv = true;
	}
	var e = null;
	var f = null;
	var d = null;
	for (const plr of players) {
		if (!plr.dead && (plr.index === st.player.index || plr.onScreen)) {
			if (plr.jumpY === undefined) {
				plr.jumpY = 0;
			}
			playerContext.clearRect(0, 0, playerCanvas.width, playerCanvas.height);
			playerContext.save();
			playerContext.globalAlpha = 0.9;
			playerContext.translate(playerCanvas.width / 2, playerCanvas.height / 2);
			let m = (Math.PI / 180) * plr.angle;
			let k = Math.round((plr.angle % 360) / 90) * 90;
			let h = plr.x - st.startX;
			let g = plr.y - plr.jumpY - st.startY;
			if (plr.animIndex === 1) {
				g -= 3;
			}
			if (plr.weapons.length > 0) {
				e = getWeaponSprite(
					getCurrentWeapon(plr).weaponIndex,
					getCurrentWeapon(plr).camo, // this isn't set anywhere..?
					k,
				);
				f = classSpriteSheets[plr.classIndex]?.arm;
				if (!getCurrentWeapon(plr).front && e != undefined) {
					playerContext.save();
					playerContext.translate(0, -getCurrentWeapon(plr).yOffset);
					playerContext.rotate(m);
					playerContext.translate(0, getCurrentWeapon(plr).holdDist);
					drawSprite(
						playerContext,
						e,
						-(getCurrentWeapon(plr).width / 2),
						0,
						getCurrentWeapon(plr).width,
						getCurrentWeapon(plr).length,
						0,
						false,
						0,
						0,
						0,
					);
					playerContext.translate(0, -getCurrentWeapon(plr).holdDist + 6);
					if (f != undefined && f != null) {
						playerContext.translate(3, -10);
						drawSprite(playerContext, f, 0, 0, 8, 32, 0, false, 0, 0, 0);
						playerContext.translate(-16, -8);
						drawSprite(playerContext, f, 0, 0, 8, 32, 0, false, 0, 0, 0);
						playerContext.restore();
					}
				}
			}
			playerContext.globalAlpha = 1;
			d = getPlayerSprite(plr.classIndex, k, plr.animIndex + 1);
			if (d != null) {
				drawSprite(
					playerContext,
					d,
					-(plr.width / 2),
					-(plr.height * 0.318),
					plr.width,
					plr.height * 0.318,
					0,
					true,
					plr.jumpY * 1.5,
					0.5,
					0,
				);
			}
			d = getPlayerSprite(plr.classIndex, k, 0);
			if (d != null) {
				drawSprite(
					playerContext,
					d,
					-(plr.width / 2),
					-plr.height,
					plr.width,
					plr.height * 0.6819999999999999,
					0,
					true,
					plr.jumpY * 1.5 + plr.height * 0.477,
					0.5,
					0,
				);
			}
			d = getShirtSprite(plr, k);
			if (d != null) {
				playerContext.globalAlpha = 0.9;
				drawSprite(
					playerContext,
					d,
					-(plr.width / 2),
					-plr.height,
					plr.width,
					plr.height * 0.6819999999999999,
					0,
					true,
					plr.jumpY * 1.5 + plr.height * 0.477,
					0.5,
					0,
				);
				playerContext.globalAlpha = 1;
			}
			let p = plr.width * 0.833;
			d = getHatSprite(plr, k);
			if (d != null) {
				drawSprite(
					playerContext,
					d,
					-(p / 2),
					-(plr.height + p * 0.045),
					//-(b.height + p * 0.095),
					p,
					p,
					0,
					false,
					0,
					0.5,
					0,
				);
			}
			if (plr.weapons.length > 0) {
				playerContext.globalAlpha = 0.9;
				if (getCurrentWeapon(plr).front && e != undefined) {
					playerContext.save();
					playerContext.translate(0, -getCurrentWeapon(plr).yOffset);
					playerContext.rotate(m);
					playerContext.translate(0, getCurrentWeapon(plr).holdDist);
					drawSprite(
						playerContext,
						e,
						-(getCurrentWeapon(plr).width / 2),
						0,
						getCurrentWeapon(plr).width,
						getCurrentWeapon(plr).length,
						0,
						false,
						0,
						0,
						0,
					);
					playerContext.translate(0, -getCurrentWeapon(plr).holdDist + 10);
					if (f != undefined && f != null) {
						if (k == 270) {
							playerContext.restore();
							playerContext.save();
							playerContext.translate(-4, -getCurrentWeapon(plr).yOffset + 8);
							playerContext.rotate(m);
							drawSprite(playerContext, f, 0, 0, 8, 32, 0, false, 0, 0, 0);
						} else if (k == 90) {
							playerContext.restore();
							playerContext.save();
							playerContext.translate(0, -getCurrentWeapon(plr).yOffset);
							playerContext.rotate(m);
							drawSprite(playerContext, f, 0, 0, 8, 32, 0, false, 0, 0, 0);
						} else {
							playerContext.translate(10, -13);
							playerContext.rotate(0.7);
							drawSprite(playerContext, f, 0, 0, 8, 32, 0, false, 0, 0, 0);
							playerContext.rotate(-0.7);
							playerContext.translate(-28, -1);
							playerContext.rotate(-0.25);
							drawSprite(playerContext, f, 0, 0, 8, 32, 0, false, 0, 0, 0);
							playerContext.rotate(0.25);
						}
						playerContext.restore();
					}
				}
			}
			if (plr.spawnProtection > 0) {
				playerContext.globalCompositeOperation = "source-atop";
				playerContext.fillStyle =
					plr.team != st.player.team ? "rgba(255,179,179,0.5)" : "rgba(179,231,255,0.5)";
				playerContext.fillRect(
					-playerCanvas.width / 2,
					-playerCanvas.height / 2,
					playerCanvas.width,
					playerCanvas.height,
				);
				playerContext.globalCompositeOperation = "source-over";
			}
			if (plr.hitFlash != undefined && plr.hitFlash > 0) {
				playerContext.globalCompositeOperation = "source-atop";
				playerContext.fillStyle = `rgba(255, 255, 255, ${plr.hitFlash})`;
				playerContext.fillRect(
					-playerCanvas.width / 2,
					-playerCanvas.height / 2,
					playerCanvas.width,
					playerCanvas.height,
				);
				playerContext.globalCompositeOperation = "source-over";
				plr.hitFlash -= delta * 0.01;
				if (plr.hitFlash < 0) {
					plr.hitFlash = 0;
				}
			}
			drawSprite(
				graph,
				playerCanvas,
				h - playerCanvas.width / 2,
				g - playerCanvas.height / 2,
				playerCanvas.width,
				playerCanvas.height,
				0,
				false,
				0,
				0,
				0,
			);
			playerContext.restore();
		}
	}
	for (const flg of flags) {
		flg.ac--;
		if (flg.ac <= 0) {
			flg.ac = 5;
			flg.ai++;
			if (flg.ai > 2) {
				flg.ai = 0;
			}
		}
		drawSprite(
			graph,
			flagSprites[flg.ai + (flg.team == st.player.team ? 0 : 3)],
			flg.x - flg.w / 2 - st.startX,
			flg.y - flg.h - st.startY,
			flg.w,
			flg.h,
			0,
			true,
			0,
			0.5,
			0,
		);
	}
	for (const clt of clutter) {
		if (
			clt.active &&
			canSee(clt.x - st.startX, clt.y - st.startY, clt.w, clt.h)
		) {
			drawSprite(
				graph,
				clutterSprites[clt.i],
				clt.x - st.startX,
				clt.y - clt.h - st.startY,
				clt.w,
				clt.h,
				0,
				clt.s,
				0,
				0.5,
				0,
			);
		}
	}
	graph.globalAlpha = 1;
	e = null;
	f = null;
	d = null;
}
function drawPlayerNames() {
	const playerConfig = {
		border: 6,
		textColor: "#efefef",
		textBorder: "#3a3a3a",
		textBorderSize: 3,
		defaultSize: 30,
	};
	graph.lineWidth = playerConfig.textBorderSize;
	graph.fillStyle = playerConfig.textColor;
	graph.miterLimit = 1;
	graph.lineJoin = "round";
	graph.globalAlpha = 1;
	for (const plr of players) {
		if (
			plr.dead ||
			(plr.index !== st.player.index && !plr.onScreen)
		)
			continue;

		let d = plr.height / 3.2;
		let e = Math.min(200, (plr.maxHealth / 100) * 100);
		let shapeX = plr.x - st.startX;
		let shapeY = plr.y - plr.jumpY - plr.nameYOffset - st.startY;
		if (plr.account !== undefined && plr.account.hat != null) {
			shapeY -= plr.account.hat.nameY;
		}
		let playerName = plr.name;
		let rankText = plr.loggedIn ? plr.account.rank : "";
		// h = graph.measureText(playerName);
		let nameColor = plr.team !== st.player.team ? "#d95151" : "#5151d9";
		if (st.settings.showNames) {
			let renderedName = renderShadedAnimText(playerName, d * textSizeMult, "#ffffff", 5, "");
			if (renderedName != undefined) {
				graph.drawImage(
					renderedName,
					shapeX - renderedName.width / 2,
					shapeY - plr.height * 1.4 - renderedName.height / 2,
					renderedName.width,
					renderedName.height,
				);
			}
			if (rankText != "") {
				let renderedRank = renderShadedAnimText(rankText, d * 1.6 * textSizeMult, "#ffffff", 6, "");
				if (renderedRank != undefined) {
					graph.drawImage(
						renderedRank,
						shapeX - renderedName.width / 2 - renderedRank.width - textSizeMult * 5,
						shapeY - plr.height * 1.4 - (renderedRank.height - renderedName.height / 2),
						renderedRank.width,
						renderedRank.height,
					);
				}
			}
			if (plr.account?.clan) {
				let renderedClan = renderShadedAnimText(
					` [${plr.account?.clan}]`,
					d * textSizeMult,
					nameColor,
					5,
					"",
				);
				if (renderedClan != undefined) {
					graph.drawImage(
						renderedClan,
						shapeX + renderedName.width / 2,
						shapeY - plr.height * 1.4 - renderedName.height / 2,
						renderedClan.width,
						renderedName.height,
					);
				}
			}
		}
		graph.fillStyle = nameColor;
		graph.fillRect(
			shapeX - (e / 2) * (plr.health / plr.maxHealth),
			shapeY - plr.height * 1.16,
			(plr.health / plr.maxHealth) * e,
			10,
		);
	}
}
function drawBackground() {
	drawSprite(
		graph,
		darkFillerSprite,
		0,
		0,
		st.maxScreenWidth,
		st.maxScreenHeight,
		0,
		false,
		0,
		0,
		0,
	);
}
function getCachedWall(tile: Tile) {
	let cacheKey = `${tile.left}${tile.right}${tile.top}${tile.bottom}${tile.topLeft}${tile.topRight}${tile.bottomLeft}${tile.bottomRight}${tile.edgeTile}${tile.hasCollision}`;

	if (cachedWalls[cacheKey] === undefined && wallSprite?.isLoaded) {
		let canvasElem = document.createElement("canvas");
		let ctx = canvasElem.getContext("2d");
		ctx.imageSmoothingEnabled = false;
		canvasElem.width = tile.scale;
		canvasElem.height = tile.scale;
		ctx.drawImage(wallSprite, 0, 0, tile.scale, tile.scale);
		drawSprite(ctx, darkFillerSprite, 12, 12, tile.scale - 24, tile.scale - 24, 0, false, 0, 0, 0);
		if (tile.left === 1) {
			drawSprite(ctx, darkFillerSprite, 0, 12, 12, tile.scale - 24, 0, false, 0, 0, 0);
		}
		if (tile.right === 1) {
			drawSprite(
				ctx,
				darkFillerSprite,
				tile.scale - 12,
				12,
				12,
				tile.scale - 24,
				0,
				false,
				0,
				0,
				0,
			);
		}
		if (tile.top === 1) {
			drawSprite(ctx, darkFillerSprite, 12, 0, tile.scale - 24, 12, 0, false, 0, 0, 0);
		}
		if (tile.bottom === 1) {
			drawSprite(
				ctx,
				darkFillerSprite,
				12,
				tile.scale - 12,
				tile.scale - 24,
				12,
				0,
				false,
				0,
				0,
				0,
			);
		}
		if (!tile.hasCollision || (tile.topLeft === 1 && tile.top === 1 && tile.left === 1)) {
			drawSprite(ctx, darkFillerSprite, 0, 0, 12, 12, 0, false, 0, 0, 0);
		}
		if (!tile.hasCollision || (tile.topRight === 1 && tile.top === 1 && tile.right === 1)) {
			drawSprite(ctx, darkFillerSprite, tile.scale - 12, 0, 12, 12, 0, false, 0, 0, 0);
		}
		if (!tile.hasCollision || (tile.bottomLeft === 1 && tile.bottom === 1 && tile.left === 1)) {
			drawSprite(ctx, darkFillerSprite, 0, tile.scale - 12, 12, 12, 0, false, 0, 0, 0);
		}
		if (!tile.hasCollision || (tile.bottomRight === 1 && tile.bottom === 1 && tile.right === 1)) {
			drawSprite(
				ctx,
				darkFillerSprite,
				tile.scale - 12,
				tile.scale - 12,
				12,
				12,
				0,
				false,
				0,
				0,
				0,
			);
		}
		cachedWalls[cacheKey] = canvasElem;
	}
	return cachedWalls[cacheKey];
}
var tilesPerFloorTile = 8;
function getCachedFloor(tile: Tile) {
	let tmpIndex = `${tile.spriteIndex}${tile.left}${tile.right}${tile.top}${tile.bottom}${tile.topLeft}${tile.topRight}`;
	if (cachedFloors[tmpIndex] === undefined && sideWalkSprite != null && sideWalkSprite.isLoaded) {
		let tmpCanvas = document.createElement("canvas");
		let ctx = tmpCanvas.getContext("2d");
		ctx.imageSmoothingEnabled = false;

		tmpCanvas.width = tile.scale;
		tmpCanvas.height = tile.scale * (tile.bottom ? 0.51 : 1);
		ctx.drawImage(floorSprites[tile.spriteIndex], 0, 0, tile.scale, tile.scale);
		let s = tile.scale / tilesPerFloorTile;
		if (tile.topLeft === 1) {
			renderSideWalks(ctx, 1, s, 0, 0, 0, 0, 0);
		}
		if (tile.topRight === 1) {
			renderSideWalks(ctx, 1, s, Math.PI, tile.scale - s, 0, 0, 0);
		}
		if (tile.left === 1) {
			if (tile.top === 1) {
				renderSideWalks(ctx, 2, s, null, 0, 0, 0, s);
				renderSideWalks(ctx, tilesPerFloorTile - 2, s, 0, 0, s * 2, 0, s);
			} else {
				renderSideWalks(ctx, tilesPerFloorTile, s, 0, 0, 0, 0, s);
			}
		}
		if (tile.right === 1) {
			if (tile.top === 1) {
				renderSideWalks(ctx, 2, s, null, tile.scale - s, 2, 0, s);
				renderSideWalks(ctx, tilesPerFloorTile - 2, s, Math.PI, tile.scale - s, s * 2, 0, s);
			} else {
				renderSideWalks(ctx, tilesPerFloorTile, s, Math.PI, tile.scale - s, 0, 0, s);
			}
		}
		if (tile.top === 1) {
			renderSideWalks(ctx, tilesPerFloorTile, s, Math.PI / 2, 0, 0, s, 0);
		}
		if (tile.bottom === 1) {
			renderSideWalks(ctx, tilesPerFloorTile, s, 0, 0, tile.scale - s, s, 0);
		}
		cachedFloors[tmpIndex] = tmpCanvas;
	}
	return cachedFloors[tmpIndex];
}
function renderSideWalks(
	ctx: CanvasRenderingContext2D,
	count: number,
	scale: number,
	rot: number,
	x: number,
	y: number,
	xInc: number,
	yInc: number,
) {
	for (let i = 0; i < count; ++i) {
		ctx.drawImage(sideWalkSprite, x, y, scale, scale);
		if (rot != null) {
			ctx.save();
			ctx.translate(x + scale / 2, y + scale / 2);
			ctx.rotate(rot);
			ctx.drawImage(ambientSprites[0], -(scale / 2), -(scale / 2), scale, scale);
			ctx.restore();
		}
		x += xInc;
		y += yInc;
	}
}
function drawMap(layer: number) {
	if (!st.gameMap) return;
	for (const tile of st.gameMap.tiles) {
		if (layer === 0) {
			if (
				!tile.wall &&
				canSee(tile.x - st.startX, tile.y - st.startY, mapTileScale, mapTileScale)
			) {
				let tmpTlSprite = getCachedFloor(tile);
				if (tmpTlSprite !== undefined) {
					drawSprite(
						graph,
						tmpTlSprite,
						tile.x - st.startX,
						tile.y - st.startY,
						tmpTlSprite.width,
						tmpTlSprite.height,
						0,
						false,
						0,
						0,
						0,
					);
				}
			}
		} else if (layer === 1) {
			if (
				tile.wall &&
				!tile.bottom &&
				canSee(
					tile.x - st.startX,
					tile.y - st.startY + mapTileScale * 0.5,
					mapTileScale,
					mapTileScale * 0.75,
				)
			) {
				drawSprite(
					graph,
					wallSpritesSeg[tile.spriteIndex],
					tile.x - st.startX,
					tile.y + Math.round(mapTileScale / 2) - st.startY,
					mapTileScale,
					mapTileScale / 2,
					0,
					true,
					-(tile.scale / 2),
					0.5,
					tile.scale,
				);
			}
		} else if (
			layer === 2 &&
			tile.wall &&
			canSee(
				tile.x - st.startX,
				tile.y - st.startY - mapTileScale * 0.5,
				mapTileScale,
				mapTileScale,
			)
		) {
			let tmpTlSprite = getCachedWall(tile);
			if (tmpTlSprite !== undefined) {
				drawSprite(
					graph,
					tmpTlSprite,
					tile.x - st.startX,
					Math.round(tile.y - mapTileScale / 2 - st.startY),
					mapTileScale,
					mapTileScale,
					0,
					false,
					0,
					0,
					0,
				);
			}
		}
	}
	if (layer === 0) {
		for (const tmpPickup of st.gameMap.pickups) {
			if (!tmpPickup.active || !canSee(tmpPickup.x - st.startX, tmpPickup.y - st.startY, 0, 0))
				continue;

			if (tmpPickup.type === "healthpack") {
				drawSprite(
					graph,
					healthPackSprite,
					tmpPickup.x - tmpPickup.scale / 2 - st.startX,
					tmpPickup.y - tmpPickup.scale / 2 - st.startY,
					tmpPickup.scale,
					tmpPickup.scale,
					0,
					true,
					0,
					0.5,
					0,
				);
			} else {
				drawSprite(
					graph,
					lootCrateSprite,
					tmpPickup.x - tmpPickup.scale / 2 - st.startX,
					tmpPickup.y - tmpPickup.scale / 2 - st.startY,
					tmpPickup.scale,
					tmpPickup.scale,
					0,
					true,
					0,
					0.5,
					0,
				);
			}
		}
	}
}
function drawSprite(
	ctx: CanvasRenderingContext2D,
	sprite: Sprite | SpriteCanvas,
	dx: number,
	dy: number,
	dw: number,
	dh: number,
	angle: number,
	hasShadows: boolean,
	shadowShift: number,
	shadowScaleY: number,
	hOff: number,
) {
	if (!sprite || sprite.width <= 0) return;
	dx = Math.floor(dx);
	dy = Math.floor(dy);
	dw = Math.floor(dw);
	dh = Math.floor(dh);
	shadowShift = Math.floor(shadowShift);
	ctx.rotate(angle);
	ctx.drawImage(sprite, dx, dy, dw, dh);
	if (hasShadows && st.settings.showShadows) {
		ctx.globalAlpha = 1;
		ctx.translate(0, shadowShift);
		let tmpShadow = getCachedShadow(sprite, dw, dh + hOff, shadowScaleY);
		if (tmpShadow) {
			ctx.drawImage(tmpShadow, dx, dy + dh);
		}
		ctx.rotate(-angle);
		ctx.translate(0, -shadowShift);
	}
}
var shadowIntensity = 0.16;
function getCachedShadow(
	sprite: Sprite | SpriteCanvas,
	width: number,
	height: number,
	scaleY: number,
) {
	if (
		cachedShadows[sprite.index] === undefined &&
		width !== 0 &&
		sprite !== undefined &&
		sprite.isLoaded
	) {
		let tmpCanvas = document.createElement("canvas");
		let ctx = tmpCanvas.getContext("2d");
		ctx.imageSmoothingEnabled = false;

		tmpCanvas.width = width;
		tmpCanvas.height = height;
		ctx.globalAlpha = scaleY === 0.5 ? shadowIntensity : shadowIntensity * 0.75;
		ctx.scale(1, -scaleY);
		ctx.transform(1, 0, 0, 1, 0, 0);
		ctx.drawImage(sprite, 0, -height, width, height);
		let imgData = ctx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
		let pixelArray = imgData.data;

		for (let i = 0; i < pixelArray.length; i += 4) {
			pixelArray[i] = 0;
			pixelArray[i + 1] = 0;
			pixelArray[i + 2] = 0;
			pixelArray[i + 3] = pixelArray[i + 3]; // ??
		}
		ctx.putImageData(imgData, 0, 0);
		cachedShadows[sprite.index] = tmpCanvas;
	}
	return cachedShadows[sprite.index];
}

function callUpdate() {
	requestAnimationFrame(callUpdate);
	currentTime = Date.now();
	updateGameLoop();
}
callUpdate();
