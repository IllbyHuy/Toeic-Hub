const prisma = require('../config/prisma');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const bcrypt = require('bcrypt');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const sendEmail = require('../utils/email');
const { nudgeEmailTemplate } = require('../utils/emailTemplates');

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fullName } = req.body;
    
    let avatarUrl = undefined;

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'toeic_avatars' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      avatarUrl = uploadResult.secure_url;
    }

    const dataToUpdate = {};
    if (fullName) dataToUpdate.fullName = fullName;
    if (avatarUrl) dataToUpdate.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
      }
    });

    return ApiResponse.success(res, 'Cập nhật thông tin thành công', user);
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'Người dùng không tồn tại');

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new ApiError(400, 'Mật khẩu cũ không chính xác');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return ApiResponse.success(res, 'Đổi mật khẩu thành công', null);
  } catch (error) {
    next(error);
  }
};

exports.getUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        posts: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, fullName: true, avatarUrl: true } },
            _count: { select: { comments: true, votes: true } }
          }
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            post: { select: { id: true, title: true } },
            grammar: { select: { id: true, title: true } },
            vocabulary: { select: { id: true, word: true } }
          }
        },
        grammars: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } }
          }
        },
        savedPosts: {
          orderBy: { createdAt: 'desc' },
          include: {
            post: {
              include: {
                author: { select: { id: true, fullName: true, avatarUrl: true } },
                _count: { select: { comments: true, votes: true } }
              }
            }
          }
        },
        savedGrammars: {
          orderBy: { createdAt: 'desc' },
          include: {
            grammar: {
              include: {
                user: { select: { id: true, fullName: true, avatarUrl: true } },
                votes: true,
                savedByUsers: true,
                _count: { select: { savedByUsers: true, votes: true } }
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new ApiError(404, 'Không tìm thấy người dùng');
    }

    return ApiResponse.success(res, 'Thành công', user);
  } catch (error) {
    next(error);
  }
};

exports.updateUserStreak = async (userId) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = user.currentStreak;
    const lastActivity = user.lastActivityDate;

    if (lastActivity) {
      const lastActivityDate = new Date(lastActivity);
      lastActivityDate.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(today - lastActivityDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        lastActivityDate: new Date()
      }
    });

    // Log Activity for today
    const activityDate = new Date();
    activityDate.setHours(0, 0, 0, 0);
    
    await prisma.activityLog.upsert({
      where: {
        userId_date_type: {
          userId: userId,
          date: activityDate,
          type: 'vocabulary'
        }
      },
      update: {
        count: { increment: 1 }
      },
      create: {
        userId: userId,
        date: activityDate,
        type: 'vocabulary',
        count: 1
      }
    });
  } catch (error) {
    console.error('Error updating streak:', error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const personalVocabs = await prisma.vocabulary.findMany({ where: { userId } });
    const systemVocabs = await prisma.userVocabProgress.findMany({ where: { userId } });

    const allVocabs = [...personalVocabs, ...systemVocabs];

    // Build Activity Logs dynamically based on ACTUAL vocabulary interactions
    const activityMap = {};
    for (const v of allVocabs) {
      const d = v.updatedAt ? new Date(v.updatedAt) : new Date(v.createdAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      if (!activityMap[dateStr]) activityMap[dateStr] = 0;
      activityMap[dateStr]++;
    }

    // Add explicit activity logs (like logins)
    const dbLogs = await prisma.activityLog.findMany({ where: { userId } });
    for (const l of dbLogs) {
      const d = new Date(l.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      if (!activityMap[dateStr]) activityMap[dateStr] = 0;
      activityMap[dateStr] += l.count;
    }

    const activityLogs = Object.keys(activityMap).map(date => ({
      date: date,
      count: activityMap[date],
      type: 'vocabulary'
    }));

    // Calculate dailyStats dynamically from the last 7 days
    const dailyStats = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const log = activityLogs.find(l => l.date === dateStr);
      const total = log ? log.count : 0;
      
      // Simulate learned vs review ratio based on total
      const learned = Math.ceil(total * 0.6);
      const review = total - learned;
      
      dailyStats.push({
        name: daysOfWeek[d.getDay()],
        learned: learned,
        review: review
      });
    }

    const stats = {
      totalWords: allVocabs.length,
      masteredWords: allVocabs.filter(v => v.status === 'MASTERED').length,
      learningWords: allVocabs.filter(v => v.status === 'LEARNING' || v.status === 'REVIEW').length,
      newWords: allVocabs.filter(v => v.status === 'NEW').length,
      retentionRate: allVocabs.length > 0 
        ? Math.round((allVocabs.filter(v => v.status === 'MASTERED').length / allVocabs.length) * 100) 
        : 0,
      currentStreak: user.currentStreak,
      activityLogs: activityLogs,
      dailyStats: dailyStats
    };

    return ApiResponse.success(res, 'Thành công', stats);
  } catch (error) {
    next(error);
  }
};

exports.getActivityDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date, type } = req.query;

    if (!date) {
      throw new ApiError(400, 'Thiếu tham số date');
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let details = [];

    if (type === 'vocabulary' || !type) {
      // Find personal vocabs updated on this date
      const personalVocabs = await prisma.vocabulary.findMany({
        where: {
          userId,
          updatedAt: {
            gte: queryDate,
            lt: nextDay
          }
        },
        select: {
          id: true,
          word: true,
          meaning: true,
          status: true,
          updatedAt: true,
          type: true
        }
      });

      // Find system vocabs progress updated on this date
      const systemVocabProgress = await prisma.userVocabProgress.findMany({
        where: {
          userId,
          updatedAt: {
            gte: queryDate,
            lt: nextDay
          }
        },
        include: {
          vocab: {
            select: {
              word: true,
              meaning: true,
              type: true
            }
          }
        }
      });

      const formattedSystemVocabs = systemVocabProgress.map(p => ({
        id: p.id,
        word: p.vocab.word,
        meaning: p.vocab.meaning,
        status: p.status,
        updatedAt: p.updatedAt,
        type: p.vocab.type
      }));

      details = [...personalVocabs, ...formattedSystemVocabs];
      
      // Sort by updatedAt descending
      details.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    return ApiResponse.success(res, 'Thành công', details);
  } catch (error) {
    next(error);
  }
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get top 50 users by streak
    const topUsers = await prisma.user.findMany({
      orderBy: { currentStreak: 'desc' },
      take: 50,
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        currentStreak: true,
        lastActivityDate: true
      }
    });

    // Check if current user is in top 50
    let currentUserRank = topUsers.findIndex(u => u.id === userId) + 1;
    let currentUserData = null;

    if (currentUserRank === 0) {
      // User is not in top 50, need to calculate their actual rank
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, avatarUrl: true, currentStreak: true, lastActivityDate: true }
      });
      
      if (user) {
        currentUserData = user;
        // Count users with higher streak to get rank
        const higherStreakCount = await prisma.user.count({
          where: { currentStreak: { gt: user.currentStreak } }
        });
        currentUserRank = higherStreakCount + 1;
      }
    } else {
      currentUserData = topUsers[currentUserRank - 1];
    }

    // Determine if each user studied today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatUser = (u) => {
      let studiedToday = false;
      if (u.lastActivityDate) {
        const lastAct = new Date(u.lastActivityDate);
        lastAct.setHours(0, 0, 0, 0);
        if (lastAct.getTime() === today.getTime()) {
          studiedToday = true;
        }
      }
      return {
        id: u.id,
        name: u.fullName,
        avatar: u.avatarUrl,
        streak: u.currentStreak,
        studiedToday
      };
    };

    return ApiResponse.success(res, 'Fetched leaderboard', {
      topUsers: topUsers.map((u, i) => ({ ...formatUser(u), rank: i + 1 })),
      currentUser: currentUserData ? { ...formatUser(currentUserData), rank: currentUserRank, isMe: true } : null
    });
  } catch (error) {
    next(error);
  }
};

