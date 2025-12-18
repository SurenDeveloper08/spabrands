const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const resizeImages = async (filePaths, includeLong = false) => {
  const resizedFiles = [];

  for (const filePath of filePaths) {
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, ext);
    const dir = path.dirname(filePath);

    const resizedFilename = `${baseName}_resized${ext}`;
    const longFilename = `${baseName}_long${ext}`;

    const resizedPath = path.join(dir, resizedFilename);
    const longPath = path.join(dir, longFilename);

    // Resize normal
    await sharp(filePath)
      .resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 95 })
      .toFile(resizedPath);

    // Resize long
    if (includeLong) {
      await sharp(filePath)
        .resize(1920, 1920, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 95 })
        .toFile(longPath);
    }

    // SAFELY remove original
    fs.unlink(filePath, (err) => {
      if (err) console.warn('Failed to delete original file:', filePath, err.message);
    });

    resizedFiles.push({
      resizedFilename,
      longFilename: includeLong ? longFilename : null,
    });
  }

  return resizedFiles;
};

module.exports = resizeImages;
