const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');

exports.toggleStatus = async (req, res, next) => {
  try {
    const { type, id, status } = req.body; // type: 'PERSONAL' | 'SYSTEM', status: 'NEW' | 'LEARNING' | 'MASTERED'
    const userId = req.user.id;

    if (type === 'PERSONAL') {
      const vocab = await prisma.vocabulary.findFirst({ where: { id, userId } });
      if (!vocab) return res.status(404).json({ message: 'Không tìm thấy' });
      
      const updated = await prisma.vocabulary.update({
        where: { id },
        data: { 
          status,
          nextReviewDate: status === 'LEARNING' ? new Date() : null,
          interval: 0,
          easeFactor: 2.5
        }
      });
      return ApiResponse.success(res, 'Cập nhật thành công', updated);
    } else {
      let progress = await prisma.userVocabProgress.findUnique({
        where: {
          userId_systemVocabId: { userId, systemVocabId: id }
        }
      });
      
      if (!progress) {
        progress = await prisma.userVocabProgress.create({
          data: {
            userId,
            systemVocabId: id,
            status,
            nextReviewDate: status === 'LEARNING' ? new Date() : null
          }
        });
      } else {
        progress = await prisma.userVocabProgress.update({
          where: { id: progress.id },
          data: {
            status,
            nextReviewDate: status === 'LEARNING' ? new Date() : null,
            interval: 0,
            easeFactor: 2.5
          }
        });
      }
      return ApiResponse.success(res, 'Cập nhật thành công', progress);
    }
  } catch (error) {
    next(error);
  }
};

exports.getSrsQueue = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { mode } = req.query; // 'NEW' (Học từ mới) or 'REVIEW' (Ôn tập)
    
    let personalVocabs = [];
    let systemVocabs = [];

    if (mode === 'NEW') {
      // Find words explicitly marked as LEARNING (Muốn học)
      personalVocabs = await prisma.vocabulary.findMany({
        where: { userId, status: 'LEARNING' },
        orderBy: { createdAt: 'desc' }
      });

      const sysProgs = await prisma.userVocabProgress.findMany({
        where: { userId, status: 'LEARNING' },
        include: { vocab: true },
        orderBy: { updatedAt: 'desc' }
      });
      systemVocabs = sysProgs.map(p => ({
        id: p.vocab.id,
        word: p.vocab.word,
        meaning: p.vocab.meaning,
        example: p.vocab.example,
        audioUrl: p.vocab.audioUrl,
        pronunciation: p.vocab.pronunciation,
        type: 'SYSTEM',
        progressId: p.id
      }));

    } else if (mode === 'REVIEW') {
      // Find words that are MASTERED (Đã thuộc)
      personalVocabs = await prisma.vocabulary.findMany({
        where: { userId, status: 'MASTERED' },
        orderBy: { createdAt: 'desc' }
      });

      const sysProgs = await prisma.userVocabProgress.findMany({
        where: { userId, status: 'MASTERED' },
        include: { vocab: true },
        orderBy: { updatedAt: 'desc' }
      });
      systemVocabs = sysProgs.map(p => ({
        id: p.vocab.id,
        word: p.vocab.word,
        meaning: p.vocab.meaning,
        example: p.vocab.example,
        audioUrl: p.vocab.audioUrl,
        pronunciation: p.vocab.pronunciation,
        type: 'SYSTEM',
        progressId: p.id
      }));
    }

    // Format personal vocabs
    const formattedPersonal = personalVocabs.map(v => ({
      id: v.id,
      word: v.word,
      meaning: v.meaning,
      example: v.example,
      type: 'PERSONAL',
      progressId: null 
    }));

    // Combine
    const combined = [...formattedPersonal, ...systemVocabs];

    return ApiResponse.success(res, 'Thành công', combined);
  } catch (error) {
    next(error);
  }
};

exports.submitReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type, id, progressId, quality } = req.body; // quality: 0-5
    
    // SuperMemo-2 Algorithm
    const calculateSM2 = (quality, interval, easeFactor) => {
      let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (newEaseFactor < 1.3) newEaseFactor = 1.3;
      
      let newInterval = 0;
      if (quality < 3) {
        newInterval = 1;
      } else if (interval === 0) {
        newInterval = 1;
      } else if (interval === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * newEaseFactor);
      }
      
      const newNextReviewDate = new Date();
      newNextReviewDate.setDate(newNextReviewDate.getDate() + newInterval);
      
      return { newInterval, newEaseFactor, newNextReviewDate };
    };

    if (type === 'PERSONAL') {
      const vocab = await prisma.vocabulary.findFirst({ where: { id, userId } });
      if (vocab) {
        const { newInterval, newEaseFactor, newNextReviewDate } = calculateSM2(quality, vocab.interval, vocab.easeFactor);
        const status = quality >= 4 && newInterval > 21 ? 'MASTERED' : 'REVIEW';
        await prisma.vocabulary.update({
          where: { id },
          data: {
            interval: newInterval,
            easeFactor: newEaseFactor,
            nextReviewDate: newNextReviewDate,
            status
          }
        });
      }
    } else {
      const prog = await prisma.userVocabProgress.findFirst({ where: { id: progressId, userId } });
      if (prog) {
        const { newInterval, newEaseFactor, newNextReviewDate } = calculateSM2(quality, prog.interval, prog.easeFactor);
        const status = quality >= 4 && newInterval > 21 ? 'MASTERED' : 'REVIEW';
        await prisma.userVocabProgress.update({
          where: { id: progressId },
          data: {
            interval: newInterval,
            easeFactor: newEaseFactor,
            nextReviewDate: newNextReviewDate,
            status
          }
        });
      }
    }

    // Cập nhật streak (chuỗi ngày học)
    const { updateUserStreak } = require('./user.controller');
    await updateUserStreak(userId);

    return ApiResponse.success(res, 'Đã ghi nhận');
  } catch (error) {
    next(error);
  }
};
