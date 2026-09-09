import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";

const REV = "C:\\Users\\User\\Documents\\Personal Projects\\AtelierCarven\\.impeccable\\review";
const files = ["desktop.png", "mobile.png", "01-onboarding-desktop.png", "02-home-desktop.png", "03-product-desktop.png", "04-home-mobile.png", "05-product-mobile.png"];

for (const f of files) {
  const buf = await readFile(join(REV, f));
  const png = PNG.sync.read(buf);
  const { width, height } = png;
  const step = Math.max(1, Math.floor((width * height) / 20000));
  let samples = 0, black = 0, white = 0, colorful = 0, minL = 255, maxL = 0;
  for (let i = 0; i < png.data.length; i += 4 * step) {
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2], a = png.data[i + 3];
    if (a < 128) continue;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (l < minL) minL = l;
    if (l > maxL) maxL = l;
    if (l < 30 && r < 30 && g < 30 && b < 30) black++;
    if (l > 250) white++;
    if (Math.max(r, g, b) - Math.min(r, g, b) > 30) colorful++;
    samples++;
  }
  const blank = maxL - minL < 8;
  const bad = blank || black / samples > 0.6 || white / samples > 0.6 || colorful / samples > 0.5;
  console.log(`${bad ? "FAIL" : "ok  "} ${f} ${width}x${height} lum[${minL.toFixed(0)},${maxL.toFixed(0)}] black=${(black/samples*100).toFixed(1)}% white=${(white/samples*100).toFixed(1)}% colored=${(colorful/samples*100).toFixed(1)}%`);
}