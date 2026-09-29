const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const uploadToCloudinary = async (fileBuffer, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'toeic-hub-grammar', resource_type: resourceType },
      (error, result) => {
        if (error) return reject(new ApiError(500, 'Lỗi khi upload file lên Cloudinary'));
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

exports.createGrammar = async (req, res, next) => {
  try {
    const { title, structure, description, examples, visibility, groupId } = req.body;
    const userId = req.user.id;

    let finalImageUrl = req.body.imageUrl || null;
    let finalVoiceUrl = req.body.voiceUrl || null;

    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        finalImageUrl = await uploadToCloudinary(req.files.image[0].buffer, 'image');
      }
      if (req.files.voice && req.files.voice[0]) {
        finalVoiceUrl = await uploadToCloudinary(req.files.voice[0].buffer, 'auto');
      }
    }

    let parsedExamples = [];
    if (typeof examples === 'string') {
      try {
        parsedExamples = JSON.parse(examples);
      } catch (e) {
        parsedExamples = [];
      }
    } else if (Array.isArray(examples)) {
      parsedExamples = examples;
    }

    const grammar = await prisma.grammar.create({
      data: {
        title,
        structure,
        description,
        examples: parsedExamples,
        imageUrl: finalImageUrl,
        voiceUrl: finalVoiceUrl,
        part: req.body.part || 'GENERAL',
        userId,
        visibility: visibility || 'PUBLIC',
        groupId: groupId || null
      },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } }
      }
    });

    return ApiResponse.created(res, 'Grammar added successfully', grammar);
  } catch (error) {
    next(error);
  }
};

exports.getGrammars = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Find groups the user belongs to
    const myGroupMemberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true }
    });
    const myGroupIds = myGroupMemberships.map(m => m.groupId);

    const grammars = await prisma.grammar.findMany({
      where: {
        OR: [
          { userId },
          { visibility: 'PUBLIC' },
          { visibility: 'GROUP', groupId: { in: myGroupIds } }
        ]
      },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        votes: true,
        savedByUsers: true,
        _count: {
          select: { savedByUsers: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return ApiResponse.success(res, 'Grammars fetched successfully', grammars);
  } catch (error) {
    next(error);
  }
};

exports.getGrammarById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const grammar = await prisma.grammar.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        votes: true,
        savedByUsers: true,
        _count: {
          select: { savedByUsers: true }
        }
      }
    });

    if (!grammar) {
      return res.status(404).json({ success: false, message: 'Tip not found' });
    }

    return ApiResponse.success(res, 'Grammar fetched successfully', grammar);
  } catch (error) {
    next(error);
  }
};

exports.deleteGrammar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await prisma.grammar.deleteMany({
      where: { id, userId }
    });

    return ApiResponse.success(res, 'Grammar deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.updateGrammar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, structure, description, examples, visibility, groupId, imageUrl, voiceUrl, part } = req.body;
    const userId = req.user.id;

    // Chỉ cho phép update nếu là chủ sở hữu
    const existing = await prisma.grammar.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Tip not found or unauthorized' });
    }

    let finalImageUrl = imageUrl || existing.imageUrl;
    let finalVoiceUrl = voiceUrl || existing.voiceUrl;

    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        finalImageUrl = await uploadToCloudinary(req.files.image[0].buffer, 'image');
      }
      if (req.files.voice && req.files.voice[0]) {
        finalVoiceUrl = await uploadToCloudinary(req.files.voice[0].buffer, 'auto');
      }
    }

    let parsedExamples = [];
    if (typeof examples === 'string') {
      try {
        parsedExamples = JSON.parse(examples);
      } catch (e) {
        parsedExamples = [];
      }
    } else if (Array.isArray(examples)) {
      parsedExamples = examples;
    }

    const updated = await prisma.grammar.update({
      where: { id },
      data: {
        title,
        structure,
        description,
        examples: parsedExamples,
        imageUrl: finalImageUrl,
        voiceUrl: finalVoiceUrl,
        part: part || 'GENERAL',
        visibility: visibility || 'PUBLIC',
        groupId: groupId || null
      },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } }
      }
    });

    return ApiResponse.success(res, 'Grammar updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

exports.toggleSaveGrammar = async (req, res, next) => {
  try {
    const { id: grammarId } = req.params;
    const userId = req.user.id;

    const existing = await prisma.savedGrammar.findUnique({
      where: {
        userId_grammarId: {
          userId,
          grammarId
        }
      }
    });

    if (existing) {
      await prisma.savedGrammar.delete({
        where: { id: existing.id }
      });
      return ApiResponse.success(res, 'Unsaved successfully', { saved: false });
    } else {
      await prisma.savedGrammar.create({
        data: { userId, grammarId }
      });

      const tip = await prisma.grammar.findUnique({
        where: { id: grammarId },
        select: { userId: true, title: true }
      });

      if (tip && tip.userId !== userId) {
        await prisma.notification.create({
          data: {
            userId: tip.userId,
            senderId: userId,
            content: `${req.user.fullName} đã lưu tip "${tip.title}" của bạn.`,
            type: 'SYSTEM',
            tipId: grammarId
          }
        });
        const io = require('../socket').getIO();
        if (io) io.to(tip.userId).emit('new_notification', { type: 'SYSTEM', content: `${req.user.fullName} đã lưu tip "${tip.title}" của bạn.` });
      }

      return ApiResponse.success(res, 'Saved successfully', { saved: true });
    }
  } catch (error) {
    next(error);
  }
};
