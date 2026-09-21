import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './services/socketService.js';
import { jobQueue } from './config/queue.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

initSocket(io);

// Start server after database connection
const startServer = async () => {
  await connectDB();
  await jobQueue.init();

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Marketplace ERP Server running on port ${PORT}`);
    console.log(`🌐 Base API URL: http://localhost:${PORT}/api/v1`);
    console.log(`⚡ Real-time Socket.IO initialized`);
    console.log(`====================================================`);
  });
};

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
});
