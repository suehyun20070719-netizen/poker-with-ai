// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

const rooms = {}; // 방별 게임 상태 관리

io.on('connection', (socket) => {
  console.log('유저 접속:', socket.id);

  // 방 참여
  socket.on('joinRoom', ({ roomId, playerName }) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: roomId,
        players: [],
        pot: 0,
        gameState: 'waiting'
      };
    }
    
    const room = rooms[roomId];
    const player = {
      id: socket.id,
      name: playerName,
      chips: 1000,
      bet: 0,
      folded: false
    };
    
    room.players.push(player);
    io.to(roomId).emit('updateRoom', room);
    console.log(`${playerName} 님이 ${roomId} 방에 참가함.`);
  });

  // 베팅 액션 수신 및 전송
  socket.on('playerAction', ({ roomId, actionType, amount }) => {
    const room = rooms[roomId];
    if (!room) return;

    // 실시간으로 모든 플레이어에게 베팅 액션 전달
    io.to(roomId).emit('onPlayerAction', {
      playerId: socket.id,
      actionType,
      amount
    });
  });

  socket.on('disconnect', () => {
    console.log('접속 종료:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));
