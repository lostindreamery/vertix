<script lang="ts">
	import { st } from "../state.svelte";
	import Controls from "./controls.svelte";
	import Settings from "./settings.svelte";

	interface Props {
		startGame: () => Promise<void>;
	}
	const { startGame }: Props = $props();

	let accordionState: "settings" | "controls" | null = $state(null);
	function accordionClick(elem: Exclude<typeof accordionState, null>) {
		if (elem === accordionState) {
			accordionState = null;
		} else {
			accordionState = elem;
		}
	}
</script>
<p class="menuHeader">MAIN MENU</p>
<input
	type="text"
	tabindex="0"
	autofocus
	placeholder="Player Name"
	id="playerNameInput"
	maxlength="15"
	bind:value={st.playerName}
	onkeydown={(e) => {if (e.code === "Enter") startGame()}}
>
<br>
<button type="button" id="startButton" onclick={() => startGame()}>ENTER GAME</button>

<button type="button" disabled id="leaderButton" onclick={() => window.open("/leaderboards.html", "_blank")}>
	LEADERBOARDS
</button>

<button type="button" id="settingsButton" onclick={() => accordionClick("settings")}>SETTINGS</button>
<div id="settings" style={`max-height: ${accordionState === "settings" ? "200" : "0"}px`}><Settings /></div>

<button type="button" id="instructionButton" onclick={() => accordionClick("controls")}>CONTROLS</button>
<br>
<div id="controls" style={`max-height: ${accordionState === "controls" ? "200" : "0"}px`}><Controls /></div>

<div style="width: 100%" id="socialContainer">
	<div style="margin-bottom:10px;">Thanks for playing</div>
</div>
