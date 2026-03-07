import type { ZipReader } from "@zip.js/zip.js";
import * as zip from "@zip.js/zip.js";
import { Howl } from "howler";
import $ from "jquery";
import { io, type Socket } from "socket.io-client";
import {
	characterClasses,
	setCharacterClasses,
	specialClasses,
	weaponNames,
} from "./loadouts.ts";
import type { Player, InputSendData, Sprite, SpriteCanvas } from "./types.ts";
import * as utils from "./utils.ts";

const {
	shootNextBullet,
	getNextBullet,
	setupMap,
	wallCol,
	getCurrentWeapon,
	getDistance,
	getAngle,
	shadeColor,
	randomFloat,
	randomInt,
} = utils;

// yeah lets just add ramdom stuff onto `HTMLImageElement`s. oh but some of them are `HTMLCanvasElement`s
// so we can't just change the interface of a single element, we create RestrictedCanvasImageSource which is a union
// and since it's a union and not an interface, we can't add properties to all at once
// :)
// declare global {
// 	interface HTMLImageElement {
// 		index?: number;
// 		flipped?: boolean;
// 		xPos?: number;
// 		yPos?: number;
// 		active?: boolean;
// 		isLoaded?: boolean;
// 		resolution?: any;
// 		scale?: number;
// 		alpha?: number;
// 		flip?: boolean;
// 		tmpInx?: any;
// 		wpnImg?: CanvasImageSource;
// 		owner?: any;
// 	}
// 	interface HTMLCanvasElement {
// 		index?: number;
// 		flipped?: boolean;
// 		xPos?: number;
// 		yPos?: number;
// 		active?: boolean;
// 		isLoaded?: boolean;
// 		resolution?: any;
// 		scale?: number;
// 		alpha?: number;
// 		flip?: boolean;
// 		tmpInx?: any;
// 		wpnImg?: CanvasImageSource;
// 		owner?: any;
// 	}
// 	interface HTMLVideoElement {
// 		index?: number;
// 		flipped?: boolean;
// 		xPos?: number;
// 		yPos?: number;
// 		active?: boolean;
// 		isLoaded?: boolean;
// 		resolution?: any;
// 		scale?: number;
// 		alpha?: number;
// 		flip?: boolean;
// 		tmpInx?: any;
// 		wpnImg?: CanvasImageSource;
// 		owner?: any;
// 	}
// 	interface ImageBitmap {
// 		index?: number;
// 		flipped?: boolean;
// 		xPos?: number;
// 		yPos?: number;
// 		active?: boolean;
// 		isLoaded?: boolean;
// 		resolution?: any;
// 		scale?: number;
// 		alpha?: number;
// 		flip?: boolean;
// 		tmpInx?: any;
// 		wpnImg?: CanvasImageSource;
// 		owner?: any;
// 	}
// 	interface OffscreenCanvas {
// 		index?: number;
// 		flipped?: boolean;
// 		xPos?: number;
// 		yPos?: number;
// 		active?: boolean;
// 		isLoaded?: boolean;
// 		resolution?: any;
// 		scale?: number;
// 		alpha?: number;
// 		flip?: boolean;
// 		tmpInx?: any;
// 		wpnImg?: CanvasImageSource;
// 		owner?: any;
// 	}
// }

let playerName: string | undefined;
var playerClassIndex: number | undefined;
var playerType: string | undefined;
var playerNameInput = document.getElementById(
	"playerNameInput",
) as HTMLInputElement;
var socket: Socket | undefined;
var reason: string | undefined;
var mobile = false;
var room: any;
var currentFPS = 0;
var fillCounter = 0;
var currentLikeButton = "";
var delta = 0;
var horizontalDT = 0;
var verticalDT = 0;
var roomNum = 0;
var currentTime = Date.now();
var oldTime = Date.now();
var FRAME_STEP = 1000 / 60;
var count = -1;
var clientPrediction = true;
var inputNumber = 0;
var clientSpeed = 12;
var thisInput: InputSendData[] = [];
var keyd = 1;
var tabbed = 0;
var timeSinceLastUpdate = 0;
var timeOfLastUpdate = 0;

window.settingShowNames = settingShowNames;

window.settingShowParticles = settingShowParticles;

window.settingShowTrippy = settingShowTrippy;

window.settingShowSprays = settingShowSprays;

window.settingProfanity = settingProfanity;

window.settingShowFade = settingShowFade;

window.settingShowShadows = settingShowShadows;

window.settingShowGlows = settingShowGlows;

window.settingShowBTrails = settingShowBTrails;

window.settingShowChat = settingShowChat;

window.settingHideUI = settingHideUI;

window.settingShowPingFps = settingShowPingFps;

window.settingShowLeader = settingShowLeader;

window.settingSelectChat = settingSelectChat;

window.changeMenuTab = changeMenuTab;

window.showUI = showUI;

window.hideUI = hideUI;

