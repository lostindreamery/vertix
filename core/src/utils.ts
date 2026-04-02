import type { Projectile } from "./logic/projectile.ts";
import { st } from "./state.svelte.ts";
import type { Player, Tile } from "./types.ts";

var bulletIndex = 0;
export function getNextBullet(bullets: Projectile[]) {
	bulletIndex++;
	if (bulletIndex >= bullets.length) {
		bulletIndex = 0;
	}
	return bullets[bulletIndex];
}
export function shootNextBullet(
	init: any,
	source: Player,
	targetD: number,
	currentTime: number,
	bullet: Projectile,
) {
	let weapon = getCurrentWeapon(source);
	if (bullet !== undefined) {
		bullet.serverIndex = init.si;
		bullet.x = init.x - 1;
		bullet.startX = init.x;
		bullet.y = init.y;
		bullet.startY = init.y;
		bullet.dir = init.d;
		bullet.speed = weapon.bSpeed;
		bullet.updateAccuracy = weapon.cAcc;
		bullet.width = weapon.bWidth;
		bullet.height = weapon.bHeight;
		let randScale = weapon.bRandScale;
		if (randScale != null) {
			let rand = randomFloat(randScale[0], randScale[1]);
			bullet.width *= rand;
			bullet.height *= rand;
			bullet.speed *= 1 + weapon.spread[weapon.spreadIndex];
		}
		bullet.trailWidth = bullet.width * 0.7;
		bullet.trailMaxLength = Math.round(bullet.height * 5);
		bullet.trailAlpha = weapon.bTrail;
		bullet.weaponIndex = weapon.weaponIndex;
		bullet.spriteIndex = weapon.bSprite;
		bullet.yOffset = weapon.yOffset;
		bullet.jumpY = source.jumpY;
		bullet.owner = source;
		bullet.dmg = weapon.dmg;
		bullet.bounce = weapon.bounce;
		bullet.startTime = currentTime;
		bullet.maxLifeTime = weapon.maxLife;
		if (weapon.distBased) {
			bullet.maxLifeTime = targetD / bullet.speed;
		}
		bullet.glowWidth = weapon.glowWidth;
		bullet.glowHeight = weapon.glowHeight;
		bullet.explodeOnDeath = weapon.explodeOnDeath;
		bullet.pierceCount = weapon.pierce;
		bullet.blastRadius = weapon.blastRadius;
		bullet.activate();
	}
	bullet = null;
}
export function setupMap(a: any, mapTileScale: number, gameObjects: any) {
	var b = a.genData;
	var d = -(mapTileScale * 2);
	var e = -(mapTileScale * 2);
	var f = 0;
	var h = b.height;
	a.tilePerCol = h;
	a.width = (b.width - 4) * mapTileScale;
	a.height = (b.height - 4) * mapTileScale;
	a.scoreToWin = a.gameMode.score;
	var l = b.data.data || b.data;
	for (let i = 0; i < b.width; i++) {
		for (let j = 0; j < b.height; j++) {
			const tileDataBaseIdx = (b.width * j + i) << 2;
			let p = `${l[tileDataBaseIdx]} ${l[tileDataBaseIdx + 1]} ${l[tileDataBaseIdx + 2]}`;
			const n: Tile = {
				index: f,
				scale: mapTileScale,
				x: 0,
				y: 0,
				wall: false,
				spriteIndex: 0,
				left: 0,
				right: 0,
				top: 0,
				bottom: 0,
				topLeft: 0,
				topRight: 0,
				bottomLeft: 0,
				bottomRight: 0,
				neighbours: 0,
				hasCollision: false,
				hardPoint: false,
				objTeam: "e",
				edgeTile: false,
			};
			n.x = d + mapTileScale * i;
			n.y = e + mapTileScale * j;
			if (i === 0 && j === 0) {
				p = "0 0 0";
			}
			let tmpTile: Tile;
			if (p === "0 0 0") {
				n.wall = true;
				n.hasCollision = true;
				tmpTile = a.tiles[f - h];
				if (tmpTile !== undefined) {
					if (tmpTile.wall) {
						n.left = 1;
						n.neighbours += 1;
					}
					tmpTile.right = 1;
					tmpTile.neighbours += 1;
				}
				tmpTile = a.tiles[f - h - 1];
				if (tmpTile?.wall) {
					tmpTile.spriteIndex = 0;
				}
				tmpTile = a.tiles[f - h - 1];
				if (tmpTile?.wall) {
					n.topLeft = 1;
					tmpTile.bottomRight = 1;
				}
				tmpTile = a.tiles[f - h + 1];
				if (tmpTile !== undefined) {
					tmpTile.topRight = 1;
					if (tmpTile.wall) {
						n.bottomLeft = 1;
					}
				}
				tmpTile = a.tiles[f - 1];
				if (tmpTile !== undefined) {
					if (tmpTile.wall) {
						n.top = 1;
						n.neighbours += 1;
					}
					tmpTile.bottom = 1;
					tmpTile.neighbours += 1;
				}
				if (i <= 0 || j <= 0 || i >= b.width - 1 || j >= b.height - 1) {
					n.left = 1;
					n.right = 1;
					n.top = 1;
					n.bottom = 1;
					n.neighbours = 4;
					n.edgeTile = true;
				}
				/*
				if (n.spriteIndex === 0 && randomInt(0, 2) === 0) {
					n.spriteIndex = randomInt(1, 2);
				}
				*/
			} else {
				let rand = randomInt(0, 10);
				n.spriteIndex = 0;
				if (rand <= 0) {
					n.spriteIndex = 1;
				}
				n.wall = false;
				tmpTile = a.tiles[f - h];
				if (tmpTile?.wall) {
					n.left = 1;
					n.neighbours += 1;
				}
				tmpTile = a.tiles[f - 1];
				if (tmpTile?.wall) {
					n.top = 1;
					n.neighbours += 1;
				}
				tmpTile = a.tiles[f - h - 1];
				if (tmpTile?.wall) {
					n.topLeft = 1;
				}
				if (p === "0 255 0") {
					n.spriteIndex = 2;
				} else if (p === "255 255 0") {
					if (a.gameMode.name === "Hardpoint" || a.gameMode.name === "Zone War") {
						n.hardPoint = true;
						if (a.gameMode.name === "Zone War") {
							n.objTeam = i < b.width / 2 ? "red" : "blue";
						}
					} else {
						n.spriteIndex = 1;
					}
				}
			}
			a.tiles.push(n);
			f++;
		}
	}
	// tmpY = tmpShad = null;
	for (b = 0; b < a.tiles.length; ++b) {
		if (a.tiles[b].edgeTile) {
			a.tiles[b].hasCollision = false;
		} else if (!a.tiles[b].wall && a.tiles[b].hardPoint) {
			if (
				canPlaceFlag(a.tiles[b - h], true) &&
				canPlaceFlag(a.tiles[b - 1], false)
			) {
				gameObjects.push({
					type: "flag",
					team: a.tiles[b].objTeam,
					x: a.tiles[b].x + 40,
					y: a.tiles[b].y + 40,
					w: 70,
					h: 152,
					ai: randomInt(0, 2),
					ac: 0,
				});
			}
			if (
				canPlaceFlag(a.tiles[b + h], true) &&
				canPlaceFlag(a.tiles[b - 1], false)
			) {
				gameObjects.push({
					type: "flag",
					team: a.tiles[b].objTeam,
					x: a.tiles[b].x + mapTileScale - 30 - 40,
					y: a.tiles[b].y + 40,
					w: 70,
					h: 152,
					ai: randomInt(0, 2),
					ac: 0,
				});
			}
			if (
				canPlaceFlag(a.tiles[b + h], true) &&
				canPlaceFlag(a.tiles[b + 1], false)
			) {
				gameObjects.push({
					type: "flag",
					team: a.tiles[b].objTeam,
					x: a.tiles[b].x + mapTileScale - 30 - 40,
					y: a.tiles[b].y + mapTileScale - 30 - 40,
					w: 70,
					h: 152,
					ai: randomInt(0, 2),
					ac: 0,
				});
			}
			if (
				canPlaceFlag(a.tiles[b - h], true) &&
				canPlaceFlag(a.tiles[b + 1], false)
			) {
				gameObjects.push({
					type: "flag",
					team: a.tiles[b].objTeam,
					x: a.tiles[b].x + 40,
					y: a.tiles[b].y + mapTileScale - 30 - 40,
					w: 70,
					h: 152,
					ai: randomInt(0, 2),
					ac: 0,
				});
			}
		}
	}
}
function canPlaceFlag(tile: Tile, ignoreWalls: boolean) {
	if (ignoreWalls) {
		return tile !== undefined && !tile.wall && !tile.hardPoint;
	} else {
		return tile !== undefined && !tile.hardPoint;
	}
}
export function wallCol(player: Player, tiles: Tile[], gameObjects: any) {
	if (player.dead) return;
	player.nameYOffset = 0;
	for (const tmpTile of tiles) {
		if (!tmpTile.wall || !tmpTile.hasCollision) continue;
		if (
			player.x + player.width / 2 >= tmpTile.x &&
			player.x - player.width / 2 <= tmpTile.x + tmpTile.scale &&
			player.y >= tmpTile.y &&
			player.y <= tmpTile.y + tmpTile.scale
		) {
			if (player.oldX <= tmpTile.x) {
				player.x = tmpTile.x - player.width / 2 - 2;
			} else if (player.oldX - player.width / 2 >= tmpTile.x + tmpTile.scale) {
				player.x = tmpTile.x + tmpTile.scale + player.width / 2 + 2;
			}
			if (player.oldY <= tmpTile.y) {
				player.y = tmpTile.y - 2;
			} else if (player.oldY >= tmpTile.y + tmpTile.scale) {
				player.y = tmpTile.y + tmpTile.scale + 2;
			}
		}
		if (
			!tmpTile.hardPoint &&
			player.x > tmpTile.x &&
			player.x < tmpTile.x + tmpTile.scale &&
			player.y - player.jumpY - player.height * 0.85 > tmpTile.y - tmpTile.scale / 2 &&
			player.y - player.jumpY - player.height * 0.85 <= tmpTile.y
		) {
			player.nameYOffset = Math.round(
				player.y - player.jumpY - player.height * 0.85 - (tmpTile.y - tmpTile.scale / 2),
			);
		}
	}
	for (const tmpObj of gameObjects) {
		if (tmpObj.type !== "clutter" || !tmpObj.active) continue;
		if (
			tmpObj.hc &&
			//canSee(b.x - startX, b.y - startY, b.w, b.h) &&
			player.x + player.width / 2 >= tmpObj.x &&
			player.x - player.width / 2 <= tmpObj.x + tmpObj.w &&
			player.y >= tmpObj.y - tmpObj.h * tmpObj.tp &&
			player.y <= tmpObj.y
		) {
			if (player.oldX + player.width / 2 <= tmpObj.x) {
				player.x = tmpObj.x - player.width / 2 - 1;
			} else if (player.oldX - player.width / 2 >= tmpObj.x + tmpObj.w) {
				player.x = tmpObj.x + tmpObj.w + player.width / 2 + 1;
			}
			if (player.oldY >= tmpObj.y) {
				player.y = tmpObj.y + 1;
			} else if (player.oldY <= tmpObj.y - tmpObj.h * tmpObj.tp) {
				player.y = tmpObj.y - tmpObj.h * tmpObj.tp - 1;
			}
		}
	}
}
export function getCurrentWeapon(player: Player) {
	return player.weapons?.[player.currentWeapon] ?? null;
}
export function roundNumber(num: number, fractionDigits: number) {
	return +num.toFixed(fractionDigits);
}
export function getAngleDifference(angleA: number, angleB: number) {
	const anglDif = Math.abs(angleB - angleA) % (Math.PI * 2);
	if (anglDif > Math.PI) {
		return Math.PI * 2 - anglDif;
	} else {
		return anglDif;
	}
}
export function jsonByteCount(obj: object) {
	return byteCount(JSON.stringify(obj));
}
export function byteCount(str: string) {
	return encodeURI(str).split(/%..|./).length - 1;
}
export function getDistance(x1: number, y1: number, x2: number, y2: number) {
	return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
export function getAngle(x1: number, y1: number, x2: number, y2: number) {
	return Math.atan2(y2 - y1, x2 - x1);
}
export function shadeColor(hexColor: string, percent: number) {
	var r = parseInt(hexColor.substring(1, 3), 16);
	var g = parseInt(hexColor.substring(3, 5), 16);
	var b = parseInt(hexColor.substring(5, 7), 16);
	r = (r * (100 + percent)) / 100;
	g = (g * (100 + percent)) / 100;
	b = (b * (100 + percent)) / 100;
	r = r < 255 ? r : 255;
	g = g < 255 ? g : 255;
	b = b < 255 ? b : 255;
	var rstr = r.toString(16).length === 1 ? `0${r.toString(16)}` : r.toString(16);
	var gstr = g.toString(16).length === 1 ? `0${g.toString(16)}` : g.toString(16);
	var bstr = b.toString(16).length === 1 ? `0${b.toString(16)}` : b.toString(16);
	return `#${rstr}${gstr}${bstr}`;
}
export function randomFloat(min: number, max: number) {
	return min + Math.random() * (max - min);
}
export function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function linearInterpolate(current: number, target: number, step: number) {
	var delta = current - target;
	if (delta * delta > step * step) {
		return target + step;
	} else {
		return current;
	}
}
export function isImageOk(img: HTMLImageElement) {
	return img.complete && img.naturalWidth !== 0;
}
export function canSee(x: number, y: number, width: number, height: number) {
	return x + width > 0 && y + height > 0 && x < st.maxScreenWidth && y < st.maxScreenHeight;
}
