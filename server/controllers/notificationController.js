const Notification = require('../models/Notification');

const serializeNotification = (n) => ({
  id: n._id,
  type: n.type,
  isRead: n.isRead,
  createdAt: n.createdAt,
  actor: n.actor && {
    id: n.actor._id,
    name: n.actor.name,
    username: n.actor.username,
    profileImage: n.actor.profileImage,
  },
  post: n.post && { id: n.post._id, image: n.post.image },
});

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('actor', 'name username profileImage')
      .populate('post', 'image');

    return res.json({ success: true, data: { notifications: notifications.map(serializeNotification) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
};

// POST /api/notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { $set: { isRead: true } });
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
};

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return res.json({ success: true, data: { count } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load unread count' });
  }
};

module.exports = { getNotifications, markAllRead, getUnreadCount };