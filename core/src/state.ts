import { store } from "@simplestack/store";

export const appStore = store({
	maxScreenWidth: 1920,
	maxScreenHeight: 1080,
	viewMult: 1,
	startX: 0,
	startY: 0,
});
