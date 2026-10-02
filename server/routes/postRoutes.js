const express = require('express');
const {
  createPost,
  getFeed,
  getUserPosts,
  getPost,
  likePost,
  getPostLikes,
  addComment,
  deleteComment,
  deletePost,
  getExplore,
} = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadPostImage } = require('../middleware/uploadMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/feed', getFeed);
router.get('/explore', getExplore);
router.get('/user/:username', getUserPosts);
router.get('/:id', getPost);
router.get('/:id/likes', getPostLikes);

router.post('/', uploadPostImage, createPost);

router.post('/:id/like', likePost);
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', deleteComment);

router.delete('/:id', deletePost);

module.exports = router;
