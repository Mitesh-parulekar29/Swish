const User = require('../models/User');

// Returns true if `list` (an array of ObjectIds) contains `id`.
const includesId = (list, id) => (list || []).some((item) => item.equals(id));

// Returns true if `ownerId` has blocked `viewerId`.
async function hasBlocked(ownerId, viewerId) {
  if (!ownerId) return false;
  const owner = await User.findById(ownerId).select('blockedUsers');
  return includesId(owner?.blockedUsers, viewerId);
}

// Returns the ids of every user whose content `userId` should NOT see:
//  - people that `userId` has blocked
//  - people who have blocked `userId`
async function getHiddenUserIds(userId) {
  const me = await User.findById(userId).select('blockedUsers');
  const blockedMe = await User.find({ blockedUsers: userId }).select('_id');
  return [...(me?.blockedUsers || []), ...blockedMe.map((u) => u._id)];
}

module.exports = { includesId, hasBlocked, getHiddenUserIds };
