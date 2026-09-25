const express = require('express');
const { createPost, getFeed, getUserPosts, getPost, likePost, addComment, deletePost } = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadPostImage } = require('../middleware/uploadMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/feed', getFeed);
router.get('/user/:username', getUserPosts);
router.get('/:id', getPost);

router.post('/', uploadPostImage, createPost);

router.post('/:id/like', likePost);
router.post('/:id/comments', addComment);

router.delete('/:id', deletePost);
module.exports = router;
