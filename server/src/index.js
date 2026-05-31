require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const cors = require('cors');
const SignalingServer = require('./signaling');
const VNCProxy = require('./vnc-proxy');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const signalingServer = new SignalingServer(io);

const vncProxy = new VNCProxy(
  process.env.VNC_HOST || 'localhost',
  process.env.VNC_PORT || 5900
);

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  vncProxy.handleConnection(ws);
});

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  
  if (pathname === '/vnc') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket VNC proxy: ws://localhost:${PORT}/vnc`);
  console.log(`Socket.io signaling server ready`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  vncProxy.closeAll();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  vncProxy.closeAll();
  server.close(() => {
    process.exit(0);
  });
});
