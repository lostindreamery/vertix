<script lang="ts">
	import type { hats, shirts } from "../../skins.ts";
	import { getItemRarityColor } from "../../utils.ts";

	interface Props {
		type: "hat" | "shirt";
		item: (typeof hats)[number] | (typeof shirts)[number];
	}
	const { type, item }: Props = $props();
</script>

<div class="hoverTooltip">
	<img
		class:itemDisplayImage={type === "hat"}
		class:shirtDisplayImage={type === "shirt"}
		src={`/images/${type}s/${item.id}/d.png`}
	>
	<div style:color={getItemRarityColor(item.chance)} style:font-size={"16px"} style:margin-top={"5px"}>{item.name}</div>
	<div style="color: #ffd100; font-size: 12px; margin-top: 0px">droprate {item.chance}%</div>
	<div style="font-size: 8px; color: #d8d8d8; margin-top: 1px"><i>wearable</i></div>
	<div style="font-size: 12px; margin-top: 5px">{item.desc}</div>
	{#if "creator" in item && item.creator !== "EatMyApples"}
		<div style="font-size: 8px; color: #d8d8d8, margin-top: 5px"><i>Artist: {item.creator}</i></div>
	{/if}
</div>
