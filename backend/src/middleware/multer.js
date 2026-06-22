import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = 'uploads/';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix =
      Date.now() + '-' + Math.round(Math.random() * 1e9);

    const ext =
      path.extname(file.originalname || '') || '.webm';

    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${ext}`
    );
  },
});

const allowedMimeTypes = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/mp3',
  'audio/m4a',
  'audio/ogg',
  'audio/webm',
  'audio/x-matroska',
  'video/webm',
  'video/x-matroska',
]);

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type for voice system: ${file.mimetype}`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

export default upload;