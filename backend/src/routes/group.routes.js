const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/', authenticate, groupController.getGroups);
router.get('/my-groups', authenticate, groupController.getMyGroups);
router.post('/', authenticate, upload.single('avatar'), groupController.createGroup);
router.get('/:groupId', authenticate, groupController.getGroupById);
router.put('/:groupId', authenticate, upload.single('avatar'), groupController.updateGroup);
router.delete('/:groupId/members/:userId', authenticate, groupController.removeMember);
router.post('/:groupId/join', authenticate, groupController.joinGroup);
router.post('/:groupId/messages', authenticate, upload.single('file'), groupController.sendGroupMessage);
router.get('/:groupId/messages', authenticate, groupController.getGroupMessages);
router.put('/:groupId/messages/:msgId/pin', authenticate, groupController.pinGroupMessage);
router.put('/:groupId/messages/:msgId/unpin', authenticate, groupController.unpinGroupMessage);
router.put('/:groupId/requests/:userId/accept', authenticate, groupController.acceptGroupRequest);
router.put('/:groupId/requests/:userId/reject', authenticate, groupController.rejectGroupRequest);
router.delete('/:groupId/messages/:msgId', authenticate, groupController.deleteGroupMessage);
router.put('/:groupId/read', authenticate, groupController.markAsRead);

module.exports = router;
