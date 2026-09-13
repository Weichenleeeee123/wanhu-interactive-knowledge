import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
// Resize the approved artwork only; never redraw or replace the mascot.
const source = 'public/submission-assets/wanhu-icon-ai.png';
await mkdir('public/brand', { recursive: true });
for (const size of [16, 32, 48, 128, 180, 512]) {
  await sharp(source).resize(size, size).png().toFile(`public/brand/wanhu-icon-${size}.png`);
}
const png = await sharp(source).resize(128, 128).png().toBuffer();
await writeFile('src/app/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image width="128" height="128" href="data:image/png;base64,${png.toString('base64')}"/></svg>\n`);
await sharp(source).resize(180, 180).png().toFile('src/app/apple-icon.png');
console.log('Prepared approved mascot for browser tabs, website, mobile and extension.');

// ICO container holding the same approved PNG for legacy favicon requests.
const favicon = await sharp(source).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header[6] = 32; header[7] = 32;
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
header.writeUInt32LE(favicon.length, 14); header.writeUInt32LE(22, 18);
await writeFile('src/app/favicon.ico', Buffer.concat([header, favicon]));
