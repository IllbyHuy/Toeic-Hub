const express = require('express');
const router = express.Router();
const voteController = require('../controllers/vote.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/posts/:postId', authenticate, voteController.votePost);
router.post('/comments/:commentId', authenticate, voteController.voteComment);
router.post('/grammars/:grammarId', authenticate, voteController.voteTip);

module.exports = router;
