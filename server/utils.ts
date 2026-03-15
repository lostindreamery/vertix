import { gameModes } from "core/src/gamemodes.ts";
import { weapons } from "core/src/loadouts.ts";
import { defaultGenData } from "core/src/maps.ts";
import type { GameMode, GenData, MapData, MapObject, Player, Tile } from "core/src/types.ts";
import { getDistance, setupMap, } from "core/src/utils.ts";

export class Room {
  id = 0;
  room = "DEV";
  players: Player[] = [];
  mapData: MapData;
  tileScale = 256;
  tiles: Tile[] = [];
  clutter: MapObject[] = [];
  pickups: MapObject[] = [];
  gameMode: GameMode
  scoreRed = 0;
  scoreBlue = 0;
  bullets: ServerProjectile[] = [];
  nextAvailableSid = 0;

  constructor() {
    this.gameMode = gameModes[1];
    this.mapData = this.newMap(defaultGenData[this.gameMode.maps[0]])
    for (let i = 0; i < 100; i++) {
      this.bullets.push(new ServerProjectile());
    }
  }

  newPlayer() {
    let sid = this.nextAvailableSid
    this.nextAvailableSid++
    let tmpPlayer = {
      id: this.id,
      room: this.room,
      index: sid,
      name: `Guest_${sid}`,
      account: { clan: "" },
      classIndex: 0,
      currentWeapon: 0,
      weapons: structuredClone([weapons[0], weapons[5]]),
      health: 0,
      maxHealth: 0,
      height: 100,
      width: 50,
      speed: 0.5,
      jumpY: 0,
      jumpDelta: 0,
      jumpStrength: 0.72,
      gravityStrength: 0.0058,
      jumpCountdown: 0,
      frameCountdown: 0,
      kills: 0,
      deaths: 0,
      score: 0,
      angle: 0,
      x: 0,
      y: 0,
      oldX: 0,
      oldY: 0,
      spawnProtection: 0,
      nameYOffset: 0,
      dead: true,
      onScreen: false,
      type: "player",
      delta: 0,
      targetF: 0,
      animIndex: 0,
      team: this.players.length % 2 === 0 ? "blue" : "red",
    }
    this.players.push(tmpPlayer);
    return tmpPlayer;
  }

  newMap(genData: GenData) {
    this.tiles = [];
    this.clutter = [];
    this.pickups = [];
    let tmpMap = {
      gameMode: this.gameMode,
      genData: genData,
      tiles: this.tiles,
      clutter: this.clutter,
      pickups: this.pickups,
      width: (genData.width - 4) * this.tileScale,
      height: (genData.height - 4) * this.tileScale,
    };
    setupMap(tmpMap, this.tileScale);
    return tmpMap;
  }
}

export class ServerProjectile {
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
	owner: any = null;
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
	update(
		delta: number,
		currentTime: number,
		clutter: any,
		tiles: any,
		players: any,
	) {
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
						if (
							getDistance(this.startX, this.startY, this.x, this.y) >=
							this.trailMaxLength
						) {
							this.startX += changeX;
							this.startY += changeY;
						}
					}
					this.cEndX =
						this.x +
						((vel + this.height) * Math.cos(this.dir)) / this.updateAccuracy;
					this.cEndY =
						this.y +
						((vel + this.height) * Math.sin(this.dir)) / this.updateAccuracy;
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
										if (
											this.lineInRect(
												tmpTile.x,
												tmpTile.y,
												tmpTile.scale,
												tmpTile.scale,
												true,
											)
										) {
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
												!(this.cEndX <= tmpTile.x) &&
													!(this.cEndX >= tmpTile.x + tmpTile.scale),
											);
										} else {
											this.hitSomething(
												!(this.cEndX <= tmpTile.x) &&
													!(this.cEndX >= tmpTile.x + tmpTile.scale),
												2,
											);
										}
									}
								}
							}
						}
					}
					if (this.active) {
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
								} else if (this.dmg > 0) {
									this.lastHit.push(tmpPlayer.index);
									if (this.spriteIndex !== 2) {
										//(particleCone(
										//	12,
										//	k.x,
										//	k.y - k.height / 2 - k.jumpY,
										//	this.dir + Math.PI,
										//	Math.PI / randomInt(5, 7),
										//	0.5,
										//	16,
										//	0,
										//	true,
										//),
										//createLiquid(k.x, k.y, this.dir, 4)),
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
				if (this.dustTimer <= 0) {
					//stillDustParticle(this.x, this.y, true);
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
		//playSound(`shot${this.weaponIndex}`, this.x, this.y);
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
		if (this.spriteIndex !== 2) {
			//particleCone(
			//	10,
			//	this.cEndX,
			//	this.cEndY,
			//	this.dir + Math.PI,
			//	Math.PI / randomInt(5, 7),
			//	0.5,
			//	16,
			//	b,
			//	a,
			//);
		}
	}
	bounceDir(a: boolean) {
		this.dir = a ? Math.PI * 2 - this.dir : Math.PI - this.dir;
		this.active = true;
		this.speed *= 0.65;
		this.x = this.cEndX;
		this.y = this.cEndY;
	}
	lineInRect(
		rectX: number,
		rectY: number,
		rectW: number,
		rectH: number,
		adjust: boolean,
	) {
		var g = this.x;
		var h = this.y;
		var k = g;
		var l = this.cEndX;
		if (k > l) {
			k = this.cEndX;
			l = g;
		}
		if (l > rectX + rectW) {
			l = rectX + rectW;
		}
		if (k < rectX) {
			k = rectX;
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
		if (p > rectY + rectH) {
			p = rectY + rectH;
		}
		if (m < rectY) {
			m = rectY;
		}
		if (m > p) {
			return false;
		}
		if (adjust) {
			this.adjustOnCollision(rectX, rectY, rectW, rectH);
		}
		return true;
	}
	dotInRect(
		dotX: number,
		dotY: number,
		rectX: number,
		rectY: number,
		rectW: number,
		rectH: number,
	) {
		return (
			dotX >= rectX &&
			dotX <= rectX + rectW &&
			dotY >= rectY &&
			dotY <= rectY + rectH
		);
	}
	adjustOnCollision(
		rectX: number,
		rectY: number,
		rectW: number,
		rectH: number,
	) {
		let endX = this.cEndX;
		let endY = this.cEndY;
		for (let i = 100; i > 0; ) {
			i--;
			if (this.dotInRect(endX, endY, rectX, rectY, rectW, rectH)) {
				i = 0;
			} else {
				endX += Math.cos(this.dir + Math.PI) * 2;
				endY += Math.sin(this.dir + Math.PI) * 2;
			}
		}
		for (let f = 100; f > 0; ) {
			f--;
			if (this.dotInRect(endX, endY, rectX, rectY, rectW, rectH)) {
				endX += Math.cos(this.dir + Math.PI) * 2;
				endY += Math.sin(this.dir + Math.PI) * 2;
			} else {
				f = 0;
			}
		}
		this.cEndX = endX;
		this.cEndY = endY;
		this.x = this.cEndX;
		this.y = this.cEndY;
	}
}
