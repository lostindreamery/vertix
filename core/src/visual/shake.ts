import { appStore } from "../state.ts";

const shake = appStore.select("shake");

const screenSkRed = 0.5;

export function screenShake(scale: number, dir: number) {
	if (shake.get().scale < scale) {
		shake.select("scale").set(scale);
        shake.select("dir").set(dir);
	}
}
export function updateScreenShake() {
	if (shake.get().scale > 0) {
        shake.select("x").set(shake.get().scale * Math.cos(shake.get().dir))
        shake.select("y").set(shake.get().scale * Math.sin(shake.get().dir))
        shake.select("scale").set(shake.get().scale * screenSkRed)
		if (shake.get().scale <= 0.1) {
			shake.select("scale").set(0);
		}
	}
}
