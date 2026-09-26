import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(path.dirname(__dirname), 'uploads');

async function optimizeUploads() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    console.log('No uploads dir.');
    return;
  }
  const files = fs.readdirSync(UPLOAD_DIR);
  for (const file of files) {
    if (!file.match(/\.(jpg|jpeg|png)$/i)) continue;
    const fp = path.join(UPLOAD_DIR, file);
    const baseName = file.replace(/\.[^/.]+$/, "");
    try {
      const img = sharp(fp);
      const meta = await img.metadata();
      const widths = [480, 960, 1600];
      let generated = 0;
      for (const w of widths) {
        if (meta.width >= w) {
          const vName = `${baseName}-${w}.webp`;
          if (!fs.existsSync(path.join(UPLOAD_DIR, vName))) {
            await img.clone().resize(w).webp().toFile(path.join(UPLOAD_DIR, vName));
            generated++;
          }
        }
      }
      const oName = `${baseName}-orig.webp`;
      if (!fs.existsSync(path.join(UPLOAD_DIR, oName))) {
        await img.clone().webp().toFile(path.join(UPLOAD_DIR, oName));
        generated++;
      }
      if (generated > 0) {
        console.log(`Optimized ${file} (${generated} variants)`);
      }
    } catch (e) {
      console.error(`Failed ${file}:`, e.message);
    }
  }
  console.log('Done.');
}

optimizeUploads();
