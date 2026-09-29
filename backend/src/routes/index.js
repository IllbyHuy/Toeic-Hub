const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const postRoutes = require('./post.routes');
const groupRoutes = require('./group.routes');
const commentRoutes = require('./comment.routes');
const voteRoutes = require('./vote.routes');
const aiRoutes = require('./ai.routes');
const vocabularyRoutes = require('./vocabulary.routes');
const grammarRoutes = require('./grammar.routes');
const reportRoutes = require('./report.routes');

const systemVocabRoutes = require('./systemVocab.routes');

router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/groups', groupRoutes);
router.use('/comments', commentRoutes);
router.use('/votes', voteRoutes);
router.use('/ai', aiRoutes);
router.use('/vocabularies', vocabularyRoutes);
router.use('/system-vocab', systemVocabRoutes);
router.use('/grammars', grammarRoutes);
router.use('/reports', reportRoutes);
router.use('/srs', require('./srs.routes'));
router.use('/users', require('./user.routes'));
router.use('/messages', require('./message.routes'));
router.use('/friendships', require('./friendship.routes'));
router.use('/notifications', require('./notification.routes'));

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
