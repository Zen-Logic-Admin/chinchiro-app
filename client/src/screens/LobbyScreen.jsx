import { useState } from 'react';
import { socket } from '../socket.js';

const CSS = `
  @keyframes neonPulse {
    0%,100% { text-shadow: 0 0 10px #ff1493, 0 0 25px #ff1493, 0 0 50px #ff1493; }
    50%      { text-shadow: 0 0 20px #ff1493, 0 0 50px #ff1493, 0 0 100px #ff1493; }
  }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes scanline {
    0%   { transform:translateY(-100%); }
    100% { transform:translateY(100vh); }
  }
`;

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

  // ── 待機室 ─────────────────────────────────────────────
  if (roomInfo) {
    return (
      <div style={s.root}>
        <style>{CSS}</style>
        <div style={s.card}>
          <div style={{ fontSize:11, color:'#ff1493', letterSpacing:4, textAlign:'center', marginBottom:10 }}>ROOM CODE</div>
          <div style={{ fontSize:52, fontWeight:900, color:'#00e5ff', textAlign:'center', letterSpacing:14, marginBottom:6, textShadow:'0 0 20px rgba(0,229,255,0.5)' }}>
            {roomInfo.roomCode}
          </div>
          <div style={{ fontSize:11, color:'#333', textAlign:'center', letterSpacing:2, marginBottom:22 }}>SHARE THIS CODE</div>

          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
            {roomInfo.players.map((p, i) => (
              <div key={p.id} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'10px 16px',
                background: i===0 ? 'rgba(255,20,147,0.1)' : 'rgba(255,255,255,0.04)',
                borderRadius:10,
                border: i===0 ? '1px solid rgba(255,20,147,0.3)' : '1px solid rgba(255,255,255,0.07)',
                animation:`slideUp 0.3s ease-out ${i*0.08}s both`,
              }}>
                <span style={{ fontSize:16 }}>{i===0 ? '🎲' : '●'}</span>
                <span style={{ color: i===0?'#ff1493':'#aaa', fontSize:15, fontWeight: i===0?'bold':'normal' }}>{p.name}</span>
                {i===0 && <span style={{ marginLeft:'auto', fontSize:10, color:'#ff1493', letterSpacing:2 }}>OYA</span>}
              </div>
            ))}
          </div>

          {roomInfo.isHost ? (
            <button onClick={startGame} style={s.rollBtn}>
              GAME START !!
            </button>
          ) : (
            <div style={{ textAlign:'center', color:'#333', fontSize:12, letterSpacing:3 }}>WAITING HOST…</div>
          )}
        </div>
      </div>
    );
  }

  // ── タイトル画面 ────────────────────────────────────────
  return (
    <div style={s.root}>
      <style>{CSS}</style>

      {/* タイトル */}
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ fontSize:13, color:'#555', letterSpacing:6, marginBottom:8 }}>● ● ●</div>
        <div style={{ fontSize:44, fontWeight:900, color:'#ff1493', letterSpacing:4, lineHeight:1, animation:'neonPulse 1.5s ease-in-out infinite' }}>
          チンチロ
        </div>
        <div style={{ fontSize:13, color:'#ff1493', letterSpacing:6, marginTop:6, opacity:0.6 }}>CHINCHIRO</div>
        <div style={{ fontSize:11, color:'#333', letterSpacing:2, marginTop:10 }}>車の中で遊ぶサイコロ賭博</div>
      </div>

      <div style={s.card}>
        <input
          style={s.input}
          placeholder="NAME"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={12}
        />

        <div style={{ display:'flex', gap:6, marginBottom:18 }}>
          {['create','join'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex:1, padding:'10px', fontSize:12, fontWeight:'bold', borderRadius:8, cursor:'pointer',
                letterSpacing:2,
                background: tab===t ? 'rgba(255,20,147,0.15)' : 'transparent',
                border: tab===t ? '1px solid rgba(255,20,147,0.6)' : '1px solid rgba(255,255,255,0.08)',
                color: tab===t ? '#ff1493' : '#444',
              }}
            >
              {t === 'create' ? 'CREATE' : 'JOIN'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <button onClick={createRoom} disabled={!name.trim()} style={{ ...s.rollBtn, opacity: !name.trim()?0.35:1 }}>
            CREATE ROOM
          </button>
        ) : (
          <>
            <input
              style={{ ...s.input, textAlign:'center', letterSpacing:10, fontSize:28, fontWeight:900, color:'#00e5ff', marginBottom:12 }}
              placeholder="0 0 0 0"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,4))}
              maxLength={4}
              inputMode="numeric"
            />
            <button onClick={joinRoom} disabled={!name.trim()||code.length!==4} style={{ ...s.rollBtn, opacity:(!name.trim()||code.length!==4)?0.35:1 }}>
              JOIN ROOM
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight:'100dvh',
    display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center',
    background:'#0a0a0f',
    padding:'20px',
  },
  card: {
    width:'100%', maxWidth:360,
    background:'rgba(255,255,255,0.03)',
    border:'1px solid rgba(255,20,147,0.15)',
    borderRadius:20,
    padding:'26px 22px',
  },
  input: {
    width:'100%',
    padding:'14px 16px',
    fontSize:16, fontWeight:'bold',
    background:'rgba(255,255,255,0.05)',
    border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:10,
    color:'#fff',
    marginBottom:14,
    outline:'none',
    letterSpacing:1,
  },
  rollBtn: {
    width:'100%',
    padding:'17px',
    fontSize:18, fontWeight:900,
    borderRadius:12,
    border:'2px solid #ff1493',
    cursor:'pointer',
    background:'rgba(255,20,147,0.15)',
    color:'#ff1493',
    letterSpacing:4,
    boxShadow:'0 0 20px rgba(255,20,147,0.25)',
    textShadow:'0 0 10px rgba(255,20,147,0.7)',
  },
};
