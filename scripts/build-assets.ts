import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const srcDir = 'src/assets';
const iconDir = 'src/assets/icons';
export const thresholdSize = 1024; // Threshold size in bytes
export const thresholdScale = 50; // Threshold scale in pixels

function getImages(directory: string): string[] {
  const files = fs.readdirSync(directory);
  const images: string[] = [];

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      const recognizedFormats = ['.jpg', '.jpeg', '.webp', '.png'];
      const fileExtension = path.extname(file).toLowerCase();

      if (recognizedFormats.includes(fileExtension)) {
        images.push(filePath);
      }
    } else if (stats.isDirectory()) {
      const subdirectoryImages = getImages(filePath);
      images.push(...subdirectoryImages);
    }
  });

  return images;
}

async function minifyImages() {
  try {
    const files = getImages(srcDir);

    const promises = files.map(async (file) => {
      const stats = fs.statSync(file);

      if (stats.size > thresholdSize) {
        const originalName = path.parse(file).name;
        const outputName = `${originalName}.min.webp`;
        const outputPath = path.join(path.dirname(file), outputName);

        // Skip minified files
        if (originalName.includes('.min')) {
          return '';
        }

        const image = sharp(file);
        const metadata = await image.metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        const averageSize = (width + height) / 2;
        const scaleFactor = Math.min(thresholdScale / averageSize, 0.1);
        const resizedWidth = Math.round(width * scaleFactor);
        const resizedHeight = Math.round(height * scaleFactor);

        await image
          .webp({ quality: 60 })
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

async function resizeIcons() {
  const iconFiles = getImages(iconDir);

  const resizePromises = iconFiles.map(async (file) => {
    // Skip minified files
    if (file.includes('.min')) {
      return '';
    }

    // Get the image original size
    const metadata = await sharp(file).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    const image = sharp(file);
    const resizedWidth = Math.min(width, 200);
    const resizedHeight = Math.min(height, 200);

    await image
      .resize(resizedWidth, resizedHeight)
      .toBuffer()
      .then((data) => {
        // Save the buffer to the same file
        fs.writeFile(file, new Uint8Array(data), (err) => {
          if (err) {
            console.error('Error writing the resized image:', err);
          }
        });
      })
      .catch((err) => {
        console.error('Error resizing the image:', err);
      });

    return `Resized ${file}`;
  });

  const resizeResults = await Promise.all(resizePromises);
  console.debug(resizeResults.filter(Boolean).join('\n'));
}

resizeIcons();
minifyImages();
