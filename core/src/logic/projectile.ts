import { playSound } from "../sound.ts";
import { appStore } from "../state.ts";
import type { Player, Tile } from "../types.ts";
import { getDistance, randomInt } from "../utils.ts";
import { createLiquid, particleCone, stillDustParticle } from "../visual/particle.ts";

const player = appStore.select("player");

export class Projectile {
	width = 0;
	height = 0;
	jumpY = 0;
	yOffset = 0;
	dir = 0;
	cEndX = 0;
	cEndY = 0;
	startX = 0;
	startY = 0;
	y = 0;
	x = 0;
	active = false;
	weaponIndex = 0;
	spriteIndex = 0;
	pierceCount = 0;
	blastRadius = 0;
	glowHeight = 0;
	glowWidth = 0;
	speed = 0;
	trailWidth = 0;
	trailMaxLength = 0;
	trailAlpha = 0;
	owner: Player = null;
	dmg = 0;
	lastHit: number[] = [];
	serverIndex = 0;
	skipMove = true;
	startTime = 0;
	maxLifeTime = 0;
	explodeOnDeath = false;
	updateAccuracy = 3;
	bounce = false;
	dustTimer = 0;
	update(delta: number, currentTime: number, clutter: any, tiles: Tile[], players: Player[]) {
		if (this.active) {
			let lifetime = currentTime - this.startTime;
			if (this.skipMove) {
				lifetime = 0;
				this.startTime = currentTime;
			}
			for (let g = 0; g < this.updateAccuracy; ++g) {
				let vel = this.speed * delta;
				if (this.active) {
					let changeX = (vel * Math.cos(this.dir)) / this.updateAccuracy;
					let changeY = (vel * Math.sin(this.dir)) / this.updateAccuracy;
					if (this.active && !this.skipMove && this.speed > 0) {
						this.x += changeX;
						this.y += changeY;
						if (getDistance(this.startX, this.startY, this.x, this.y) >= this.trailMaxLength) {
							this.startX += changeX;
							this.startY += changeY;
						}
					}
					this.cEndX = this.x + ((vel + this.height) * Math.cos(this.dir)) / this.updateAccuracy;
					this.cEndY = this.y + ((vel + this.height) * Math.sin(this.dir)) / this.updateAccuracy;
					for (let i = 0; i < clutter.length; ++i) {
						let tmpClutter = clutter[i];
						if (
							this.active &&
							tmpClutter.type === "clutter" &&
							tmpClutter.active &&
							tmpClutter.hc &&
							this.canSeeObject(tmpClutter, tmpClutter.h) &&
							tmpClutter.h * tmpClutter.tp >= this.yOffset &&
							this.lineInRect(
								tmpClutter.x,
								tmpClutter.y - tmpClutter.h,
								tmpClutter.w,
								tmpClutter.h - this.yOffset,
								true,
							)
						) {
							if (this.bounce) {
								this.bounceDir(
									this.cEndY <= tmpClutter.y - tmpClutter.h ||
										this.cEndY >= tmpClutter.y - this.yOffset,
								);
							} else {
								this.active = false;
								this.hitSomething(false, 2);
							}
						}
					}
					if (this.active) {
						for (let i = 0; i < tiles.length; ++i) {
							if (this.active) {
								let tmpTile = tiles[i];
								if (
									tmpTile.wall &&
									tmpTile.hasCollision &&
									this.canSeeObject(tmpTile, tmpTile.scale)
								) {
									if (tmpTile.bottom) {
										if (this.lineInRect(tmpTile.x, tmpTile.y, tmpTile.scale, tmpTile.scale, true)) {
											this.active = false;
										}
									} else if (
										this.lineInRect(
											tmpTile.x,
											tmpTile.y,
											tmpTile.scale,
											tmpTile.scale - this.owner.height - this.jumpY,
											true,
										)
									) {
										this.active = false;
									}
									if (!this.active) {
										if (this.bounce) {
											this.bounceDir(
												!(this.cEndX <= tmpTile.x) && !(this.cEndX >= tmpTile.x + tmpTile.scale),
											);
										} else {
											this.hitSomething(
												!(this.cEndX <= tmpTile.x) && !(this.cEndX >= tmpTile.x + tmpTile.scale),
												2,
											);
										}
									}
								}
							}
						}
					}
					if (
						this.active &&
						(typeof window === "undefined" || this.owner.index == player.get().index)
					) {
						for (let i = 0; i < players.length; i++) {
							let tmpPlayer = players[i];
							if (
								tmpPlayer.index === this.owner.index ||
								this.lastHit.includes(tmpPlayer.index) ||
								tmpPlayer.team === this.owner.team ||
								tmpPlayer.type !== "player" ||
								!tmpPlayer.onScreen ||
								tmpPlayer.dead
							) {
								continue;
							}
							if (
								this.lineInRect(
									tmpPlayer.x - tmpPlayer.width / 2,
									tmpPlayer.y - tmpPlayer.height - tmpPlayer.jumpY,
									tmpPlayer.width,
									tmpPlayer.height,
									this.pierceCount <= 1,
								) &&
								tmpPlayer.spawnProtection <= 0
							) {
								if (this.explodeOnDeath) {
									this.active = false;
									this.lastHit.push(tmpPlayer.index);
								} else if (this.dmg > 0) {
									this.lastHit.push(tmpPlayer.index);
									if (this.spriteIndex !== 2 && typeof window !== "undefined") {
										particleCone(
											12,
											tmpPlayer.x,
											tmpPlayer.y - tmpPlayer.height / 2 - tmpPlayer.jumpY,
											this.dir + Math.PI,
											Math.PI / randomInt(5, 7),
											0.5,
											16,
											0,
											true,
										);
										createLiquid(tmpPlayer.x, tmpPlayer.y, this.dir, 4);
									}
									if (this.pierceCount > 0) this.pierceCount--;
									if (this.pierceCount <= 0) this.active = false;
								}
							}
							if (!this.active) break;
						}
					}
					if (this.maxLifeTime != null && lifetime >= this.maxLifeTime) {
						this.active = false;
					}
				}
			}
			if (this.spriteIndex === 1) {
				this.dustTimer -= delta;
				if (this.dustTimer <= 0 && typeof window !== "undefined") {
					stillDustParticle(this.x, this.y, true);
					this.dustTimer = 20;
				}
			}
		} else if (!this.active && this.trailAlpha > 0) {
			this.trailAlpha -= delta * 0.001;
			if (this.trailAlpha <= 0) {
				this.trailAlpha = 0;
			}
		}
		this.skipMove = false;
	}
	activate() {
		this.skipMove = true;
		this.lastHit = [];
		this.active = true;
		if (typeof window !== "undefined") playSound(`shot${this.weaponIndex}`, this.x, this.y);
	}
	canSeeObject(a: any, b: number) {
		let f = Math.abs(this.cEndX - a.x);
		let h = Math.abs(this.cEndY - a.y);
		return f <= (b + this.height) * 2 && h <= (b + this.height) * 2;
	}
	deactivate() {
		this.active = false;
	}
	hitSomething(a: boolean, b: number) {
		if (this.spriteIndex !== 2 && typeof window !== "undefined") {
			particleCone(
				10,
				this.cEndX,
				this.cEndY,
				this.dir + Math.PI,
				Math.PI / randomInt(5, 7),
				0.5,
				16,
				b,
				a,
			);
		}
	}
	bounceDir(a: boolean) {
		this.dir = a ? Math.PI * 2 - this.dir : Math.PI - this.dir;
		this.active = true;
		this.speed *= 0.65;
		this.x = this.cEndX;
		this.y = this.cEndY;
	}
	lineInRect(a: number, b: number, d: number, e: number, f: boolean) {
		var g = this.x;
		var h = this.y;
		var k = g;
		var l = this.cEndX;
		if (k > l) {
			k = this.cEndX;
			l = g;
		}
		if (l > a + d) {
			l = a + d;
		}
		if (k < a) {
			k = a;
		}
		if (k > l) {
			return false;
		}
		var m = h;
		var p = this.cEndY;
		var q = this.cEndX - g;
		if (Math.abs(q) > 1e-7) {
			p = (this.cEndY - h) / q;
			g = h - p * g;
			m = p * k + g;
			p = p * l + g;
		}
		if (m > p) {
			k = p;
			p = m;
			m = k;
		}
		if (p > b + e) {
			p = b + e;
		}
		if (m < b) {
			m = b;
		}
		if (m > p) {
			return false;
		}
		if (f) {
			this.adjustOnCollision(a, b, d, e);
		}
		return true;
	}
	dotInRect(a: number, b: number, d: number, e: number, f: number, h: number) {
		return a >= d && a <= d + f && b >= e && b <= e + h;
	}
	adjustOnCollision(a: number, b: number, d: number, e: number) {
		let h = this.cEndX,
			g = this.cEndY;
		for (let f = 100; f > 0; ) {
			f--;
			if (this.dotInRect(h, g, a, b, d, e)) {
				f = 0;
			} else {
				h += Math.cos(this.dir + Math.PI) * 2;
				g += Math.sin(this.dir + Math.PI) * 2;
			}
		}
		for (let f = 100; f > 0; ) {
			f--;
			if (this.dotInRect(h, g, a, b, d, e)) {
				h += Math.cos(this.dir + Math.PI) * 2;
				g += Math.sin(this.dir + Math.PI) * 2;
			} else {
				f = 0;
			}
		}
		this.cEndX = h;
		this.cEndY = g;
		this.x = this.cEndX;
		this.y = this.cEndY;
	}
}
