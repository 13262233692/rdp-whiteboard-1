class SignalingServer {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.whiteboardData = new Map();
    this.setupHandlers();
  }

  setupHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('join-room', (roomId, userId) => {
        this.joinRoom(socket, roomId, userId);
      });

      socket.on('leave-room', (roomId) => {
        this.leaveRoom(socket, roomId);
      });

      socket.on('draw', (data) => {
        this.handleDraw(socket, data);
      });

      socket.on('delete-stroke', (data) => {
        this.handleDeleteStroke(socket, data);
      });

      socket.on('cursor-move', (data) => {
        this.handleCursorMove(socket, data);
      });

      socket.on('clear-canvas', (roomId) => {
        this.handleClearCanvas(socket, roomId);
      });

      socket.on('offer', (data) => {
        this.handleOffer(socket, data);
      });

      socket.on('answer', (data) => {
        this.handleAnswer(socket, data);
      });

      socket.on('ice-candidate', (data) => {
        this.handleIceCandidate(socket, data);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  joinRoom(socket, roomId, userId) {
    socket.join(roomId);
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    if (!this.whiteboardData.has(roomId)) {
      this.whiteboardData.set(roomId, []);
    }

    const room = this.rooms.get(roomId);
    room.set(socket.id, userId);

    const users = Array.from(room.values());
    socket.emit('room-joined', {
      roomId,
      userId,
      users,
      whiteboardData: this.whiteboardData.get(roomId)
    });

    socket.to(roomId).emit('user-joined', { userId, socketId: socket.id });
    console.log(`User ${userId} joined room ${roomId}`);
  }

  leaveRoom(socket, roomId) {
    socket.leave(roomId);
    
    const room = this.rooms.get(roomId);
    if (room) {
      const userId = room.get(socket.id);
      room.delete(socket.id);
      
      if (room.size === 0) {
        this.rooms.delete(roomId);
        this.whiteboardData.delete(roomId);
      } else {
        socket.to(roomId).emit('user-left', { userId, socketId: socket.id });
      }
      
      console.log(`User ${userId} left room ${roomId}`);
    }
  }

  handleDraw(socket, data) {
    const { roomId, strokeId } = data;
    
    if (this.whiteboardData.has(roomId)) {
      const existingIndex = this.whiteboardData.get(roomId).findIndex(d => d.strokeId === strokeId);
      if (existingIndex === -1) {
        this.whiteboardData.get(roomId).push(data);
      }
    }

    socket.to(roomId).emit('draw', data);
  }

  handleDeleteStroke(socket, data) {
    const { roomId, strokeId } = data;
    
    if (this.whiteboardData.has(roomId)) {
      const strokes = this.whiteboardData.get(roomId);
      this.whiteboardData.set(roomId, strokes.filter(s => s.strokeId !== strokeId));
    }

    socket.to(roomId).emit('delete-stroke', data);
  }

  handleCursorMove(socket, data) {
    const { roomId } = data;
    socket.to(roomId).emit('cursor-move', data);
  }

  handleClearCanvas(socket, roomId) {
    if (this.whiteboardData.has(roomId)) {
      this.whiteboardData.set(roomId, []);
    }
    socket.to(roomId).emit('clear-canvas');
  }

  handleOffer(socket, data) {
    const { to, offer } = data;
    socket.to(to).emit('offer', {
      from: socket.id,
      offer
    });
  }

  handleAnswer(socket, data) {
    const { to, answer } = data;
    socket.to(to).emit('answer', {
      from: socket.id,
      answer
    });
  }

  handleIceCandidate(socket, data) {
    const { to, candidate } = data;
    socket.to(to).emit('ice-candidate', {
      from: socket.id,
      candidate
    });
  }

  handleDisconnect(socket) {
    console.log('User disconnected:', socket.id);
    
    this.rooms.forEach((room, roomId) => {
      if (room.has(socket.id)) {
        const userId = room.get(socket.id);
        room.delete(socket.id);
        
        if (room.size === 0) {
          this.rooms.delete(roomId);
          this.whiteboardData.delete(roomId);
        } else {
          socket.to(roomId).emit('user-left', { userId, socketId: socket.id });
        }
      }
    });
  }
}

module.exports = SignalingServer;
