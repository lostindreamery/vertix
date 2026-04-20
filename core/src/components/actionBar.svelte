<script lang="ts">
	import { st } from "../state.svelte.ts";
</script>
{#if st.sprites.weapons[0] && st.player.weapons}
	{#each st.player.weapons as weapon, idx}
		{@const icon = st.sprites.weapons[weapon.weaponIndex].icon}
		<div
			id={`actionContainer${idx}`}
			class={idx === st.player.currentWeapon ? "actionContainerActive" : "actionContainer"}
		>
			{#if icon}
				<div id={`actionCooldown${idx}`} class="actionCooldown"></div>
				<img src={icon.src} class="actionItem">
			{/if}
		</div>
	{/each}
{/if}

<style>
	.actionContainer {
		padding: 10px;
		margin-right: 10px;
		position: relative;
		display: inline-block;
		height: 25px;
		width: 25px;
	}

	.actionContainerActive {
		padding: 10px;
		margin-right: 10px;
		position: relative;
		display: inline-block;
		height: 35px;
		width: 35px;
	}

	.actionItem {
		background: rgba(0, 0, 0, 0.1);
		position: absolute;
		bottom: 0;
		height: 100%;
		width: 100%;
	}

	.actionCooldown {
		background: rgba(255, 255, 255, 0.2);
		position: absolute;
		bottom: 0;
		height: 0%;
		width: 100%;
		overflow: hidden;
	}
</style>
