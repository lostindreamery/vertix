<script lang="ts">
	import { tick } from "svelte";
	import { st } from "../state.svelte.ts";

	const mainCanvas = document.getElementById("cvs") as HTMLCanvasElement;

	let currentChatType = $state("ALL");
	function changeChatType() {
		// swap
		currentChatType = currentChatType === "ALL" ? "TEAM" : "ALL";
		tick().then(() => {
			mainCanvas.focus();
		});
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
			tick().then(() => {
				mainCanvas.focus();
			});
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
		// arbitrary, so the DOM doesn't grow forever
		if (st.chatLines.length >= 20) {
			st.chatLines.shift();
		}
	}
	function nameColorFromSource(source: string) {
		if (source === "red") {
			return "#d95151";
		} else if (source === "blue") {
			return "#5151d9";
		} else if (source === "system") {
			return "#db4fcd";
		} else if (source === "me" || source === "notif") {
			return "#fff";
		}
	}
</script>
<ul id="chatList" class="chat-list">
	{#each st.chatLines.toReversed() as line}
		<li>
			{#if line.source === "system" || line.source === "notif"}
				<span style:color={nameColorFromSource(line.source)}>{line.text}</span>
			{:else}
				<span style:color={nameColorFromSource(line.source)}>{line.source === "me" ? "YOU" : line.author}: </span>
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
