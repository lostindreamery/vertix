<script lang="ts">
	import { gameModes } from "../../gamemodes.ts";
	import { st } from "../../state.svelte.ts";
	import type { GenData } from "../../types.ts";
	import { getItemRarityColor, loadImageData } from "../../utils.ts";
	import CosmeticTooltip from "./CosmeticTooltip.svelte";

	let currentScreen:
		| "main"
		| "class"
		| "primaryCamo"
		| "secondaryCamo"
		| "hat"
		| "shirt"
		| "spray"
		| "joinServer"
		| "createServer" = $state("main");

	// sync preferences to localStorage
	function savePref(key: string, value: string | undefined) {
		console.debug(`saving ${value} to ${key}`);
		if (value) {
			localStorage.setItem(key, value);
		} else {
			localStorage.removeItem(key);
		}
	}
	$effect(() => {
		savePref("prevHat", st.loadout.hat?.id.toString());
	});
	$effect(() => {
		savePref("prevShirt", st.loadout.shirt?.id.toString());
	});
	$effect(() => {
		savePref("prevSpray", st.loadout.spray?.toString());
	});
	$effect(() => {
		savePref("prevPrimaryCamo", st.loadout.primaryCamo?.id.toString());
	});
	$effect(() => {
		savePref("prevSecondaryCamo", st.loadout.secondaryCamo?.id.toString());
	});
	$effect(() => {
		savePref("prevClass", st.loadout.class?.folderName.toString());
	});

	// sync selected cosmetics to server
	$effect(() => {
		st.socket?.emit("cCamo", {
			weaponID: st.loadout.class.weaponIndexes[0],
			camoID: st.loadout.primaryCamo?.id ?? 0,
		});
	});
	$effect(() => {
		st.socket?.emit("cCamo", {
			weaponID: st.loadout.class.weaponIndexes[1],
			camoID: st.loadout.secondaryCamo?.id ?? 0,
		});
	});
	$effect(() => {
		st.socket?.emit("cHat", st.loadout.hat?.id ?? -1);
	});
	$effect(() => {
		st.socket?.emit("cShirt", st.loadout.shirt?.id ?? -1);
	});
	$effect(() => {
		st.socket?.emit("cSpray", st.loadout.spray ?? 1);
	});

	const createGameOpts = $state({
		srvPlayers: 6,
		srvHealthMult: 1,
		srvSpeedMult: 1,
		srvPass: "",
		srvMap: null as (GenData & { name: string }) | null,
		srvClnWr: false,
		srvModes: [] as number[],
	});
