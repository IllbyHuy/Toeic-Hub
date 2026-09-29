const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/', authenticate, notificationController.getNotifications);
router.put('/read-all', authenticate, notificationController.markAsRead);

module.exports = router;
