// Generates the PWA icon set from a single SVG source.
// Run via: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');
mkdirSync(publicDir, { recursive: true });

// Base "any" icon: dumbbell glyph on a deep slate background that matches the
// app's dark theme. The artwork keeps the dumbbell within ~72% of the canvas
// so the maskable variant survives Android's circular safe-area crop.
function svgAny() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="92" fill="#0f172a"/>
  <g fill="none" stroke="#a5b4fc" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
    <line x1="160" y1="256" x2="352" y2="256"/>
    <line x1="120" y1="200" x2="120" y2="312"/>
    <line x1="392" y1="200" x2="392" y2="312"/>
    <line x1="80" y1="220" x2="80" y2="292"/>
    <line x1="432" y1="220" x2="432" y2="292"/>
  </g>
</svg>`;
}

function svgMaskable() {
  // Same artwork but reduced inside an 80% safe-area circle, on an opaque
  // background — required by the maskable purpose.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0f172a"/>
  <g transform="translate(51 51) scale(0.8)" fill="none" stroke="#a5b4fc" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
    <line x1="160" y1="256" x2="352" y2="256"/>
    <line x1="120" y1="200" x2="120" y2="312"/>
    <line x1="392" y1="200" x2="392" y2="312"/>
    <line x1="80" y1="220" x2="80" y2="292"/>
    <line x1="432" y1="220" x2="432" y2="292"/>
  </g>
</svg>`;
}

async function emit(name, size, body) {
  const buf = await sharp(Buffer.from(body)).resize(size, size).png().toBuffer();
  writeFileSync(resolve(publicDir, name), buf);
  console.log(`wrote ${name} (${size}×${size})`);
}

const any = svgAny();
const maskable = svgMaskable();

await emit('icon-192.png', 192, any);
await emit('icon-512.png', 512, any);
await emit('icon-512-maskable.png', 512, maskable);
await emit('apple-touch-icon.png', 180, any);

// Also keep the source SVG for the browser favicon.
writeFileSync(resolve(publicDir, 'icon.svg'), any);
console.log('done');
