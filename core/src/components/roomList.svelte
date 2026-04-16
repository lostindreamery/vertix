<script lang="ts">
	import { st } from "../state.svelte.ts";

	interface Props {
		joinRoom: (roomName: string) => void;
	}
	const { joinRoom }: Props = $props();

	const url = "http://localhost:1118/getRooms";

	let rooms = $state(fetch(url));

	$effect(() => {
		st.room;
		rooms = fetch(url);
	});
</script>

<div class="roomListHeader">
	<h3 class="menuHeader">ROOM BROWSER</h3>
	<button class="smallMenuButton" onclick={() => rooms = fetch(url)}>REFRESH</button>
</div>
<div id="roomSelector">
	<svelte:boundary>
		{#snippet pending()}
			Loading...
		{/snippet}
		{#each await (await rooms).json() as room}
			<div class="roomSelectItem" onclick={() => joinRoom(room.n)}>
				<b>{`${room.m}_${room.n}`}</b>
				<b>{`${room.pl}/${room.mxpl}`}</b>
			</div>
		{/each}
	</svelte:boundary>
</div>

<style>
	.roomListHeader {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 125%;
		box-sizing: border-box;
		font-size: 12px;
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
	.roomSelectItem:hover {
		background: rgba(0, 0, 0, 0.1);
		font-size: 14px;
	}
</style>
