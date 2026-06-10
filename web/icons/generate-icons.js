'use strict';
/* Generateur d'icones PWA — pur Node (zlib), sans dependance.
   Dessine le losange neon ◆ de la marque sur fond sombre degrade.
   Usage : node web/icons/generate-icons.js  */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filtre none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Genere une icone NxN. maskable => pas d'arrondi + contenu dans la zone sure.
function makeIcon(N, { maskable = false } = {}) {
  const buf = Buffer.alloc(N * N * 4);
  const cx = N / 2, cy = N / 2;
  const radius = N * 0.22;          // arrondi du fond
  const scale = maskable ? 0.62 : 0.78; // taille du losange (plus petit si maskable)
  const R = (N / 2) * scale;        // demi-diagonale du losange
  const VIOLET = [168, 85, 247], RED = [255, 45, 85];
  const BG_IN = [26, 15, 46], BG_OUT = [10, 10, 15];

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = x - cx, dy = y - cy;
      const i = (y * N + x) * 4;

      // Fond : degrade radial sombre.
      const rg = clamp01(Math.hypot(dx, dy) / (N * 0.7));
      let r = lerp(BG_IN[0], BG_OUT[0], rg);
      let g = lerp(BG_IN[1], BG_OUT[1], rg);
      let b = lerp(BG_IN[2], BG_OUT[2], rg);
      let a = 255;

      // Masque coins arrondis (icones standard uniquement).
      if (!maskable) {
        const qx = Math.abs(dx) - (N / 2 - radius);
        const qy = Math.abs(dy) - (N / 2 - radius);
        const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
        if (outside > 0) a = 0;
      }

      // Losange : distance de Manhattan normalisee.
      const d = (Math.abs(dx) + Math.abs(dy)) / R;
      const tv = clamp01((dy + R) / (2 * R)); // gradient vertical violet->rouge
      const col = [lerp(VIOLET[0], RED[0], tv), lerp(VIOLET[1], RED[1], tv), lerp(VIOLET[2], RED[2], tv)];

      if (d <= 1) {
        // Interieur : losange evide (anneau lumineux) pour un look "◆".
        const inner = 0.58;
        const onRing = d > inner;
        const bright = onRing ? 1 : 0.18 + 0.3 * (1 - d);
        r = lerp(r, col[0], bright); g = lerp(g, col[1], bright); b = lerp(b, col[2], bright);
      } else if (d <= 1.5) {
        // Halo neon exterieur.
        const glow = (1.5 - d) / 0.5;
        const k = glow * glow * 0.85;
        r = lerp(r, col[0], k); g = lerp(g, col[1], k); b = lerp(b, col[2], k);
      }

      buf[i] = Math.round(r); buf[i + 1] = Math.round(g); buf[i + 2] = Math.round(b); buf[i + 3] = a;
    }
  }
  return encodePNG(N, N, buf);
}

const out = __dirname;
const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-512-maskable.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, {}]
];
for (const [name, size, opts] of targets) {
  fs.writeFileSync(path.join(out, name), makeIcon(size, opts));
  console.log('genere', name);
}
