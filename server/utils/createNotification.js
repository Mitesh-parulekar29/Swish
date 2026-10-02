const Notification = require('../models/Notification');

// Creates a notification for `recipient`, unless the actor is the recipient
// themselves (e.g. liking your own post shouldn't notify you).
// Failures are logged but never thrown - a notification going missing should
// never break the like/comment/follow action that triggered it.
async function createNotification({ recipient, actor, type, post, text = '' }) {
  try {
    if (String(recipient) === String(actor._id)) return;
    await Notification.create({ recipient, actor: actor._id, type, post, text });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
}

module.exports = createNotification;