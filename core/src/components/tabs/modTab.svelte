<script lang="ts">
	interface Props {
		loadModPack: (url: string, isBaseAssets: boolean) => Promise<false | undefined>;
	}
	const { loadModPack }: Props = $props();

	let textureModInput: HTMLInputElement;
</script>

<h3 class="menuHeaderTabbed2">LOAD MOD PACK</h3>
<div id="featuredModList">
	<!--
        <div class="modBtn" onclick="loadModPack('/mods/minecraft/vertixmod.zip', false)"> Minecraft Mod Pack (6 mb)</div>
        <div class="modBtn" onclick="loadModPack('/mods/pacman/vertixmod.zip', false)"> Pacman Mod Pack (1 mb)</div>
        <div class="modBtn" onclick="loadModPack('/mods/ruins/vertixmod.zip', false)"> Undertale Ruins (4 mb)</div>
        <div class="modBtn" onclick="loadModPack('/mods/snowdin/vertixmod.zip', false)"> Undertale Snowdin (3 mb)</div>
        <div class="modBtn" onclick="loadModPack('/mods/waterfalls/vertixmod.zip', false)"> Undertale Waterfalls (1 mb)</div>
        <div class="modBtn" onclick="loadModPack('/mods/grayscale/vertixmod.zip', false)"> Black &amp; White Mod (4 mb)</div>
        <div class="modBtn" onclick="loadModPack('/mods/water/vertixmod.zip', false)"> Waterguns</div>
        <div class="modBtn" onclick="loadModPack('mods/mario/vertixmod.zip', false)"> Mario Mod Pack (5 mb)</div>
        <div class="modBtn" onclick="loadModPack('mods/nuclear-throne/vertixmod.zip', false)">Nuclear Throne</div>
    -->
	<div class="modBtn" onclick={() => loadModPack('13xlc5n3ipudqsn', false)}>Sonic Mod Pack</div>
</div>
<div>
	<input
		type="text"
		tabindex="0"
		autofocus
		placeholder="Mod Key/URL"
		id="textureModInput"
		bind:this={textureModInput}
		class="menuTextInput"
	>
	<button
		type="button"
		id="texturePackButton"
		class="smallMenuButton"
		onclick={() => loadModPack(textureModInput.value, false)}
	>
		LOAD
	</button>
</div>
<b>
	<a
		target="_blank"
		href="https://web.archive.org/web/20230531015720/https://www.reddit.com/r/VertixOnline/comments/4vypx9/texture_mods_please_post_all_texture_mods_here/"
	>
		Get more mods here
	</a>
</b>
<br>
<div id="modInfo"></div>
