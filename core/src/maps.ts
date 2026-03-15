import type { GenData } from "./types.ts";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import { readdir } from "fs/promises";

export const defaultGenData: GenData[] = [];

//this could probably be better
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, "../assets/maps");
const files = (await readdir(dir))
  .filter(f => f.endsWith(".png"))
  .sort();

for (let i = 0; i < files.length; i++) {
  const { data, info } = await sharp(path.join(dir, files[i]))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  defaultGenData.push({
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  });
}
