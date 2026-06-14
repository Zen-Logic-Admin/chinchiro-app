const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

const rooms = new Map();
const STARTING_COINS = 100;

function generateRoomCode() {
  let code;
  do { code = Math.floor(1000 + Math.random() * 9000).toString(); }
  while (rooms.has(code));
  return code;
}

function rollDie() { return Math.floor(Math.random() * 6) + 1; }

// サイコロ3つで役を評価
function evaluateDice(dice) {
  const s = [...dice].sort((a, b) => a - b);
  const [a, b, c] = s;

  // ピンゾロ
  if (a === 1 && b === 1 && c === 1) return { rank: 100, label: 'ピンゾロ', multiplier: 3 };
  // シゴロ
  if (a === 4 && b === 5 && c === 6) return { rank: 90, label: 'シゴロ', multiplier: 2 };
  // ゾロ目
  if (a === b && b === c) return { rank: 70 + a, label: `${a}のゾロ目`, multiplier: 1 };
  // ヒフミ
  if (a === 1 && b === 2 && c === 3) return { rank: -10, label: 'ヒフミ', multiplier: 2 };
  // 目 (ペア+別の数字)
  if (a === b) return { rank: c, label: `${c}目`, multiplier: 1 };
  if (b === c) return { rank: a, label: `${a}目`, multiplier: 1 };
  // 役なし
  return { rank: 0, label: '役なし', reroll: true, multiplier: 1 };
}

// 最大3回振って有効な役を出す
function rollUntilValid() {
  const attempts = [];
  for (let i = 0; i < 3; i++) {
    const dice = [rollDie(), rollDie(), rollDie()];
    const result = evaluateDice(dice);
    attempts.push({ dice, result });
    if (!result.reroll) return { attempts, final: { dice, result } };
  }
  // 3回とも役なし → 最後のを使う（負け扱い）
  const last = attempts[attempts.length - 1];
  return { attempts, final: { dice: last.dice, result: { ...last.result, rank: 0, label: '役なし' } } };
}

// 1vs1の勝敗判定
function judge(oyaResult, koResult, bet) {
  const oya = oyaResult.rank;
  const ko = koResult.rank;

  if (ko > oya) {
    const mul = Math.max(koResult.multiplier, 1);
    return { outcome: 'win', coinChange: bet * mul };
  } else if (ko < oya) {
    const mul = Math.max(oyaResult.multiplier, koResult.rank === -10 ? 2 : 1);
    return { outcome: 'loss', coinChange: -(bet * mul) };
  } else {
    return { outcome: 'draw', coinChange: 0 };
  }
}

io.on('connection', (socket) => {

  socket.on('room:create', ({ playerName }) => {
    const code = generateRoomCode();
    const room = {
      code, hostId: socket.id,
      players: [{ id: socket.id, name: playerName, coins: STARTING_COINS, bet: 10 }],
      state: 'waiting',
      oyaIndex: 0,
      round: 0,
    };
    rooms.set(code, room);
    socket.join(code);
    socket.roomCode = code;
    socket.emit('room:created', { roomCode: code, players: room.players, isHost: true });
  });

  socket.on('room:join', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);
    if (!room) return socket.emit('error', { message: 'ルームが見つかりません' });
    if (room.state !== 'waiting') return socket.emit('error', { message: 'ゲームはすでに始まっています' });

    room.players.push({ id: socket.id, name: playerName, coins: STARTING_COINS, bet: 10 });
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.emit('room:joined', { roomCode, players: room.players, isHost: false });
    socket.to(roomCode).emit('room:updated', { players: room.players });
  });

  socket.on('game:start', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.state = 'betting';
    room.oyaIndex = 0;
    room.round = 1;
    room.players.forEach(p => { p.coins = STARTING_COINS; p.bet = 10; });
    io.to(room.code).emit('game:started', {
      players: room.players,
      oyaId: room.players[0].id,
      round: room.round,
    });
  });

  socket.on('bet:set', ({ amount }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.state !== 'betting') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    const clamped = Math.max(1, Math.min(amount, player.coins));
    player.bet = clamped;
    io.to(room.code).emit('bet:updated', { players: room.players });
  });

  socket.on('round:roll', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'betting') return;
    room.state = 'rolling';

    const oya = room.players[room.oyaIndex];
    const oyaRoll = rollUntilValid();

    const battles = room.players
      .filter(p => p.id !== oya.id)
      .map(ko => {
        const koRoll = rollUntilValid();
        const { outcome, coinChange } = judge(oyaRoll.final.result, koRoll.final.result, ko.bet);
        ko.coins = Math.max(0, ko.coins + coinChange);
        oya.coins = Math.max(0, oya.coins - coinChange);
        return {
          playerId: ko.id,
          playerName: ko.name,
          bet: ko.bet,
          attempts: koRoll.attempts,
          dice: koRoll.final.dice,
          result: koRoll.final.result,
          outcome,
          coinChange,
        };
      });

    room.state = 'result';

    io.to(room.code).emit('round:result', {
      oyaId: oya.id,
      oyaName: oya.name,
      oyaAttempts: oyaRoll.attempts,
      oyaDice: oyaRoll.final.dice,
      oyaResult: oyaRoll.final.result,
      battles,
      players: room.players,
      round: room.round,
    });
  });

  socket.on('round:next', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'result') return;

    // 破産者チェック
    const alive = room.players.filter(p => p.coins > 0);
    if (alive.length <= 1) {
      room.state = 'over';
      io.to(room.code).emit('game:over', { players: room.players });
      return;
    }

    room.oyaIndex = (room.oyaIndex + 1) % room.players.length;
    room.round += 1;
    room.state = 'betting';
    room.players.forEach(p => {
      p.bet = Math.min(p.bet || 10, p.coins || 1);
    });

    io.to(room.code).emit('round:next', {
      oyaId: room.players[room.oyaIndex].id,
      players: room.players,
      round: room.round,
    });
  });

  socket.on('game:end', () => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.state = 'over';
    io.to(room.code).emit('game:over', { players: room.players });
  });

  socket.on('disconnect', () => {
    const roomCode = socket.roomCode;
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) { rooms.delete(roomCode); return; }
    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
      io.to(roomCode).emit('host:changed', { hostId: room.hostId, players: room.players });
    } else {
      io.to(roomCode).emit('room:updated', { players: room.players });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Chinchiro server on port ${PORT}`));
