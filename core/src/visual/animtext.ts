import { appStore } from "../state.ts";
import { randomInt, shadeColor } from "../utils.ts";

const textSizeMult = 0.55;
const bigTextSize = (appStore.get().maxScreenHeight / 7.7) * textSizeMult;
const medTextSize = bigTextSize * 0.85;
const textGap = bigTextSize * 1.2;
const bigTextY = appStore.get().maxScreenHeight / 4.3;
const viewMult = appStore.select("viewMult");

export class AnimText {
	text = "";
	scaleSpeed = 0;
	minScale = 0;
	maxScale = 0;
	fontSize = 0;
	scale = 0;
	ySpeed = 0;
	xSpeed = 0;
	y = 0;
	x = 0;
	active = false;
	alpha = 1;
	fadeSpeed = 0;
	useStart = false;
	moveDelay = 0;
	fadeDelay = 0;
	removable = false;
	textType = "";
	color = "#fff";
	cachedImage: HTMLCanvasElement | null = null;

	update(delta: number) {
		if (!this.active) return;
		this.scale += this.scaleSpeed * delta;
		if (this.scaleSpeed > 0) {
			if (this.scale >= this.maxScale) {
				this.scale = this.maxScale;
				this.scaleSpeed *= -1;
			}
		} else if (this.scale < this.minScale) {
			this.scale = this.minScale;
			this.scaleSpeed = 0;
		}
		if (this.moveDelay > 0) {
			this.moveDelay -= delta;
		} else {
			this.x += this.xSpeed * delta;
			this.y += this.ySpeed * delta;
		}
		if (this.fadeDelay > 0) {
			this.fadeDelay -= delta;
		} else {
			this.alpha -= this.fadeSpeed * delta;
			if (this.alpha <= 0) {
				this.alpha = 0;
				this.active = false;
			}
		}
	}

	draw() {
		if (!this.active || !this.cachedImage) return;
		window.graph.globalAlpha = this.alpha;
		if (this.useStart) {
			window.graph.drawImage(
				this.cachedImage,
				this.x - appStore.get().startX - (this.cachedImage.width / 2) * this.scale,
				this.y - appStore.get().startY - (this.cachedImage.height / 2) * this.scale,
				this.cachedImage.width * this.scale,
				this.cachedImage.height * this.scale,
			);
		} else {
			window.graph.drawImage(
				this.cachedImage,
				this.x - (this.cachedImage.width / 2) * this.scale,
				this.y - (this.cachedImage.height / 2) * this.scale,
				this.cachedImage.width * this.scale,
				this.cachedImage.height * this.scale,
			);
		}
	}
}
var notificationsSize = textSizeMult * 80;
var notificationsGap = notificationsSize * 1.6;
var notifications: AnimText[] = [];
for (let i = 0; i < 3; ++i) {
	notifications.push(new AnimText());
}
var notificationIndex = 0;
export function showNotification(text: string) {
	text = text.toUpperCase();
	notificationIndex++;
	if (notificationIndex >= notifications.length) {
		notificationIndex = 0;
	}
	notifications[notificationIndex].text = text;
	notifications[notificationIndex].alpha = 1;
	notifications[notificationIndex].x = appStore.get().maxScreenWidth / 2;
	notifications[notificationIndex].fadeSpeed = 0.003;
	notifications[notificationIndex].fadeDelay = 800;
	notifications[notificationIndex].fontSize = notificationsSize * viewMult.get();
	notifications[notificationIndex].scale = 1;
	notifications[notificationIndex].scaleSpeed = 0.005;
	notifications[notificationIndex].minScale = 1;
	notifications[notificationIndex].maxScale = 1.5;
	notifications[notificationIndex].cachedImage = renderShadedAnimText(
		text,
		notificationsSize * viewMult.get(),
		"#ffffff",
		7,
		"Italic ",
	);
	notifications[notificationIndex].active = true;
	positionNotifications();
}
var activeNotifications = 0;
export function positionNotifications() {
	activeNotifications = 0;
	for (let i = 0; i < notifications.length; ++i) {
		if (notifications[i].active) {
			activeNotifications++;
		}
	}
	if (activeNotifications > 0) {
		notifications.sort(sortByAlpha);
		let b = 0;
		const yBase =
			appStore.get().maxScreenHeight -
			notifications.length * notificationsGap * viewMult.get() -
			100;
		for (let i = 0; i < notifications.length; ++i) {
			if (notifications[i].active) {
				notifications[i].y = yBase + notificationsGap * viewMult.get() * b;
				b++;
			}
		}
	}
}
export function sortByAlpha(a: AnimText, b: AnimText) {
	if (a.alpha < b.alpha) {
		return 1;
	} else if (b.alpha < a.alpha) {
		return -1;
	} else {
		return 0;
	}
}
export function updateNotifications(delta: number) {
	window.graph.fillStyle = "#fff";
	for (let i = 0; i < notifications.length; ++i) {
		if (notifications[i].active) {
			notifications[i].update(delta);
			notifications[i].draw();
		}
	}
	window.graph.globalAlpha = 1;
}
var animTexts: AnimText[] = [];
for (let i = 0; i < 20; i++) {
	animTexts.push(new AnimText());
}
var shadowOffset = 6;

