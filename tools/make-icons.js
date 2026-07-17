// Generate icons/ — a golden idol among jungle leaves.
// Run: node tools/make-icons.js  (from the deep-jungle folder)
const fs = require("fs");
const path = require("path");
const { makeCanvas, downsample, encodePNG } = require("../lib/tools/png.js");

const OUT = path.join(__dirname, "..", "icons");
fs.mkdirSync(OUT, { recursive: true });

function paint(size, pad) {
  const SS = 4, big = size * SS;
  const cv = makeCanvas(big);
  const u = big / 100; // percentage unit

  // deep jungle backdrop
  cv.fillRect(0, 0, big, big, "#0a1f14");
  // faint canopy glow
  cv.fillCircle(50 * u, 30 * u, 46 * u, "#123524");
  cv.fillCircle(50 * u, 24 * u, 34 * u, "#1a4a30");

  // leaves framing the corners
  const leaf = (cx, cy, r, col) => {
    cv.fillCircle(cx, cy, r, col);
    cv.fillCircle(cx + r * 0.7, cy - r * 0.5, r * 0.75, col);
  };
  const margin = pad ? 16 : 6;
  leaf(margin * u, (100 - margin) * u, 16 * u, "#2e7d43");
  leaf((100 - margin) * u, (100 - margin + 2) * u, 14 * u, "#256b38");
  leaf((margin - 4) * u, (margin + 6) * u, 12 * u, "#256b38");
  leaf((100 - margin + 2) * u, margin * u, 13 * u, "#2e7d43");

  // stone plinth
  cv.fillRect(34 * u, 72 * u, 32 * u, 10 * u, "#5c5347");
  cv.fillRect(31 * u, 80 * u, 38 * u, 6 * u, "#4a4238");

  // golden idol — head
  const gold = "#f5c542", goldDark = "#c99a1e", goldLite = "#ffe08a";
  cv.fillRect(38 * u, 40 * u, 24 * u, 32 * u, gold);          // face block
  cv.fillRect(35 * u, 46 * u, 3 * u, 14 * u, goldDark);       // ears
  cv.fillRect(62 * u, 46 * u, 3 * u, 14 * u, goldDark);
  cv.fillRect(40 * u, 30 * u, 20 * u, 10 * u, goldDark);      // headdress base
  cv.fillRect(44 * u, 22 * u, 12 * u, 8 * u, gold);           // headdress top
  cv.fillRect(48 * u, 16 * u, 4 * u, 6 * u, goldLite);        // crest
  // eyes
  cv.fillRect(42 * u, 50 * u, 6 * u, 5 * u, "#0a1f14");
  cv.fillRect(52 * u, 50 * u, 6 * u, 5 * u, "#0a1f14");
  cv.fillRect(43 * u, 51 * u, 2 * u, 2 * u, "#7ef0c0");       // emerald glint
  cv.fillRect(53 * u, 51 * u, 2 * u, 2 * u, "#7ef0c0");
  // mouth
  cv.fillRect(45 * u, 62 * u, 10 * u, 4 * u, "#0a1f14");
  cv.fillRect(47 * u, 63 * u, 6 * u, 2 * u, goldDark);
  // shine
  cv.fillRect(39 * u, 42 * u, 3 * u, 20 * u, goldLite);

  // sparkle
  cv.fillRect(68 * u, 34 * u, 2 * u, 8 * u, "#ffffff");
  cv.fillRect(65 * u, 37 * u, 8 * u, 2 * u, "#ffffff");

  return encodePNG(size, size, downsample(cv.px, big, SS));
}

fs.writeFileSync(path.join(OUT, "icon-192.png"), paint(192, false));
fs.writeFileSync(path.join(OUT, "icon-512.png"), paint(512, false));
fs.writeFileSync(path.join(OUT, "maskable-512.png"), paint(512, true));
console.log("icons written to", OUT);
