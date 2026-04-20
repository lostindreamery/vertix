<script lang="ts">
	import { st } from "../state.svelte.ts";

	const mainCanvas = document.getElementById("cvs") as HTMLCanvasElement;

	let currentChatType = $state("ALL");
	function changeChatType() {
		// swap
		currentChatType = currentChatType === "ALL" ? "TEAM" : "ALL";
		setTimeout(() => {
			mainCanvas.focus();
		}, 0);
	}

	function sendChat(this: HTMLInputElement, event: KeyboardEvent) {
		if (event.key !== "Enter") return;
		if (this.value !== "") {
			st.socket?.emit("cht", this.value.substring(0, 50), currentChatType);
			addChatLine(
				st.player.name,
				(currentChatType === "TEAM" ? "(TEAM) " : "") + this.value + (!st.socket ? " (unsent)" : ""),
				true,
				st.player.team,
			);
			this.value = "";
			setTimeout(() => {
				mainCanvas.focus();
			}, 0);
		}
	}
	export function addChatLine(author: string, text: string, fromSelf: boolean, type: string) {
		if (type === "system" || type === "notif") {
			st.chatLines.push({ text, source: type, author });
		} else if (fromSelf) {
			st.chatLines.push({ text, source: "me", author });
		} else {
			st.chatLines.push({ text, source: st.player.team === type ? "blue" : "red", author });
		}
	}
</script>
<ul id="chatList" class="chat-list">
	{#each st.chatLines as line}
		<li class={line.source}>
			{#if line.source === "system" || line.source === "notif"}
				<span>{line.text}</span>
			{:else}
				<span>{line.source === "me" ? "YOU" : line.author}: </span>
				<div style="display: inline-block">{line.text}</div>
			{/if}
		</li>
	{/each}
</ul>
<div>
	<input
		id="chatInput"
		type="text"
		class="chat-input"
		placeholder="Send Message..."
		maxlength="50"
		onkeydown={sendChat}
	>
	<div id="chatType" onclick={changeChatType}>{currentChatType}</div>
</div>
