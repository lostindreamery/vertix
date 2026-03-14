import type { Socket } from "socket.io-client";
import { appStore } from "../state.ts";

const player = appStore.select("player");
const mobile = appStore.select("mobile");
const currentChatType = appStore.select("currentChatType");
const chatInput = document.getElementById("chatInput") as HTMLInputElement;
const mainCanvas = document.getElementById("cvs") as HTMLCanvasElement;

export class ChatManager {
	chatLineCounter = 0;
	constructor() {
		chatInput.addEventListener("keypress", this.sendChat.bind(this));
		// chatInput.addEventListener("keyup", (b) => {
		// 	let knum = b.which || b.keyCode;
		// 	if (knum) {
		// 		chatInput.value = "";
		// 		mainCanvas.focus();
		// 	}
		// });
	}
	sendChat(event: KeyboardEvent) {
		var chatInput = document.getElementById("chatInput") as HTMLInputElement;
		if (event.key === "Enter") {
			let msg = chatInput.value.replace(/(<([^>]+)>)/gi, "");
			if (msg !== "") {
				(appStore.select("socket").get() as Socket).emit(
					"cht",
					msg.substring(0, 50),
					currentChatType.get(),
				);
				this.addChatLine(
					player.get().name,
					(currentChatType.get() === "TEAM" ? "(TEAM) " : "") + msg,
					true,
					player.get().team,
				);
				chatInput.value = "";
				mainCanvas.focus();
			}
		}
	}
	appendMessage(msgElem: HTMLElement) {
		if (mobile.get()) return;

		const chatbox = document.getElementById("chatbox");
		const chatList = document.getElementById("chatList");
		while (chatbox.clientHeight > 260) {
			chatList.removeChild(chatList.childNodes[0]);
		}
		chatList.appendChild(msgElem);
	}
	addChatLine(authorName: string, text: string, fromSelf: boolean, type: string) {
		if (mobile.get()) return;

		// b = checkProfanityString(b);
		let listElem = document.createElement("li");
		let source = "me";
		if (fromSelf || type === "system" || type === "notif") {
			if (type === "system") {
				source = "system";
			} else if (type === "notif") {
				source = "notif";
			}
		} else {
			source = player.get().team === type ? "blue" : "red";
		}
		this.chatLineCounter++;
		listElem.className = source;
		let tmp = false;
		if (source === "system" || source === "notif") {
			listElem.innerHTML = `<span>${text}</span>`;
		} else {
			tmp = true;
			listElem.innerHTML =
				"<span>" +
				(fromSelf ? "YOU" : authorName) +
				': </span><label id="chatLine' +
				this.chatLineCounter +
				'"></label>';
		}
		this.appendMessage(listElem);
		if (tmp) {
			document.getElementById(`chatLine${this.chatLineCounter}`).textContent = text;
		}
	}
}

let chatTypeIndex = 0;
const chatTypes = ["ALL", "TEAM"];
document.getElementById("chatType").addEventListener("click", () => {
	chatTypeIndex++;
	if (chatTypeIndex >= chatTypes.length) {
		chatTypeIndex = 0;
	}
	currentChatType.set(chatTypes[chatTypeIndex]);
	document.getElementById("chatType").innerHTML = currentChatType.get();
	mainCanvas.focus();
});
