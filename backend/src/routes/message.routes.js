const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/unread/count', authenticate, messageController.getUnreadCount);
router.get('/unread/details', authenticate, messageController.getUnreadDetails);
router.get('/recent-info', authenticate, messageController.getRecentInfo);
router.get('/:userId', authenticate, messageController.getDirectMessages);
router.post('/:userId', authenticate, upload.single('file'), messageController.sendDirectMessage);
router.put('/:userId/read', authenticate, messageController.markAsRead);
router.put('/pin/:msgId', authenticate, messageController.pinDirectMessage);
router.put('/unpin/:msgId', authenticate, messageController.unpinDirectMessage);
router.delete('/:msgId', authenticate, messageController.deleteDirectMessage);

module.exports = router;
