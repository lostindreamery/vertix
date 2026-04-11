import { playSound } from "../sound.ts";
import { st } from "../state.svelte.ts";
import type { Player, Tile } from "../types.ts";
import { dotInRect, getDistance, randomInt } from "../utils.ts";
import { createLiquid, particleCone, stillDustParticle } from "../visual/particle.ts";

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
	selfDamage = false;
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
					for (const [i, clt] of clutter.entries()) {
						if (
							this.active &&
							clt.active &&
							clt.hc &&
							this.canSeeObject(clt, clt.h) &&
							clt.h * clt.tp >= this.yOffset &&
							this.lineInRect(clt.x, clt.y - clt.h, clt.w, clt.h - this.yOffset, true)
						) {
							if (this.bounce) {
								this.bounceDir(this.cEndY <= clt.y - clt.h || this.cEndY >= clt.y - this.yOffset);
							} else {
								this.active = false;
								if (clt.i === 2) {
									this.dmg = 92;
									this.blastRadius = 150;
									this.explodeOnDeath = true;
									this.selfDamage = true;
									this.lastHit.push(i);
								}
								this.hitSomething(false, 2);
							}
						}
					}
					if (this.active) {
						for (const tl of tiles) {
							if (this.active) {
								if (tl.wall && tl.hasCollision && this.canSeeObject(tl, tl.scale)) {
									if (tl.bottom) {
										if (this.lineInRect(tl.x, tl.y, tl.scale, tl.scale, true)) {
											this.active = false;
										}
									} else if (
										this.lineInRect(
											tl.x,
											tl.y,
											tl.scale,
											tl.scale - this.owner.height - this.jumpY,
											true,
										)
									) {
										this.active = false;
									}
									if (!this.active) {
										if (this.bounce) {
											this.bounceDir(!(this.cEndX <= tl.x) && !(this.cEndX >= tl.x + tl.scale));
										} else {
											this.hitSomething(
												!(this.cEndX <= tl.x) && !(this.cEndX >= tl.x + tl.scale),
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
						(typeof window === "undefined" || this.owner.index == st.player.index)
					) {
						for (const [i, pl] of players.entries()) {
							if (
								pl.index === this.owner.index ||
								this.lastHit.includes(pl.index) ||
								pl.team === this.owner.team ||
								!pl.onScreen ||
								pl.dead
							) {
								continue;
							}
							if (
								this.lineInRect(
									pl.x - pl.width / 2,
									pl.y - pl.height - pl.jumpY,
									pl.width,
									pl.height,
									this.pierceCount <= 1,
								) &&
								pl.spawnProtection <= 0
							) {
								if (this.explodeOnDeath) {
									this.active = false;
								} else if (this.dmg > 0) {
									this.lastHit.push(i);
									if (this.spriteIndex !== 2 && typeof window !== "undefined") {
										particleCone(
											12,
											pl.x,
											pl.y - pl.height / 2 - pl.jumpY,
											this.dir + Math.PI,
											Math.PI / randomInt(5, 7),
											0.5,
											16,
											0,
											true,
										);
										createLiquid(pl.x, pl.y, this.dir, 4);
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
	adjustOnCollision(a: number, b: number, d: number, e: number) {
		let h = this.cEndX,
			g = this.cEndY;
		for (let i = 100; i > 0; ) {
			i--;
			if (dotInRect(h, g, a, b, d, e)) {
				i = 0;
			} else {
				h += Math.cos(this.dir + Math.PI) * 2;
				g += Math.sin(this.dir + Math.PI) * 2;
			}
		}
		for (let i = 100; i > 0; ) {
			i--;
			if (dotInRect(h, g, a, b, d, e)) {
				h += Math.cos(this.dir + Math.PI) * 2;
				g += Math.sin(this.dir + Math.PI) * 2;
			} else {
				i = 0;
			}
		}
		this.cEndX = h;
		this.cEndY = g;
		this.x = this.cEndX;
		this.y = this.cEndY;
	}
}
