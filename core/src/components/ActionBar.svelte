<script module lang="ts">
	import { st } from "../state.svelte.ts";

	const cooldownMap: Record<number, HTMLElement> = {};

	declare global {
		interface Window {
			setCooldownAnimation: typeof setCooldownAnimation;
		}
	}
	window.setCooldownAnimation = setCooldownAnimation;
	export function setCooldownAnimation(weaponIdx: number, time: number, play: boolean) {
		const tmpDiv = cooldownMap[weaponIdx];
		if (play) {
			tmpDiv.animate({ height: ["100%", "0%"] }, time);
		} else {
			tmpDiv.style.height = "0%";
		}
	}
</script>
{#if st.sprites.weapons[0] && st.player.weapons}
	{#each st.player.weapons as weapon, idx}
		{@const icon = st.sprites.weapons[weapon.weaponIndex].icon}
		<div class={idx === st.player.currentWeapon ? "actionContainerActive" : "actionContainer"}>
			{#if icon}
				<div bind:this={cooldownMap[idx]} class="actionCooldown"></div>
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
