<script lang="ts">
	import { st } from "../state.svelte.ts";

	let refreshTick = $state(0);

	const rooms = $derived.by(async () => {
		// these are dependencies - if they change, this function runs again
		refreshTick;
		st.room;

		const r = await fetch("http://localhost:1118/getRooms");
		return await r.json();
	});
</script>

<div id="roomListHeader">
	<h3 class="menuHeader">ROOM BROWSER</h3>
	<button class="smallMenuButton" onclick={() => refreshTick++}>REFRESH</button>
</div>
<div id="roomSelector">
	<svelte:boundary>
		{#snippet pending()}
			Loading...
		{/snippet}
		{#each await rooms as room}
			<div
				class="roomSelectItem"
				class:roomSelectItemSelected={st.room === room.n}
				onclick={() => window.joinRoom(room.n)}
			>
				<b>{`${room.m}_${room.n}`}</b>
				<b>{`${room.lb}% - ${room.pl}/${room.mxpl}`}</b>
			</div>
		{/each}
	</svelte:boundary>
</div>

<style>
	#roomListHeader {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 125%;
		box-sizing: border-box;
		font-size: 12px;
	}
	.menuHeader {
		margin-top: 0px;
		margin-bottom: 10px;
	}

	#roomSelector {
		max-height: 265px;
		overflow-y: scroll;
		overflow-x: hidden;
	}

	.roomSelectItem {
		font-size: 12px;
		padding: 5px;
		cursor: pointer;
		position: relative;
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		box-sizing: border-box;
	}
	.roomSelectItem:hover,
	.roomSelectItemSelected {
		background: rgba(0, 0, 0, 0.1);
		font-size: 14px;
	}
</style>
