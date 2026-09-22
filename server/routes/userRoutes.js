const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { searchUsers, getSuggestions, getUserByUsername, followUser, unfollowUser, getFollowers, getFollowing } = require('../controllers/userController');

const router = express.Router();
router.use(authMiddleware);
router.get('/search', searchUsers);
router.get('/suggestions', getSuggestions);
router.get('/:username', getUserByUsername);
router.post('/:id/follow', followUser);
router.delete('/:id/follow', unfollowUser);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);
module.exports = router;
