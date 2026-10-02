const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadProfileImage } = require('../middleware/uploadMiddleware');
const {
  searchUsers,
  getSuggestions,
  getUserByUsername,
  followUser,
  unfollowUser,
  getFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getFollowers,
  getFollowing,
  updateProfile,
  updatePrivacy,
} = require('../controllers/userController');

const router = express.Router();
router.use(authMiddleware);
router.get('/search', searchUsers);
router.get('/suggestions', getSuggestions);
router.put('/me', uploadProfileImage, updateProfile);
router.put('/me/privacy', updatePrivacy);

// Follow requests (private accounts) - keep these ABOVE the '/:username' route
router.get('/me/follow-requests', getFollowRequests);
router.post('/me/follow-requests/:id/accept', acceptFollowRequest);
router.delete('/me/follow-requests/:id', declineFollowRequest);

// List of users I have blocked
router.get('/me/blocked', getBlockedUsers);

router.get('/:username', getUserByUsername);
router.post('/:id/follow', followUser);
router.delete('/:id/follow', unfollowUser);
router.post('/:id/block', blockUser);
router.delete('/:id/block', unblockUser);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);
module.exports = router;