const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 정적 파일 제공 (public 폴더 안의 클라이언트 파일들)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 방 및 게임 상태 관리 객체
const rooms = {};

io.on('connection', (socket) => {
    console.log('플레이어 접속:', socket.id);

    // 방 만들기
    socket.on('createRoom', ({ roomCode, playerName }) => {
        if (rooms[roomCode]) {
            socket.emit('errorMsg', '이미 존재하는 방 코드입니다.');
            return;
        }

        rooms[roomCode] = {
            host: socket.id,
            players: [{ id: socket.id, name: playerName, chips: 1000, bet: 0, folded: false }],
            gameState: 'waiting', // waiting, playing
            pot: 0,
            currentTurn: 0
        };

        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
        io.to(roomCode).emit('updateRoom', rooms[roomCode]);
        console.log(`방 생성됨: ${roomCode} (방장: ${playerName})`);
    });

    // 방 입장하기
    socket.on('joinRoom', ({ roomCode, playerName }) => {
        const room = rooms[roomCode];
        if (!room) {
            socket.emit('errorMsg', '존재하지 않는 방입니다.');
            return;
        }

        if (room.gameState !== 'waiting') {
            socket.emit('errorMsg', '이미 게임이 진행 중인 방입니다.');
            return;
        }

        room.players.push({ id: socket.id, name: playerName, chips: 1000, bet: 0, folded: false });
        socket.join(roomCode);
        socket.emit('roomJoined', roomCode);
        io.to(roomCode).emit('updateRoom', room);
        console.log(`${playerName} 님이 방 ${roomCode}에 입장했습니다.`);
    });

    // 베팅 액션 처리 (체크, 콜, 레이즈, 다이/폴드 등)
    socket.on('playerAction', ({ roomCode, action, amount }) => {
        const room = rooms[roomCode];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        console.log(`[액션 수신] 방: ${roomCode}, 플레이어: ${player.name}, 액션: ${action}, 금액: ${amount || 0}`);

        // 각 베팅 액션에 따른 로직 분기
        if (action === 'fold') {
            player.folded = true;
        } else if (action === 'call') {
            // 콜 처리 로직
            player.chips -= amount;
            player.bet += amount;
            room.pot += amount;
        } else if (action === 'raise') {
            // 레이즈 처리 로직
            player.chips -= amount;
            player.bet += amount;
            room.pot += amount;
        } else if (action === 'check') {
            // 체크는 추가 칩 소모 없음
        }

        // 액션 결과를 해당 방의 모든 플레이어에게 브로드캐스트
        io.to(roomCode).emit('actionPerformed', {
            playerId: socket.id,
            playerName: player.name,
            action,
            amount,
            roomState: room
        });

        // 다음 턴으로 넘기거나 게임 진행 판정 로직을 여기에 추가할 수 있습니다.
    });

    // 연결 해제 시 처리
    socket.on('disconnect', () => {
        console.log('플레이어 접속 해제:', socket.id);
        // 방에서 플레이어 제거 로직
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const index = room.players.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                io.to(roomCode).emit('updateRoom', room);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`포커 게임 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
