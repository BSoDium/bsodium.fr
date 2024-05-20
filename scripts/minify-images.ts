/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const srcDir = 'src/assets';
export const thresholdSize = 1024; // Threshold size in bytes
export const thresholdScale = 50; // Threshold scale in pixels

async function minifyImages() {
  try {
    const files = fs.readdirSync(srcDir);

    const promises = files.map(async (file) => {
      const filePath = path.join(srcDir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile() && stats.size > thresholdSize) {
        const originalName = path.parse(file).name;
        const outputName = `${originalName}.min.webp`;
        const outputPath = path.join(srcDir, outputName);

        // Skip minified files
        if (originalName.includes('.min')) {
          return '';
        }

        const recognizedFormats = ['.jpg', '.jpeg', '.webp', '.png'];
        const fileExtension = path.extname(file).toLowerCase();
        if (!recognizedFormats.includes(fileExtension)) {
          return '';
        }

        const image = sharp(filePath);
        const metadata = await image.metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        const averageSize = (width + height) / 2;
        const scaleFactor = thresholdScale / averageSize;
        const resizedWidth = Math.round(width * scaleFactor);
        const resizedHeight = Math.round(height * scaleFactor);

        await image
          .webp()
          .resize(resizedWidth, resizedHeight)
          .toFile(outputPath);

        return `Minified ${file} to ${outputName}`;
      }

      return '';
    });

    const results = await Promise.all(promises);
    console.debug(results.filter(Boolean).join('\n'));
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

minifyImages();
