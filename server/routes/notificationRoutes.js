const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getNotifications, markAllRead, getUnreadCount } = require('../controllers/notificationController');

const router = express.Router();
router.use(authMiddleware);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/read-all', markAllRead);

module.exports = router;