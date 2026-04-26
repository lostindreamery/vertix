<script lang="ts">
	import AccountTab from "./tabs/accountTab.svelte";
	import LoadoutTab from "./tabs/loadoutTab.svelte";
	import ModTab from "./tabs/modTab.svelte";

	interface Props {
		loadModPack: (url: string, isBaseAssets: boolean) => Promise<false | undefined>;
	}
	const { loadModPack }: Props = $props();

	let currentTab: "loadoutTab" | "accountTab" | "modTab" = $state("loadoutTab");
</script>

<!-- MENU TABS -->
<ul class="tab">
	<li>
		<div class="tablinks" class:active={currentTab === "loadoutTab"} onclick={() => currentTab = "loadoutTab"}>
			SETUP
		</div>
	</li>
	<li>
		<div class="tablinks" class:active={currentTab === "accountTab"} onclick={() => currentTab = "accountTab"}>
			ACCOUNT
		</div>
	</li>
	<li>
		<div class="tablinks" class:active={currentTab === "modTab"} onclick={() => currentTab = "modTab"}>MODS</div>
	</li>
</ul>

<!-- LOADOUT TAB -->
<div id="loadoutTab" class="tabcontent" style:display={currentTab === "loadoutTab" ? "block" : "none"}>
	<LoadoutTab />
</div>

<!-- ACCOUNT TAB -->
<div id="accountTab" class="tabcontent" style:display={currentTab === "accountTab" ? "block" : "none"}>
	<AccountTab />
</div>

<!-- MOD TAB -->
<div id="modTab" class="tabcontent" style:display={currentTab === "modTab" ? "block" : "none"}>
	<ModTab {loadModPack} />
</div>
