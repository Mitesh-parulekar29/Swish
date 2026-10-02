const User = require('../models/User');
const Notification = require('../models/Notification');
const createNotification = require('../utils/createNotification');
const { includesId, getHiddenUserIds } = require('../utils/blockHelpers');

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
    const me = await User.findById(req.user._id).select('following');
    const hiddenIds = await getHiddenUserIds(req.user._id); // blocked by me + blocked me
    const excluded = [req.user._id, ...(me.following || []), ...hiddenIds];
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

    const isMe = user._id.equals(req.user._id);

    // This user has blocked the viewer -> send back ONLY the name, nothing else.
    if (!isMe && includesId(user.blockedUsers, req.user._id)) {
      return res.json({
        success: true,
        data: { user: { id: user._id, name: user.name, isBlockedByThem: true } },
      });
    }

    const isFollowing = includesId(user.followers, req.user._id);
    const isRequested = includesId(user.followRequests, req.user._id); // viewer has a pending follow request
    const isBlocked = includesId(req.user.blockedUsers, user._id); // viewer has blocked this user
    const canViewPosts = !user.isPrivate || isFollowing || isMe;

    return res.json({
      success: true,
      data: { user: { ...publicUser(user), isFollowing, isRequested, isBlocked, isMe, canViewPosts } },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
};

// POST /api/users/:id/follow
// Public account  -> follow immediately.
// Private account -> only send a follow request (the owner must accept it).
const followUser = async (req, res) => {
  try {
    if (req.user._id.equals(req.params.id)) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    const target = await User.findById(req.params.id);
    if (!target || target.isSuspended) return res.status(404).json({ success: false, message: 'User not found' });

    // Blocking rules
    if (includesId(target.blockedUsers, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You cannot follow this user' });
    }
    if (includesId(req.user.blockedUsers, target._id)) {
      return res.status(400).json({ success: false, message: 'Unblock this user before following' });
    }

    // Already following -> nothing to do
    if (includesId(target.followers, req.user._id)) {
      return res.json({ success: true, data: { user: publicUser(target), isFollowing: true, isRequested: false } });
    }

    // PRIVATE account -> save a follow request, do NOT follow yet
    if (target.isPrivate) {
      const alreadyRequested = includesId(target.followRequests, req.user._id);
      if (!alreadyRequested) {
        await User.findByIdAndUpdate(target._id, { $addToSet: { followRequests: req.user._id } });
        await createNotification({ recipient: target._id, actor: req.user, type: 'follow_request' });
      }
      return res.json({ success: true, data: { user: publicUser(target), isFollowing: false, isRequested: true } });
    }

    // PUBLIC account -> follow directly
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: target._id } });
    await User.findByIdAndUpdate(target._id, { $addToSet: { followers: req.user._id } });
    await createNotification({ recipient: target._id, actor: req.user, type: 'follow' });

    const updated = await User.findById(target._id);
    return res.json({ success: true, data: { user: publicUser(updated), isFollowing: true, isRequested: false } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to follow user' });
  }
};

// DELETE /api/users/:id/follow
// Works for both: unfollowing, and cancelling a pending follow request.
const unfollowUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id } });
    await User.findByIdAndUpdate(req.params.id, {
      $pull: { followers: req.user._id, followRequests: req.user._id },
    });
    await Notification.deleteMany({ recipient: req.params.id, actor: req.user._id, type: 'follow_request' });
    return res.json({ success: true, data: { isFollowing: false, isRequested: false } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to unfollow user' });
  }
};

// ---------------------------------------------------------------------------
// FOLLOW REQUESTS (for the owner of a private account)
// ---------------------------------------------------------------------------

// GET /api/users/me/follow-requests
const getFollowRequests = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).populate('followRequests', 'name username profileImage');
    const requests = (me.followRequests || []).map((u) => ({
      id: u._id,
      name: u.name,
      username: u.username,
      profileImage: u.profileImage,
    }));
    return res.json({ success: true, data: { requests } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load follow requests' });
  }
};

