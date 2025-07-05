const express = require('express');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const cors = require('cors');
const http = require('http');
const morgan = require('morgan');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const redis = require('redis');

dotenv.config({ override: true, path: '.env' });

const PORT = process.env.PORT || 5000;

if (cluster.isMaster) {
  console.log(`👑 Master ${process.pid} is running`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  // Restart on crash
  cluster.on('exit', (worker) => {
    console.log(`💀 Worker ${worker.process.pid} died. Spawning a new one.`);
    cluster.fork();
  });

} else {
  // 🧠 Worker Process
  
  const app = express();
  const server = http.createServer(app);
  
  // 🔌 Socket.IO with improved CORS and clustering support
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000","https://get-on-rent.vercel.app", "http://127.0.0.1:3000"], // Add both localhost variants
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    allowEIO3: true, // Allow Engine.IO v3 clients
    transports: ['polling', 'websocket'], // Explicitly define transports
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis adapter for clustering (uncomment if you have Redis)
  // const pubClient = redis.createClient({ host: 'localhost', port: 6379 });
  // const subClient = pubClient.duplicate();
  // io.adapter(createAdapter(pubClient, subClient));

  // Database connection
  require('./config/dbconnect');

  // Middlewares
  app.use(cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('combined'));

  // Make io accessible in routes
  app.set('io', io);

  // Socket.io handlers with better error handling
io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id, 'Worker:', process.pid);
  
  // Send welcome message to confirm connection
  socket.emit('connected', {
    message: 'Connected successfully',
    socketId: socket.id,
    workerId: process.pid
  });

  socket.on('join-chat', (chatId) => {
    try {
      socket.join(chatId);
      console.log(`User ${socket.id} joined chat ${chatId} on worker ${process.pid}`);
      socket.emit('joined-chat', { chatId, success: true });
    } catch (error) {
      console.error('Error joining chat:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  });

  socket.on('join-user-room', (userId) => {
    const userRoom = `user-${userId}`;
    console.log(`🏠 User ${socket.id} joining user room ${userRoom}`);
    socket.join(userRoom);
    
    // Store user ID for this socket
    socket.userId = userId;
    
    socket.emit('joined-room', userRoom);
    console.log(`✅ User ${socket.id} joined user room ${userRoom}`);
  });

  socket.on('leave-chat', (chatId) => {
    try {
      socket.leave(chatId);
      console.log(`User ${socket.id} left chat ${chatId} on worker ${process.pid}`);
      socket.emit('left-chat', { chatId, success: true });
    } catch (error) {
      console.error('Error leaving chat:', error);
    }
  });

 const onlineUsers = new Map();
  socket.on('user-connected', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('update-online-users', Array.from(onlineUsers.keys())); // Broadcast to all
  });

  socket.on('typing', ({ chatId, isTyping, userId }) => {
    try {
      socket.to(chatId).emit('typing', { isTyping, userId });
    } catch (error) {
      console.error('Error handling typing event:', error);
    }
  });



  // Add a ping handler for connection testing
  socket.on('ping', (data) => {
    console.log('📡 Ping received:', data);
    socket.emit('pong', {
      message: 'Pong from server',
      timestamp: new Date().toISOString(),
      workerId: process.pid
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('🔴 User disconnected:', socket.id, 'Reason:', reason, 'Worker:', process.pid);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

  // Routes
  app.get('/cluster-test', (req, res) => {
    res.send(`Handled by worker ${process.pid}`);
  });

 

  app.use('/api', require('./routes/useroute'));
  app.use('/api', require('./routes/category'));
  app.use('/api', require('./routes/subcategory'));
  app.use('/api', require('./routes/postroute'));
  app.use('/api', require('./routes/booking'));
  app.use('/api', require('./routes/payment'));
  app.use('/api', require('./routes/itemtypes'));
  app.use('/api', require('./routes/auth'));
  app.use('/api/chats', require('./routes/chatRoutes'));
  app.use('/api/teams', require('./routes/teamRoutes'));
  app.use('/api/files', require('./routes/fileRoutes'));

  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // Cron Jobs
  require('./utils/cronJob');

  // Fallback error handler
  app.use((err, req, res, next) => {
    console.error('❌ Middleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start server
  server.listen(PORT, () => {
    console.log(`🚀 Worker ${process.pid} listening on port ${PORT}`);
    console.log(`🔌 Socket.IO server ready on worker ${process.pid}`);
  });
}