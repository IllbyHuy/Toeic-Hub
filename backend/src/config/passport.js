const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const prisma = require('./prisma');

// Sử dụng chung 1 hàm logic để xử lý OAuth Login
const handleOAuthLogin = async (provider, profile, done) => {
  try {
    const email = (profile.emails && profile.emails.length > 0) 
      ? profile.emails[0].value 
      : `${profile.username || profile.id}@${provider}.com`; // Fallback nếu không có email public
    
    let user = await prisma.user.findUnique({ where: { email } });
    
    const updateData = {};
    if (provider === 'google') updateData.googleId = profile.id;
    if (provider === 'github') updateData.githubId = profile.id;
    
    const avatarUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

    if (user) {
      // Gộp tài khoản nếu email đã tồn tại nhưng chưa có Provider ID
      if ((provider === 'google' && !user.googleId) || (provider === 'github' && !user.githubId)) {
        user = await prisma.user.update({
          where: { email },
          data: updateData
        });
      }
      return done(null, user);
    } else {
      // Tạo mới nếu chưa có tài khoản
      user = await prisma.user.create({
        data: {
          email,
          fullName: profile.displayName || profile.username || 'Người dùng mới',
          avatarUrl,
          isVerified: true, // Auto verify vì đã qua bước xác thực bên thứ 3
          ...updateData
        }
      });
      return done(null, user);
    }
  } catch (error) {
    console.error(`OAuth ${provider} Error:`, error);
    return done(error, false);
  }
};

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER) || Boolean(process.env.BACKEND_URL);
const backendUrl = (process.env.BACKEND_URL || 'https://toeic-hub.onrender.com').replace(/\/$/, '');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_ID.trim() : process.env.GOOGLE_CLIENT_ID : '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.trim() : '',
    callbackURL: isProduction 
      ? `${backendUrl}/api/v1/auth/google/callback` 
      : "http://localhost:5000/api/v1/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    handleOAuthLogin('google', profile, done);
  }
));

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID ? process.env.GITHUB_CLIENT_ID.trim() : '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ? process.env.GITHUB_CLIENT_SECRET.trim() : '',
    callbackURL: isProduction 
      ? `${backendUrl}/api/v1/auth/github/callback` 
      : "http://localhost:5000/api/v1/auth/github/callback",
    scope: ['user:email']
  },
  (accessToken, refreshToken, profile, done) => {
    handleOAuthLogin('github', profile, done);
  }
));

module.exports = passport;
