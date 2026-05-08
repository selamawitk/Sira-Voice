import fs from 'fs';
import path from 'path';

export const deleteFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error(err);
    });
  }
};

export const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};