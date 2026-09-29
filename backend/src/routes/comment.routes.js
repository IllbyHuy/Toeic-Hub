const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const upload = require('../middlewares/upload.middleware');

router.post('/', authenticate, upload.single('image'), commentController.createComment);
router.get('/', commentController.getCommentsByTarget);
router.put('/:id', authenticate, commentController.editComment);
router.delete('/:id', authenticate, commentController.deleteComment);

module.exports = router;
