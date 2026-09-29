const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

// Chống spam gọi AI liên tục gây tốn tài nguyên
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // Mỗi user chỉ được gọi AI 10 lần / 15 phút
  message: { success: false, message: 'Bạn đã sử dụng quá giới hạn AI. Vui lòng thử lại sau 15 phút.' }
});

// API gọi AI giải thích ngữ pháp bài viết
router.post('/explain', authenticate, aiLimiter, aiController.explainPost);
// API tra từ điển AI
router.post('/dictionary', authenticate, aiLimiter, aiController.dictionaryLookup);
// API tạo quiz từ từ vựng
router.post('/quiz', authenticate, aiLimiter, aiController.generateQuiz);
// API kiểm tra câu đặt
router.post('/check-sentence', authenticate, aiLimiter, aiController.checkSentence);
// API nhờ AI soạn tip ngữ pháp
router.post('/grammar-lookup', authenticate, aiLimiter, aiController.grammarLookup);
// API AI tự tạo bài tập từ sổ tay
router.post('/generate-exercises', authenticate, aiLimiter, aiController.generateExercises);
// API tạo bài tập từ Tip (Ngữ pháp)
router.post('/generate-grammar-exercises', authenticate, aiLimiter, aiController.generateGrammarExercises);
// API Chatbot trên Landing page
router.post('/chat', aiLimiter, aiController.chat);

module.exports = router;
