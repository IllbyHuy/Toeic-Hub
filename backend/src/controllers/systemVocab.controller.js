const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const jwt = require('jsonwebtoken');

exports.getTopics = async (req, res, next) => {
  try {
    const topics = await prisma.topic.findMany({
      include: {
        _count: {
          select: { words: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    return ApiResponse.success(res, 'Lấy danh sách chủ đề thành công', topics);
  } catch (error) {
    next(error);
  }
};

exports.getWordsByTopic = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check user auth if token provided (optional auth)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) {
        // ignore
      }
    }

    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        words: {
          include: userId ? {
            progresses: {
              where: { userId }
            }
          } : false,
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!topic) throw new ApiError(404, 'Không tìm thấy chủ đề');

    // Format the response
    const words = topic.words.map(w => ({
      ...w,
      progress: (userId && w.progresses.length > 0) ? w.progresses[0].status : null,
      progresses: undefined // remove the raw relation array
    }));

    return ApiResponse.success(res, 'Lấy từ vựng thành công', { ...topic, words });
  } catch (error) {
    next(error);
  }
};

exports.updateProgress = async (req, res, next) => {
  try {
    const { systemVocabId, status } = req.body;
    const userId = req.user.id;

    if (!systemVocabId || !status) {
      throw new ApiError(400, 'Thiếu thông tin systemVocabId hoặc status');
    }

    const progress = await prisma.userVocabProgress.upsert({
      where: {
        userId_systemVocabId: { userId, systemVocabId }
      },
      update: { status },
      create: { userId, systemVocabId, status }
    });

    return ApiResponse.success(res, 'Cập nhật tiến độ thành công', progress);
  } catch (error) {
    next(error);
  }
};