// POST /api/users/me/follow-requests/:id/accept
const acceptFollowRequest = async (req, res) => {
  try {
    const requesterId = req.params.id;
    if (!includesId(req.user.followRequests, requesterId)) {
      return res.status(404).json({ success: false, message: 'No follow request from this user' });
    }

    // Remove the request and make the requester a follower of me
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { followRequests: requesterId },
      $addToSet: { followers: requesterId },
    });
    await User.findByIdAndUpdate(requesterId, { $addToSet: { following: req.user._id } });
    await Notification.deleteMany({ recipient: req.user._id, actor: requesterId, type: 'follow_request' });

    return res.json({ success: true, message: 'Follow request accepted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to accept follow request' });
  }
};

// DELETE /api/users/me/follow-requests/:id
const declineFollowRequest = async (req, res) => {
  try {
    const requesterId = req.params.id;
    await User.findByIdAndUpdate(req.user._id, { $pull: { followRequests: requesterId } });
    await Notification.deleteMany({ recipient: req.user._id, actor: requesterId, type: 'follow_request' });
    return res.json({ success: true, message: 'Follow request declined' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to decline follow request' });
  }
};

// ---------------------------------------------------------------------------
// BLOCK / UNBLOCK
// ---------------------------------------------------------------------------

// POST /api/users/:id/block
const blockUser = async (req, res) => {
  try {
    if (req.user._id.equals(req.params.id)) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });

    // 1. Add to my block list and remove every follow link / request on my side
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: target._id },
      $pull: { followers: target._id, following: target._id, followRequests: target._id },
    });

    // 2. Remove every follow link / request on their side
    await User.findByIdAndUpdate(target._id, {
      $pull: { followers: req.user._id, following: req.user._id, followRequests: req.user._id },
    });

    // 3. Clean up old follow notifications between the two users
    await Notification.deleteMany({
      type: { $in: ['follow', 'follow_request'] },
      $or: [
        { recipient: req.user._id, actor: target._id },
        { recipient: target._id, actor: req.user._id },
      ],
    });

    return res.json({ success: true, message: 'User blocked', data: { isBlocked: true } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to block user' });
  }
};

// GET /api/users/me/blocked
const getBlockedUsers = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).populate('blockedUsers', 'name username profileImage');
    const users = (me.blockedUsers || []).map((u) => ({
      id: u._id,
      name: u.name,
      username: u.username,
      profileImage: u.profileImage,
    }));
    return res.json({ success: true, data: { users } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load blocked users' });
  }
};

// DELETE /api/users/:id/block
const unblockUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: req.params.id } });
    return res.json({ success: true, message: 'User unblocked', data: { isBlocked: false } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to unblock user' });
  }
};

// GET /api/users/:id/followers
const getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'name username profileImage bio');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (includesId(user.blockedUsers, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You cannot view this list' });
    }
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
    if (includesId(user.blockedUsers, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You cannot view this list' });
    }
    return res.json({ success: true, data: { users: user.following } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load following' });
  }
};

// PUT /api/users/me
// Updates the logged-in user's editable profile fields. Accepts a new profile
// picture either as an uploaded file (multipart field "profileImage") or as
// a plain image URL string in the body, matching how post images work.
const updateProfile = async (req, res) => {
  try {
    const { name, bio, department, course, batch, profileImage } = req.body;
    const updates = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      if (trimmed.length > 80) return res.status(400).json({ success: false, message: 'Name is too long' });
      updates.name = trimmed;
    }
    if (bio !== undefined) {
      const trimmed = String(bio).trim();
      if (trimmed.length > 300) return res.status(400).json({ success: false, message: 'Bio is too long' });
      updates.bio = trimmed;
    }
    if (department !== undefined) updates.department = String(department).trim().slice(0, 80);
    if (course !== undefined) updates.course = String(course).trim().slice(0, 80);
    if (batch !== undefined) updates.batch = String(batch).trim().slice(0, 20);

    if (req.file) {
      updates.profileImage = `/uploads/profiles/${req.file.filename}`;
    } else if (typeof profileImage === 'string' && profileImage.trim()) {
      updates.profileImage = profileImage.trim();
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return res.json({ success: true, message: 'Profile updated', data: { user: publicUser(user) } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'That username is already taken' });
    }
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// PUT /api/users/me/privacy
const updatePrivacy = async (req, res) => {
  try {
    if (typeof req.body.isPrivate !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isPrivate must be true or false' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { isPrivate: req.body.isPrivate }, { new: true });
    return res.json({ success: true, data: { user: publicUser(user) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update account privacy' });
  }
};

module.exports = {
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
};