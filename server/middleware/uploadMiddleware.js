const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const POSTS_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'posts');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

fs.mkdirSync(POSTS_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, POSTS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const extension = MIME_TO_EXT[file.mimetype] || '.jpg';
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

// multipart/form-data field name: image
const uploadPostImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image must be 5 MB or smaller',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid image upload',
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid image upload',
    });
  });
};

module.exports = { uploadPostImage };
