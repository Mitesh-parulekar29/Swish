const User = require('../models/User');

const publicUser = (user) => user.toPublicJSON();

// GET /api/users/search?q=
const searchUsers = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ success: true, data: { users: [] } });

    const users = await User.find({
      _id: { $ne: req.user._id },
      isSuspended: false,
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ],
    })
      .select('-password')
      .limit(20);

    return res.json({ success: true, data: { users: users.map(publicUser) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to search users' });
  }
};


const getSuggestions = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select('following blockedUsers');
    const excluded = [req.user._id, ...(me.following || []), ...(me.blockedUsers || [])];
    const users = await User.find({ _id: { $nin: excluded }, isSuspended: false }).sort({ createdAt: -1 }).limit(5);
    return res.json({ success: true, data: { users: users.map(publicUser) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load suggestions' });
  }
};

// GET /api/users/:username
const getUserByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase(), isSuspended: false });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isFollowing = user.followers.some((id) => id.equals(req.user._id));
    return res.json({
      success: true,
      data: { user: { ...publicUser(user), isFollowing, isMe: user._id.equals(req.user._id) } },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
};

// POST /api/users/:id/follow
const followUser = async (req, res) => {
  try {
    if (req.user._id.equals(req.params.id)) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    const target = await User.findById(req.params.id);
    if (!target || target.isSuspended) return res.status(404).json({ success: false, message: 'User not found' });

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: target._id } });
    await User.findByIdAndUpdate(target._id, { $addToSet: { followers: req.user._id } });

    const updated = await User.findById(target._id);
    return res.json({ success: true, data: { user: publicUser(updated), isFollowing: true } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to follow user' });
  }
};

// DELETE /api/users/:id/follow
const unfollowUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id } });
    await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user._id } });
    return res.json({ success: true, data: { isFollowing: false } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to unfollow user' });
  }
};

// GET /api/users/:id/followers
const getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'name username profileImage bio');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: { users: user.followers } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load followers' });
  }
};

// GET /api/users/:id/following
const getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('following', 'name username profileImage bio');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: { users: user.following } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load following' });
  }
};

module.exports = { searchUsers, getSuggestions, getUserByUsername, followUser, unfollowUser, getFollowers, getFollowing };
