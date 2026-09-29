const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

const streamifier = require('streamifier');

const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'toeic-hub/comments', resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

exports.createComment = async (req, res, next) => {
  try {
    const { content, targetId, targetType, parentId, imageUrl, replyToCommentId } = req.body;
    const authorId = req.user.id;

    if (!content || !targetId || !targetType) {
      throw new ApiError(400, 'Content, targetId, and targetType are required');
    }

    let finalImageUrl = imageUrl || null;
    
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      finalImageUrl = result.secure_url;
    }

    const data = {
      content,
      authorId,
      imageUrl: finalImageUrl,
      parentId: parentId || null,
    };

    if (targetType === 'POST') data.postId = targetId;
    else if (targetType === 'VOCABULARY') data.vocabularyId = targetId;
    else if (targetType === 'TIP') data.grammarId = targetId;
    else throw new ApiError(400, 'Invalid targetType');

    const comment = await prisma.comment.create({
      data,
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });

    // Notify author of post/tip/vocab
    let targetOwnerId = null;
    let targetLink = '';
    
    if (targetType === 'POST') {
      const p = await prisma.post.findUnique({ where: { id: targetId }, select: { authorId: true, title: true } });
      targetOwnerId = p?.authorId;
      targetLink = `bài viết "${p?.title}"`;
    } else if (targetType === 'VOCABULARY') {
      const v = await prisma.vocabulary.findUnique({ where: { id: targetId }, select: { userId: true, word: true } });
      targetOwnerId = v?.userId;
      targetLink = `từ vựng "${v?.word}"`;
    } else if (targetType === 'TIP') {
      const t = await prisma.grammar.findUnique({ where: { id: targetId }, select: { userId: true, title: true } });
      targetOwnerId = t?.userId;
      targetLink = `tip "${t?.title}"`;
    }

    if (targetOwnerId && targetOwnerId !== authorId) {
      const notification = await prisma.notification.create({
        data: {
          userId: targetOwnerId,
          senderId: authorId,
          content: `${req.user.fullName} đã bình luận vào ${targetLink} của bạn.`,
          type: 'COMMENT',
          postId: targetType === 'POST' ? targetId : null,
          tipId: targetType === 'TIP' ? targetId : null,
          commentId: comment.id
        }
      });
      const io = require('../socket').getIO();
      const senderUser = await prisma.user.findUnique({ where: { id: authorId }, select: { id: true, fullName: true, avatarUrl: true } });
      io.to(targetOwnerId).emit('new_notification', { ...notification, sender: senderUser });
    }

    // Notify parent comment author if this is a reply
    // Notify parent comment author if this is a reply
    const notifyCommentId = replyToCommentId || parentId;
    if (notifyCommentId) {
      const notifyComment = await prisma.comment.findUnique({ where: { id: notifyCommentId }, select: { authorId: true } });
      if (notifyComment && notifyComment.authorId !== authorId && notifyComment.authorId !== targetOwnerId) {
        const replyNotification = await prisma.notification.create({
          data: {
            userId: notifyComment.authorId,
            senderId: authorId,
            content: `${req.user.fullName} đã trả lời bình luận của bạn.`,
            type: 'REPLY',
            postId: targetType === 'POST' ? targetId : null,
            tipId: targetType === 'TIP' ? targetId : null,
            commentId: comment.id
          }
        });
        const io = require('../socket').getIO();
        const senderUser = await prisma.user.findUnique({ where: { id: authorId }, select: { id: true, fullName: true, avatarUrl: true } });
        io.to(notifyComment.authorId).emit('new_notification', { ...replyNotification, sender: senderUser });
      }
    }

    return ApiResponse.created(res, 'Comment posted successfully', comment);
  } catch (error) {
    next(error);
  }
};

exports.getCommentsByTarget = async (req, res, next) => {
  try {
    const { targetId, targetType } = req.query;
    if (!targetId || !targetType) throw new ApiError(400, 'Missing target parameters');

    const where = { parentId: null };
    if (targetType === 'POST') where.postId = targetId;
    else if (targetType === 'VOCABULARY') where.vocabularyId = targetId;
    else if (targetType === 'TIP') where.grammarId = targetId;

    const comments = await prisma.comment.findMany({
      where,
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true }
        },
        _count: {
          select: { replies: true }
        },
        votes: true,
        replies: {
          include: {
            author: { select: { id: true, fullName: true, avatarUrl: true } },
            votes: true
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return ApiResponse.success(res, 'Fetched comments successfully', comments);
  } catch (error) {
    next(error);
  }
};

exports.editComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, imageUrl } = req.body;
    const authorId = req.user.id;

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing || existing.authorId !== authorId) {
      throw new ApiError(403, 'Permission denied');
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { content, imageUrl },
      include: { author: { select: { id: true, fullName: true, avatarUrl: true } } }
    });

    return ApiResponse.success(res, 'Comment updated', updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const authorId = req.user.id;

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing || existing.authorId !== authorId) {
      throw new ApiError(403, 'Permission denied');
    }

    await prisma.comment.delete({ where: { id } });
    return ApiResponse.success(res, 'Comment deleted');
  } catch (error) {
    next(error);
  }
};
