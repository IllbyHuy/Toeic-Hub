const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { calculateSRS } = require('../utils/srs');

exports.createVocabulary = async (req, res, next) => {
  try {
    const { word, type, meaning, example, synonyms, visibility, groupId } = req.body;
    const userId = req.user.id;

    const vocab = await prisma.vocabulary.create({
      data: {
        word,
        type: type || null,
        meaning,
        example,
        synonyms: synonyms || [],
        userId,
        visibility: visibility || 'PRIVATE',
        groupId: groupId || null
      }
    });

    return ApiResponse.created(res, 'Vocabulary added successfully', vocab);
  } catch (error) {
    next(error);
  }
};

exports.updateVocabulary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { word, type, meaning, example, synonyms, visibility } = req.body;

    const vocab = await prisma.vocabulary.updateMany({
      where: { id, userId },
      data: {
        word,
        type: type || null,
        meaning,
        example,
        synonyms: synonyms || [],
        visibility: visibility || 'PRIVATE',
      }
    });

    if (vocab.count === 0) {
      throw new ApiError(404, 'Vocabulary not found or not owned by user');
    }

    return ApiResponse.success(res, 'Vocabulary updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.getVocabularies = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Lấy các group user tham gia
    const myGroupMemberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true }
    });
    const myGroupIds = myGroupMemberships.map(m => m.groupId);

    const vocabs = await prisma.vocabulary.findMany({
      where: {
        OR: [
          { userId },
          { visibility: 'PUBLIC' },
          { visibility: 'GROUP', groupId: { in: myGroupIds } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return ApiResponse.success(res, 'Vocabularies fetched successfully', vocabs);
  } catch (error) {
    next(error);
  }
};

exports.deleteVocabulary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Chỉ xóa nếu vocab thuộc về user đó (prisma sẽ lỗi nếu ko tồn tại, nhưng có thể check trước)
    await prisma.vocabulary.deleteMany({
      where: { id, userId }
    });

    return ApiResponse.success(res, 'Vocabulary deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.getStudySession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // 1. Lấy các từ vựng cá nhân đến hạn ôn tập (hoặc chưa học)
    const personalVocabs = await prisma.vocabulary.findMany({
      where: {
        userId,
        OR: [
          { status: 'NEW' },
          { nextReviewDate: { lte: now } }
        ]
      },
      take: 20
    });

    // 2. Lấy các từ vựng hệ thống (3000 TOEIC Words) đến hạn ôn tập
    const systemProgress = await prisma.userVocabProgress.findMany({
      where: {
        userId,
        OR: [
          { status: 'NEW' },
          { nextReviewDate: { lte: now } }
        ]
      },
      include: { vocab: true },
      take: 20
    });

    // Nếu chưa đủ từ hệ thống, lấy thêm các từ chưa từng học
    let systemVocabsToLearn = systemProgress.map(p => ({
      ...p.vocab,
      isSystem: true,
      progressId: p.id,
      status: p.status,
      interval: p.interval,
      easeFactor: p.easeFactor
    }));

    if (systemVocabsToLearn.length < 10) {
      const learnedSystemVocabIds = await prisma.userVocabProgress.findMany({
        where: { userId },
        select: { systemVocabId: true }
      });
      const idsToExclude = learnedSystemVocabIds.map(p => p.systemVocabId);

      const newSystemVocabs = await prisma.systemVocab.findMany({
        where: { id: { notIn: idsToExclude } },
        take: 10 - systemVocabsToLearn.length
      });

      systemVocabsToLearn = [
        ...systemVocabsToLearn,
        ...newSystemVocabs.map(v => ({
          ...v,
          isSystem: true,
          status: 'NEW',
          interval: 0,
          easeFactor: 2.5
        }))
      ];
    }

    const session = [
      ...personalVocabs.map(v => ({ ...v, isSystem: false })),
      ...systemVocabsToLearn
    ].sort(() => 0.5 - Math.random()); // Trộn ngẫu nhiên

    return ApiResponse.success(res, 'Study session fetched', session.slice(0, 30));
  } catch (error) {
    next(error);
  }
};

exports.reviewVocabulary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, isSystem, quality } = req.body;

    if (quality < 0 || quality > 5) {
      throw new ApiError(400, 'Quality score must be between 0 and 5');
    }

    if (isSystem) {
      // 1. Xử lý từ vựng hệ thống
      let progress = await prisma.userVocabProgress.findUnique({
        where: { userId_systemVocabId: { userId, systemVocabId: id } }
      });

      if (!progress) {
        progress = await prisma.userVocabProgress.create({
          data: { userId, systemVocabId: id, status: 'NEW', interval: 0, easeFactor: 2.5 }
        });
      }

      const { interval, easeFactor, nextReviewDate, status } = calculateSRS(
        quality, progress.interval, progress.easeFactor
      );

      const updated = await prisma.userVocabProgress.update({
        where: { id: progress.id },
        data: { interval, easeFactor, nextReviewDate, status }
      });
      return ApiResponse.success(res, 'System vocabulary reviewed', updated);

    } else {
      // 2. Xử lý từ vựng cá nhân
      const vocab = await prisma.vocabulary.findUnique({ where: { id, userId } });
      if (!vocab) throw new ApiError(404, 'Vocabulary not found');

      const { interval, easeFactor, nextReviewDate, status } = calculateSRS(
        quality, vocab.interval, vocab.easeFactor
      );

      const updated = await prisma.vocabulary.update({
        where: { id },
        data: { interval, easeFactor, nextReviewDate, status }
      });
      return ApiResponse.success(res, 'Personal vocabulary reviewed', updated);
    }

  } catch (error) {
    next(error);
  }
};

exports.importVocabularies = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { vocabularies } = req.body; // Array of { word, meaning, example, synonyms }

    if (!vocabularies || !Array.isArray(vocabularies)) {
      throw new ApiError(400, 'Invalid data format');
    }

    const dataToInsert = vocabularies.map(v => ({
      userId,
      word: v.word,
      type: v.type || null,
      meaning: v.meaning,
      example: v.example || '',
      synonyms: Array.isArray(v.synonyms) ? v.synonyms : (v.synonyms ? v.synonyms.split(',').map(s => s.trim()) : []),
      visibility: 'PRIVATE'
    }));

    await prisma.vocabulary.createMany({
      data: dataToInsert,
      skipDuplicates: true
    });

    return ApiResponse.success(res, 'Imported successfully', { count: dataToInsert.length });
  } catch (error) {
    next(error);
  }
};

exports.exportVocabularies = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const vocabs = await prisma.vocabulary.findMany({
      where: { userId },
      select: { word: true, meaning: true, example: true, synonyms: true }
    });

    return ApiResponse.success(res, 'Exported successfully', vocabs);
  } catch (error) {
    next(error);
  }
};
