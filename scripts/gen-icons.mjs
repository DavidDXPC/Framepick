#!/usr/bin/env node
// Rasterize the FramePick mark (public/favicon.svg) into the PNG icon set:
// extension toolbar icons + web app touch icons. Run once and commit the
// output — CI never needs sharp.
//
//   npm i --no-save sharp && node scripts/gen-icons.mjs

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svg = await readFile(join(root, 'public', 'favicon.svg'));

const targets = [
	{ out: join(root, 'extension', 'icons', 'icon16.png'), size: 16 },
	{ out: join(root, 'extension', 'icons', 'icon32.png'), size: 32 },
	{ out: join(root, 'extension', 'icons', 'icon48.png'), size: 48 },
	{ out: join(root, 'extension', 'icons', 'icon128.png'), size: 128 },
	{ out: join(root, 'public', 'icons', 'apple-touch-icon.png'), size: 180 },
	{ out: join(root, 'public', 'icons', 'icon-512.png'), size: 512 },
];

for (const t of targets) {
	await mkdir(dirname(t.out), { recursive: true });
	const png = await sharp(svg, { density: Math.max(72, (t.size / 100) * 72 * 4) })
		.resize(t.size, t.size)
		.png()
		.toBuffer();
	await writeFile(t.out, png);
	console.log(`✓ ${t.out} (${t.size}×${t.size})`);
}
