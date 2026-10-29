// scripts/gen-icons.js
// Generate PWA icons (192, 512, maskable) from an inline SVG.
// Run: `node scripts/gen-icons.js` (or `bun scripts/gen-icons.js`).
// Uses sharp (already installed).

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// A simple, recognizable icon: rounded square with a chat/globe motif.
const svg = (size, padding = 0) => {
  const inner = size - padding * 2;
  const cx = size / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#06b6d4"/>
      <stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#g)"/>
  <g transform="translate(${padding}, ${padding})" fill="none" stroke="#ffffff" stroke-width="${size * 0.04}" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="${inner / 2}" cy="${inner / 2}" r="${inner * 0.32}"/>
    <path d="M ${inner * 0.18} ${inner / 2} Q ${inner / 2} ${inner * 0.18} ${inner * 0.82} ${inner / 2} Q ${inner / 2} ${inner * 0.82} ${inner * 0.18} ${inner / 2} Z"/>
    <line x1="${inner / 2}" y1="${inner * 0.18}" x2="${inner / 2}" y2="${inner * 0.82}"/>
  </g>
  <text x="${cx}" y="${size * 0.93}" font-family="Arial, sans-serif" font-size="${size * 0.13}" font-weight="700" fill="#ffffff" text-anchor="middle" opacity="0.92">Linguava</text>
</svg>`;
};

(async () => {
  await sharp(Buffer.from(svg(512, 0))).png().toFile(path.join(OUT_DIR, 'icon-512.png'));
  await sharp(Buffer.from(svg(192, 0))).png().toFile(path.join(OUT_DIR, 'icon-192.png'));
  // Maskable icons need ~10% safe-zone padding on all sides.
  await sharp(Buffer.from(svg(512, 64))).png().toFile(path.join(OUT_DIR, 'icon-maskable.png'));
  console.log('PWA icons generated.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
