import { st } from "../state.svelte.ts";

let currentChatType = "ALL";
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
		if (event.key === "Enter") {
			let msg = chatInput.value.replace(/(<([^>]+)>)/gi, "");
			if (msg !== "") {
				st.socket?.emit("cht", msg.substring(0, 50), currentChatType);
				this.addChatLine(
					st.player.name,
					(currentChatType === "TEAM" ? "(TEAM) " : "") + msg + (!st.socket ? " (unsent)" : ""),
					true,
					st.player.team,
				);
				chatInput.value = "";
				mainCanvas.focus();
			}
		}
	}
	appendMessage(msgElem: HTMLElement) {
		if (st.mobile) return;

		const chatbox = document.getElementById("chatbox")!;
		const chatList = document.getElementById("chatList")!;
		while (chatbox.clientHeight > 260) {
			chatList.removeChild(chatList.childNodes[0]);
		}
		chatList.appendChild(msgElem);
	}
	addChatLine(authorName: string, text: string, fromSelf: boolean, type: string) {
		if (st.mobile) return;

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
			source = st.player.team === type ? "blue" : "red";
		}
		this.chatLineCounter++;
		listElem.className = source;
		let tmp = false;
		if (source === "system" || source === "notif") {
			listElem.replaceChildren(<span>{text}</span>);
		} else {
			tmp = true;
			listElem.replaceChildren(
				<>
					<span>{fromSelf ? "YOU" : authorName}: </span>
					<div id={`chatLine${this.chatLineCounter}`} style="display: inline-block"></div>
				</>,
			);
		}
		this.appendMessage(listElem);
		if (tmp) {
			document.getElementById(`chatLine${this.chatLineCounter}`)!.textContent = text;
		}
	}
}

let chatTypeIndex = 0;
const chatTypes = ["ALL", "TEAM"];
document.getElementById("chatType")!.addEventListener("click", () => {
	chatTypeIndex++;
	if (chatTypeIndex >= chatTypes.length) {
		chatTypeIndex = 0;
	}
	currentChatType = chatTypes[chatTypeIndex];
	document.getElementById("chatType")!.textContent = currentChatType;
	mainCanvas.focus();
});
