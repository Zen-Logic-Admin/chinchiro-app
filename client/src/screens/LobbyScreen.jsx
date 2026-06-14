import { useState } from 'react';
import { socket } from '../socket.js';

export default function LobbyScreen({ roomInfo, setRoomInfo }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [tab, setTab] = useState('create');

  function createRoom() {
    if (!name.trim()) return;
    socket.emit('room:create', { playerName: name.trim() });
  }

  function joinRoom() {
    if (!name.trim() || !code.trim()) return;
    socket.emit('room:join', { roomCode: code.trim(), playerName: name.trim() });
  }

  function startGame() {
    socket.emit('game:start');
  }

  // ルーム待機画面
  if (roomInfo) {
    return (
      <div style={styles.root}>
        <div style={styles.card}>
          <div style={styles.title}>チンチロリン 🎲</div>
          <div style={{ marginBottom: 8, color: '#aaa', fontSize: 13 }}>ルームコード</div>
          <div style={styles.roomCode}>{roomInfo.roomCode}</div>
          <div style={{ marginBottom: 16, color: '#888', fontSize: 12 }}>このコードを仲間に教えてください</div>

          <div style={{ marginBottom: 16 }}>
            {roomInfo.players.map((p, i) => (
              <div key={p.id} style={styles.playerRow}>
                <span style={{ color: '#ffd700' }}>{i === 0 ? '👑 ' : '🎲 '}</span>
                <span>{p.name}</span>
                {i === 0 && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#ffd700' }}>親</span>}
              </div>
            ))}
          </div>

          {roomInfo.isHost && (
            <button
              onClick={startGame}
              disabled={roomInfo.players.length < 2}
              style={{
                ...styles.btn,
                opacity: roomInfo.players.length < 2 ? 0.4 : 1,
                background: 'linear-gradient(135deg, #ffd700, #ff8800)',
                color: '#1a0800',
              }}
            >
              {roomInfo.players.length < 2 ? '参加者を待っています…' : 'ゲームスタート！'}
            </button>
          )}
          {!roomInfo.isHost && (
            <div style={{ color: '#888', textAlign: 'center', fontSize: 14 }}>ホストがゲームを開始するまでお待ちください…</div>
          )}
        </div>
      </div>
    );
  }

  // 入口画面
  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.title}>🎲 チンチロリン</div>
        <div style={{ color: '#888', fontSize: 12, marginBottom: 24, textAlign: 'center' }}>車の中で遊ぶサイコロ賭博</div>

        <input
          style={styles.input}
          placeholder="あなたの名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={12}
        />

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => setTab('create')}
            style={{ ...styles.tabBtn, background: tab === 'create' ? 'rgba(255,215,0,0.2)' : 'transparent', borderColor: tab === 'create' ? '#ffd700' : '#333', color: tab === 'create' ? '#ffd700' : '#666' }}
          >
            部屋を作る
          </button>
          <button
            onClick={() => setTab('join')}
            style={{ ...styles.tabBtn, background: tab === 'join' ? 'rgba(255,215,0,0.2)' : 'transparent', borderColor: tab === 'join' ? '#ffd700' : '#333', color: tab === 'join' ? '#ffd700' : '#666' }}
          >
            部屋に入る
          </button>
        </div>

        {tab === 'create' ? (
          <button onClick={createRoom} disabled={!name.trim()} style={{ ...styles.btn, opacity: !name.trim() ? 0.4 : 1, background: 'linear-gradient(135deg, #ffd700, #ff8800)', color: '#1a0800' }}>
            部屋を作ってゲーム開始
          </button>
        ) : (
          <>
            <input
              style={{ ...styles.input, marginBottom: 12, textAlign: 'center', letterSpacing: 6, fontSize: 22, fontWeight: 'bold' }}
              placeholder="0000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              inputMode="numeric"
            />
            <button onClick={joinRoom} disabled={!name.trim() || code.length !== 4} style={{ ...styles.btn, opacity: (!name.trim() || code.length !== 4) ? 0.4 : 1, background: 'linear-gradient(135deg, #ffd700, #ff8800)', color: '#1a0800' }}>
              部屋に入る
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at top, #1a0a00 0%, #0a0000 60%)',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: 20,
    padding: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffd700',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 2,
  },
  roomCode: {
    fontSize: 48,
    fontWeight: 900,
    color: '#ffd700',
    textAlign: 'center',
    letterSpacing: 12,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 16,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    color: '#fff',
    marginBottom: 16,
    outline: 'none',
  },
  btn: {
    width: '100%',
    padding: '15px',
    fontSize: 16,
    fontWeight: 'bold',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    padding: '10px',
    fontSize: 13,
    fontWeight: 'bold',
    borderRadius: 10,
    border: '1px solid',
    cursor: 'pointer',
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    marginBottom: 6,
    fontSize: 15,
  },
};
