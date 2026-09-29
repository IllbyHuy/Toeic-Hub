const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// Toggle or update vote on a post
exports.votePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { type } = req.body; // 'UPVOTE' or 'DOWNVOTE'
    const userId = req.user.id;

    if (!['UPVOTE', 'DOWNVOTE'].includes(type)) {
      throw new ApiError(400, 'Invalid vote type. Must be UPVOTE or DOWNVOTE');
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existingVote) {
      if (existingVote.type === type) {
        // Toggle off (remove vote if user clicks same button again)
        await prisma.vote.delete({ where: { id: existingVote.id } });
        return ApiResponse.success(res, 'Vote removed', { voted: null });
      } else {
        // Change vote (e.g. from DOWNVOTE to UPVOTE)
        const updated = await prisma.vote.update({
          where: { id: existingVote.id },
          data: { type },
        });
        return ApiResponse.success(res, 'Vote updated', { voted: updated.type });
      }
    }

    const newVote = await prisma.vote.create({
      data: {
        type,
        userId,
        postId,
      },
    });

    if (type === 'UPVOTE') {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true, title: true }
      });

      if (post && post.authorId !== userId) {
        const io = require('../socket').getIO();
        const notification = await prisma.notification.create({
          data: {
            userId: post.authorId,
            senderId: userId,
            content: `${req.user.fullName} đã thích bài viết "${post.title}" của bạn.`,
            type: 'UPVOTE',
            postId: postId
          }
        });
        const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, avatarUrl: true } });
        io.to(post.authorId).emit('new_notification', { ...notification, sender: senderUser });
      }
    }

    return ApiResponse.created(res, 'Vote cast successfully', { voted: newVote.type });
  } catch (error) {
    next(error);
  }
};

exports.voteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { type } = req.body; // 'UPVOTE' or 'DOWNVOTE'
    const userId = req.user.id;

    if (!['UPVOTE', 'DOWNVOTE'].includes(type)) {
      throw new ApiError(400, 'Invalid vote type. Must be UPVOTE or DOWNVOTE');
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_commentId: { userId, commentId },
      },
    });

    if (existingVote) {
      if (existingVote.type === type) {
        await prisma.vote.delete({ where: { id: existingVote.id } });
        return ApiResponse.success(res, 'Vote removed', { voted: null });
      } else {
        const updated = await prisma.vote.update({
          where: { id: existingVote.id },
          data: { type },
        });
        return ApiResponse.success(res, 'Vote updated', { voted: updated.type });
      }
    }

    const newVote = await prisma.vote.create({
      data: {
        type,
        userId,
        commentId,
      },
    });

    return ApiResponse.success(res, 'Vote cast successfully', { voted: newVote.type });
  } catch (error) {
    next(error);
  }
};

exports.voteTip = async (req, res, next) => {
  try {
    const { grammarId } = req.params;
    const { type } = req.body; // 'UPVOTE' or 'DOWNVOTE'
    const userId = req.user.id;

    if (!['UPVOTE', 'DOWNVOTE'].includes(type)) {
      throw new ApiError(400, 'Invalid vote type. Must be UPVOTE or DOWNVOTE');
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_grammarId: { userId, grammarId },
      },
    });

    if (existingVote) {
      if (existingVote.type === type) {
        await prisma.vote.delete({ where: { id: existingVote.id } });
        return ApiResponse.success(res, 'Vote removed', { voted: null });
      } else {
        const updated = await prisma.vote.update({
          where: { id: existingVote.id },
          data: { type },
        });
        return ApiResponse.success(res, 'Vote updated', { voted: updated.type });
      }
    }

    const newVote = await prisma.vote.create({
      data: {
        type,
        userId,
        grammarId,
      },
    });

    return ApiResponse.success(res, 'Vote cast successfully', { voted: newVote.type });
  } catch (error) {
    next(error);
  }
};
