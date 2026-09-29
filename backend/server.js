require('dotenv').config();
const app = require('./src/app');
const prisma = require('./src/config/prisma');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database successfully via Prisma');

    const server = app.listen(PORT, () => {
      console.log(`🚀 TOEIC-HUB Backend server running on port http://localhost:${PORT}`);
      console.log(`📡 API Health Check: http://localhost:${PORT}/api/v1/health`);
    });

    // Khởi tạo Socket.io
    const socketio = require('./src/socket');
    socketio.init(server);

    // Graceful shutdown handling
    const shutdown = async () => {
      console.log('Stopping server...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('❌ Failed to connect to database or start server:', error);
    process.exit(1);
  }
}

startServer();