export function updateAnimTexts(delta: number) {
	window.graph.lineJoin = "round";
	window.graph.textAlign = "center";
	window.graph.textBaseline = "middle";
	for (let i = 0; i < animTexts.length; i++) {
		animTexts[i].update(delta);
		if (animTexts[i].active) {
			animTexts[i].draw();
		}
	}
	window.graph.globalAlpha = 1;
}
export function getReadyAnimText() {
	for (let i = 0; i < animTexts.length; ++i) {
		if (!animTexts[i].active) {
			return animTexts[i];
		}
	}
	return null;
}
export function startAnimText(a, b, d, e, f, h, g, l, m, k, p, n, r, u, v, t, w) {
	var q = getReadyAnimText();
	if (q == null) return;
	q.text = a.toUpperCase();
	q.x = b;
	q.y = d;
	q.xSpeed = e;
	q.ySpeed = f;
	q.fadeSpeed = h;
	q.fontSize = g * viewMult.get();
	q.scale = 1;
	q.maxScale = 1.6;
	q.minScale = 1;
	q.alpha = 1;
	q.scaleSpeed = l;
	q.useStart = m;
	q.fadeDelay = k;
	q.removable = p;
	q.moveDelay = n;
	q.alpha = u;
	q.color = v;
	q.textType = t;
	q.cachedImage = renderShadedAnimText(q.text, q.fontSize, q.color, w, r);
	q.active = true;
}
export function startBigAnimText(a, b, d, e, f, h, g, l) {
	if (!deactiveAnimTexts("big")) return;
	if (a.length > 0) {
		startAnimText(
			a,
			appStore.get().maxScreenWidth / 2,
			bigTextY,
			0,
			-0.1,
			0.0025,
			bigTextSize * l,
			e ? 0.005 : 0,
			false,
			d,
			g,
			d,
			"Italic ",
			1,
			f,
			"big",
			8,
		);
	}
	if (b.length > 0) {
		startAnimText(
			b,
			appStore.get().maxScreenWidth / 2,
			bigTextY + textGap * viewMult.get() * l,
			0,
			-0.04,
			0.0025,
			(medTextSize / 2) * l,
			e ? 0.003 : 0,
			false,
			d,
			g,
			d,
			"Italic ",
			1,
			h,
			"big",
			8,
		);
	}
}
export function startMovingAnimText(a, b, d, e, f) {
	b += randomInt(-25, 25);
	d += randomInt(-20, 5);
	startAnimText(
		a,
		b,
		d,
		0,
		-0.15,
		0.0025,
		appStore.get().maxScreenHeight / 26 + f,
		0.005,
		true,
		350,
		false,
		0,
		"",
		1,
		e,
		"moving",
		5,
	);
}
export function deactiveAnimTexts(a) {
	for (let i = 0; i < animTexts.length; ++i) {
		if (!animTexts[i].active) continue;
		if (animTexts[i].removable) {
			animTexts[i].active = false;
		} else if (animTexts[i].textType === a) {
			return false;
		}
	}
	return true;
}
export function deactiveAllAnimTexts() {
	for (let i = 0; i < animTexts.length; ++i) {
		animTexts[i].active = false;
	}
}
var cachedTextRenders: Record<string, HTMLCanvasElement> = {};
export function renderShadedAnimText(text: string, b, color: string, layerCount: number, f) {
	let tmpIndex = `${text}${b}${color}${layerCount}${f}`;
	let cachedText = cachedTextRenders[tmpIndex];
	if (cachedText === undefined) {
		let tmpCanvas = document.createElement("canvas");
		let ctx = tmpCanvas.getContext("2d");
		ctx.imageSmoothingEnabled = false;

		ctx.textAlign = "center";
		ctx.font = `${f + b}px mainFont`;
		tmpCanvas.width = ctx.measureText(text).width * 1.08;
		tmpCanvas.height = b * 1.8 + layerCount;
		ctx.fillStyle = shadeColor(color, -18);
		ctx.font = `${f + b}px mainFont`;
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		for (let i = 1; i < layerCount; ++i) {
			ctx.fillText(text, tmpCanvas.width / 2, tmpCanvas.height / 2 + i);
		}
		ctx.fillStyle = color;
		ctx.font = `${f + b}px mainFont`;
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		ctx.fillText(text, tmpCanvas.width / 2, tmpCanvas.height / 2);
		cachedText = tmpCanvas;
		cachedTextRenders[tmpIndex] = cachedText;
	}
	return cachedText;
}
