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
