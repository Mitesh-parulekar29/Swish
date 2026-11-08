const express = require('express');
const { register, login, getMe, changePassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/securityMiddleware');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, getMe);
router.put('/change-password', authLimiter, authMiddleware, changePassword);

module.exports = router;