const express = require('express');
const router = express.Router();
const friendshipController = require('../controllers/friendship.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/status/:userId', authenticate, friendshipController.getFriendshipStatus);
router.post('/request/:userId', authenticate, friendshipController.sendFriendRequest);
router.put('/request/:userId/accept', authenticate, friendshipController.acceptFriendRequest);
router.put('/request/:userId/reject', authenticate, friendshipController.rejectFriendRequest);
router.delete('/:userId', authenticate, friendshipController.unfriend);
router.get('/friends', authenticate, friendshipController.getFriends);
router.get('/requests', authenticate, friendshipController.getFriendRequests);

module.exports = router;
