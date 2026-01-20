/**
 * PWA Icon Generator Script
 *
 * Generates all required PWA icons from the source SVG.
 *
 * Usage: node scripts/generate-pwa-icons.js
 */

const sharp = require('sharp');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SOURCE_SVG = path.join(ICONS_DIR, 'icon.svg');

const ICON_SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

async function generateIcons() {
  console.log('Generating PWA icons from SVG...\n');

  for (const { size, name } of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, name);

    try {
      await sharp(SOURCE_SVG)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated: ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed: ${name} - ${error.message}`);
    }
  }

  console.log('\n✓ All icons generated successfully!');
}

generateIcons();
