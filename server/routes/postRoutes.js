const express = require('express');
const { createPost } = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadPostImage } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', authMiddleware, uploadPostImage, createPost);

module.exports = router;