</script>
<div style:display={currentScreen === "main" ? "block" : "none"}>
	<h3 class="menuHeaderTabbed2">LOADOUT</h3>
	<div>
		<b>Class:</b>
		<div class="hatSelectItem" onclick={() => currentScreen = "class"} style="display:inline-block">
			{st.loadout.class.classN}
		</div>
	</div>
	<div onclick={() => currentScreen = "primaryCamo"} style="margin-top:-5px;">
		<b>Primary: </b>
		<div
			class="hatSelectItem"
			style="display:inline-block"
			style:color={st.loadout.primaryCamo ? getItemRarityColor(st.loadout.primaryCamo.chance) : undefined}
		>
			{st.loadout.primaryCamo?.name ?? st.loadout.class.pWeapon}
		</div>
	</div>
	<div onclick={() => currentScreen = "secondaryCamo"} style="margin-top:-5px;">
		<b>Secondary: </b>
		<div
			class="hatSelectItem"
			style="display:inline-block"
			style:color={st.loadout.secondaryCamo ? getItemRarityColor(st.loadout.secondaryCamo.chance) : undefined}
		>
			{st.loadout.secondaryCamo?.name ?? st.loadout.class.sWeapon}
		</div>
	</div>
	<div onclick={() => currentScreen = "hat"} style="margin-top:-5px;">
		<b>Hat:</b>
		<div
			class="hatSelectItem"
			style="display:inline-block"
			style:color={st.loadout.hat ? getItemRarityColor(st.loadout.hat.chance) : undefined}
		>
			{st.loadout.hat?.name ?? "Default"}
			{#if st.loadout.hat}
				<CosmeticTooltip type="hat" item={st.loadout.hat} />
			{/if}
		</div>
	</div>
	<div onclick={() => currentScreen = "shirt"} style="margin-top:-5px;">
		<b>Shirt:</b>
		<div
			class="hatSelectItem"
			style="display:inline-block"
			style:color={st.loadout.shirt ? getItemRarityColor(st.loadout.shirt.chance) : undefined}
		>
			{st.loadout.shirt?.name ?? "Default"}
			{#if st.loadout.shirt}
				<CosmeticTooltip type="shirt" item={st.loadout.shirt} />
			{/if}
		</div>
	</div>
	<div onclick={() => currentScreen = "spray"} style="margin-top:-5px;">
		<b>Spray:</b>
		<div class="hatSelectItem" style="display:inline-block">Strike</div>
	</div>
</div>

<div style:display={currentScreen === "class" ? "block" : "none"}>
	<h3 class="menuHeaderTabbed">SELECT CLASS</h3>
	<div id="classList">
		{#each st.characterClasses.filter(c => c.classN !== "???") as cls}
			<div class="hatSelectItem" onclick={() => {st.loadout.class = cls; currentScreen = "main"}}>{cls.classN}</div>
		{/each}
	</div>
</div>

<div
	class="cosmeticSelector"
	style:display={currentScreen === "primaryCamo" || currentScreen === "secondaryCamo" ? "block" : "none"}
>
	<h3 class="menuHeaderTabbed">SELECT CAMO</h3>
	<div>
		<div
			class="hatSelectItem"
			onclick={() => {st.loadout[currentScreen as "primaryCamo" | "secondaryCamo"] = null; currentScreen = "main"}}
		>
			Default
		</div>
		<!-- hack (assuming every weapon has the same camo list, which is correct for now, but maybe not in the future) -->
		{#each st.cosmetics.camos[0] as camo}
			<div
				class="hatSelectItem"
				style:color={getItemRarityColor(camo.chance)}
				onclick={() => {st.loadout[currentScreen as "primaryCamo" | "secondaryCamo"] = camo; currentScreen = "main"}}
			>
				{camo.name}
				x{camo.count + 1}
				<!-- tooltip? -->
			</div>
		{/each}
	</div>
</div>

<div class="cosmeticSelector" style:display={currentScreen === "hat" ? "block" : "none"}>
	<h3 class="menuHeaderTabbed">SELECT HAT</h3>
	<div>
		<div class="hatSelectItem" onclick={() => {st.loadout.hat = null; currentScreen = "main"}}>Default</div>
		{#each st.cosmetics.hats as hat}
			<div
				class="hatSelectItem"
				style:color={getItemRarityColor(hat.chance)}
				onclick={() => {st.loadout.hat = hat; currentScreen = "main"}}
			>
				{hat.name}
				x{hat.count + 1}
				<CosmeticTooltip type="hat" item={hat} />
			</div>
		{/each}
	</div>
</div>

<div class="cosmeticSelector" style:display={currentScreen === "shirt" ? "block" : "none"}>
	<h3 class="menuHeaderTabbed">SELECT SHIRT</h3>
	<div>
		<div class="hatSelectItem" onclick={() => {st.loadout.shirt = null; currentScreen = "main"}}>Default</div>
		{#each st.cosmetics.shirts as shirt}
			<div
				class="hatSelectItem"
				style:color={getItemRarityColor(shirt.chance)}
				onclick={() => {st.loadout.shirt = shirt; currentScreen = "main"}}
			>
				{shirt.name}
				x{shirt.count + 1}
				<CosmeticTooltip type="shirt" item={shirt} />
			</div>
		{/each}
	</div>
</div>

<div class="cosmeticSelector" style:display={currentScreen === "spray" ? "block" : "none"}>
	<h3 class="menuHeaderTabbed">SELECT SPRAY</h3>
	<div>
		<!-- tmp since we don't have spray data -->
		<div class="hatSelectItem" onclick={() => {st.loadout.spray = 1; currentScreen = "main"}}>Strike</div>
	</div>
</div>

<div style:display={currentScreen === "joinServer" ? "block" : "none"}>
	<h3 class="menuHeaderTabbed2">JOIN SERVER</h3>
	<input class="menuTextInput" placeholder="Server IP" id="lobbyKey" maxlength="50" style="margin-top:10px;">
	<input
		class="menuTextInput"
		placeholder="Server Password (Optional)"
		id="lobbyPass"
		type="password"
		maxlength="10"
		style="margin-top:10px;margin-bottom:8px;"
	>
	<div id="lobbyMessage" style="margin-left:4px;">Ask the host for the address.</div>
	<button type="button" id="joinLobbyButton" class="smallMenuButton" style="margin-left:5px;margin-top:10px;">
		JOIN
	</button>
	<button
		type="button"
		class="smallMenuButton"
		onclick={() => currentScreen = "main"}
		style="margin-bottom:0px;margin-top:10px;"
	>
		BACK
	</button>
</div>

<div style:display={currentScreen === "createServer" ? "block" : "none"}>
	<div id="createServerContainer">
		<h3 class="menuHeaderTabbed2" style="margin-bottom:8px;">CREATE SERVER</h3>
		<h1>Statistics will not be affected by games played in private servers.</h1>
		<b>Gamemodes:</b>
		<div style="margin-top:5px;margin-bottom:5px;">
			{#each gameModes as gameMode, idx}
				<input type="checkbox" value={idx} bind:group={createGameOpts.srvModes}>
				{gameMode.name}
				<br>
			{/each}
		</div>
		<b>Clan War</b>
		<br>
		<input type="checkbox" bind:checked={createGameOpts.srvClnWr}>
		Enable
		<br>
		<b>Server Size: (2-8 Players)</b>
		<input
			class="menuTextInput"
			placeholder="Number of Players"
			bind:value={createGameOpts.srvPlayers}
			min="2"
			max="8"
			step="2"
			maxlength="1"
			type="number"
			style="margin-top:5px;margin-bottom:8px;width:95%;"
		>
		<b>Health Multiplier:</b>
		<input
			class="menuTextInput"
			placeholder="Health Multiplier"
			bind:value={createGameOpts.srvHealthMult}
			min="0.1"
			max="3.0"
			step="0.1"
			maxlength="1"
			type="number"
			style="margin-top:5px;margin-bottom:8px;width:95%;"
		>
		<b>Speed Multiplier:</b>
		<input
			class="menuTextInput"
			placeholder="Speed Multiplier"
			bind:value={createGameOpts.srvSpeedMult}
			min="0.1"
			max="2.0"
			step="0.1"
			maxlength="1"
			type="number"
			style="margin-top:5px;margin-bottom:8px;width:95%;"
		>
		<b>Password: (Optional)</b>
		<input
			class="menuTextInput"
			placeholder="Server Password"
			bind:value={createGameOpts.srvPass}
			maxlength="10"
			type="password"
			style="margin-top:5px;margin-bottom:8px;width:95%;"
		>
		<b>Custom Map: (Optional)</b>
		<button type="button" class="smallMenuButton" onclick={() => document.getElementById('customMapFile')!.click()}>
			{createGameOpts.srvMap?.name ?? "Select Map"}
		</button>
		<input
			type="file"
			id="customMapFile"
			style="display:none;"
			accept="image/*"
			onchange={async (event) => {
			    const file = event.currentTarget?.files?.[0];
        		if (!file) return;
        		const name = event.currentTarget.value.split("\\").at(-1)!;
        		createGameOpts.srvMap = { name, ...(await loadImageData(file)) };
			}}
		>
		<div id="serverCreateMessage" class="selectable" style="margin-bottom:8px;">Press start to start the Server.</div>
		<button type="button" class="smallMenuButton" onclick={() => st.socket?.emit("cSrv", createGameOpts)}>START</button>
	</div>
	<button
		type="button"
		class="smallMenuButton"
		onclick={() => currentScreen = "main"}
		style="margin-bottom:0px;margin-top:10px;"
	>
		BACK
	</button>
</div>

<div style="margin-top:-3px;margin-bottom:-5px;" style:display={currentScreen === "main" ? "block" : "none"}>
	<h3 style="margin-top:12px;margin-bottom:3px;">SERVERS</h3>
	<div
		class="hatSelectItem"
		style="display:inline-block; padding-left:0px;color:#76b3e3;"
		onclick={() => currentScreen = "joinServer"}
	>
		Join a Server
	</div>
	|
	<div
		class="hatSelectItem"
		style="display:inline-block; padding-left:3px;color:#76b3e3;"
		onclick={() => currentScreen = "createServer"}
	>
		Create a Server
	</div>
	<b>Current Server:</b>
	<div class="selectable" style="margin-bottom:8px;display:inline-block;">{st.room ?? "none"}</div>
</div>

<style>
	.cosmeticSelector {
		max-height: 240px;
		overflow-y: scroll;
		overflow-x: hidden;
	}

	#classList {
		max-height: 190px;
		overflow-y: scroll;
	}

	#createServerContainer {
		max-height: 190px;
		overflow-y: scroll;
	}
	.selectable {
		-webkit-user-select: text;
		user-select: text;
		pointer-events: all;
	}
</style>