exports.nudgeUser = async (req, res, next) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;
    
    if (receiverId === senderId) {
      return next(new ApiError(400, 'Không thể tự nhắc nhở bản thân'));
    }

    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    
    if (!receiver || !sender) {
      return next(new ApiError(404, 'User not found'));
    }

    const html = nudgeEmailTemplate(sender.fullName, receiver.fullName, receiver.currentStreak || 0);
    
    if (receiver.email) {
       await sendEmail({
         to: receiver.email,
         subject: `${sender.fullName} vừa nhắc bạn học bài!`,
         html
       });
    }

    return ApiResponse.success(res, 'Nudge sent successfully', null);
  } catch (error) {
    next(error);
  }
};

exports.getTopContributors = async (req, res, next) => {
  try {
    const activeUsers = await prisma.user.findMany({
      take: 50,
      orderBy: { posts: { _count: 'desc' } },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        posts: {
          select: {
            id: true,
            votes: { select: { type: true } },
            savedByUsers: { select: { id: true } }
          }
        }
      }
    });

    const userStats = activeUsers.map(user => {
      let totalLikes = 0;
      let totalSaved = 0;
      let totalPosts = user.posts.length;

      user.posts.forEach(post => {
        totalLikes += post.votes.filter(v => v.type === 'UPVOTE').length;
        totalSaved += post.savedByUsers.length;
      });

      return {
        id: user.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        postsCount: totalPosts,
        likesCount: totalLikes,
        savedCount: totalSaved
      };
    });

    const mostPosts = [...userStats].sort((a, b) => b.postsCount - a.postsCount).slice(0, 5);
    const mostLikes = [...userStats].sort((a, b) => b.likesCount - a.likesCount).slice(0, 5);
    const mostSaved = [...userStats].sort((a, b) => b.savedCount - a.savedCount).slice(0, 5);

    return ApiResponse.success(res, 'Fetched top contributors', {
      mostPosts,
      mostLikes,
      mostSaved
    });
  } catch (error) {
    next(error);
  }
};
