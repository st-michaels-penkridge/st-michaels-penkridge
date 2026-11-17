// Rebuilds oversized large photos (images/opt/*-1600.webp over 250KB) from their original JPG,
// at the same pixel size and WebP quality 75. A file is only replaced when the new one is at
// least 20% smaller, so photos never get visibly worse for a tiny saving.
// Usage (from the repo folder): npm install --no-save sharp, then node .ai/tools/compress-webp.mjs
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const DIR = 'images/opt';
const LIMIT = 250 * 1024;
let replaced = 0, saved = 0;

for (const name of readdirSync(DIR).filter((n) => n.endsWith('-1600.webp'))) {
  const file = join(DIR, name);
  const size = statSync(file).size;
  if (size <= LIMIT) continue;
  const id = name.replace('-1600.webp', '');
  const original = ['jpg', 'jpeg', 'JPG'].map((ext) => `images/${id}.${ext}`).find(existsSync);
  if (!original) { console.log(`kept    ${name} ${Math.round(size / 1024)}KB (no original JPG)`); continue; }
  const { width } = await sharp(file).metadata();
  const out = await sharp(original).rotate().resize({ width }).webp({ quality: 75, effort: 6 }).toBuffer();
  if (out.length > size * 0.8) { console.log(`kept    ${name} ${Math.round(size / 1024)}KB (rebuilding would save under 20%)`); continue; }
  writeFileSync(file, out);
  replaced++; saved += size - out.length;
  console.log(`SHRUNK  ${name} ${Math.round(size / 1024)}KB -> ${Math.round(out.length / 1024)}KB`);
}
console.log(`\n${replaced} replaced, ${Math.round(saved / 1024)}KB saved`);