// zip.workerScriptsPath = "../js/lib/";
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
	mobile = true;
	hideMenuUI();
	hideUI(true);
	alert("tried to open google play");
	// openGooglePlay(false);
}
var previousClass = 0;
var previousHat = 0;
var previousShirt = 0;
var previousSpray = 0;
var startingGame = false;
var changingLobby = false;
var inMainMenu = true;
var loggedIn = false;
function startGame(plrType: string) {
	if (!startingGame && !changingLobby) {
		startingGame = true;
		playerName = playerNameInput.value
			.replace(/(<([^>]+)>)/gi, "")
			.substring(0, 25);
		enterGame(plrType);
		if (inMainMenu) {
			$("#loadingWrapper").fadeIn(0, () => {});
			document.getElementById("loadText").textContent = "CONNECTING";
		}
	}
}
var devTest = false;
function enterGame(plrType: string) {
	startSoundTrack(2);
	playerClassIndex = currentClassID;
	playerType = plrType;
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
function validNick() {
	return /^\w*$/.exec(playerNameInput.value) !== null;
}
var createClanButton = document.getElementById("createClanButton");
var joinClanButton = document.getElementById("joinClanButton");
var clanNameInput = document.getElementById(
	"clanNameInput",
) as HTMLInputElement;
var clanKeyInput = document.getElementById("clanKeyInput") as HTMLInputElement;
var clanDBMessage = document.getElementById("clanDBMessage");
var clanStats = document.getElementById("clanStats");
var clanSignUp = document.getElementById("clanSignUp");
var clanHeader = document.getElementById("clanHeader");
var clanAdminPanel = document.getElementById("clanAdminPanel");
var clanInviteInput = document.getElementById(
	"clanInviteInput",
) as HTMLInputElement;
var inviteClanButton = document.getElementById("inviteClanButton");
var kickClanButton = document.getElementById("kickClanButton");
var leaveClanButton = document.getElementById("leaveClanButton");
var clanChatInput = document.getElementById(
	"clanChatInput",
) as HTMLInputElement;
var setChatClanButton = document.getElementById("setChatClanButton");
var clanInvMessage = document.getElementById("clanInvMessage");
var clanChtMessage = document.getElementById("clanChtMessage");
var clanChatLink = document.getElementById("clanChatLink");
var loginWrapper = document.getElementById("loginWrapper");
var loggedInWrapper = document.getElementById("loggedInWrapper");
var loginButton = document.getElementById("loginButton");
var registerButton = document.getElementById("registerButton");
var logoutButton = document.getElementById("logoutButton");
var loginMessage = document.getElementById("loginMessage");
var recoverButton = document.getElementById("recoverButton");
var userNameInput = document.getElementById(
	"usernameInput",
) as HTMLInputElement;
var userEmailInput = document.getElementById("emailInput") as HTMLInputElement;
var userPassInput = document.getElementById(
	"passwordInput",
) as HTMLInputElement;
var loginUserNm = "";
var loginUserPs = "";
var settingsMenu = document.getElementById("settingsButton");
var settings = document.getElementById("settings");
var howToMenu = document.getElementById("instructionButton");
var howTo = document.getElementById("instructions");
var leaderboardButton = document.getElementById("leaderButton");
var btn = document.getElementById("startButton");
var btnMod = document.getElementById("texturePackButton");
var modURL = document.getElementById("textureModInput") as HTMLInputElement;
var lobbyInput = document.getElementById("lobbyKey") as HTMLInputElement;
var lobbyPass = document.getElementById("lobbyPass") as HTMLInputElement;
var lobbyMessage = document.getElementById("lobbyMessage");
var lobbyButton = document.getElementById("joinLobbyButton");
var createServerButton = document.getElementById("createServerButton");
var serverCreateMessage = document.getElementById("serverCreateMessage");
var serverKeyTxt = document.getElementById("serverKeyTxt");

let dropUpLinksCount = 5;
let activeIndex = -1;
window.clickDropUpLink = (index) => {
	for (let i = 0; i < dropUpLinksCount; ++i) {
		const tmpIndex = i + 1;
		try {
			if (tmpIndex === index && activeIndex !== index) {
				activeIndex = index;
				document.getElementById(`di${tmpIndex}`).style.opacity = "1";
				document.getElementById(`di${tmpIndex}`).style.pointerEvents = "auto";
			} else {
				document.getElementById(`di${tmpIndex}`).style.opacity = "0";
				document.getElementById(`di${tmpIndex}`).style.pointerEvents = "none";
				if (tmpIndex === index) activeIndex = -1;
			}
		} catch (_) {}
	}
};

var loginTimeOut = null;
function startLogin() {
	if (socket) {
		socket.emit("dbLogin", {
			userName: userNameInput.value,
			userPass: userPassInput.value,
		});
		loginUserNm = userNameInput.value;
		loginUserPs = userPassInput.value;
		loginMessage.style.display = "block";
		loginMessage.textContent = "Please Wait...";
	}
}
var customMap = null;
function getFile() {
	document.getElementById("upfile").click();
}
function selectedCMap(a) {
	var b = a.value.split("\\");
	document.getElementById("customMapButton").innerHTML = b[b.length - 1];
	if (a.files?.[0]) {
		b = new FileReader();
		b.onload = (_) => {
			var b = document.createElement("img");
			b.onload = (_) => {
				let tmpCanvas = document.createElement("canvas");
				tmpCanvas.width = b.width;
				tmpCanvas.height = b.height;
				tmpCanvas.getContext("2d").drawImage(b, 0, 0, b.width, b.height);
				customMap = {
					width: b.width,
					height: b.height,
					data: tmpCanvas.getContext("2d").getImageData(0, 0, b.width, b.height)
						.data,
				};
			};
			b.src = a.target.result;
		};
		b.readAsDataURL(a.files[0]);
	}
}
function clearCustomMap() {
	customMap = null;
	document.getElementById("customMapButton").textContent = "Select Map";
}

window.onload = () => {
	if (mobile) {
		document.getElementById("loadText").textContent =
			"MOBILE VERSION COMING SOON";
	} else {
		document.documentElement.style.overflow = "hidden";
		document.getElementById("gameAreaWrapper").style.opacity = "1";
		drawMenuBackground();
		settingsMenu.onclick = () => {
			if (settings.style.maxHeight === "200px") {
				settings.style.maxHeight = "0px";
			} else {
				settings.style.maxHeight = "200px";
				howTo.style.maxHeight = "0px";
			}
		};
		howToMenu.onclick = () => {
			if (howTo.style.maxHeight === "200px") {
				howTo.style.maxHeight = "0px";
			} else {
				howTo.style.maxHeight = "200px";
				settings.style.maxHeight = "0px";
			}
		};
		leaderboardButton.onclick = () => {
			window.open("/leaderboards.html", "_blank");
		};
		$.get("http://localhost:1118/getIP", (a) => {
			let port = a.port;
			if (!socket) {
				socket = io(`http://${devTest ? "localhost" : a.ip}:${a.port}`, {
					reconnection: true,
					transports: ["websocket"],
					forceNew: false,
				});
				setupSocket(socket);
			}
			socket.once("connect", () => {
				var a = localStorage.getItem("logKey");
				var d = localStorage.getItem("userName");
				if (a && a !== "" && d && d !== "") {
					socket.emit("dbLogin", {
						lgKey: a,
						userName: d,
						userPass: false,
					});
					loginMessage.style.display = "block";
					loginMessage.textContent = "Logging in...";
				} else {
					loadSavedClass();
				}
				btn.onclick = () => {
					startGame("player");
				};
				playerNameInput.addEventListener("keypress", (event) => {
					if (event.code === "Enter") {
						startGame("player");
					}
				});
				btnMod.onclick = () => {
					loadModPack(modURL.value, false);
				};
				registerButton.onclick = () => {
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
				loginButton.onclick = () => {
					startLogin();
				};
				logoutButton.onclick = () => {
					loggedInWrapper.style.display = "none";
					loginWrapper.style.display = "block";
					loginMessage.textContent = "";
					loggedIn = false;
					resetHatList();
					resetShirtList();
					d = a = "";
					localStorage.setItem("logKey", "");
					localStorage.setItem("userName", "");
					socket.emit("dbLogout");
				};
				recoverButton.onclick = () => {
					socket.emit("dbRecov", {
						userMail: userEmailInput.value,
					});
					loginMessage.style.display = "block";
					loginMessage.textContent = "Please Wait...";
				};
				createClanButton.onclick = () => {
					socket.emit("dbClanCreate", {
						clanName: clanNameInput.value,
					});
					clanDBMessage.style.display = "block";
					clanDBMessage.textContent = "Please Wait...";
				};
				joinClanButton.onclick = () => {
					socket.emit("dbClanJoin", {
						clanKey: clanKeyInput.value,
					});
					clanDBMessage.style.display = "block";
					clanDBMessage.textContent = "Please Wait...";
				};
				inviteClanButton.onclick = () => {
					socket.emit("dbClanInvite", {
						userName: clanInviteInput.value,
					});
					clanInvMessage.style.display = "block";
					clanInvMessage.textContent = "Please Wait...";
				};
				kickClanButton.onclick = () => {
					socket.emit("dbClanKick", {
						userName: clanInviteInput.value,
					});
					clanInvMessage.style.display = "block";
					clanInvMessage.textContent = "Please Wait...";
				};
				leaveClanButton.onclick = () => {
					socket.emit("dbClanLeave");
				};
				setChatClanButton.onclick = () => {
					socket.emit("dbClanChatURL", {
						chUrl: clanChatInput.value,
					});
					clanChtMessage.style.display = "inline-block";
					clanChtMessage.textContent = "Please Wait...";
				};
				createServerButton.onclick = () => {
					var modes = [];
					for (let i = 0; i < 9; ++i) {
						if (
							(document.getElementById(`serverMode${i}`) as HTMLInputElement)
								.checked
						) {
							modes.push(i);
						}
					}
					socket.emit("cSrv", {
						srvPlayers: (
							document.getElementById("serverPlayers") as HTMLInputElement
						).value,
						srvHealthMult: (
							document.getElementById("serverHealthMult") as HTMLInputElement
						).value,
						srvSpeedMult: (
							document.getElementById("serverSpeedMult") as HTMLInputElement
						).value,
						srvPass: (document.getElementById("serverPass") as HTMLInputElement)
							.value,
						srvMap: customMap,
						srvClnWr: (
							document.getElementById("clanWarEnabled") as HTMLInputElement
						).checked,
						srvModes: modes,
					});
				};
				lobbyButton.onclick = () => {
					if (!changingLobby) {
						if (lobbyInput.value.split("/")[0].trim()) {
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
									lgKey: a,
									userName: d,
								});
								s.once("lobbyRes", (a, d) => {
									lobbyMessage.innerHTML = a.resp || a;
									if (d) {
										socket.removeListener("disconnect");
										socket.once("disconnect", () => {
											socket.close();
											changingLobby = false;
											socket = s;
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
						} else {
							lobbyMessage.style.display = "block";
							lobbyMessage.textContent = "Please enter a valid IP";
						}
					}
				};
			});
		});
		hideUI(true);
		$(".noRightClick").bind("contextmenu", (_) => false);
		resize();
		$("#loadingWrapper").fadeOut(200, () => {});
	}
};

var accStatKills = document.getElementById("accStatKills");
var accStatDeaths = document.getElementById("accStatDeaths");
var accStatLikes = document.getElementById("accStatLikes");
var accStatKD = document.getElementById("accStatKD");
var accStatRank = document.getElementById("accStatRank");
var accStatView = document.getElementById("accStatView");
var accStatRankProg = document.getElementById("rankProgress");
var accStatWorldRank = document.getElementById("accStatWorldRank");
var profileButton = document.getElementById("profileButton");
var newUsernameInput = document.getElementById(
	"newUsernameInput",
) as HTMLInputElement;
var youtubeChannelInput = document.getElementById(
	"youtubeChannelInput",
) as HTMLInputElement;
var saveAccountData = document.getElementById("saveAccountData");
var editProfileMessage = document.getElementById("editProfileMessage");
function updateAccountPage(a) {
	player.account = a;
	accStatRank.innerHTML = `<b>Rank:  </b>${a.rank}`;
	accStatRankProg.style.width = `${a.rankPercent}%`;
	accStatKills.innerHTML = `<b>Kills:  </b>${a.kills}`;
	accStatDeaths.innerHTML = `<b>Deaths:  </b>${a.deaths}`;
	accStatKD.innerHTML = `<b>KD:  </b>${a.kd}`;
	accStatWorldRank.innerHTML = `<b>World Rank:  </b>${a.worldRank}`;
	accStatLikes.innerHTML = `<b>Likes:  </b>${a.likes}`;
	profileButton.onclick = () => {
		showUserStatPage(player.account.user_name);
	};
	newUsernameInput.value = player.account.user_name;
	youtubeChannelInput.value = player.account.channel;
	saveAccountData.onclick = () => {
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
var clanStatRank = document.getElementById("clanStatRank");
var clanStatFounder = document.getElementById("clanStatFounder");
var clanStatMembers = document.getElementById("clanStatMembers");
var clanStatKD = document.getElementById("clanStatKD");
function updateClanPage(a) {
	clanStatRank.innerHTML = `<b>Rank:  </b>${a.level}`;
	clanStatKD.innerHTML = `<b>Avg KD:  </b>${a.kd}`;
	clanStatFounder.innerHTML = `<b>Founder:  </b>${a.founder}`;
	clanStatMembers.innerHTML = `<b>Roster:</b>${a.members}`;
	a = a.chatURL;
	if (a !== "") {
		if (!a.match(/^https?:\/\//i)) {
			a = `http://${a}`;
		}
		clanChatLink.innerHTML = `<a target='_blank' href='${a}'>Clan Chat</a>`;
	}
}
function showUserStatPage(a) {
	window.open(`/profile.html?${a}`, "_blank");
}
var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;
var gameWidth = 0;
var gameHeight = 0;
var mouseX = 0;
var mouseY = 0;
var maxScreenWidth = 1920;
var originalScreenWidth = maxScreenWidth;
var maxScreenHeight = 1080;
var originalScreenHeight = maxScreenHeight;
var viewMult = 1;
var uiScale = 1;
calculateUIScale();
var gameStart = false;
var gameOver = false;
var gameOverFade = false;
var disconnected = false;
var kicked = false;
var killTxt = "";
var continuity = false;
var startPingTime = 0;
var textSizeMult = 0.55;
var bigTextSize = (maxScreenHeight / 7.7) * textSizeMult;
var medTextSize = bigTextSize * 0.85;
var textGap = bigTextSize * 1.2;
var bigTextY = maxScreenHeight / 4.3;
var startX = 0;
var startY = 0;
var gameMode = null;
var playerConfig = {
	border: 6,
	textColor: "#efefef",
	textBorder: "#3a3a3a",
	textBorderSize: 3,
	defaultSize: 30,
};
var player: Player = {
	dead: true,
	weapons: [],
} as Player; // hack, since maybe this is accessed before gameSetup?
var target = {
	f: 0,
	d: 0,
	dOffset: 0,
};
var gameObjects = [];
window.gameObjects = gameObjects;
var bullets = [];
var gameMap = null;
window.getGameMap = () => gameMap;
var mapTileScale = 0;
var leaderboard = [];
var keys = {
	u: 0,
	d: 0,
	l: 0,
	r: 0,
	lm: 0,
	s: 0,
	rl: 0,
};
var reenviar = true;
var directionLock = false;
var directions = [];
var zipFileCloser: any;
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
	var b = getCurrentWeapon(player)?.yOffset ?? 0;
	mouseX = event.clientX;
	mouseY = event.clientY;
	lastAngle = target.f;
	lastDist = target.d;
	target.d = Math.sqrt(
		Math.pow(mouseY - (screenHeight / 2 - b / 2), 2) +
			Math.pow(mouseX - screenWidth / 2, 2),
	);
	target.d *= Math.min(
		maxScreenWidth / screenWidth,
		maxScreenHeight / screenHeight,
	);
	target.f = Math.atan2(
		screenHeight / 2 - b / 2 - mouseY,
		screenWidth / 2 - mouseX,
	);
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
	keys.lm = 1;
}
function mouseUp(event: MouseEvent) {
	event.preventDefault();
	event.stopPropagation();
	keys.lm = 0;
}
mainCanvas.addEventListener("mousewheel", gameScroll, false);
mainCanvas.addEventListener("DOMMouseScroll", gameScroll, false);
var userScroll = 0;
function gameScroll(event) {
	event.preventDefault();
	event.stopPropagation();
	userScroll =
		Math.max(-1, Math.min(1, event.wheelDelta || -event.detail)) * -1;
}
// todo: redo input handling to not use keycodes
var keyMap = [];
var showingScoreBoard = false;
var keyToChange = null;
var keyChangeElement = null;
var keyCodeMap = {
	8: "backspace",
	9: "tab",
	13: "enter",
	16: "shift",
	//17: "ctrl",
	18: "alt",
	19: "pausebreak",
	20: "capslock",
	27: "escape",
	32: "space",
	33: "pageup",
	34: "pagedown",
	35: "end",
	36: "home",
	37: "left",
	38: "up",
	39: "right",
	40: "down",
	43: "+",
	44: "printscreen",
	45: "insert",
	46: "delete",
	112: "f1",
	113: "f2",
	114: "f3",
	115: "f4",
	116: "f5",
	117: "f6",
	118: "f7",
	119: "f8",
	120: "f9",
	121: "f10",
	122: "f11",
	//123: "f12",
	144: "numlock",
	145: "scrolllock",
};
var keysList = null;
function inputReset(a) {
	keysList = {
		upKey: 87,
		downKey: 83,
		leftKey: 65,
		rightKey: 68,
		reloadKey: 82,
		jumpKey: 32,
		sprayKey: 70,
		leaderboardKey: 16,
		chatToggleKey: 13,
		incWeapKey: 69,
		decWeapKey: 81,
	};
	updateKeysUI();
	if (a) {
		localStorage.setItem("customControls", JSON.stringify(keysList));
	}
}
inputReset(false);
var previousKeyElementContent = null;
function inputChange(a, b) {
	if (keyToChange != null && keyChangeElement != null) {
		keyChangeElement.innerHTML = previousKeyElementContent;
	}
	previousKeyElementContent = a.innerHTML;
	a.innerHTML = "Press any Key";
	keyChangeElement = a;
	keyToChange = b;
}
function getKeyName(a) {
	let b = keyCodeMap[a];
	if (b == undefined || !b.trim()) {
		b = String.fromCharCode(a);
	}
	b = b.charAt(0).toUpperCase() + b.slice(1);
	return b;
}
function saveKeysToCookie() {
	localStorage.setItem("customControls", JSON.stringify(keysList));
}
if (localStorage.getItem("customControls")) {
	try {
		keysList = JSON.parse(localStorage.getItem("customControls"));
	} catch (_) {}
	if (keysList) {
		updateKeysUI();
	}
}
function updateKeysUI() {
	document.getElementById("upKeyCh").textContent = getKeyName(keysList.upKey);
	document.getElementById("downKeyCh").textContent = getKeyName(
		keysList.downKey,
	);
	document.getElementById("leftKeyCh").textContent = getKeyName(
		keysList.leftKey,
	);
	document.getElementById("rightKeyCh").textContent = getKeyName(
		keysList.rightKey,
	);
	document.getElementById("reloadKeyCh").textContent = getKeyName(
		keysList.reloadKey,
	);
	document.getElementById("jumpKeyCh").textContent = getKeyName(
		keysList.jumpKey,
	);
	document.getElementById("sprayKeyCh").textContent = getKeyName(
		keysList.sprayKey,
	);
	document.getElementById("leaderboardKeyCh").textContent = getKeyName(
		keysList.leaderboardKey,
	);
	document.getElementById("chatToggleKeyCh").textContent = getKeyName(
		keysList.chatToggleKey,
	);
	document.getElementById("incWeapKeyCh").textContent = getKeyName(
		keysList.incWeapKey,
	);
	document.getElementById("decWeapKeyCh").textContent = getKeyName(
		keysList.decWeapKey,
	);
}
window.addEventListener("keydown", keyDown, false);
function keyDown(event: KeyboardEvent) {
	if (keyToChange != null) {
		let b = keyCodeMap[event.keyCode];
		if (b == undefined || !b.trim()) {
			b = String.fromCharCode(event.keyCode);
		}
		if (b.trim()) {
			keyChangeElement.innerHTML = b.charAt(0).toUpperCase() + b.slice(1);
			keysList[keyToChange] = event.keyCode;
		} else {
			keyChangeElement.innerHTML = previousKeyElementContent;
		}
		keyChangeElement = keyToChange = null;
		saveKeysToCookie();
	} else if (mainCanvas === document.activeElement) {
		event.preventDefault();
		keyMap[event.keyCode] = event.type === "keydown";
		if (event.keyCode === 27 && gameStart) {
			showESCMenu();
		}
		if (keyMap[keysList.upKey] && !keys.u) {
			keys.u = 1;
			keys.d = 0;
			keyMap[keysList.downKey] = false;
		}
		if (keyMap[keysList.downKey] && !keys.d) {
			keys.d = 1;
			keys.u = 0;
			keyMap[keysList.upKey] = false;
		}
		if (keyMap[keysList.leftKey] && !keys.l) {
			keys.l = 1;
			keys.r = 0;
			keyMap[keysList.rightKey] = false;
		}
		if (keyMap[keysList.rightKey] && !keys.r) {
			keys.r = 1;
			keys.l = 0;
			keyMap[keysList.leftKey] = false;
		}
		if (keyMap[keysList.jumpKey] && !keys.s) {
			keys.s = 1;
		}
		if (keyMap[keysList.reloadKey] && !keys.rl) {
			keys.rl = 1;
		}
		if (event.keyCode === keysList.chatToggleKey) {
			document.getElementById("chatInput").focus();
		}
		if (
			!!keyMap[keysList.leaderboardKey] &&
			!!gameStart &&
			!showingScoreBoard &&
			!player.dead &&
			!gameOver
		) {
			showingScoreBoard = true;
			showStatTable(getUsersList(), null, null, true, true, true);
		}
	}
}
mainCanvas.addEventListener("keyup", keyUp, false);
function keyUp(event: KeyboardEvent) {
	event.preventDefault();
	keyMap[event.keyCode] = event.type === "keydown";
	if (event.keyCode === keysList.upKey) {
		keys.u = 0;
	}
	if (event.keyCode === keysList.downKey) {
		keys.d = 0;
	}
	if (event.keyCode === keysList.leftKey) {
		keys.l = 0;
	}
	if (event.keyCode === keysList.rightKey) {
		keys.r = 0;
	}
	if (event.keyCode === keysList.jumpKey) {
		keys.s = 0;
	}
	if (event.keyCode === keysList.reloadKey) {
		keys.rl = 0;
	}
	if (event.keyCode === keysList.incWeapKey) {
		playerSwapWeapon(findUserByIndex(player.index), 1);
	}
	if (event.keyCode === keysList.decWeapKey) {
		playerSwapWeapon(findUserByIndex(player.index), -1);
	}
	if (event.keyCode === keysList.sprayKey) {
		sendSpray();
	}
	if (
		event.keyCode === keysList.leaderboardKey &&
		!!showingScoreBoard &&
		!player.dead &&
		!gameOver &&
		!gameOver
	) {
		hideStatTable();
	}
}
function ChatManager() {
	this.commands = {};
	var chatInput = document.getElementById("chatInput") as HTMLInputElement;
	chatInput.addEventListener("keypress", this.sendChat.bind(this));
	chatInput.addEventListener("keyup", (b) => {
		let knum = b.which || b.keyCode;
		if (knum) {
			chatInput.value = "";
			mainCanvas.focus();
		}
	});
}
var chatTypeIndex = 0;
var chatTypes = ["ALL", "TEAM"];
var currentChatType = chatTypes[0];
ChatManager.prototype.sendChat = function (a) {
	var chatInput = document.getElementById("chatInput") as HTMLInputElement;
	a = a.which || a.keyCode;
	if (a === 13) {
		a = chatInput.value.replace(/(<([^>]+)>)/gi, "");
		if (a !== "") {
			socket.emit("cht", a.substring(0, 50), currentChatType);
			this.addChatLine(
				player.name,
				(currentChatType == "TEAM" ? "(TEAM) " : "") + a,
				true,
				player.team,
			);
			chatInput.value = "";
			mainCanvas.focus();
		}
	}
};
function toggleTeamChat() {
	chatTypeIndex++;
	if (chatTypeIndex >= chatTypes.length) {
		chatTypeIndex = 0;
	}
	currentChatType = chatTypes[chatTypeIndex];
	document.getElementById("chatType").innerHTML = currentChatType;
	mainCanvas.focus();
}
// var profanityList = []; // emptied
// function checkProfanityString(a) {
// 	if (showProfanity) {
// 		for (let i = 0; i < profanityList.length; ++i) {
// 			if (a.indexOf(profanityList[i]) > -1) {
// 				let tmpString = "";
// 				for (var d = 0; d < profanityList[i].length; ++d) {
// 					tmpString += "*";
// 				}
// 				a = a.replace(new RegExp(profanityList[i], "g"), tmpString);
// 			}
// 		}
// 	}
// 	return a;
// }
var chatLineCounter = 0;
ChatManager.prototype.addChatLine = function (a, b, d, e) {
	if (mobile) return;

	// b = checkProfanityString(b);
	let listElem = document.createElement("li");
	let source = "me";
	if (d || e === "system" || e === "notif") {
		if (e === "system") {
			source = "system";
		} else if (e === "notif") {
			source = "notif";
		}
	} else {
		source = player.team === e ? "blue" : "red";
	}
	chatLineCounter++;
	listElem.className = source;
	e = false;
	if (source === "system" || source === "notif") {
		listElem.innerHTML = `<span>${b}</span>`;
	} else {
		e = true;
		listElem.innerHTML =
			"<span>" +
			(d ? "YOU" : a) +
			': </span><label id="chatLine' +
			chatLineCounter +
			'"></label>';
	}
	this.appendMessage(listElem);
	if (e) {
		document.getElementById(`chatLine${chatLineCounter}`).textContent = b;
	}
};
ChatManager.prototype.appendMessage = (msgElem: HTMLElement) => {
	if (mobile) return;

	const chatbox = document.getElementById("chatbox");
	const chatList = document.getElementById("chatList");
	for (; chatbox.clientHeight > 260; ) {
		chatList.removeChild(chatList.childNodes[0]);
	}
	chatList.appendChild(msgElem);
};
var chat = new ChatManager();
function messageFromServer(a) {
	try {
		let tmpChatUser = findUserByIndex(a[0]);
		if (tmpChatUser != null) {
			if (tmpChatUser.index === player.index) return;
			chat.addChatLine(
				tmpChatUser.name,
				a[1],
				tmpChatUser.index === player.index,
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
var mapCanvas = document.getElementById("mapc") as HTMLCanvasElement;
var mapContext = mapCanvas.getContext("2d");
mapCanvas.width = 200;
mapCanvas.height = 200;
mapContext.imageSmoothingEnabled = false;

if (localStorage.getItem("showNames") !== "false") {
	if (!(document.getElementById("showNames") as HTMLInputElement).checked) {
		document.getElementById("showNames").click();
	}
}
var showNames = (document.getElementById("showNames") as HTMLInputElement)
	.checked;
function settingShowNames(a) {
	showNames = a.checked;
	localStorage.setItem("showNames", showNames ? "true" : "false");
}
if (localStorage.getItem("showParticles") !== "false") {
	if (!(document.getElementById("showParticles") as HTMLInputElement).checked) {
		document.getElementById("showParticles").click();
	}
}
var showParticles = (
	document.getElementById("showParticles") as HTMLInputElement
).checked;
function settingShowParticles(a) {
	showParticles = a.checked;
	localStorage.setItem("showParticles", showParticles ? "true" : "false");
}
if (localStorage.getItem("showTrippy") === "true") {
	if (!(document.getElementById("showTrippy") as HTMLInputElement).checked) {
		document.getElementById("showTrippy").click();
	}
} else if (
	(document.getElementById("showTrippy") as HTMLInputElement).checked
) {
	document.getElementById("showTrippy").click();
}
var showTrippy = (document.getElementById("showTrippy") as HTMLInputElement)
	.checked;
function settingShowTrippy(elem: HTMLInputElement) {
	showTrippy = elem.checked;
	localStorage.setItem("showTrippy", showTrippy ? "true" : "false");
}
if (localStorage.getItem("showSprays") !== "false") {
	if (!(document.getElementById("showSprays") as HTMLInputElement).checked) {
		document.getElementById("showSprays").click();
	}
}
var showSprays = (document.getElementById("showSprays") as HTMLInputElement)
	.checked;
function settingShowSprays(a) {
	showSprays = a.checked;
	localStorage.setItem("showSprays", showSprays ? "true" : "false");
}
if (
	localStorage.getItem("showProfanity") !== "false" &&
	(document.getElementById("showProfanity") as HTMLInputElement).checked
) {
	document.getElementById("showProfanity").click();
}
var showProfanity = (
	document.getElementById("showProfanity") as HTMLInputElement
).checked;
function settingProfanity(a) {
	showProfanity = a.checked;
	localStorage.setItem("showProfanity", showProfanity ? "true" : "false");
}
if (localStorage.getItem("showFade") !== "false") {
	if (!(document.getElementById("showFade") as HTMLInputElement).checked) {
		document.getElementById("showFade").click();
	}
}
var showUIFade = (document.getElementById("showFade") as HTMLInputElement)
	.checked;
function settingShowFade(a) {
	showUIFade = a.checked;
	localStorage.setItem("showFade", showUIFade ? "true" : "false");
}
if (localStorage.getItem("showShadows") !== "false") {
	if (!(document.getElementById("showShadows") as HTMLInputElement).checked) {
		document.getElementById("showShadows").click();
	}
}
var showShadows = (document.getElementById("showShadows") as HTMLInputElement)
	.checked;
function settingShowShadows(a) {
	showShadows = a.checked;
	localStorage.setItem("showShadows", showShadows ? "true" : "false");
}
if (localStorage.getItem("showGlows") !== "false") {
	if (!(document.getElementById("showGlows") as HTMLInputElement).checked) {
		document.getElementById("showGlows").click();
	}
}
var showGlows = (document.getElementById("showGlows") as HTMLInputElement)
	.checked;
function settingShowGlows(a) {
	showGlows = a.checked;
	localStorage.setItem("showGlows", showGlows ? "true" : "false");
}
if (localStorage.getItem("showBTrails") !== "false") {
	if (!(document.getElementById("showBTrails") as HTMLInputElement).checked) {
		document.getElementById("showBTrails").click();
	}
}
var showBTrails = (document.getElementById("showBTrails") as HTMLInputElement)
	.checked;
function settingShowBTrails(a) {
	showBTrails = a.checked;
	localStorage.setItem("showBTrails", showBTrails ? "true" : "false");
}
if (localStorage.getItem("showChat") !== "false") {
	if (!(document.getElementById("showChat") as HTMLInputElement).checked) {
		document.getElementById("showChat").click();
	}
}
var showChat = (document.getElementById("showChat") as HTMLInputElement)
	.checked;
function settingShowChat(a) {
	showChat = a.checked;
	if (showChat) {
		if (gameStart) {
			document.getElementById("chatbox").style.display = "block";
		}
	} else {
		document.getElementById("chatbox").style.display = "none";
	}
	localStorage.setItem("showChat", showChat ? "true" : "false");
}
if (localStorage.getItem("hideUI") !== "false") {
	if (!(document.getElementById("hideUI") as HTMLInputElement).checked) {
		document.getElementById("hideUI").click();
	}
}
var showUIALL = (document.getElementById("hideUI") as HTMLInputElement).checked;
function settingHideUI(a) {
	showUIALL = a.checked;
	localStorage.setItem("hideUI", showUIALL ? "true" : "false");
}
if (localStorage.getItem("showPINGFPS") !== "false") {
	if (!(document.getElementById("showPingFps") as HTMLInputElement).checked) {
		document.getElementById("showPingFps").click();
	}
}
var showPINGFPS = (document.getElementById("showPingFps") as HTMLInputElement)
	.checked;
function settingShowPingFps(a) {
	showPINGFPS = a.checked;
	if (!showPINGFPS) {
		document.getElementById("conStatContainer").style.display = "none";
	}
	localStorage.setItem("showPINGFPS", showPINGFPS ? "true" : "false");
}
if (localStorage.getItem("showLeader") !== "false") {
	if (!(document.getElementById("showLeader") as HTMLInputElement).checked) {
		document.getElementById("showLeader").click();
	}
}
var showLeader = (document.getElementById("showLeader") as HTMLInputElement)
	.checked;
function settingShowLeader(a) {
	showLeader = a.checked;
	if (showLeader) {
		if (gameStart) {
			document.getElementById("status").style.display = "block";
		}
	} else {
		document.getElementById("status").style.display = "none";
	}
	localStorage.setItem("showLeader", showLeader ? "true" : "false");
}
if (localStorage.getItem("selectChat") === "true") {
	if (!(document.getElementById("selectChat") as HTMLInputElement).checked) {
		document.getElementById("selectChat").click();
	}
}
var selectChat = (document.getElementById("selectChat") as HTMLInputElement)
	.checked;
settingSelectChat(document.getElementById("selectChat") as HTMLInputElement);
function settingSelectChat(elem: HTMLInputElement) {
	selectChat = elem.checked;
	localStorage.setItem("selectChat", selectChat ? "true" : "false");
	document.getElementById("chatList").style.pointerEvents = selectChat
		? "auto"
		: "none";
}
var targetFPS = 60;
if (localStorage.getItem("targetFPS")) {
	try {
		targetFPS = Number.parseInt(localStorage.getItem("targetFPS"));
	} catch (_) {
		targetFPS = 60;
	}
	const fpsSelect = document.getElementById("fpsSelect") as HTMLSelectElement;
	fpsSelect.value = targetFPS.toString();
}
window.pickedFps = pickedFps;
function pickedFps(elem: HTMLSelectElement) {
	try {
		targetFPS = Number.parseInt(elem.options[elem.selectedIndex].value);
	} catch (_) {
		targetFPS = 60;
	}
	localStorage.setItem("targetFPS", targetFPS.toString());
}
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
	if (!disconnected) {
		hideStatTable();
		hideUI(true);
		hideMenuUI();
		document.getElementById("startMenuWrapper").style.display = "none";
		gameOver = disconnected = true;
		if (reason === undefined) {
			reason = secondReason;
		}
		kicked = true;
		socket.close();
		updateGameLoop();
		stopAllSounds();
	}
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
window.showLobbySelector = showLobbySelector;
function hideLobbySelector() {
	charSelectorCont.style.display = "block";
	lobbySelectorCont.style.display = "block";
	lobbySelector.style.display = "none";
}
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
window.showLobbyCSelector = showLobbyCSelector;
function hideLobbyCSelector() {
	charSelectorCont.style.display = "block";
	lobbySelectorCont.style.display = "block";
	lobbyCSelector.style.display = "none";
}
window.hideLobbyCSelector = hideLobbyCSelector;
var timeOutCheck = null;
var tmpPingTimer = null;
var pingText = document.getElementById("pingText");
var fpsText = document.getElementById("fpsText");
var pingStart = 0;
function receivePing() {
	var a = Date.now() - pingStart;
	pingText.innerHTML = `PING ${a}`;
}
var pingInterval = null;
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
		serverKeyTxt.innerHTML = d;
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
		player.id = b.id;
		player.room = b.room;
		room = player.room;
		player.name = playerName;
		player.classIndex = playerClassIndex;
		b.name = player.name;
		b.classIndex = playerClassIndex;
		sock.emit("gotit", b, d, Date.now(), false);
		player.dead = true;
		if (d) {
			deactiveAllAnimTexts();
			gameStart = false;
			hideUI(false);
			document.getElementById("startMenuWrapper").style.display = "block";
		}
		if (gameOver) {
			document.getElementById("gameStatWrapper").style.display = "none";
		}
		gameOverFade = gameOver = false;
		targetChanged = true;
		if (mobile) {
			hideMenuUI();
			hideUI(true);
			document.getElementById("startMenuWrapper").style.display = "none";
		}
		resize();
	});
	sock.on("cSrvRes", (a, d) => {
		if (d) {
			serverKeyTxt.innerHTML = a;
			serverCreateMessage.innerHTML = `Success. Created server with IP: ${a}`;
		} else {
			serverCreateMessage.innerHTML = a;
		}
	});
	sock.on("regRes", (a, d) => {
		if (!d) {
			loginMessage.style.display = "block";
		}
		loginMessage.innerHTML = a;
	});
	sock.on("logRes", (a, d) => {
		if (d) {
			loginMessage.style.display = "none";
			loginMessage.innerHTML = "";
			loginWrapper.style.display = "none";
			loggedInWrapper.style.display = "block";
			(document.getElementById("playerNameInput") as HTMLInputElement).value =
				a.text;
			let tmpLogKey = a.logKey;
			let tmpUserName = a.text;
			localStorage.setItem("logKey", a.logKey);
			localStorage.setItem("userName", a.text);
			loggedIn = true;
			player.loggedIn = true;
			const user = findUserByIndex(player.index);
			if (user) {
				user.loggedIn = true;
			}
		} else {
			loginMessage.style.display = "block";
			loginMessage.innerHTML = a;
		}
		loadSavedClass();
	});
	sock.on("recovRes", (b, d) => {
		loginMessage.style.display = "block";
		loginMessage.innerHTML = b;
		if (d) {
			document.getElementById("recoverForm").style.display = "block";
			const chngPassKey = document.getElementById(
				"chngPassKey",
			) as HTMLInputElement;
			const chngPassPass = document.getElementById(
				"chngPassPass",
			) as HTMLInputElement;
			document.getElementById("chngPassButton").onclick = () => {
				loginMessage.style.display = "block";
				loginMessage.innerHTML = "Please Wait...";
				sock.emit("dbCngPass", {
					passKey: chngPassKey.value,
					newPass: chngPassPass.value,
				});
				sock.on("cngPassRes", (a, b) => {
					loginMessage.style.display = "block";
					loginMessage.innerHTML = a;
					if (b) {
						document.getElementById("recoverForm").style.display = "none";
					}
				});
			};
		}
	});
	sock.on("dbClanCreateR", (a, d) => {
		if (d) {
			clanSignUp.style.display = "none";
			clanStats.style.display = "block";
			clanHeader.innerHTML = `[${a}] Clan:`;
			clanAdminPanel.style.display = "block";
			leaveClanButton.style.display = "inline-block";
			leaveClanButton.innerHTML = "DELETE CLAN";
		} else {
			clanDBMessage.style.display = "block";
			clanDBMessage.innerHTML = a;
		}
	});
	sock.on("dbClanJoinR", (a, d) => {
		if (d) {
			clanSignUp.style.display = "none";
			clanStats.style.display = "block";
			clanHeader.innerHTML = `[${a}] Clan:`;
			player.account.clan = a;
			const user = findUserByIndex(player.index);
			if (user) {
				user.account.clan = a;
			}
			leaveClanButton.style.display = "inline-block";
			leaveClanButton.innerHTML = "Leave Clan";
		} else {
			clanDBMessage.style.display = "block";
			clanDBMessage.innerHTML = a;
		}
	});
	sock.on("dbClanInvR", (a, _) => {
		clanInvMessage.style.display = "block";
		clanInvMessage.innerHTML = a;
	});
	sock.on("dbKickInvR", (a, _) => {
		clanInvMessage.style.display = "block";
		clanInvMessage.innerHTML = a;
	});
	sock.on("dbClanLevR", (a, d) => {
		if (d) {
			clanSignUp.style.display = "block";
			clanStats.style.display = "none";
			clanHeader.innerHTML = "Clans";
			clanDBMessage.style.display = "block";
			clanDBMessage.innerHTML = a;
			leaveClanButton.style.display = "none";
		}
	});
	sock.on("dbChatR", (a, d) => {
		clanChtMessage.style.display = "inline-block";
		clanChtMessage.innerHTML = a.text;
		if (d) {
			if (!a.newURL.match(/^https?:\/\//i)) {
				a.newURL = `http://${a.newURL}`;
			}
			clanChatLink.innerHTML = `<a target='_blank' href='${a.newURL}'>Clan Chat</a>`;
		}
	});
	sock.on("dbChangeUserR", (a, d) => {
		if (d) {
			localStorage.setItem("userName", a);
			player.account.user_name = a;
			editProfileMessage.innerHTML = "Success. Account Updated.";
		} else {
			editProfileMessage.innerHTML = a;
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
			gameMap = a.mapData;
			gameMap.tiles = [];
			gameWidth = gameMap.width;
			gameHeight = gameMap.height;
			mapTileScale = a.tileScale;
			gameObjects = a.usersInRoom;
			for (let d = 0; d < gameObjects.length; ++d) {
				gameObjects[d].type = "player";
			}
			gameMode = gameMap.gameMode;
			if (a.you.team === "blue") {
				document.getElementById("gameModeText").innerHTML = gameMode.desc2;
			} else {
				document.getElementById("gameModeText").innerHTML = gameMode.desc1;
			}
			currentLikeButton = "";
			for (let d = 0; d < gameMap.clutter.length; ++d) {
				const b = gameMap.clutter[d];
				b.type = "clutter";
				gameObjects.push(b);
			}
			setupMap(gameMap, mapTileScale);
			cachedMiniMap = null;
			deactivateSprays();
			for (let d = 0; d < 100; ++d) {
				bullets.push(new Projectile());
			}
		}
		if (e) {
			gameStart = true;
			showUI();
			document.getElementById("cvs").focus();
		}
		keys.lm = 0;
		maxScreenHeight = a.maxScreenHeight * a.viewMult;
		maxScreenWidth = a.maxScreenWidth * a.viewMult;
		viewMult = a.viewMult;
		a.you.type = "player";
		player = a.you;
		e = findUserByIndex(a.you.index);
		if (e != null) {
			gameObjects[gameObjects.indexOf(e)] = a.you;
		} else {
			gameObjects.push(a.you);
		}
		updateWeaponUI(player, true);
		if (inMainMenu) {
			$("#loadingWrapper").fadeOut(0, () => {});
			inMainMenu = false;
		}
		startingGame = false;
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
			(a.dID != player.index || a.gID == player.index) &&
			a.amount <= 0 &&
			a.gID == player.index &&
			e != 0
		) {
			screenShake(e / 2, a.dir);
		}
		if (
			a.dID != null &&
			a.dID == player.index &&
			b != null &&
			e > 0 &&
			b.onScreen
		) {
			if (a.amount < 0) {
				startMovingAnimText(
					`${e}`,
					b.x - b.width / 2,
					b.y - b.height,
					"#d95151",
					e / 10,
				);
			} else {
				startMovingAnimText(
					`${e}`,
					b.x - b.width / 2,
					b.y - b.height,
					"#5ed951",
					e / 10,
				);
			}
		}
		if (a.bi != null) {
			let svb = findServerBullet(a.bi);
			if (svb != undefined && svb.owner.index != player.index) {
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
			if (b.index == player.index) {
				updatePlayerInfo(b);
				updateUiStats(b);
			}
		}
	});
	sock.on("2", someoneShot);
	sock.on("jum", otherJump);
	sock.on("ex", createExplosion);
	sock.on("r", (a) => {
		var b = findUserByIndex(player.index);
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
		if (event.kB && event.gID !== player.index) {
			if (event.dID === player.index) {
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
		} else if (event.dID === player.index && event.gID !== player.index) {
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
			startBigAnimText(
				killMsg,
				`${event.sS} POINTS`,
				2000,
				true,
				"#ffffff",
				"#5151d9",
				true,
				1.25,
			);
		}
		if (event.gID === player.index) {
			hideStatTable();
			gameStart = false;
			hideUI(false);
			player.dead = true;
			window.setTimeout(() => {
				if (!gameOver) {
					document.getElementById("startMenuWrapper").style.display = "block";
					document.getElementById("linkBox").style.display = "block";
				}
			}, 1300);
			playSound("death1", player.x, player.y);
			startSoundTrack(1);
		}
	});
	sock.on("4", (a, d, e) => {
		if (e == 0) {
			if (gameMap != null && a.active != undefined) {
				gameMap.pickups[d].active = a.active;
			}
		} else {
			for (e = 0; e < gameObjects.length; ++e) {
				if (gameObjects[e].type == "clutter" && gameObjects[e].indx == d) {
					if (a.active != undefined) {
						gameObjects[e].active = a.active;
					}
					if (a.x != undefined) {
						gameObjects[e].x = a.x;
					}
					if (a.y != undefined) {
						gameObjects[e].y = a.y;
					}
				}
			}
		}
	});
	sock.on("tprt", (a) => {
		var b = findUserByIndex(a.indx);
		if (b !== undefined) {
			b.x = a.newX;
			b.y = a.newY;
			createSmokePuff(b.x, b.y, 5, false, 1);
			if (a.indx === player.index) {
				player.x = a.newX;
				player.y = a.newY;
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
				showNotification(`${b.name} scored`);
			}
		}
	});
	sock.on("5", (a) => {
		showNotification(a);
	});
	sock.on("6", (a, d, e) => {
		if (!player.dead) {
			startBigAnimText(a, d, 2000, true, "#ffffff", "#5151d9", true, e);
		}
	});
	sock.on("7", (a, d, e, f) => {
		try {
			gameOver = true;
			document.getElementById("startMenuWrapper").style.display = "none";
			showStatTable(d, e, a, false, f, true);
			startSoundTrack(1);
		} catch (h) {
			console.log(h);
		}
	});
	sock.on("8", (a) => {
		document.getElementById("nextGameTimer").innerHTML =
			`${a}: UNTIL NEXT ROUND`;
	});
}
function likePlayerStat(a) {
	socket.emit("like", a);
}
function updateVoteStats(a) {
	document.getElementById(`votesText${a.i}`).innerHTML = `${a.n}: ${a.v}`;
}
function showESCMenu() {
	deactiveAllAnimTexts();
	gameStart = false;
	hideUI(false);
	document.getElementById("startMenuWrapper").style.display = "block";
}
var buttonCount = 0;
function showStatTable(userList: any[], b, d, e, f, h) {
	buttonCount = 0;
	if (h) {
		hideUI(false);
		if (e) {
			document.getElementById("nextGameTimer").textContent = "GAME STATS";
			document.getElementById("winningTeamText").textContent = "";
			document.getElementById("voteModeContainer").textContent = "";
		} else {
			d = player.team == d || player.id == d;
			if (!f) {
				if (d) {
					startBigAnimText(
						"Victory",
						"Well Played!",
						2500,
						true,
						"#5151d9",
						"#ffffff",
						false,
						2,
					);
					document.getElementById("winningTeamText").textContent = "VICTORY";
					document.getElementById("winningTeamText").style.color = "#5151d9";
				} else if (player.team != "") {
					startBigAnimText(
						"Defeat",
						"Bad Luck!",
						2500,
						true,
						"#d95151",
						"#ffffff",
						false,
						2,
					);
					document.getElementById("winningTeamText").textContent = "DEFEAT";
					document.getElementById("winningTeamText").style.color = "#d95151";
				}
			}
			if (b != null) {
				document.getElementById("voteModeContainer").textContent = "";
				for (let i = 0; i < b.length; ++i) {
					let modeVoteBtn = document.createElement("button");
					modeVoteBtn.className = "modeVoteButton";
					modeVoteBtn.setAttribute("id", `votesText${i}`);
					modeVoteBtn.innerHTML = `${b[i].name}: ${b[i].votes}`;
					document.getElementById("voteModeContainer").appendChild(modeVoteBtn);
					modeVoteBtn.onclick = ((a, d) => () => {
						mainCanvas.focus();
						socket.emit("modeVote", a.indx);
						for (let j = 0; j < b.length; ++j) {
							if (
								d === j &&
								document.getElementById(`votesText${j}`).className ===
									"modeVoteButton"
							) {
								document.getElementById(`votesText${j}`).className =
									"modeVoteButtonA";
							} else {
								document.getElementById(`votesText${j}`).className =
									"modeVoteButton";
							}
						}
					})(b[i], i);
				}
			}
		}
	}
	try {
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
		for (let g = 0; g < userList.length; ++g) {
			if (!userList[g].team) continue;
			addRowToStatTable(
				[
					{
						text: userList[g].name,
						className: "contL",
						canClick: userList[g].loggedIn,
						color:
							userList[g].index == player.index
								? "#fff"
								: userList[g].team != player.team
									? "#d95151"
									: "#5151d9",
						id: null,
						userInfo: findUserByIndex(userList[g].index),
					},
					{
						text: userList[g].score || 0,
						className: "contC",
						color: "#fff",
						id: null,
					},
					{
						text: userList[g].kills || 0,
						className: "contC",
						color: "#fff",
						id: null,
					},
					{
						text: userList[g].deaths || 0,
						className: "contC",
						color: "#fff",
						id: null,
					},
					{
						text: userList[g].totalDamage || 0,
						className: "contC",
						color: "#fff",
						id: null,
					},
					{
						text:
							gameMode.code == "zmtch"
								? userList[g].totalGoals || 0
								: userList[g].totalHealing || 0,
						className: "contC",
						color: "#fff",
						id: null,
					},
					{
						text:
							userList[g].lastItem != null
								? userList[g].lastItem.name
								: "No Reward",
						className: "rewardText",
						color:
							userList[g].lastItem != null
								? getItemRarityColor(userList[g].lastItem.chance)
								: "#fff",
						id: null,
						hoverInfo: userList[g].lastItem,
					},
					{
						text: userList[g].likes || 0,
						className: "contC",
						color: "#fff",
						pos: userList[g].index,
						id: `likeStat${userList[g].index}`,
						uID: userList[g].id,
					},
				],
				false,
			);
		}
		if (h) {
			if (f) {
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
	} catch (l) {}
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
function addRowToStatTable(data, b) {
	let trow = document.createElement("tr");
	for (let f = 0; f < data.length; ++f) {
		let tcell = document.createElement("td");
		if (b || f !== data.length - 1) {
			tcell.appendChild(document.createTextNode(data[f].text));
			tcell.className = data[f].className;
			tcell.style.color = data[f].color;
			if (data[f].hoverInfo) {
				let tooltip = document.createElement("div");
				tooltip.className = "hoverTooltip";
				tooltip.innerHTML =
					data[f].hoverInfo.type === "hat"
						? "<image class='itemDisplayImage' src='.././images/hats/" +
							data[f].hoverInfo.id +
							"/d.png'></image><div style='color:" +
							data[f].color +
							"; font-size:16px; margin-top:5px;'>" +
							data[f].hoverInfo.name +
							"</div><div style='color:#ffd100; font-size:12px; margin-top:0px;'>droprate " +
							data[f].hoverInfo.chance +
							"%</div>" +
							(data[f].hoverInfo.duplicate
								? "<div style='font-size:8px; color:#e04141; margin-top:1px;'><i>Duplicate</i></div>"
								: "<div style='font-size:8px; color:#d8d8d8; margin-top:1px;'><i>wearable</i></div>") +
							"<div style='font-size:12px; margin-top:5px;'>" +
							data[f].hoverInfo.desc +
							"</div>" +
							(data[f].hoverInfo.creator === "EatMyApples"
								? ""
								: "<div style='font-size:8px; color:#d8d8d8; margin-top:5px;'><i>Artist: " +
									data[f].hoverInfo.creator +
									"</i></div>")
						: data[f].hoverInfo.type === "shirt"
							? "<image class='shirtDisplayImage' src='.././images/shirts/" +
								data[f].hoverInfo.id +
								"/d.png'></image><div style='color:" +
								data[f].color +
								"; font-size:16px; margin-top:5px;'>" +
								data[f].hoverInfo.name +
								"</div><div style='color:#ffd100; font-size:12px; margin-top:0px;'>droprate " +
								data[f].hoverInfo.chance +
								"%</div>" +
								(data[f].hoverInfo.duplicate
									? "<div style='font-size:8px; color:#e04141; margin-top:1px;'><i>Duplicate</i></div>"
									: "<div style='font-size:8px; color:#d8d8d8; margin-top:1px;'><i>shirt</i></div>") +
								"<div style='font-size:12px; margin-top:5px;'>" +
								data[f].hoverInfo.desc +
								"</div>"
							: "<image class='camoDisplayImage' src='.././images/camos/" +
								(data[f].hoverInfo.id + 1) +
								".png'></image><div style='color:" +
								data[f].color +
								"; font-size:16px; margin-top:5px;'>" +
								data[f].hoverInfo.name +
								"</div><div style='color:#ffd100; font-size:12px; margin-top:0px;'>droprate " +
								data[f].hoverInfo.chance +
								"%</div>" +
								(data[f].hoverInfo.duplicate
									? "<div style='font-size:8px; color:#e04141; margin-top:1px;'><i>Duplicate</i></div>"
									: "<div style='font-size:8px; color:#d8d8d8; margin-top:1px;'><i>weapon camo</i></div>") +
								"<div style='font-size:12px; margin-top:5px;'>" +
								data[f].hoverInfo.weaponName +
								"</div>";
				tcell.appendChild(tooltip);
			}
			if (tcell.className === "contL" && data[f].canClick) {
				tcell.addEventListener("click", () => {
					showUserStatPage(data[f].text);
				});
			}
		} else {
			let btn = document.createElement("button");
			let btnText = document.createTextNode(" NICE");
			btn.appendChild(btnText);
			btn.setAttribute("type", "button");
			let m = data[f];
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
					this.setAttribute("class", "gameStatLikeButtonA");
				} else {
					currentLikeButton = "";
				}
			};
			btn.setAttribute("id", `gameStatLikeButton${buttonCount}`);
			buttonCount++;
			if (m.uID === currentLikeButton) {
				btn.setAttribute("class", "gameStatLikeButtonA");
			} else {
				btn.setAttribute("class", "gameStatLikeButton");
			}
			btn.style.display = m.pos === player.index ? "none" : "block";
			trow.appendChild(btn);
			let tmpDiv = document.createElement("div");
			tmpDiv.innerHTML = data[f].text;
			if (data[f].id != null) {
				tmpDiv.setAttribute("id", data[f].id);
			}
			tcell.appendChild(btnText);
			tcell.className = data[f].className;
			tcell.style.color = data[f].color;
		}
		trow.appendChild(tcell);
	}
	document.getElementById("gameStatBoard").appendChild(trow);
}
function addUser(a) {
	a = JSON.parse(a);
	if (a.index !== player.index) {
		a.type = "player";
		const b = findUserByIndex(a.index);
		if (b == null) {
			gameObjects.push(a);
		} else {
			gameObjects[gameObjects.indexOf(b)] = a;
		}
	}
}
function removeUser(userIndex: number) {
	if (userIndex !== player.index) {
		let tmpUser = findUserByIndex(userIndex);
		if (tmpUser != null) {
			gameObjects.splice(gameObjects.indexOf(tmpUser), 1);
		}
	}
}
function updateUiStats(player) {
	document.getElementById("scoreValue").innerHTML = player.score;
	if (player.weapons.length > 0) {
		document.getElementById("ammoValue").innerHTML =
			getCurrentWeapon(player).ammo;
	}
	document.getElementById("healthValue").innerHTML = player.health;
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
function updateUserValue(a) {
	var b = false;
	const tmpUser = findUserByIndex(a.i);
	if (tmpUser != null) {
		if (a.s != undefined) {
			tmpUser.score = a.s;
			b = true;
		}
		if (a.sp != undefined) {
			tmpUser.spawnProtection = a.sp;
		}
		if (a.wi != undefined && a.i != player.index) {
			playerEquipWeapon(tmpUser, a.wi);
		}
		if (a.l != undefined) {
			tmpUser.likes = a.l;
			b = true;
		}
		if (a.dea != undefined) {
			tmpUser.deaths = a.dea;
			b = true;
		}
		if (a.kil != undefined) {
			tmpUser.kills = a.kil;
			b = true;
		}
		if (a.dmg != undefined) {
			tmpUser.totalDamage = a.dmg;
			b = true;
		}
		if (a.hea != undefined) {
			tmpUser.totalHealing = a.hea;
			b = true;
		}
		if (tmpUser.index == player.index) {
			updatePlayerInfo(tmpUser);
			updateUiStats(tmpUser);
		}
		if (b) {
			if (gameOver) {
				if (a.l != undefined) {
					a = document.createTextNode(tmpUser.likes.toString());
					document.getElementById(`likeStat${tmpUser.index}`).textContent = "";
					document.getElementById(`likeStat${tmpUser.index}`).appendChild(a);
				}
			} else {
				showStatTable(getUsersList(), null, null, true, true, false);
			}
		}
	} else {
		fetchUserWithIndex(a.i);
	}
}
function fetchUserWithIndex(a) {
	socket.emit("ftc", a);
}
function canPlaceFlag(a, b) {
	if (b) {
		return a && !a.wall && !a.hardPoint;
	} else {
		return a && !a.hardPoint;
	}
}
function receiveServerData(a) {
	let tmpNowTime = Date.now();
	timeSinceLastUpdate = tmpNowTime - timeOfLastUpdate;
	timeOfLastUpdate = tmpNowTime;
	if (!gameOver) {
		for (let i = 0; i < gameObjects.length; ++i) {
			if (gameObjects[i].type === "player") {
				gameObjects[i].onScreen = false;
			}
		}
		for (let d = 0; d < a.length; ) {
			let b = a[0 + d];
			const tmpUser = findUserByIndex(a[1 + d]);
			if (a[1 + d] === player.index && tmpUser != null) {
				if (b > 2) {
					tmpUser.x = a[2 + d];
				}
				if (b > 3) {
					tmpUser.y = a[3 + d];
				}
				if (b > 4) {
					tmpUser.angle = a[4 + d];
				}
				if (b > 5) {
					tmpUser.isn = a[5 + d];
				}
				tmpUser.onScreen = true;
			} else if (tmpUser != null) {
				if (b > 2) {
					tmpUser.xSpeed = Math.abs(tmpUser.x - a[2 + d]);
					tmpUser.x = a[2 + d];
				}
				if (b > 3) {
					tmpUser.ySpeed = Math.abs(tmpUser.y - a[3 + d]);
					tmpUser.y = a[3 + d];
				}
				if (b > 4) {
					tmpUser.angle = a[4 + d];
				}
				if (getCurrentWeapon(tmpUser) !== undefined) {
					const wepAngle = Math.round((tmpUser.angle % 360) / 90) * 90;
					if (wepAngle === 0 || wepAngle === 360) {
						getCurrentWeapon(tmpUser).front = true;
					} else if (wepAngle === 180) {
						getCurrentWeapon(tmpUser).front = false;
					} else {
						getCurrentWeapon(tmpUser).front = true;
					}
				}
				//TODO: nameYOffset for other players
				//if (b > 5) {
				//  tmpUser.nameYOffset = a[5 + d];
				//}
				tmpUser.onScreen = true;
			} else {
				fetchUserWithIndex(a[1 + d]);
			}
			d += b;
		}
	}
	for (let d = 0; d < gameObjects.length; d++) {
		if (gameObjects[d].index === player.index) {
			if (gameObjects[d].dead || gameOver || thisInput.length > 80) {
				thisInput.length = 0;
			}
			let f = 0;
			if (!gameObjects[d].dead) {
				while (f < thisInput.length) {
					if (thisInput[f].isn <= gameObjects[d].isn) {
						thisInput.splice(f, 1);
					} else {
						a = thisInput[f].hdt;
						let b = thisInput[f].vdt;
						const e = Math.sqrt(
							thisInput[f].hdt * thisInput[f].hdt +
								thisInput[f].vdt * thisInput[f].vdt,
						);
						if (e !== 0) {
							a /= e;
							b /= e;
						}
						gameObjects[d].oldX = gameObjects[d].x;
						gameObjects[d].oldY = gameObjects[d].y;
						gameObjects[d].x += a * gameObjects[d].speed * thisInput[f].delta;
						gameObjects[d].y += b * gameObjects[d].speed * thisInput[f].delta;
						wallCol(gameObjects[d], gameMap, gameObjects);
						f++;
					}
				}
				gameObjects[d].x = Math.round(gameObjects[d].x);
				gameObjects[d].y = Math.round(gameObjects[d].y);
				updatePlayerInfo(gameObjects[d]);
			}
		}
	}
}
function updatePlayerInfo(a: Partial<Player>) {
	player.x = a.x;
	player.y = a.y;
	player.dead = a.dead;
	if (player.score < a.score) {
		playSound("score", player.x, player.y);
	}
	player.score = a.score;
	player.health = a.health;
}
var currentHat = document.getElementById("currentHat");
var hatList = document.getElementById("hatList");
var hatHeader = document.getElementById("hatHeader");
function updateHatList(a, b) {
	hatHeader.innerHTML = `SELECT HAT: (${b.length}/${a})`;
	var content =
		"<div class='hatSelectItem' id='hatItem-1' onclick='changeHat(-1);'>Default</div>";
	for (let i = 0; i < b.length; ++i) {
		content +=
			"<div class='hatSelectItem' id='hatItem" +
			b[i].id +
			"' style='color:" +
			getItemRarityColor(b[i].chance) +
			";' onclick='changeHat(" +
			b[i].id +
			");'>" +
			b[i].name +
			" x" +
			(parseInt(b[i].count) + 1) +
			"<div class='hoverTooltip'><image class='itemDisplayImage' src='.././images/hats/" +
			b[i].id +
			"/d.png'></image><div style='color:" +
			getItemRarityColor(b[i].chance) +
			"; font-size:16px; margin-top:5px;'>" +
			b[i].name +
			"</div><div style='color:#ffd100; font-size:12px; margin-top:0px;'>droprate " +
			b[i].chance +
			"%</div><div style='font-size:8px; color:#d8d8d8; margin-top:1px;'><i>wearable</i></div><div style='font-size:12px; margin-top:5px;'>" +
			b[i].desc +
			"</div>" +
			(b[i].creator == "EatMyApples"
				? ""
				: "<div style='font-size:8px; color:#d8d8d8; margin-top:5px;'><i>Artist: " +
					b[i].creator +
					"</i></div>") +
			"</div></div>";
	}
	hatList.innerHTML = content;
}
function resetHatList() {
	hatHeader.textContent = "SELECT HAT";
	hatList.innerHTML =
		"<div class='hatSelectItem' id='hatItem-1' onclick='changeHat(-1);'>Default</div>";
	changeHat(-1);
}
window.showHatselector = showHatselector;
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
window.changeHat = changeHat;
function changeHat(a) {
	if (!socket) return;
	socket.emit("cHat", a);
	localStorage.setItem("previousHat", a);
	currentHat.innerHTML = document.getElementById(`hatItem${a}`).innerHTML;
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
function updateShirtList(a, b) {
	shirtHeader.textContent = `SELECT SHIRT: (${b.length}/${a})`;
	let listContent =
		"<div class='hatSelectItem' id='shirtItem-1' onclick='changeShirt(-1);'>Default</div>";
	for (let i = 0; i < b.length; ++i) {
		listContent +=
			"<div class='hatSelectItem' id='shirtItem" +
			b[i].id +
			"' style='color:" +
			getItemRarityColor(b[i].chance) +
			";' onclick='changeShirt(" +
			b[i].id +
			");'>" +
			b[i].name +
			" x" +
			(parseInt(b[i].count) + 1) +
			"<div class='hoverTooltip'><image class='shirtDisplayImage' src='.././images/shirts/" +
			b[i].id +
			"/d.png'></image><div style='color:" +
			getItemRarityColor(b[i].chance) +
			"; font-size:16px; margin-top:5px;'>" +
			b[i].name +
			"</div><div style='color:#ffd100; font-size:12px; margin-top:0px;'>droprate " +
			b[i].chance +
			"%</div><div style='font-size:8px; color:#d8d8d8; margin-top:1px;'><i>shirt</i></div><div style='font-size:12px; margin-top:5px;'>" +
			b[i].desc +
			"</div></div></div>";
	}
	shirtList.innerHTML = listContent;
}
function resetShirtList() {
	shirtHeader.textContent = "SELECT SHIRT";
	shirtList.innerHTML =
		"<div class='hatSelectItem' id='shirtItem-1' onclick='changeShirt(-1);'>Default</div>";
	changeShirt(-1);
}
window.showShirtselector = showShirtselector;
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
window.changeShirt = changeShirt;
function changeShirt(shirtId: number) {
	if (socket) {
		socket.emit("cShirt", shirtId);
		localStorage.setItem("previousShirt", shirtId.toString());
		currentShirt.innerHTML = document.getElementById(
			`shirtItem${shirtId}`,
		).innerHTML;
		currentShirt.style.color = document.getElementById(
			`shirtItem${shirtId}`,
		).style.color;
		charSelectorCont.style.display = "block";
		lobbySelectorCont.style.display = "block";
		classSelector.style.display = "none";
		camoSelector.style.display = "none";
		shirtSelector.style.display = "none";
		hatSelector.style.display = "none";
		lobbySelector.style.display = "none";
		lobbyCSelector.style.display = "none";
	}
}
var currentSpray = document.getElementById("currentSpray");
var sprayList = document.getElementById("sprayList");
function updateSpraysList(a) {
	let listContent = "";
	for (let i = 0; i < a.length; ++i) {
		listContent +=
			"<div class='hatSelectItem' id='sprayItem" +
			(i + 1) +
			"' onclick='changeSpray(" +
			(i + 1) +
			"," +
			a[i].id +
			");'>" +
			a[i].name +
			"<div id='sprayHoverImage" +
			(i + 1) +
			"' class='hoverTooltip' style='width:90px;height:90px;'></div></div>";
	}
	sprayList.innerHTML = listContent;
	if (localStorage.getItem("previousSpray")) {
		previousSpray = Number.parseInt(localStorage.getItem("previousSpray"));
		try {
			changeSpray(previousSpray, a[previousSpray - 1].id);
		} catch (_) {
			changeSpray(1, a[1].id);
		}
	} else {
		changeSpray(1, a[1].id);
	}
}
window.updateSpraysList = updateSpraysList;
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
window.showSprayselector = showSprayselector;
function changeSpray(sprayId, b) {
	if (!socket) return;
	socket.emit("cSpray", sprayId);
	localStorage.setItem("previousSpray", sprayId);
	currentSpray.innerHTML = document.getElementById(
		`sprayItem${sprayId}`,
	).innerHTML;
	currentSpray.style.color = document.getElementById(
		`sprayItem${sprayId}`,
	).style.color;
	let hoverElem = document.getElementById(`sprayHoverImage${sprayId}`);
	if (hoverElem) {
		hoverElem.innerHTML =
			"<image class='sprayDisplayImage' src='.././images/sprays/" +
			b +
			".png'></image>";
	}
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
window.changeSpray = changeSpray;
function findUserByIndex(index: number): Player {
	for (let i = 0; i < gameObjects.length; ++i) {
		if (gameObjects[i].index === index) {
			return gameObjects[i];
		}
	}
	return null;
}
function getUsersList() {
	let tmpUsers = [];
	for (let i = 0; i < gameObjects.length; ++i) {
		if (gameObjects[i].type === "player") {
			tmpUsers.push(gameObjects[i]);
		}
	}
	tmpUsers.sort(sortUsersByScore);
	return tmpUsers;
}
function sortUsersByScore(a, b) {
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
function sortUsersByPosition(a, b) {
	if (a.y < b.y) {
		return -1;
	} else if (a.y > b.y) {
		return 1;
	} else {
		return 0;
	}
}
function updateLeaderboard(data: number[]) {
	try {
		let lbContent = '<span class="title">LEADERBOARD</span>';
		for (let i = 0; i < data.length; i++) {
			let tmpPlayer = findUserByIndex(data[0 + i]);
			if (tmpPlayer == null) continue;
			lbContent += "<br />";
			if (tmpPlayer.index === player.index) {
				lbContent +=
					'<span class="me">' +
					(i + 1) +
					". " +
					player.name +
					(player.account.clan ? ` [${player.account.clan}]` : "") +
					"</span>";
			} else if (tmpPlayer.name) {
				lbContent +=
					'<span class="' +
					(tmpPlayer.team !== player.team ? "red" : "blue") +
					'">' +
					(i + 1) +
					". " +
					tmpPlayer.name +
					"</span>" +
					(tmpPlayer.account.clan
						? `<span class='me'> [${tmpPlayer.account.clan}]</span>`
						: "");
			}
		}
		document.getElementById("status").innerHTML = lbContent;
	} catch (err) {
		// "throw it all in a try-catch, that'll fix it"
		// - Sidney, probably
		// I wonder what error was coming up here
		console.error(err);
	}
}
function updateTeamScores(a, b) {
	var redProgress = document.getElementById("redProgress");
	var blueText = document.getElementById("blueText");
	var blueProgress = document.getElementById("blueProgress");
	var redProgCont = document.getElementById("redProgCont");
	if (!gameMode) return;
	try {
		if (gameMode.teams) {
			blueText.textContent = "A";
			redProgCont.style.display = "";
			if (player.team === "red") {
				redProgress.setAttribute("style", `display:block;width:${b}%`);
				redProgress.style.width = `${b}%`;
				blueProgress.setAttribute("style", `display:block;width:${a}%`);
				blueProgress.style.width = `${a}%`;
			} else {
				redProgress.setAttribute("style", `display:block;width:${a}%`);
				redProgress.style.width = `${a}%`;
				blueProgress.setAttribute("style", `display:block;width:${b}%`);
				blueProgress.style.width = `${b}%`;
			}
		} else {
			b = Math.round((player.score / a) * 100);
			blueProgress.setAttribute("style", `display:block;width:${b}%`);
			blueProgress.style.width = `${b}%`;
			blueText.innerHTML = "YOU";
			redProgCont.style.display = "none";
		}
	} catch (err) {
		// "throw it all in a try-catch, that'll fix it" pt 2
		console.error(err);
	}
}
function showUI() {
	if (showUIALL) {
		document.getElementById("status").style.display = "block";
		document.getElementById("statContainer2").style.display = "block";
		document.getElementById("actionBar").style.display = "block";
		document.getElementById("statContainer").style.display = "block";
		document.getElementById("score").style.display = "block";
		if (showPINGFPS) {
			document.getElementById("conStatContainer").style.display = "block";
		}
		if (!showLeader) {
			document.getElementById("status").style.display = "none";
		}
	}
	if (showChat) {
		document.getElementById("chatbox").style.display = "block";
	}
}
function hideMenuUI() {
	document.getElementById("namesBox").style.display = "none";
	document.getElementById("linkBox").style.display = "none";
}
function hideUI(a) {
	document.getElementById("status").style.display = "none";
	document.getElementById("statContainer2").style.display = "none";
	document.getElementById("actionBar").style.display = "none";
	document.getElementById("conStatContainer").style.display = "none";
	document.getElementById("score").style.display = "none";
	document.getElementById("statContainer").style.display = "none";
	if (a) {
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
var sendData = null;
var fpsUpdateUICounter = 0;
function updateGameLoop() {
	delta = currentTime - oldTime;
	fpsUpdateUICounter--;
	if (fpsUpdateUICounter <= 0) {
		currentFPS = Math.round(1000 / delta);
		fpsText.innerHTML = `FPS ${currentFPS}`;
		fpsUpdateUICounter = targetFPS;
	}
	oldTime = currentTime;
	horizontalDT = verticalDT = 0;
	count++;
	var doJump = 0;
	if (keys.u === 1) {
		verticalDT = -1;
		// temp = 0;
	}
	if (keys.d === 1) {
		verticalDT = 1;
		// temp = 0;
	}
	if (keys.r === 1) {
		horizontalDT = 1;
		// temp = 0;
	}
	if (keys.l === 1) {
		horizontalDT = -1;
		// temp = 0;
	} else {
		keyd = 0;
	}
	if (keys.s === 1) {
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
		for (let e = 0; e < gameObjects.length; e++) {
			if (gameObjects[e].type === "player") {
				if (gameObjects[e].index === player.index) {
					gameObjects[e].oldX = gameObjects[e].x;
					gameObjects[e].oldY = gameObjects[e].y;
					if (!gameObjects[e].dead && !gameOver) {
						gameObjects[e].x += b * gameObjects[e].speed * delta;
						gameObjects[e].y += d * gameObjects[e].speed * delta;
					}
					wallCol(gameObjects[e], gameMap, gameObjects);
					gameObjects[e].x = Math.round(gameObjects[e].x);
					gameObjects[e].y = Math.round(gameObjects[e].y);
					gameObjects[e].angle =
						((target.f + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI) + 90;
					if (getCurrentWeapon(gameObjects[e]) !== undefined) {
						let f = Math.round((gameObjects[e].angle % 360) / 90) * 90;
						if (f === 0 || f === 360) {
							getCurrentWeapon(gameObjects[e]).front = true;
						} else if (f === 180) {
							getCurrentWeapon(gameObjects[e]).front = false;
						} else {
							getCurrentWeapon(gameObjects[e]).front = true;
						}
					}
					if (gameObjects[e].jumpCountdown > 0) {
						gameObjects[e].jumpCountdown -= delta;
					}
					if (keys.s === 1 && gameObjects[e].jumpCountdown <= 0 && !gameOver) {
						playerJump(gameObjects[e]);
						doJump = 1;
					}
				}
				if (gameObjects[e].jumpY !== 0) {
					gameObjects[e].jumpDelta -= gameObjects[e].gravityStrength * delta;
					gameObjects[e].jumpY += gameObjects[e].jumpDelta * delta;
					if (gameObjects[e].jumpY > 0) {
						gameObjects[e].animIndex = 1;
					} else {
						gameObjects[e].jumpY = 0;
						gameObjects[e].jumpDelta = 0;
						gameObjects[e].jumpCountdown = 250;
					}
					gameObjects[e].jumpY = Math.round(gameObjects[e].jumpY);
				}
				if (gameObjects[e].index == player.index && !gameOver) {
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
					if (userScroll != 0 && !gameOver) {
						playerSwapWeapon(gameObjects[e], userScroll);
						userScroll = 0;
					}
					if (keys.rl == 1 && !gameOver) {
						playerReload(gameObjects[e], true);
					}
					if (keys.lm == 1 && !gameOver && player.weapons.length > 0) {
						keyd = 0;
						if (
							currentTime - getCurrentWeapon(gameObjects[e]).lastShot >=
							getCurrentWeapon(gameObjects[e]).fireRate
						) {
							shootBullet(gameObjects[e]);
						}
					}
				}
				if (gameOver) {
					gameObjects[e].animIndex = 0;
				} else {
					let f = Math.abs(b) + Math.abs(d);
					if (gameObjects[e].index != player.index) {
						f =
							Math.abs(gameObjects[e].xSpeed) + Math.abs(gameObjects[e].ySpeed);
					}
					if (f > 0) {
						gameObjects[e].frameCountdown -= delta / 4;
						if (gameObjects[e].frameCountdown <= 0) {
							gameObjects[e].animIndex++;
							if (
								gameObjects[e].jumpY == 0 &&
								gameObjects[e].onScreen &&
								!gameObjects[e].dead
							) {
								stillDustParticle(gameObjects[e].x, gameObjects[e].y, false);
							}
							if (gameObjects[e].animIndex >= 3) {
								gameObjects[e].animIndex = 1;
							} else if (
								gameObjects[e].animIndex == 2 &&
								gameObjects[e].jumpY <= 0
							) {
								playSound("step1", gameObjects[e].x, gameObjects[e].y);
							}
							gameObjects[e].frameCountdown = 40;
						}
					} else if (gameObjects[e].animIndex != 0) {
						gameObjects[e].animIndex = 0;
					}
					if (gameObjects[e].jumpY > 0) {
						gameObjects[e].animIndex = 1;
					}
				}
			}
		}
	}
	gameObjects.sort(sortUsersByPosition);
	if (!kicked) {
		if (gameOver) {
			doGame(delta);
			if (gameOverFade && showUIFade) {
				drawOverlay(graph, true, false);
			}
		} else if (player.dead && !inMainMenu) {
			doGame(delta);
			drawOverlay(graph, true, false);
		} else if (gameStart) {
			doGame(delta);
			drawOverlay(graph, false, true);
			if (!mobile && targetChanged) {
				targetChanged = false;
				socket.emit("0", target.f);
			}
		} else if (!kicked) {
			drawMenuBackground();
			drawOverlay(graph, false, false);
		}
	}
	if (disconnected || kicked) {
		drawOverlay(graph, false, false);
		const renderedReason = kicked
			? reason !== ""
				? renderShadedAnimText(reason, viewMult * 48, "#ffffff", 6, "")
				: renderShadedAnimText(
						"You were kicked",
						viewMult * 48,
						"#ffffff",
						6,
						"",
					)
			: renderShadedAnimText("Disconnected", viewMult * 48, "#ffffff", 6, "");
		if (renderedReason !== undefined) {
			graph.drawImage(
				renderedReason,
				maxScreenWidth / 2 - renderedReason.width / 2,
				maxScreenHeight / 2 - renderedReason.height / 2,
				renderedReason.width,
				renderedReason.height,
			);
		}
	}
	if (showTrippy) {
		context.globalAlpha = 0.25;
	}
}
function otherJump(a) {
	var b = findUserByIndex(a);
	if (b != undefined && b != null && player.index != a) {
		playerJump(b);
	}
}
function playerJump(a) {
	if (a.jumpY <= 0) {
		playSound("jump1", a.x, a.y);
		a.jumpDelta = a.jumpStrength;
		a.jumpY = a.jumpDelta;
	}
}
var overlayMaxAlpha = 0.5;
var overlayAlpha = overlayMaxAlpha;
var overlayFadeUp = 0.01;
var overlayFadeDown = 0.04;
var animateOverlay = true;
function drawOverlay(a, b, d) {
	if (animateOverlay) {
		if (b) {
			overlayAlpha += overlayFadeUp;
			if (overlayAlpha >= overlayMaxAlpha) {
				overlayAlpha = overlayMaxAlpha;
			}
		} else if (d) {
			overlayAlpha -= overlayFadeDown;
			if (overlayAlpha <= 0) {
				overlayAlpha = 0;
			}
		} else {
			overlayAlpha = overlayMaxAlpha;
		}
	}
	if (overlayAlpha > 0) {
		a.fillStyle = "#2e3031";
		a.globalAlpha = overlayAlpha;
		a.fillRect(0, 0, maxScreenWidth, maxScreenHeight);
		a.globalAlpha = 1;
	}
}
var drawMiniMapFPS = 4;
var drawMiniMapCounter = 0;
function doGame(delta: number) {
	updateScreenShake(delta);
	if (target != null) {
		startX =
			player.x -
			maxScreenWidth / 2 +
			-screenSkX +
			target.dOffset * Math.cos(target.f + Math.PI);
		startY =
			player.y -
			20 -
			maxScreenHeight / 2 +
			-screenSkY +
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
	if (drawMiniMapCounter <= 0 && gameStart) {
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
	var a = Math.max(
		screenWidth / maxScreenWidth,
		screenHeight / maxScreenHeight,
	);
	mainCanvas.width = screenWidth;
	mainCanvas.height = screenHeight;
	graph.setTransform(
		a,
		0,
		0,
		a,
		(screenWidth - maxScreenWidth * a) / 2,
		(screenHeight - maxScreenHeight * a) / 2,
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
				player.x - startX,
				player.y - startY,
				0,
				player.x - startX,
				player.y - startY,
				maxScreenWidth / 2,
			);
			grd.addColorStop(0, "rgba(0,0,0,0.0)");
			grd.addColorStop(1, "rgba(0,0,0,0.4");
		}
		graph.fillStyle = grd;
		graph.fillRect(0, 0, maxScreenWidth, maxScreenHeight);
	} catch (err) {
		console.error(err);
	}
}

class FlashGlow {
	initScale = 0;
	scale = 0;
	y = 0;
	x = 0;
	active = false;
	maxDuration = 0;
	duration = 0;

	update(a) {
		if (!(this.active && this.maxDuration > 0)) return;
		this.duration += a;
		let tmpScale = Math.max(0, 1 - this.duration / this.maxDuration);
		this.scale = this.initScale * tmpScale;
		if (this.scale < 1) {
			this.active = false;
		}
		if (this.duration >= this.maxDuration) {
			this.active = false;
		}
	}

	draw() {
		if (!this.active) return;
		graph.drawImage(
			lightSprite,
			this.x - startX - this.scale / 2,
			this.y - startY - this.scale / 2,
			this.scale,
			this.scale,
		);
	}
}

var lightX = 0;
var lightY = 0;
var glowIntensity = 0.2;
var flashGlows = [];
var glowIndex = 0;
for (let i = 0; i < 30; ++i) {
	flashGlows.push(new FlashGlow());
}

function createFlash(x: number, y: number, scale: number) {
	glowIndex++;
	if (glowIndex >= flashGlows.length) {
		glowIndex = 0;
	}
	let tmpGlow = flashGlows[glowIndex];
	tmpGlow.x = x;
	tmpGlow.y = y;
	tmpGlow.scale = 0;
	tmpGlow.initScale = scale * 220;
	tmpGlow.duration = 0;
	tmpGlow.maxDuration = 180;
	tmpGlow.active = true;
}
function drawGameLights(delta: number) {
	if (lightSprite != null) {
		graph.globalCompositeOperation = "lighter";
		graph.globalAlpha = 0.2;
		for (let i = 0; i < bullets.length; i++) {
			let tmpObject = bullets[i];
			if (showGlows && tmpObject.spriteIndex !== 2 && tmpObject.active) {
				let tmpBulletGlowWidth =
					tmpObject.glowWidth || Math.min(200, tmpObject.width * 14);
				let tmpBulletGlowHeight =
					tmpObject.glowHeight || tmpObject.height * 2.5;
				lightX = tmpObject.x - startX;
				lightY = tmpObject.y - startY;
				if (canSee(lightX, lightY, tmpBulletGlowWidth, tmpBulletGlowHeight)) {
					graph.save();
					graph.translate(lightX, lightY);
					drawSprite(
						graph,
						lightSprite,
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
			}
		}
		if (showGlows) {
			graph.globalAlpha = 0.2;
			for (let i = 0; i < flashGlows.length; ++i) {
				let tmpObject = flashGlows[i];
				tmpObject.update(delta);
				tmpObject.draw();
			}
		}
		graph.globalCompositeOperation = "source-over";
	}
}
var mapScale = mapCanvas.width;
var pingScale = mapScale / 80;
mapContext.lineWidth = pingScale / 2;
var pingFade = 0.085;
var pingGrow = 0.4;
var cachedMiniMap = null;
function getCachedMiniMap() {
	fillCounter++;
	if (
		cachedMiniMap == null &&
		gameMap !== undefined &&
		gameMap.tiles.length > 0
	) {
		let baseCanvasElem = document.createElement("canvas");
		let baseCtx = baseCanvasElem.getContext("2d");
		baseCanvasElem.width = mapScale;
		baseCanvasElem.height = mapScale;
		baseCtx.fillStyle = "#fff";
		for (let i = 0; i < gameMap.tiles.length; ++i) {
			if (gameMap.tiles[i].wall) {
				baseCtx.fillRect(
					(gameMap.tiles[i].x / gameWidth) * mapScale,
					(gameMap.tiles[i].y / gameHeight) * mapScale,
					((mapTileScale * 1.08) / gameWidth) * mapScale,
					((mapTileScale * 1.08) / gameWidth) * mapScale,
				);
			}
		}
		let finalCanvasElem = document.createElement("canvas");
		let finalCtx = finalCanvasElem.getContext("2d");
		finalCanvasElem.width = mapScale;
		finalCanvasElem.height = mapScale;
		finalCtx.globalAlpha = 0.1;
		finalCtx.drawImage(baseCanvasElem, 0, 0);
		finalCtx.globalAlpha = 1;
		for (let d = 0; d < gameMap.tiles.length; ++d) {
			if (gameMap.tiles[d].hardPoint) {
				finalCtx.fillStyle =
					gameMap.tiles[d].objTeam === player.team ? "#5151d9" : "#d95151";
				finalCtx.fillRect(
					(gameMap.tiles[d].x / gameWidth) * mapScale,
					(gameMap.tiles[d].y / gameHeight) * mapScale,
					((mapTileScale * 1.08) / gameWidth) * mapScale,
					((mapTileScale * 1.08) / gameWidth) * mapScale,
				);
			}
		}
		cachedMiniMap = finalCanvasElem;
	}
	return cachedMiniMap;
}
function drawMiniMap() {
	mapContext.reset(); // I had to add this - the minimap 'caching' system seems weird
	var a = getCachedMiniMap();
	if (a != null) {
		mapContext.drawImage(a, 0, 0, mapScale, mapScale);
	}
	mapContext.globalAlpha = 1;
	for (a = 0; a < gameObjects.length; ++a) {
		if (
			gameObjects[a].type === "player" &&
			gameObjects[a].onScreen &&
			(gameObjects[a].index === player.index ||
				gameObjects[a].team === player.team ||
				gameObjects[a].isBoss)
		) {
			mapContext.fillStyle =
				gameObjects[a].index === player.index
					? "#fff"
					: gameObjects[a].isBoss
						? "#db4fcd"
						: "#5151d9";
			mapContext.beginPath();
			mapContext.arc(
				(gameObjects[a].x / gameWidth) * mapScale,
				(gameObjects[a].y / gameHeight) * mapScale,
				pingScale,
				0,
				Math.PI * 2,
				true,
			);
			mapContext.closePath();
			mapContext.fill();
		}
	}
	if (gameMap != null) {
		mapContext.globalAlpha = 1;
		a = 0;
		for (; a < gameMap.pickups.length; ++a) {
			if (gameMap.pickups[a].active) {
				if (gameMap.pickups[a].type === "lootcrate") {
					mapContext.fillStyle = "#ffd100";
				} else if (gameMap.pickups[a].type === "healthpack") {
					mapContext.fillStyle = "#5ed951";
				}
				mapContext.beginPath();
				mapContext.arc(
					(gameMap.pickups[a].x / gameWidth) * mapScale,
					(gameMap.pickups[a].y / gameHeight) * mapScale,
					pingScale,
					0,
					Math.PI * 2,
					true,
				);
				mapContext.closePath();
				mapContext.fill();
			}
		}
	}
}
function calculateUIScale() {
	uiScale =
		((screenHeight + screenWidth) /
			(originalScreenWidth + originalScreenHeight)) *
		1.25;
}
function drawMenuBackground() {}
function isImageOk(img: HTMLImageElement) {
	if (img.complete && img.naturalWidth !== 0) {
		return true;
	} else {
		return false;
	}
}
function drawUI() {}
var screenSkX = 0;
var screenShackeScale = 0;
var screenSkY = 0;
var screenSkRed = 0.5;
var screenSkDir = 0;
function screenShake(a, b) {
	if (screenShackeScale < a) {
		screenShackeScale = a;
		screenSkDir = b;
	}
}
function updateScreenShake(_) {
	if (screenShackeScale > 0) {
		screenSkX = screenShackeScale * Math.cos(screenSkDir);
		screenSkY = screenShackeScale * Math.sin(screenSkDir);
		screenShackeScale *= screenSkRed;
		if (screenShackeScale <= 0.1) {
			screenShackeScale = 0;
		}
	}
}
var userSprays: Sprite[] = [];
var cachedSprays: SpriteCanvas[] = [];
function createSpray(a, b, d) {
	let tmpPlayer = findUserByIndex(a);
	if (tmpPlayer != null) {
		let tmpSpray = null;
		for (let i = 0; i < userSprays.length; ++i) {
			if (userSprays[i].owner == a) {
				tmpSpray = userSprays[i];
				break;
			}
		}
		if (tmpSpray == null) {
			const img = new Image() as Sprite;
			img.owner = a;
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
		tmpSpray.xPos = b - tmpSpray.scale / 2;
		tmpSpray.yPos = d - tmpSpray.scale / 2;
		if (tmpSpray.src !== tmpPlayer.spray.src) {
			tmpSpray.src = tmpPlayer.spray.src;
		}
	}
}
function sendSpray() {
	socket.emit("crtSpr");
}
function deactivateSprays() {
	for (let i = 0; i < userSprays.length; ++i) {
		userSprays[i].active = false;
	}
}
function cacheSpray(img: Sprite) {
	const tmpIndex = img.src;
	let tmpSpray = cachedSprays[tmpIndex];
	if (tmpSpray === undefined && img.width !== 0) {
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
}
function drawSprays() {
	if (!showSprays) return;
	for (let i = 0; i < userSprays.length; ++i) {
		if (userSprays[i].active) {
			let tmpSpray = cachedSprays[`${userSprays[i].src}`];
			if (tmpSpray != undefined) {
				graph.drawImage(
					tmpSpray,
					userSprays[i].xPos - startX,
					userSprays[i].yPos - startY,
				);
			}
		}
	}
}
var tmpList: Record<
	string,
	{
		loc: string;
		id: string;
		sound: Howl | null;
		loop: boolean;
		onload: () => void;
	}
> = {};
var soundList = [
	{
		loc: "weapons/smg",
		id: "shot0",
		sound: null,
		loop: false,
	},
	{
		loc: "weapons/revolver",
		id: "shot1",
		sound: null,
		loop: false,
	},
	{
		loc: "weapons/sniper",
		id: "shot2",
		sound: null,
		loop: false,
	},
	{
		loc: "weapons/toygun",
		id: "shot3",
		sound: null,
		loop: false,
	},
	{
		loc: "weapons/shotgun",
		id: "shot4",
		sound: null,
		loop: false,
	},
	{
		loc: "weapons/grenades",
		id: "shot5",
		sound: null,
		loop: false,
	},
	{
		loc: "weapons/rockets",
		id: "shot6",
		sound: null,
		loop: false,
	},
	{
		loc: "weapons/pistol",
		id: "shot7",
		sound: null,
		loop: false,
	},
	{
		loc: "weapons/minigun",
		id: "shot8",
		sound: null,
		loop: false,
	},
	{
		loc: "weapons/flamethrower",
		id: "shot9",
		sound: null,
		loop: false,
	},
	{
		loc: "characters/footstep1",
		id: "step1",
		sound: null,
		loop: false,
	},
	{
		loc: "characters/jump1",
		id: "jump1",
		sound: null,
		loop: false,
	},
	{
		loc: "characters/death1",
		id: "death1",
		sound: null,
		loop: false,
	},
	{
		loc: "characters/kill1",
		id: "kill1",
		sound: null,
		loop: false,
	},
	{
		loc: "special/explosion",
		id: "explosion",
		sound: null,
		loop: false,
	},
	{
		loc: "special/score",
		id: "score",
		sound: null,
		loop: false,
	},
	{
		loc: "tracks/track1",
		id: "track1",
		sound: null,
		loop: true,
		onload: () => {
			tmpList.track1.sound.play();
			if (!player.dead || startingGame) {
				tmpList.track1.sound.mute();
			} else {
				currentTrack = 1;
			}
		},
	},
	{
		loc: "tracks/track2",
		id: "track2",
		sound: null,
		loop: true,
		onload: () => {
			tmpList.track2.sound.play();
			if (player.dead || !gameStart || gameOver) {
				tmpList.track2.sound.mute();
			} else {
				currentTrack = 2;
			}
		},
	},
];
var doSounds = false;
function loadSounds(base: string) {
	if (!doSounds) {
		return false;
	}
	tmpList = {};
	for (let i = 0; i < soundList.length; ++i) {
		let tmpSound = localStorage.getItem(`${base + soundList[i].loc}data`);
		let tmpFormat = localStorage.getItem(`${base + soundList[i].loc}format`);
		loadSound(tmpSound, soundList[i], tmpFormat);
	}
}
function loadSound(a, b, d) {
	if (tmpList[b.id] != undefined && tmpList[b.id].sound != null) {
		tmpList[b.id].sound.stop();
	}
	tmpList[b.id] = b;
	tmpList[b.id].sound = new Howl({
		src: [a],
		format: [d],
		loop: b.loop,
		onload: b.onload || (() => {}),
	});
}
var currentTrack = 0;
function startSoundTrack(a) {
	if (!doSounds || tmpList.track1 == undefined || tmpList.track2 == undefined) {
		return false;
	}
	try {
		if (a == 1) {
			if (currentTrack != a) {
				currentTrack = a;
				tmpList.track1.sound.fade(0, 1, 1000);
			}
			tmpList.track2.sound.mute();
		} else {
			if (currentTrack != a) {
				currentTrack = a;
				tmpList.track2.sound.fade(0, 1, 1000);
			}
			tmpList.track1.sound.mute();
		}
	} catch (b) {
		console.log(b);
	}
}
var maxHearDist = 1500;
function playSound(soundId: string, x: number, y: number) {
	if (!kicked && doSounds) {
		try {
			let tmpDist = getDistance(player.x, player.y, x, y);
			if (tmpDist <= maxHearDist) {
				let tmpSoundEntry = tmpList[soundId];
				if (tmpSoundEntry !== undefined) {
					let tmpSound = tmpSoundEntry.sound;
					tmpSound.volume(Math.round((1 - tmpDist / maxHearDist) * 10) / 10);
					tmpSound.play();
				}
			}
		} catch (e) {
			console.log(e);
		}
	}
}
function stopAllSounds() {
	if (!doSounds) {
		return false;
	}
	for (let i = 0; i < soundList.length; ++i) {
		tmpList[soundList[i].id].sound.stop();
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
function flipSprite(
	sprite: Sprite,
	b,
): Sprite {
	let canvasElem = document.createElement("canvas") as any;
	let ctx = canvasElem.getContext("2d");
	canvasElem.width = sprite.width;
	canvasElem.height = sprite.height;
	ctx.imageSmoothingEnabled = false;
	if (b) {
		ctx.scale(-1, 1);
		ctx.drawImage(
			sprite,
			-canvasElem.width,
			0,
			canvasElem.width,
			canvasElem.height,
		);
	} else {
		ctx.scale(1, -1);
		ctx.drawImage(
			sprite,
			0,
			-canvasElem.height,
			canvasElem.width,
			canvasElem.height,
		);
  }
	// TODO
	canvasElem.index = sprite.index;
	canvasElem.flipped = true;
	canvasElem.isLoaded = true;
	return canvasElem;
}
class Projectile {
	width = 0;
	height = 0;
	jumpY = 0;
	yOffset = 0;
	dir = 0;
	cEndX = 0;
	cEndY = 0;
	startX = 0;
	startY = 0;
	y = 0;
	x = 0;
	active = false;
	weaponIndex = 0;
	spriteIndex = 0;
	pierceCount = 0;
	glowHeight = 0;
	glowWidth = 0;
	speed = 0;
	trailWidth = 0;
	trailMaxLength = 0;
	trailAlpha = 0;
	owner: any = null;
	dmg = 0;
	lastHit: number[] = [];
	serverIndex = 0;
	skipMove = true;
	startTime = 0;
	maxLifeTime = 0;
	explodeOnDeath = false;
	updateAccuracy = 3;
	bounce = false;
	dustTimer = 0;
	update(
		delta: number,
		currentTime: number,
		clutter: any,
		tiles: any,
		players: any,
	) {
		if (this.active) {
			let lifetime = currentTime - this.startTime;
			if (this.skipMove) {
				lifetime = 0;
				this.startTime = currentTime;
			}
			for (let g = 0; g < this.updateAccuracy; ++g) {
				let vel = this.speed * delta;
				if (this.active) {
					let changeX = (vel * Math.cos(this.dir)) / this.updateAccuracy;
					let changeY = (vel * Math.sin(this.dir)) / this.updateAccuracy;
					if (this.active && !this.skipMove && this.speed > 0) {
						this.x += changeX;
						this.y += changeY;
						if (
							getDistance(this.startX, this.startY, this.x, this.y) >=
							this.trailMaxLength
						) {
							this.startX += changeX;
							this.startY += changeY;
						}
					}
					this.cEndX =
						this.x +
						((vel + this.height) * Math.cos(this.dir)) / this.updateAccuracy;
					this.cEndY =
						this.y +
						((vel + this.height) * Math.sin(this.dir)) / this.updateAccuracy;
					for (let i = 0; i < clutter.length; ++i) {
						let tmpClutter = clutter[i];
						if (
							this.active &&
							tmpClutter.type === "clutter" &&
							tmpClutter.active &&
							tmpClutter.hc &&
							this.canSeeObject(tmpClutter, tmpClutter.h) &&
							tmpClutter.h * tmpClutter.tp >= this.yOffset &&
							this.lineInRect(
								tmpClutter.x,
								tmpClutter.y - tmpClutter.h,
								tmpClutter.w,
								tmpClutter.h - this.yOffset,
								true,
							)
						) {
							if (this.bounce) {
								this.bounceDir(
									this.cEndY <= tmpClutter.y - tmpClutter.h ||
										this.cEndY >= tmpClutter.y - this.yOffset,
								);
							} else {
								this.active = false;
								this.hitSomething(false, 2);
							}
						}
					}
					if (this.active) {
						for (let i = 0; i < tiles.length; ++i) {
							if (this.active) {
								let tmpTile = tiles[i];
								if (
									tmpTile.wall &&
									tmpTile.hasCollision &&
									this.canSeeObject(tmpTile, tmpTile.scale)
								) {
									if (tmpTile.bottom) {
										if (
											this.lineInRect(
												tmpTile.x,
												tmpTile.y,
												tmpTile.scale,
												tmpTile.scale,
												true,
											)
										) {
											this.active = false;
										}
									} else if (
										this.lineInRect(
											tmpTile.x,
											tmpTile.y,
											tmpTile.scale,
											tmpTile.scale - this.owner.height - this.jumpY,
											true,
										)
									) {
										this.active = false;
									}
									if (!this.active) {
										if (this.bounce) {
											this.bounceDir(
												!(this.cEndX <= tmpTile.x) &&
													!(this.cEndX >= tmpTile.x + tmpTile.scale),
											);
										} else {
											this.hitSomething(
												!(this.cEndX <= tmpTile.x) &&
													!(this.cEndX >= tmpTile.x + tmpTile.scale),
												2,
											);
										}
									}
								}
							}
						}
					}
					if (this.active && this.owner.index == player.index) {
						for (let i = 0; i < players.length; i++) {
							let tmpPlayer = players[i];
							if (
								tmpPlayer.index === this.owner.index ||
								this.lastHit.includes(tmpPlayer.index) ||
								tmpPlayer.team === this.owner.team ||
								tmpPlayer.type !== "player" ||
								!tmpPlayer.onScreen ||
								tmpPlayer.dead
							) {
								continue;
							}
							if (
								this.lineInRect(
									tmpPlayer.x - tmpPlayer.width / 2,
									tmpPlayer.y - tmpPlayer.height - tmpPlayer.jumpY,
									tmpPlayer.width,
									tmpPlayer.height,
									this.pierceCount <= 1,
								) &&
								tmpPlayer.spawnProtection <= 0
							) {
								if (this.explodeOnDeath) {
									this.active = false;
									this.lastHit.push(tmpPlayer.index);
								} else if (this.dmg > 0) {
									this.lastHit.push(tmpPlayer.index);
									if (this.spriteIndex !== 2) {
										particleCone(
											12,
											tmpPlayer.x,
											tmpPlayer.y - tmpPlayer.height / 2 - tmpPlayer.jumpY,
											this.dir + Math.PI,
											Math.PI / randomInt(5, 7),
											0.5,
											16,
											0,
											true,
										);
										createLiquid(tmpPlayer.x, tmpPlayer.y, this.dir, 4);
									}
									if (this.pierceCount > 0) this.pierceCount--;
									if (this.pierceCount <= 0) this.active = false;
								}
							}
							if (!this.active) break;
						}
					}
					if (this.maxLifeTime != null && lifetime >= this.maxLifeTime) {
						this.active = false;
					}
				}
			}
			if (this.spriteIndex === 1) {
				this.dustTimer -= delta;
				if (this.dustTimer <= 0) {
					stillDustParticle(this.x, this.y, true);
					this.dustTimer = 20;
				}
			}
		} else if (!this.active && this.trailAlpha > 0) {
			this.trailAlpha -= delta * 0.001;
			if (this.trailAlpha <= 0) {
				this.trailAlpha = 0;
			}
		}
		this.skipMove = false;
	}
	activate() {
		this.skipMove = true;
		this.lastHit = [];
		this.active = true;
		playSound(`shot${this.weaponIndex}`, this.x, this.y);
	}
	canSeeObject(a: any, b: number) {
		let f = Math.abs(this.cEndX - a.x);
		let h = Math.abs(this.cEndY - a.y);
		return f <= (b + this.height) * 2 && h <= (b + this.height) * 2;
	}
	deactivate() {
		this.active = false;
	}
	hitSomething(a: boolean, b: number) {
		if (this.spriteIndex !== 2) {
			particleCone(
				10,
				this.cEndX,
				this.cEndY,
				this.dir + Math.PI,
				Math.PI / randomInt(5, 7),
				0.5,
				16,
				b,
				a,
			);
		}
	}
	bounceDir(a: boolean) {
		this.dir = a ? Math.PI * 2 - this.dir : Math.PI - this.dir;
		this.active = true;
		this.speed *= 0.65;
		this.x = this.cEndX;
		this.y = this.cEndY;
	}
	lineInRect(a: number, b: number, d: number, e: number, f: boolean) {
		var g = this.x;
		var h = this.y;
		var k = g;
		var l = this.cEndX;
		if (k > l) {
			k = this.cEndX;
			l = g;
		}
		if (l > a + d) {
			l = a + d;
		}
		if (k < a) {
			k = a;
		}
		if (k > l) {
			return false;
		}
		var m = h;
		var p = this.cEndY;
		var q = this.cEndX - g;
		if (Math.abs(q) > 1e-7) {
			p = (this.cEndY - h) / q;
			g = h - p * g;
			m = p * k + g;
			p = p * l + g;
		}
		if (m > p) {
			k = p;
			p = m;
			m = k;
		}
		if (p > b + e) {
			p = b + e;
		}
		if (m < b) {
			m = b;
		}
		if (m > p) {
			return false;
		}
		if (f) {
			this.adjustOnCollision(a, b, d, e);
		}
		return true;
	}
	dotInRect(a: number, b: number, d: number, e: number, f: number, h: number) {
		return a >= d && a <= d + f && b >= e && b <= e + h;
	}
	adjustOnCollision(a: number, b: number, d: number, e: number) {
		let h = this.cEndX,
			g = this.cEndY;
		for (let f = 100; f > 0; ) {
			f--;
			if (this.dotInRect(h, g, a, b, d, e)) {
				f = 0;
			} else {
				h += Math.cos(this.dir + Math.PI) * 2;
				g += Math.sin(this.dir + Math.PI) * 2;
			}
		}
		for (let f = 100; f > 0; ) {
			f--;
			if (this.dotInRect(h, g, a, b, d, e)) {
				h += Math.cos(this.dir + Math.PI) * 2;
				g += Math.sin(this.dir + Math.PI) * 2;
			} else {
				f = 0;
			}
		}
		this.cEndX = h;
		this.cEndY = g;
		this.x = this.cEndX;
		this.y = this.cEndY;
	}
}
function playerSwapWeapon(tmpPlayer: Player, change: number) {
	if (tmpPlayer != null && !tmpPlayer.dead) {
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
}
function playerEquipWeapon(tmpPlayer: Player, weaponId: number) {
	tmpPlayer.currentWeapon = weaponId;
}
var actionBar = document.getElementById("actionBar");
function updateWeaponUI(tmpPlayer: Player, force: boolean) {
	if (weaponSpriteSheet[0] == undefined || tmpPlayer.weapons == undefined) {
		return false;
	}
	if (force) {
		actionBar.innerHTML = "";
	}
	if (actionBar.innerHTML === "") {
		for (let i = 0; i < tmpPlayer.weapons.length; ++i) {
			let actionContainer = document.createElement("div");
			actionContainer.id = `actionContainer${i}`;
			actionContainer.className =
				i === tmpPlayer.currentWeapon
					? "actionContainerActive"
					: "actionContainer";
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
				i === tmpPlayer.currentWeapon
					? "actionContainerActive"
					: "actionContainer";
		}
	}
	updateUiStats(tmpPlayer);
}
function setCooldownAnimation(weaponIdx, time, d) {
	// for some reason, the action cooldown elements sometimes aren't created?
	if (!document.getElementById(`actionCooldown${weaponIdx}`)) {
		updateWeaponUI(player, true);
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
function shootBullet(source) {
	if (
		!source.dead &&
		getCurrentWeapon(source) !== undefined &&
		source.spawnProtection === 0 &&
		getCurrentWeapon(source).weaponIndex >= 0 &&
		getCurrentWeapon(source).reloadTime <= 0 &&
		getCurrentWeapon(source).ammo > 0
	) {
		screenShake(getCurrentWeapon(source).shake, target.f);
		for (let b = 0; b < getCurrentWeapon(source).bulletsPerShot; ++b) {
			getCurrentWeapon(source).spreadIndex++;
			if (
				getCurrentWeapon(source).spreadIndex >=
				getCurrentWeapon(source).spread.length
			) {
				getCurrentWeapon(source).spreadIndex = 0;
			}
			let spread =
				getCurrentWeapon(source).spread[getCurrentWeapon(source).spreadIndex];
			spread = utils.roundNumber(target.f + Math.PI + spread, 2);
			let dist =
				getCurrentWeapon(source).holdDist + getCurrentWeapon(source).bDist;
			let x = Math.round(source.x + dist * Math.cos(spread));
			dist = Math.round(
				source.y -
					getCurrentWeapon(source).yOffset -
					source.jumpY +
					dist * Math.sin(spread),
			);
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
		socket.emit(
			"1",
			source.x,
			source.y,
			source.jumpY,
			target.f,
			target.d,
			currentTime,
		);
		getCurrentWeapon(source).lastShot = currentTime;
		getCurrentWeapon(source).ammo--;
		if (getCurrentWeapon(source).ammo <= 0) {
			playerReload(source, true);
		}
		updateUiStats(source);
	}
}
function playerReload(player, shouldEmit: boolean) {
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
		setCooldownAnimation(
			player.currentWeapon,
			getCurrentWeapon(player).reloadTime,
			true,
		);
	}
}
function findServerBullet(bulletIndex) {
	for (let b = 0; b < bullets.length; ++b) {
		if (bullets[b].serverIndex === bulletIndex) {
			return bullets[b];
		}
	}
}
function someoneShot(a) {
	if (a.i !== player.index) {
		let tmpPlayer = findUserByIndex(a.i);
		if (tmpPlayer != null) {
			shootNextBullet(
				a,
				tmpPlayer,
				target.d,
				currentTime,
				getNextBullet(bullets),
			);
		}
	}
}
var trailGrad = null;
function updateBullets(delta: number) {
	graph.globalAlpha = 1;
	for (let i = 0; i < bullets.length; i++) {
		let bullet = bullets[i];
		bullet.update(delta, currentTime, gameObjects, gameMap.tiles, gameObjects);
		if (bullet.active) {
			let b = bullet.x - startX;
			let d = bullet.y - startY;
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
		if (showBTrails && bullet.trailAlpha > 0) {
			graph.save();
			let b = Math.round(bullet.startX - startX);
			let d = Math.round(bullet.startY - startY);
			let e = Math.round(bullet.x - startX);
			let f = Math.round(bullet.y - startY);
			trailGrad = graph.createLinearGradient(b, d, e, f);
			trailGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
			trailGrad.addColorStop(1, `rgba(255, 255, 255, ${bullet.trailAlpha})`);
			graph.strokeStyle = trailGrad;
			graph.lineWidth = bullet.trailWidth;
			graph.beginPath();
			graph.moveTo(b, d);
			graph.lineTo(e, f);
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
	let res = "";
	for (let i = 0; i < characterClasses.length; ++i) {
		res +=
			"<div class='hatSelectItem' id='classItem" +
			i +
			"' onclick='pickedCharacter(" +
			i +
			");'>" +
			characterClasses[i].classN +
			"</div>";
	}
	classList.innerHTML = res;
}
createClassList();
function showClassselector() {
	charSelectorCont.style.display = "none";
	lobbySelectorCont.style.display = "none";
	classSelector.style.display = "block";
}
window.showClassselector = showClassselector;
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
	currentClass.innerHTML = document.getElementById(
		`classItem${classId}`,
	).innerHTML;
	currentClass.style.color = document.getElementById(
		`classItem${classId}`,
	).style.color;
	characterWepnDisplay.innerHTML =
		"<b>Primary:</b><div class='hatSelectItem' style='display:inline-block'>" +
		characterClasses[classId].pWeapon +
		"</div>";
	characterWepnDisplay2.innerHTML =
		"<b>Secondary:</b><div class='hatSelectItem' style='display:inline-block'>" +
		characterClasses[classId].sWeapon +
		"</div>";
	localStorage.setItem("previousClass", classId.toString());
	if (loggedIn) {
		for (let i = 0; i < characterClasses[classId].weaponIndexes.length; ++i) {
			let skinPref = localStorage.getItem(
				`wpnSkn${characterClasses[classId].weaponIndexes[i]}`,
			);
			if (skinPref != "") {
				changeCamo(
					characterClasses[classId].weaponIndexes[i],
					parseInt(skinPref),
					false,
				);
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
window.pickedCharacter = pickedCharacter;
var camoDataList = null;
var maxCamos = 0;
var camoList = document.getElementById("camoList");
function showWeaponSelector(a) {
	charSelectorCont.style.display = "none";
	lobbySelectorCont.style.display = "none";
	classSelector.style.display = "none";
	camoSelector.style.display = "block";
	a = characterClasses[currentClassID].weaponIndexes[a];
	var b =
		"<div class='hatSelectItem' onclick='changeCamo(" +
		a +
		",0,true);'>Default</div>";
	if (loggedIn && camoDataList != null && camoDataList[a] != undefined) {
		for (let i = 0; i < camoDataList[a].length; ++i) {
			let camo = camoDataList[a][i];
			b +=
				"<div class='hatSelectItem' style='color:" +
				getItemRarityColor(camo.chance) +
				"' onclick='changeCamo(" +
				a +
				"," +
				camo.id +
				",true);'>" +
				camo.name +
				" x" +
				(parseInt(camo.count) + 1) +
				"</div>";
		}
		document.getElementById("camoHeaderAmount").innerHTML =
			"SELECT CAMO (" +
			(camoDataList[a].length + 1) +
			"/" +
			(maxCamos + 1) +
			")";
	} else {
		document.getElementById("camoHeaderAmount").innerHTML = "SELECT CAMO";
	}
	camoList.innerHTML = b;
}
window.showWeaponSelector = showWeaponSelector;
function getCamoURL(a) {
	return `.././images/camos/${a + 1}.png`;
}
function changeCamo(a, b, d) {
	if (socket) {
		socket.emit("cCamo", {
			weaponID: a,
			camoID: b,
		});
		if (d) {
			localStorage.setItem(`wpnSkn${a}`, b);
			charSelectorCont.style.display = "block";
			lobbySelectorCont.style.display = "block";
			camoSelector.style.display = "none";
			shirtSelector.style.display = "none";
			classSelector.style.display = "none";
			hatSelector.style.display = "none";
			lobbySelector.style.display = "none";
			lobbyCSelector.style.display = "none";
		}
	}
}
window.changeCamo = changeCamo;
function updateCamosList(a, b) {
	camoDataList = b;
	maxCamos = a;
}
window.updateCamosList = updateCamosList;
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
	for (let i = 0; i < classes.length; ++i) {
		let upSprites: Sprite[] = [];
		let downSprites: Sprite[] = [];
		let leftSprites: Sprite[] = [];
		let rightSprites: Sprite[] = [];
		upSprites.push(getSprite(`${base}characters/${classes[i].folderName}/up`));
		downSprites.push(
			getSprite(`${base}characters/${classes[i].folderName}/down`),
		);
		leftSprites.push(
			getSprite(`${base}characters/${classes[i].folderName}/left`),
		);
		rightSprites.push(
			getSprite(`${base}characters/${classes[i].folderName}/left`),
		);
		for (let j = 0; j < animLength; ++j) {
			let tmpIndex = j;
			upSprites.push(
				getSprite(
					`${base}characters/${classes[i].folderName}/up${tmpIndex + 1}`,
				),
			);
			let tmpSprite = classes[i].hasDown
				? getSprite(
						`${base}characters/${classes[i].folderName}/down${tmpIndex + 1}`,
					)
				: getSprite(
						`${base}characters/${classes[i].folderName}/up${tmpIndex + 1}`,
					);
			downSprites.push(tmpSprite);
			if (tmpIndex >= 2) {
				tmpIndex = 0;
			}
			leftSprites.push(
				getSprite(
					`${base}characters/${classes[i].folderName}/left${tmpIndex + 1}`,
				),
			);
			rightSprites.push(
				getSprite(
					`${base}characters/${classes[i].folderName}/left${tmpIndex + 1}`,
				),
			);
		}
		classSpriteSheets.push({
			upSprites,
			downSprites,
			leftSprites,
			rightSprites,
			arm: getSprite(`${base}characters/${classes[i].folderName}/arm`),
			hD: getSprite(`${base}characters/${classes[i].folderName}/hd`),
			hU: getSprite(`${base}characters/${classes[i].folderName}/hu`),
			hL: getSprite(`${base}characters/${classes[i].folderName}/hl`),
			hR: getSprite(`${base}characters/${classes[i].folderName}/hl`),
		});
	}
}
var flagSprites: Sprite[] = [];
var clutterSprites: Sprite[] = [];
var cachedWalls: Record<string, SpriteCanvas> = {};
var floorSprites: Sprite[] = [];
var cachedFloors: Record<string, SpriteCanvas> = {};
var sideWalkSprite = null;
var lightSprite = null;
var ambientSprites: Sprite[] = [];
var wallSpritesSeg: Sprite[] = [];
var particleSprites: Sprite[] = [];
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
var wallSprite = null;
var darkFillerSprite = null;
var healthPackSprite = null;
var lootCrateSprite = null;
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
	particleSprites = [];
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
	lightSprite = getSprite(`${base}lighting`);
	floorSprites.push(getSprite(`${base}ground1`));
	floorSprites.push(getSprite(`${base}ground2`));
	floorSprites.push(getSprite(`${base}ground3`));
	sideWalkSprite = getSprite(`${base}sidewalk1`);
	wallSpritesSeg.push(getSprite(`${base}wallSegment1`));
	wallSpritesSeg.push(getSprite(`${base}wallSegment2`));
	wallSpritesSeg.push(getSprite(`${base}wallSegment3`));
	particleSprites.push(getSprite(`${base}particles/blood/blood`));
	particleSprites.push(getSprite(`${base}particles/oil/oil`));
	particleSprites.push(getSprite(`${base}particles/wall`));
	particleSprites.push(getSprite(`${base}particles/hole`));
	particleSprites.push(getSprite(`${base}particles/blood/splatter1`));
	particleSprites.push(getSprite(`${base}particles/blood/splatter2`));
	particleSprites.push(getSprite(`${base}particles/explosion`));
	healthPackSprite = getSprite(`${base}healthpack`);
	lootCrateSprite = getSprite(`${base}lootCrate1`);
	weaponSpriteSheet = [];
	for (let i = 0; i < weaponNames.length; ++i) {
		weaponSpriteSheet.push({
			upSprite: getSprite(`${base}weapons/${weaponNames[i]}/up`),
			downSprite: getSprite(`${base}weapons/${weaponNames[i]}/up`),
			leftSprite: getSprite(`${base}weapons/${weaponNames[i]}/left`),
			rightSprite: getSprite(`${base}weapons/${weaponNames[i]}/left`),
			icon: getSprite(`${base}weapons/${weaponNames[i]}/icon`),
		});
	}
	bulletSprites.push(getSprite(`${base}weapons/bullet`));
	bulletSprites.push(getSprite(`${base}weapons/grenade`));
	bulletSprites.push(getSprite(`${base}weapons/flame`));
	resize();
}
var mainTitleText = document.getElementById("mainTitleText");
function updateMenuInfo(a) {
	mainTitleText.innerHTML = a;
}
function isURL(str: string) {
	return str.indexOf(".") > 0;
}
var linkedMod = location.hash.replace("#", "");
loadModPack(linkedMod, linkedMod == "");
var loadingTexturePack = false;
var modInfo = document.getElementById("modInfo");
function setModInfoText(a) {
	if (modInfo != undefined) {
		modInfo.innerHTML = a;
	}
}
var fileFormat = "";
window.loadModPack = loadModPack;
function loadModPack(url: string, isBaseAssets: boolean) {
	try {
		if (loadingTexturePack) return;
		function d() {
			this.numFiles;
			this.progress;
			this.reader;
			this.init = (reader: ZipReader<unknown>, numFiles: number) => {
				this.numFiles = numFiles;
				this.progress = 0;
				this.reader = reader;
			};
			this.close = () => {
				if (this.reader) {
					this.progress++;
					if (this.numFiles === this.progress) {
						spriteIndex = 0;
						loadPlayerSprites("sprites/");
						loadDefaultSprites("sprites/");
						loadSounds("sounds/");
						this.reader.close();
						this.reader = undefined;
						loadingTexturePack = false;
					}
				} else {
					console.log("reader not valid");
				}
			};
		}
		function e(a) {
			this.typeName = a;
			this.process = (a) => {
				try {
					if (this.typeName.indexOf("modinfo") > -1) {
						setModInfoText(a);
					} else if (this.typeName.indexOf("cssmod") > -1) {
						let d = document.createElement("style");
						d.type = "text/css";
						d.innerHTML = a;
						document.getElementsByTagName("head")[0].appendChild(d);
					} else if (this.typeName.indexOf("gameinfo") > -1) {
						let e = a.replace(/(\r\n|\n|\r)/gm, "");
						let f = JSON.parse(e);
						updateMenuInfo(f.name);
					} else if (this.typeName.indexOf("charinfo") > -1) {
						let h = a.replace(/(\r\n|\n|\r)/gm, "").split("|");
						let tmp = [];
						for (a = 0; a < h.length; ++a) {
							tmp.push(JSON.parse(h[a]));
						}
						setCharacterClasses(tmp);
						createClassList();
						pickedCharacter(currentClassID);
					}
				} catch (err) {
					console.error(`Script Read Error: ${err}`);
				}
				zipFileCloser.close();
			};
		}
		function f(a, b) {
			this.filename = a;
			this.soundAsDataURL = this.tmpLocation = "";
			this.format = b;
			this.process = (a) => {
				this.soundAsDataURL = URL.createObjectURL(a);
				if (this.soundAsDataURL) {
					try {
						this.tmpLocation = this.filename;
						localStorage.setItem(
							`${this.tmpLocation}data`,
							this.soundAsDataURL,
						);
						localStorage.setItem(`${this.tmpLocation}format`, this.format);
					} catch (err) {
						console.error(`Storage failed: ${err}`);
					}
					zipFileCloser.close();
				} else {
					console.error(`failed to generate url: ${this.filename}`);
				}
			};
		}
		function h(a) {
			this.filename = a;
			this.imgAsDataURL = this.tmpLocation = "";
			this.process = (a) => {
				this.imgAsDataURL = URL.createObjectURL(a);
				if (this.imgAsDataURL) {
					try {
						this.tmpLocation = this.filename;
						localStorage.setItem(this.tmpLocation, this.imgAsDataURL);
					} catch (err) {
						console.error(`Storage failed: ${err}`);
					}
					zipFileCloser.close();
				} else {
					console.error(`failed to generate url: ${this.filename}`);
				}
			};
		}
		let modPath = "";
		if (isBaseAssets) {
			doSounds = false;
			modPath = "/res.zip";
		} else {
			if (url === "") {
				setModInfoText("Please enter a mod Key/URL");
				return false;
			}
			loadingTexturePack = doSounds = true;
			if (isURL(url)) {
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
		zipFileCloser ||= new d();
		const reader = new zip.ZipReader(new zip.HttpReader(modPath));
		reader.getEntries().then((entries) => {
			let b = entries;
			if (!b.length) return;
			zipFileCloser.init(reader, b.length);
			for (let i = 0; i < b.length; i++) {
				let tmpFile = b[i];
				if (tmpFile.directory) {
					zipFileCloser.close();
				} else {
					tmpFile.filename = tmpFile.filename.replace("vertixmod/", "");
					fileFormat =
						tmpFile.filename.split(".")[tmpFile.filename.split(".").length - 1];
					let basePath = tmpFile.filename.split("/")[0];
					if (basePath === "scripts") {
						let processor = new e(tmpFile.filename);
						(tmpFile as any)
							.getData(new zip.TextWriter())
							.then((a) => {
								processor.process(a);
							})
							.catch((err) => {
								console.error(`Script Read Error: ${err}`);
							});
					} else if (basePath === "sprites") {
						let processor = new h(tmpFile.filename);
						(tmpFile as any)
							.getData(new zip.BlobWriter("image/png"))
							.then((a) => {
								processor.process(a);
							})
							.catch((err) => {
								console.error(`Image Load Error: ${err}`);
							});
					} else if (basePath === "sounds") {
						let processor = new f(
							tmpFile.filename.replace(`.${fileFormat}`, ""),
							fileFormat,
						);
						(tmpFile as any)
							.getData(new zip.BlobWriter(`audio/${fileFormat}`))
							.then((a) => {
								processor.process(a);
							})
							.catch((err) => {
								console.error(`Sound Load Error: ${err}`);
							});
					} else {
						loadingTexturePack = false;
						setModInfoText("Mod could not be loaded");
					}
				}
			}
		});
	} catch (err) {
		console.error(err);
		loadingTexturePack = false;
		setModInfoText("Mod could not be loaded");
	}
}
function getPlayerSprite(classIdx: number, angle: number, animIdx: number) {
	let tmpSprite: Sprite;
	let tmpSpriteCollection = classSpriteSheets[classIdx];
	if (!tmpSpriteCollection) {
		return null;
	}
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
				hat.lS.src = `.././images/hats/${tmpAcc.hat.id}/l.png`;
				hat.lS.onload = () => {
					hat.imgToLoad--;
					hat.lS.isLoaded = true;
					hat.lS.onload = null;
				};
				hat.imgToLoad++;
				hat.rS.index = spriteIndex;
				spriteIndex++;
				hat.rS.src = `.././images/hats/${tmpAcc.hat.id}/l.png`;
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
				hat.uS.src = `.././images/hats/${tmpAcc.hat.id}/u.png`;
				hat.uS.onload = () => {
					hat.imgToLoad--;
					hat.uS.isLoaded = true;
					hat.uS.onload = null;
				};
			}
			hat.imgToLoad++;
			hat.dS.index = spriteIndex;
			spriteIndex++;
			hat.dS.src = `.././images/hats/${tmpAcc.hat.id}/d.png`;
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
			d.lS.src = `.././images/shirts/${tmpAcc.shirt.id}/l.png`;
			d.lS.onload = () => {
				d.imgToLoad--;
				d.lS.isLoaded = true;
				d.lS.onload = null;
			};
			d.imgToLoad++;
			d.rS = new Image() as Sprite;
			d.rS.index = spriteIndex;
			spriteIndex++;
			d.rS.src = `.././images/shirts/${tmpAcc.shirt.id}/l.png`;
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
			d.uS.src = `.././images/shirts/${tmpAcc.shirt.id}/u.png`;
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
		d.dS.src = `.././images/shirts/${tmpAcc.shirt.id}/d.png`;
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
				ctx.drawImage(
					img.flip ? flipSprite(img, true) : img,
					0,
					0,
					img.width,
					img.height,
				);
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
	for (let i = 0; i < gameObjects.length; i++) {
		let tmpObject = gameObjects[i];
		if (tmpObject.type === "player") {
			if (
				!tmpObject.dead &&
				(tmpObject.index === player.index || tmpObject.onScreen)
			) {
				if (tmpObject.jumpY === undefined) {
					tmpObject.jumpY = 0;
				}
				playerContext.clearRect(0, 0, playerCanvas.width, playerCanvas.height);
				playerContext.save();
				playerContext.globalAlpha = 0.9;
				playerContext.translate(
					playerCanvas.width / 2,
					playerCanvas.height / 2,
				);
				let m = (Math.PI / 180) * tmpObject.angle;
				let k = Math.round((tmpObject.angle % 360) / 90) * 90;
				let h = tmpObject.x - startX;
				let g = tmpObject.y - tmpObject.jumpY - startY;
				if (tmpObject.animIndex === 1) {
					g -= 3;
				}
				if (tmpObject.weapons.length > 0) {
					e = getWeaponSprite(
						getCurrentWeapon(tmpObject).weaponIndex,
						getCurrentWeapon(tmpObject).camo,
						k,
					);
					f = classSpriteSheets[tmpObject.classIndex];
					if (f != undefined) {
						f = f.arm;
					}
					if (!getCurrentWeapon(tmpObject).front && e != undefined) {
						playerContext.save();
						playerContext.translate(0, -getCurrentWeapon(tmpObject).yOffset);
						playerContext.rotate(m);
						playerContext.translate(0, getCurrentWeapon(tmpObject).holdDist);
						drawSprite(
							playerContext,
							e,
							-(getCurrentWeapon(tmpObject).width / 2),
							0,
							getCurrentWeapon(tmpObject).width,
							getCurrentWeapon(tmpObject).length,
							0,
							false,
							0,
							0,
							0,
						);
						playerContext.translate(
							0,
							-getCurrentWeapon(tmpObject).holdDist + 6,
						);
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
				d = getPlayerSprite(tmpObject.classIndex, k, tmpObject.animIndex + 1);
				if (d != null) {
					drawSprite(
						playerContext,
						d,
						-(tmpObject.width / 2),
						-(tmpObject.height * 0.318),
						tmpObject.width,
						tmpObject.height * 0.318,
						0,
						true,
						tmpObject.jumpY * 1.5,
						0.5,
						0,
					);
				}
				d = getPlayerSprite(tmpObject.classIndex, k, 0);
				if (d != null) {
					drawSprite(
						playerContext,
						d,
						-(tmpObject.width / 2),
						-tmpObject.height,
						tmpObject.width,
						tmpObject.height * 0.6819999999999999,
						0,
						true,
						tmpObject.jumpY * 1.5 + tmpObject.height * 0.477,
						0.5,
						0,
					);
				}
				d = getShirtSprite(tmpObject, k);
				if (d != null) {
					playerContext.globalAlpha = 0.9;
					drawSprite(
						playerContext,
						d,
						-(tmpObject.width / 2),
						-tmpObject.height,
						tmpObject.width,
						tmpObject.height * 0.6819999999999999,
						0,
						true,
						tmpObject.jumpY * 1.5 + tmpObject.height * 0.477,
						0.5,
						0,
					);
					playerContext.globalAlpha = 1;
				}
				let p = tmpObject.width * 0.833;
				d = getHatSprite(tmpObject, k);
				if (d != null) {
					drawSprite(
						playerContext,
						d,
						-(p / 2),
						-(tmpObject.height + p * 0.045),
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
				if (tmpObject.weapons.length > 0) {
					playerContext.globalAlpha = 0.9;
					if (getCurrentWeapon(tmpObject).front && e != undefined) {
						playerContext.save();
						playerContext.translate(0, -getCurrentWeapon(tmpObject).yOffset);
						playerContext.rotate(m);
						playerContext.translate(0, getCurrentWeapon(tmpObject).holdDist);
						drawSprite(
							playerContext,
							e,
							-(getCurrentWeapon(tmpObject).width / 2),
							0,
							getCurrentWeapon(tmpObject).width,
							getCurrentWeapon(tmpObject).length,
							0,
							false,
							0,
							0,
							0,
						);
						playerContext.translate(
							0,
							-getCurrentWeapon(tmpObject).holdDist + 10,
						);
						if (f != undefined && f != null) {
							if (k == 270) {
								playerContext.restore();
								playerContext.save();
								playerContext.translate(
									-4,
									-getCurrentWeapon(tmpObject).yOffset + 8,
								);
								playerContext.rotate(m);
								drawSprite(playerContext, f, 0, 0, 8, 32, 0, false, 0, 0, 0);
							} else if (k == 90) {
								playerContext.restore();
								playerContext.save();
								playerContext.translate(
									0,
									-getCurrentWeapon(tmpObject).yOffset,
								);
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
				if (tmpObject.spawnProtection > 0) {
					playerContext.globalCompositeOperation = "source-atop";
					playerContext.fillStyle =
						tmpObject.team != player.team
							? "rgba(255,179,179,0.5)"
							: "rgba(179,231,255,0.5)";
					playerContext.fillRect(
						-playerCanvas.width / 2,
						-playerCanvas.height / 2,
						playerCanvas.width,
						playerCanvas.height,
					);
					playerContext.globalCompositeOperation = "source-over";
				}
				if (tmpObject.hitFlash != undefined && tmpObject.hitFlash > 0) {
					playerContext.globalCompositeOperation = "source-atop";
					playerContext.fillStyle = `rgba(255, 255, 255, ${tmpObject.hitFlash})`;
					playerContext.fillRect(
						-playerCanvas.width / 2,
						-playerCanvas.height / 2,
						playerCanvas.width,
						playerCanvas.height,
					);
					playerContext.globalCompositeOperation = "source-over";
					tmpObject.hitFlash -= delta * 0.01;
					if (tmpObject.hitFlash < 0) {
						tmpObject.hitFlash = 0;
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
		} else if (tmpObject.type === "flag") {
			tmpObject.ac--;
			if (tmpObject.ac <= 0) {
				tmpObject.ac = 5;
				tmpObject.ai++;
				if (tmpObject.ai > 2) {
					tmpObject.ai = 0;
				}
			}
			drawSprite(
				graph,
				flagSprites[tmpObject.ai + (tmpObject.team == player.team ? 0 : 3)],
				tmpObject.x - tmpObject.w / 2 - startX,
				tmpObject.y - tmpObject.h - startY,
				tmpObject.w,
				tmpObject.h,
				0,
				true,
				0,
				0.5,
				0,
			);
		} else if (
			tmpObject.type === "clutter" &&
			tmpObject.active &&
			canSee(
				tmpObject.x - startX,
				tmpObject.y - startY,
				tmpObject.w,
				tmpObject.h,
			)
		) {
			drawSprite(
				graph,
				clutterSprites[tmpObject.i],
				tmpObject.x - startX,
				tmpObject.y - tmpObject.h - startY,
				tmpObject.w,
				tmpObject.h,
				0,
				tmpObject.s,
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
	graph.lineWidth = playerConfig.textBorderSize;
	graph.fillStyle = playerConfig.textColor;
	graph.miterLimit = 1;
	graph.lineJoin = "round";
	graph.globalAlpha = 1;
	for (let i = 0; i < gameObjects.length; i++) {
		let tmpObject = gameObjects[i];
		if (
			tmpObject.type !== "player" ||
			tmpObject.dead ||
			(tmpObject.index !== player.index && !tmpObject.onScreen)
		)
			continue;

		let d = tmpObject.height / 3.2;
		let e = Math.min(200, (tmpObject.maxHealth / 100) * 100);
		let shapeX = tmpObject.x - startX;
		let shapeY = tmpObject.y - tmpObject.jumpY - tmpObject.nameYOffset - startY;
		if (tmpObject.account !== undefined && tmpObject.account.hat != null) {
			shapeY -= tmpObject.account.hat.nameY;
		}
		let playerName = tmpObject.name;
		let rankText = tmpObject.loggedIn ? tmpObject.account.rank : "";
		// h = graph.measureText(playerName);
		let nameColor = tmpObject.team !== player.team ? "#d95151" : "#5151d9";
		if (showNames) {
			let renderedName = renderShadedAnimText(
				playerName,
				d * textSizeMult,
				"#ffffff",
				5,
				"",
			);
			if (renderedName != undefined) {
				graph.drawImage(
					renderedName,
					shapeX - renderedName.width / 2,
					shapeY - tmpObject.height * 1.4 - renderedName.height / 2,
					renderedName.width,
					renderedName.height,
				);
			}
			if (rankText != "") {
				let renderedRank = renderShadedAnimText(
					rankText,
					d * 1.6 * textSizeMult,
					"#ffffff",
					6,
					"",
				);
				if (renderedRank != undefined) {
					graph.drawImage(
						renderedRank,
						shapeX -
							renderedName.width / 2 -
							renderedRank.width -
							textSizeMult * 5,
						shapeY -
							tmpObject.height * 1.4 -
							(renderedRank.height - renderedName.height / 2),
						renderedRank.width,
						renderedRank.height,
					);
				}
			}
			if (tmpObject.account?.clan != "") {
				let renderedClan = renderShadedAnimText(
					` [${tmpObject.account?.clan}]`,
					d * textSizeMult,
					nameColor,
					5,
					"",
				);
				if (renderedClan != undefined) {
					graph.drawImage(
						renderedClan,
						shapeX + renderedName.width / 2,
						shapeY - tmpObject.height * 1.4 - renderedName.height / 2,
						renderedClan.width,
						renderedName.height,
					);
				}
			}
		}
		graph.fillStyle = nameColor;
		graph.fillRect(
			shapeX - (e / 2) * (tmpObject.health / tmpObject.maxHealth),
			shapeY - tmpObject.height * 1.16,
			(tmpObject.health / tmpObject.maxHealth) * e,
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
		maxScreenWidth,
		maxScreenHeight,
		0,
		false,
		0,
		0,
		0,
	);
}
function getCachedWall(tile) {
	let cacheKey = `${tile.left}${tile.right}${tile.top}${tile.bottom}${tile.topLeft}${tile.topRight}${tile.bottomLeft}${tile.bottomRight}${tile.edgeTile}${tile.hasCollision}`;

	if (cachedWalls[cacheKey] === undefined && wallSprite?.isLoaded) {
		let canvasElem = document.createElement("canvas");
		let ctx = canvasElem.getContext("2d");
		ctx.imageSmoothingEnabled = false;
		canvasElem.width = tile.scale;
		canvasElem.height = tile.scale;
		ctx.drawImage(wallSprite, 0, 0, tile.scale, tile.scale);
		drawSprite(
			ctx,
			darkFillerSprite,
			12,
			12,
			tile.scale - 24,
			tile.scale - 24,
			0,
			false,
			0,
			0,
			0,
		);
		if (tile.left === 1) {
			drawSprite(
				ctx,
				darkFillerSprite,
				0,
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
			drawSprite(
				ctx,
				darkFillerSprite,
				12,
				0,
				tile.scale - 24,
				12,
				0,
				false,
				0,
				0,
				0,
			);
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
		if (
			!tile.hasCollision ||
			(tile.topLeft === 1 && tile.top === 1 && tile.left === 1)
		) {
			drawSprite(ctx, darkFillerSprite, 0, 0, 12, 12, 0, false, 0, 0, 0);
		}
		if (
			!tile.hasCollision ||
			(tile.topRight === 1 && tile.top === 1 && tile.right === 1)
		) {
			drawSprite(
				ctx,
				darkFillerSprite,
				tile.scale - 12,
				0,
				12,
				12,
				0,
				false,
				0,
				0,
				0,
			);
		}
		if (
			!tile.hasCollision ||
			(tile.bottomLeft === 1 && tile.bottom === 1 && tile.left === 1)
		) {
			drawSprite(
				ctx,
				darkFillerSprite,
				0,
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
		if (
			!tile.hasCollision ||
			(tile.bottomRight === 1 && tile.bottom === 1 && tile.right === 1)
		) {
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
function getCachedFloor(tile) {
	let tmpIndex = `${tile.spriteIndex}${tile.left}${tile.right}${tile.top}${tile.bottom}${tile.topLeft}${tile.topRight}`;
	if (
		cachedFloors[tmpIndex] === undefined &&
		sideWalkSprite != null &&
		sideWalkSprite.isLoaded
	) {
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
				renderSideWalks(
					ctx,
					tilesPerFloorTile - 2,
					s,
					Math.PI,
					tile.scale - s,
					s * 2,
					0,
					s,
				);
			} else {
				renderSideWalks(
					ctx,
					tilesPerFloorTile,
					s,
					Math.PI,
					tile.scale - s,
					0,
					0,
					s,
				);
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
function renderSideWalks(ctx: CanvasRenderingContext2D, b, d, e, f, h, g, l) {
	for (let i = 0; i < b; ++i) {
		ctx.drawImage(sideWalkSprite, f, h, d, d);
		if (e != null) {
			ctx.save();
			ctx.translate(f + d / 2, h + d / 2);
			ctx.rotate(e);
			ctx.drawImage(ambientSprites[0], -(d / 2), -(d / 2), d, d);
			ctx.restore();
		}
		f += g;
		h += l;
	}
}
function drawMap(layer: number) {
	if (gameMap != null) {
		for (let i = 0; i < gameMap.tiles.length; ++i) {
			let tile = gameMap.tiles[i];
			if (layer === 0) {
				if (
					!tile.wall &&
					canSee(tile.x - startX, tile.y - startY, mapTileScale, mapTileScale)
				) {
					let tmpTlSprite = getCachedFloor(tile);
					if (tmpTlSprite !== undefined) {
						drawSprite(
							graph,
							tmpTlSprite,
							tile.x - startX,
							tile.y - startY,
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
						tile.x - startX,
						tile.y - startY + mapTileScale * 0.5,
						mapTileScale,
						mapTileScale * 0.75,
					)
				) {
					drawSprite(
						graph,
						wallSpritesSeg[tile.spriteIndex],
						tile.x - startX,
						tile.y + Math.round(mapTileScale / 2) - startY,
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
					tile.x - startX,
					tile.y - startY - mapTileScale * 0.5,
					mapTileScale,
					mapTileScale,
				)
			) {
				let tmpTlSprite = getCachedWall(tile);
				if (tmpTlSprite !== undefined) {
					drawSprite(
						graph,
						tmpTlSprite,
						tile.x - startX,
						Math.round(tile.y - mapTileScale / 2 - startY),
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
			for (let i = 0; i < gameMap.pickups.length; ++i) {
				let tmpPickup = gameMap.pickups[i];
				if (
					tmpPickup.active &&
					canSee(tmpPickup.x - startX, tmpPickup.y - startY, 0, 0)
				) {
					if (tmpPickup.type === "healthpack") {
						drawSprite(
							graph,
							healthPackSprite,
							tmpPickup.x - tmpPickup.scale / 2 - startX,
							tmpPickup.y - tmpPickup.scale / 2 - startY,
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
							tmpPickup.x - tmpPickup.scale / 2 - startX,
							tmpPickup.y - tmpPickup.scale / 2 - startY,
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
	m,
	k,
	hOff: number,
) {
	if (sprite != null && sprite !== undefined && sprite.width > 0) {
		dx = Math.floor(dx);
		dy = Math.floor(dy);
		dw = Math.floor(dw);
		dh = Math.floor(dh);
		m = Math.floor(m);
		ctx.rotate(angle);
		ctx.drawImage(sprite, dx, dy, dw, dh);
		if (hasShadows && showShadows) {
			ctx.globalAlpha = 1;
			ctx.translate(0, m);
			let tmpShadow = getCachedShadow(sprite, dw, dh + hOff, k);
			if (tmpShadow) {
				ctx.drawImage(tmpShadow, dx, dy + dh);
			}
			ctx.rotate(-angle);
			ctx.translate(0, -m);
		}
	}
}
var shadowIntensity = 0.16;
function getCachedShadow(
	sprite: Sprite | SpriteCanvas,
	width: number,
	height: number,
	e,
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
		ctx.globalAlpha = e === 0.5 ? shadowIntensity : shadowIntensity * 0.75;
		ctx.scale(1, -e);
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
function canSee(a, b, d, e) {
	return a + d > 0 && b + e > 0 && a < maxScreenWidth && b < maxScreenHeight;
}
class AnimText {
	text = "";
	scaleSpeed = 0;
	minScale = 0;
	maxScale = 0;
	fontSize = 0;
	scale = 0;
	ySpeed = 0;
	xSpeed = 0;
	y = 0;
	x = 0;
	active = false;
	alpha = 1;
	fadeSpeed = 0;
	useStart = false;
	moveDelay = 0;
	fadeDelay = 0;
	removable = false;
	textType = "";
	color = "#fff";
	cachedImage: HTMLCanvasElement | null = null;

	update(a) {
		if (!this.active) return;
		this.scale += this.scaleSpeed * a;
		if (this.scaleSpeed > 0) {
			if (this.scale >= this.maxScale) {
				this.scale = this.maxScale;
				this.scaleSpeed *= -1;
			}
		} else if (this.scale < this.minScale) {
			this.scale = this.minScale;
			this.scaleSpeed = 0;
		}
		if (this.moveDelay > 0) {
			this.moveDelay -= a;
		} else {
			this.x += this.xSpeed * a;
			this.y += this.ySpeed * a;
		}
		if (this.fadeDelay > 0) {
			this.fadeDelay -= a;
		} else {
			this.alpha -= this.fadeSpeed * a;
			if (this.alpha <= 0) {
				this.alpha = 0;
				this.active = false;
			}
		}
	}

	draw() {
		if (!this.active || !this.cachedImage) return;
		graph.globalAlpha = this.alpha;
		if (this.useStart) {
			graph.drawImage(
				this.cachedImage,
				this.x - startX - (this.cachedImage.width / 2) * this.scale,
				this.y - startY - (this.cachedImage.height / 2) * this.scale,
				this.cachedImage.width * this.scale,
				this.cachedImage.height * this.scale,
			);
		} else {
			graph.drawImage(
				this.cachedImage,
				this.x - (this.cachedImage.width / 2) * this.scale,
				this.y - (this.cachedImage.height / 2) * this.scale,
				this.cachedImage.width * this.scale,
				this.cachedImage.height * this.scale,
			);
		}
	}
}
var notificationsSize = textSizeMult * 80;
var notificationsGap = notificationsSize * 1.6;
var notifications: AnimText[] = [];
for (let i = 0; i < 3; ++i) {
	notifications.push(new AnimText());
}
var notificationIndex = 0;
function showNotification(text: string) {
	text = text.toUpperCase();
	notificationIndex++;
	if (notificationIndex >= notifications.length) {
		notificationIndex = 0;
	}
	notifications[notificationIndex].text = text;
	notifications[notificationIndex].alpha = 1;
	notifications[notificationIndex].x = maxScreenWidth / 2;
	notifications[notificationIndex].fadeSpeed = 0.003;
	notifications[notificationIndex].fadeDelay = 800;
	notifications[notificationIndex].fontSize = notificationsSize * viewMult;
	notifications[notificationIndex].scale = 1;
	notifications[notificationIndex].scaleSpeed = 0.005;
	notifications[notificationIndex].minScale = 1;
	notifications[notificationIndex].maxScale = 1.5;
	notifications[notificationIndex].cachedImage = renderShadedAnimText(
		text,
		notificationsSize * viewMult,
		"#ffffff",
		7,
		"Italic ",
	);
	notifications[notificationIndex].active = true;
	positionNotifications();
}
var activeNotifications = 0;
function positionNotifications() {
	activeNotifications = 0;
	for (let i = 0; i < notifications.length; ++i) {
		if (notifications[i].active) {
			activeNotifications++;
		}
	}
	if (activeNotifications > 0) {
		notifications.sort(sortByAlpha);
		let b = 0;
		const yBase =
			maxScreenHeight -
			notifications.length * notificationsGap * viewMult -
			100;
		for (let i = 0; i < notifications.length; ++i) {
			if (notifications[i].active) {
				notifications[i].y = yBase + notificationsGap * viewMult * b;
				b++;
			}
		}
	}
}
function sortByAlpha(a: AnimText, b: AnimText) {
	if (a.alpha < b.alpha) {
		return 1;
	} else if (b.alpha < a.alpha) {
		return -1;
	} else {
		return 0;
	}
}
function updateNotifications(delta: number) {
	graph.fillStyle = "#fff";
	for (let i = 0; i < notifications.length; ++i) {
		if (notifications[i].active) {
			notifications[i].update(delta);
			notifications[i].draw();
		}
	}
	graph.globalAlpha = 1;
}
var animTexts: AnimText[] = [];
for (let i = 0; i < 20; i++) {
	animTexts.push(new AnimText());
}
var shadowOffset = 6;

function updateAnimTexts(delta: number) {
	graph.lineJoin = "round";
	graph.textAlign = "center";
	graph.textBaseline = "middle";
	for (let i = 0; i < animTexts.length; i++) {
		animTexts[i].update(delta);
		if (animTexts[i].active) {
			animTexts[i].draw();
		}
	}
	graph.globalAlpha = 1;
}
function getReadyAnimText() {
	for (let i = 0; i < animTexts.length; ++i) {
		if (!animTexts[i].active) {
			return animTexts[i];
		}
	}
	return null;
}
function startAnimText(a, b, d, e, f, h, g, l, m, k, p, n, r, u, v, t, w) {
	var q = getReadyAnimText();
	if (q == null) return;
	q.text = a.toUpperCase();
	q.x = b;
	q.y = d;
	q.xSpeed = e;
	q.ySpeed = f;
	q.fadeSpeed = h;
	q.fontSize = g * viewMult;
	q.scale = 1;
	q.maxScale = 1.6;
	q.minScale = 1;
	q.alpha = 1;
	q.scaleSpeed = l;
	q.useStart = m;
	q.fadeDelay = k;
	q.removable = p;
	q.moveDelay = n;
	q.alpha = u;
	q.color = v;
	q.textType = t;
	q.cachedImage = renderShadedAnimText(q.text, q.fontSize, q.color, w, r);
	q.active = true;
}
function startBigAnimText(a, b, d, e, f, h, g, l) {
	if (!deactiveAnimTexts("big")) return;
	if (a.length > 0) {
		startAnimText(
			a,
			maxScreenWidth / 2,
			bigTextY,
			0,
			-0.1,
			0.0025,
			bigTextSize * l,
			e ? 0.005 : 0,
			false,
			d,
			g,
			d,
			"Italic ",
			1,
			f,
			"big",
			8,
		);
	}
	if (b.length > 0) {
		startAnimText(
			b,
			maxScreenWidth / 2,
			bigTextY + textGap * viewMult * l,
			0,
			-0.04,
			0.0025,
			(medTextSize / 2) * l,
			e ? 0.003 : 0,
			false,
			d,
			g,
			d,
			"Italic ",
			1,
			h,
			"big",
			8,
		);
	}
}
function startMovingAnimText(a, b, d, e, f) {
	b += randomInt(-25, 25);
	d += randomInt(-20, 5);
	startAnimText(
		a,
		b,
		d,
		0,
		-0.15,
		0.0025,
		maxScreenHeight / 26 + f,
		0.005,
		true,
		350,
		false,
		0,
		"",
		1,
		e,
		"moving",
		5,
	);
}
function deactiveAnimTexts(a) {
	for (let i = 0; i < animTexts.length; ++i) {
		if (!animTexts[i].active) continue;
		if (animTexts[i].removable) {
			animTexts[i].active = false;
		} else if (animTexts[i].textType === a) {
			return false;
		}
	}
	return true;
}
function deactiveAllAnimTexts() {
	for (let i = 0; i < animTexts.length; ++i) {
		animTexts[i].active = false;
	}
}
var cachedTextRenders: Record<string, HTMLCanvasElement> = {};
function renderShadedAnimText(
	text: string,
	b,
	color: string,
	layerCount: number,
	f,
) {
	let tmpIndex = `${text}${b}${color}${layerCount}${f}`;
	let cachedText = cachedTextRenders[tmpIndex];
	if (cachedText === undefined) {
		let tmpCanvas = document.createElement("canvas");
		let ctx = tmpCanvas.getContext("2d");
		ctx.imageSmoothingEnabled = false;

		ctx.textAlign = "center";
		ctx.font = `${f + b}px mainFont`;
		tmpCanvas.width = ctx.measureText(text).width * 1.08;
		tmpCanvas.height = b * 1.8 + layerCount;
		ctx.fillStyle = shadeColor(color, -18);
		ctx.font = `${f + b}px mainFont`;
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		for (let i = 1; i < layerCount; ++i) {
			ctx.fillText(text, tmpCanvas.width / 2, tmpCanvas.height / 2 + i);
		}
		ctx.fillStyle = color;
		ctx.font = `${f + b}px mainFont`;
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		ctx.fillText(text, tmpCanvas.width / 2, tmpCanvas.height / 2);
		cachedText = tmpCanvas;
		cachedTextRenders[tmpIndex] = cachedText;
	}
	return cachedText;
}
var cachedParticles: any[] = []; // todo use better type once the Particle here is an es6 class
var particleIndex = 0;
for (let i = 0; i < 700; ++i) {
	cachedParticles.push(new Particle());
}
function updateParticles(delta: number, layer: number) {
	for (let i = 0; i < cachedParticles.length; ++i) {
		if (
			(showParticles || cachedParticles[i].forceShow) &&
			cachedParticles[i].active &&
			canSee(
				cachedParticles[i].x - startX,
				cachedParticles[i].y - startY,
				cachedParticles[i].scale,
				cachedParticles[i].scale,
			)
		) {
			if (layer === cachedParticles[i].layer) {
				cachedParticles[i].update(delta);
				cachedParticles[i].draw();
			}
		} else {
			cachedParticles[i].active = false;
		}
	}
	graph.globalAlpha = 1;
}
function Particle() {
	this.rotation =
		this.initScale =
		this.scale =
		this.dir =
		this.initSpeed =
		this.speed =
		this.y =
		this.x =
			0;
	this.active = false;
	this.layer = this.spriteIndex = 0;
	this.alpha = 1;
	this.fadeSpeed = 0;
	this.forceShow = this.checkCollisions = false;
	this.tmpScale = this.maxDuration = this.duration = 0;
	this.update = function (a) {
		if (!this.active) return;
		if (this.maxDuration > 0) {
			this.duration += a;
			this.tmpScale = 1 - this.duration / this.maxDuration;
			this.tmpScale = this.tmpScale < 0 ? 0 : this.tmpScale;
			this.scale = this.initScale * this.tmpScale;
			if (this.scale < 1) {
				this.active = false;
			}
			this.speed = this.initSpeed * this.tmpScale;
			if (this.speed <= 0.01) {
				this.speed = 0;
			} else {
				this.x += this.speed * a * Math.cos(this.dir);
				this.y += this.speed * a * Math.sin(this.dir);
			}
			if (this.duration >= this.maxDuration) {
				this.active = false;
			}
		}
		if (this.alpha > 0) {
			this.alpha -= this.fadeSpeed * a;
		}
		if (this.alpha <= 0) {
			this.alpha = 0;
			this.active = false;
		}
		if (this.checkCollisions) {
			this.checkInWall();
		}
	};
	this.draw = function () {
		if (
			this.active &&
			particleSprites[this.spriteIndex] != null &&
			isImageOk(particleSprites[this.spriteIndex])
		) {
			graph.globalAlpha = this.alpha;
			if (this.rotation !== 0) {
				graph.save();
				graph.translate(this.x - startX, this.y - startY);
				graph.rotate(this.rotation);
				graph.drawImage(
					particleSprites[this.spriteIndex],
					-(this.scale / 2),
					-(this.scale / 2),
					this.scale,
					this.scale,
				);
				graph.restore();
			} else {
				graph.drawImage(
					particleSprites[this.spriteIndex],
					this.x - startX - this.scale / 2,
					this.y - startY - this.scale / 2,
					this.scale,
					this.scale,
				);
			}
		}
	};
	this.checkInWall = function () {
		for (let i = 0; i < gameMap.tiles.length; ++i) {
			if (gameMap.tiles[i].wall && gameMap.tiles[i].hasCollision) {
				const tmpTl = gameMap.tiles[i];
				if (
					this.x >= tmpTl.x &&
					this.x <= tmpTl.x + tmpTl.scale &&
					this.y > tmpTl.y &&
					this.y < tmpTl.y + tmpTl.scale - player.height
				) {
					this.active = false;
				}
			}
		}
	};
}
function getReadyParticle() {
	particleIndex++;
	if (particleIndex >= cachedParticles.length) {
		particleIndex = 0;
	}
	return cachedParticles[particleIndex];
}
function particleCone(
	count: number,
	x: number,
	y: number,
	dir: number,
	spread: number,
	speed: number,
	scale,
	spriteIndex: number,
	m,
) {
	if (!showParticles) return;
	for (let i = 0; i < count; ++i) {
		let tmpParticle = getReadyParticle();
		tmpParticle.forceShow = false;
		tmpParticle.checkCollisions = false;
		tmpParticle.x = x;
		tmpParticle.y = y;
		tmpParticle.rotation = 0;
		tmpParticle.alpha = 1;
		tmpParticle.speed = 0;
		tmpParticle.fadeSpeed = 0;
		tmpParticle.initSpeed = 0;
		tmpParticle.initScale = randomFloat(3, 9);
		tmpParticle.spriteIndex = 0;
		tmpParticle.maxDuration = -1;
		tmpParticle.duration = 0;
		if (i === 0 && spriteIndex === 2 && m) {
			tmpParticle.spriteIndex = 3;
			tmpParticle.layer = 0;
		} else {
			tmpParticle.dir = dir + randomFloat(-spread, spread);
			tmpParticle.initScale = scale * randomFloat(1.5, 1.8);
			tmpParticle.initSpeed = speed * randomFloat(0.3, 1.3);
			tmpParticle.maxDuration = randomFloat(0.8, 1.1) * 360;
			tmpParticle.spriteIndex = spriteIndex;
			tmpParticle.layer = randomInt(0, 1);
		}
		tmpParticle.scale = tmpParticle.initScale;
		tmpParticle.active = true;
	}
}
var liquidSpread = 35;
function createLiquid(x: number, y: number, _dir, spriteIndex: number) {
	let tmpParticle = getReadyParticle();
	tmpParticle.x = x + randomFloat(-liquidSpread, liquidSpread);
	tmpParticle.y = y + randomFloat(-liquidSpread, liquidSpread);
	tmpParticle.initSpeed = 0;
	tmpParticle.maxDuration = -1;
	tmpParticle.duration = 0;
	tmpParticle.initScale = randomFloat(60, 150);
	tmpParticle.scale = tmpParticle.initScale;
	tmpParticle.rotation = randomInt(0, 5);
	tmpParticle.alpha = randomFloat(0.3, 0.5);
	tmpParticle.fadeSpeed = 0.00002;
	tmpParticle.checkCollisions = false;
	tmpParticle.spriteIndex = randomInt(spriteIndex, spriteIndex + 1);
	tmpParticle.layer = 0;
	tmpParticle.forceShow = false;
	tmpParticle.active = true;
}
var maxShakeDist = 2000;
var maxExplosionDuration = 400;
var maxShake = 9;

function createExplosion(x: number, y: number, scale: number) {
	let tmpDist = getDistance(x, y, player.x, player.y);
	if (tmpDist <= maxShakeDist) {
		let tmpDir = getAngle(x, player.x, y, player.y);
		screenShake(scale * maxShake * (1 - tmpDist / maxShakeDist), tmpDir);
	}
	playSound("explosion", x, y);
	createSmokePuff(x, y, scale, true, 1);
}
function createSmokePuff(
	x: number,
	y: number,
	scale: number,
	hole: boolean,
	speed: number,
) {
	createFlash(x, y, scale);
	for (let i = 0; i < 30; ++i) {
		let tmpParticle = getReadyParticle();
		tmpParticle.dir =
			Math.round(randomFloat(-Math.PI, Math.PI) / (Math.PI / 3)) *
			(Math.PI / 3);
		tmpParticle.forceShow = true;
		tmpParticle.spriteIndex = 2;
		tmpParticle.checkCollisions = true;
		tmpParticle.alpha = 1;
		tmpParticle.fadeSpeed = 0;
		tmpParticle.initSpeed = 0;
		tmpParticle.maxDuration = -1;
		tmpParticle.duration = 0;
		tmpParticle.layer = 1;
		tmpParticle.rotation = 0;
		if (i === 0 && hole) {
			tmpParticle.x = x;
			tmpParticle.y = y;
			tmpParticle.initScale = randomFloat(50, 60) * scale;
			tmpParticle.rotation = randomInt(0, 5);
			tmpParticle.speed = 0;
			tmpParticle.fadeSpeed = 0.0002;
			tmpParticle.checkCollisions = false;
			tmpParticle.spriteIndex = 6;
			tmpParticle.layer = 0;
		} else if (i <= 10) {
			let tmpDist = i * scale;
			tmpParticle.x = x + tmpDist * Math.cos(tmpParticle.dir);
			tmpParticle.y = y + tmpDist * Math.sin(tmpParticle.dir);
			tmpParticle.initScale = randomFloat(30, 33) * scale;
			tmpParticle.initSpeed = (3 / tmpParticle.initScale) * scale * speed;
			tmpParticle.maxDuration = maxExplosionDuration * 0.8;
		} else {
			let tmpDist = randomFloat(0, 10) * scale;
			tmpParticle.x = x + tmpDist * Math.cos(tmpParticle.dir);
			tmpParticle.y = y + tmpDist * Math.sin(tmpParticle.dir);
			let rand = randomFloat(0.7, 1.4);
			tmpParticle.initScale = scale * 11 * rand;
			tmpParticle.initSpeed =
				(((12 / tmpParticle.initScale) * scale) / rand) * speed;
			tmpParticle.maxDuration = maxExplosionDuration * rand;
		}
		tmpParticle.scale = tmpParticle.initScale;
		tmpParticle.active = true;
	}
}
function stillDustParticle(x: number, y: number, d) {
	let tmpParticle = getReadyParticle();
	tmpParticle.x = x + randomInt(-10, 10);
	tmpParticle.y = y;
	tmpParticle.initScale = randomFloat(18, 25);
	tmpParticle.initSpeed = 0.05;
	tmpParticle.maxDuration = 600;
	tmpParticle.duration = 0;
	tmpParticle.dir = randomFloat(0, Math.PI * 2);
	tmpParticle.rotation = 0;
	tmpParticle.spriteIndex = 2;
	tmpParticle.layer = d ? 1 : 0;
	tmpParticle.alpha = 1;
	tmpParticle.fadeSpeed = 0;
	tmpParticle.checkCollisions = false;
	tmpParticle.forceShow = d;
	tmpParticle.active = true;
}
var then = Date.now();
let elapsed: number | undefined;
function callUpdate() {
	requestAnimationFrame(callUpdate);
	currentTime = Date.now();
	elapsed = currentTime - then;
	if (elapsed > 1000 / targetFPS) {
		then = currentTime - (elapsed % (1000 / targetFPS));
		updateGameLoop();
	}
}
callUpdate();
