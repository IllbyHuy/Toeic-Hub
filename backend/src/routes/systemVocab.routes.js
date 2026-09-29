const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const systemVocabController = require('../controllers/systemVocab.controller');

// Lấy danh sách các chủ đề
router.get('/topics', systemVocabController.getTopics);

// Lấy từ vựng theo chủ đề (có kèm trạng thái học tập của user nếu có truyền token)
router.get('/topics/:id/words', systemVocabController.getWordsByTopic);

// Cập nhật tiến độ học của 1 từ vựng
router.post('/progress', authenticate, systemVocabController.updateProgress);

module.exports = router;
