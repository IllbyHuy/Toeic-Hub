const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const onlineUsers = new Map(); // Map to track userId -> Set of socketIds

module.exports = {
  init: (httpServer) => {
    const clientOrigin = process.env.CLIENT_URL || '*';
    io = new Server(httpServer, {
      cors: {
        origin: clientOrigin === '*' ? '*' : [clientOrigin, 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Authentication middleware cho Socket.io
    io.use((socket, next) => {
      if (socket.handshake.query && socket.handshake.query.token) {
        jwt.verify(
          socket.handshake.query.token,
          process.env.JWT_SECRET || 'fallback_secret',
          (err, decoded) => {
            if (err) return next(new Error('Authentication error'));
            socket.userId = decoded.id;
            next();
          }
        );
      } else {
        next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`🔌 Người dùng đã kết nối vào Socket: ${socket.userId}`);
      
      // Track online status
      if (!onlineUsers.has(socket.userId)) {
        onlineUsers.set(socket.userId, new Set());
        // Broadcast new online user to everyone
        io.emit('user_status', { userId: socket.userId, online: true });
      }
      onlineUsers.get(socket.userId).add(socket.id);
      
      // Send initial list of online users to this socket
      socket.emit('online_users', Array.from(onlineUsers.keys()));

      // Cho user join vào 1 room cá nhân để dễ gửi thông báo riêng
      socket.join(socket.userId);
      socket.join(`user_${socket.userId}`);

      // Tham gia phòng chat group
      socket.on('join_group', (groupId) => {
        socket.join(`group_${groupId}`);
      });

      // Rời khỏi phòng chat group
      socket.on('leave_group', (groupId) => {
        socket.leave(`group_${groupId}`);
      });

      socket.on('disconnect', () => {
        console.log(`❌ Người dùng ngắt kết nối: ${socket.userId}`);
        const userSockets = onlineUsers.get(socket.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            onlineUsers.delete(socket.userId);
            // Broadcast offline status
            io.emit('user_status', { userId: socket.userId, online: false });
          }
        }
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
};
