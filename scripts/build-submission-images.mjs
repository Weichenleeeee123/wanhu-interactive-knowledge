import sharp from "sharp";
await sharp("submission/cover.svg").png().toFile("submission/cover.png");
await sharp("src/app/icon.svg").resize(512,512).png().toFile("submission/icon.png");
console.log("Submission cover (1600 × 900) and icon (512 × 512) created.");
