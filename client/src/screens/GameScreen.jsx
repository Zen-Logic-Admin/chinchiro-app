import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket.js';

const CSS = `
  @keyframes diceRoll {
    0%   { transform: rotate(0deg)  scale(1)    translateY(0); }
    25%  { transform: rotate(25deg) scale(1.14) translateY(-5px); }
    50%  { transform: rotate(-18deg) scale(0.86) translateY(3px); }
    75%  { transform: rotate(12deg) scale(1.08) translateY(-2px); }
    100% { transform: rotate(0deg)  scale(1)    translateY(0); }
  }
  @keyframes impactIn {
    0%   { opacity: 0; transform: scale(3) rotate(-8deg); filter: blur(6px); }
    65%  { opacity: 1; transform: scale(0.92) rotate(2deg); filter: blur(0); }
    100% { transform: scale(1) rotate(0deg); }
  }
  @keyframes neonPulse {
    0%,100% { text-shadow: 0 0 10px #ff1493, 0 0 25px #ff1493, 0 0 50px #ff1493; }
    50%      { text-shadow: 0 0 20px #ff1493, 0 0 50px #ff1493, 0 0 100px #ff1493; }
  }
  @keyframes cyanPulse {
    0%,100% { text-shadow: 0 0 10px #00e5ff, 0 0 25px #00e5ff; }
    50%      { text-shadow: 0 0 25px #00e5ff, 0 0 60px #00e5ff; }
  }
  @keyframes screenBlast {
    0%   { opacity: 0.9; }
    100% { opacity: 0; }
  }
  @keyframes shake {
    0%,100% { transform: translateX(0) rotate(0); }
    20%     { transform: translateX(-8px) rotate(-3deg); }
    40%     { transform: translateX(8px) rotate(3deg); }
    60%     { transform: translateX(-5px) rotate(-1deg); }
    80%     { transform: translateX(5px) rotate(1deg); }
  }
  @keyframes resultBounce {
    0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
    65%  { transform: scale(1.1) rotate(2deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes slideRight {
    from { opacity: 0; transform: translateX(-28px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes winFloat {
    0%   { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-60px) scale(1.4); }
  }
  @keyframes diceLand {
    0%   { transform: scale(1.3) rotate(10deg); }
    60%  { transform: scale(0.95) rotate(-2deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
`;

// サイコロコンポーネント
function Die({ value, rolling, size = 76, glowColor = null }) {
  const dots = {
    1: [[50,50]],
    2: [[28,28],[72,72]],
    3: [[28,28],[50,50],[72,72]],
    4: [[28,28],[72,28],[28,72],[72,72]],
    5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
    6: [[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],
  };
  const face = (value >= 1 && value <= 6) ? value : 1;
  const dotSize = Math.round(size * 0.17);
  const glow = glowColor || (rolling ? '#ff1493' : 'transparent');

  return (
    <div style={{
      width: size, height: size,
      background: rolling ? '#f8f8f8' : '#fff',
      borderRadius: Math.round(size * 0.17),
      position: 'relative',
      flexShrink: 0,
      boxShadow: rolling
        ? `0 0 18px ${glow}, 0 0 36px ${glow}60, 0 6px 20px rgba(0,0,0,0.9)`
        : glowColor
          ? `0 0 14px ${glowColor}, 0 0 30px ${glowColor}50, 0 4px 14px rgba(0,0,0,0.8)`
          : '0 4px 14px rgba(0,0,0,0.8)',
      animation: rolling ? 'diceRoll 0.22s ease-in-out infinite' : 'diceLand 0.4s ease-out',
      transition: 'box-shadow 0.4s',
    }}>
      {dots[face].map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute',
          width: dotSize, height: dotSize,
          background: '#0f0f0f',
          borderRadius: '50%',
          left: `${x}%`, top: `${y}%`,
          transform: 'translate(-50%,-50%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
        }} />
      ))}
    </div>
  );
}

// ランダムな値でサイコロを回す表示用
let rollingValues = [1,1,1];
function DiceRow({ dice, rolling, glowColor }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!rolling) return;
    const id = setInterval(() => {
      rollingValues = [
        Math.ceil(Math.random()*6),
        Math.ceil(Math.random()*6),
        Math.ceil(Math.random()*6),
      ];
      setTick(t => t + 1);
    }, 80);
    return () => clearInterval(id);
  }, [rolling]);

  const display = rolling ? rollingValues : dice;
  return (
    <div style={{ display:'flex', gap:10, justifyContent:'center', alignItems:'center' }}>
      {[0,1,2].map(i => (
        <Die key={i} value={display[i]} rolling={rolling} glowColor={glowColor} />
      ))}
    </div>
  );
}

// 役バッジ
function ResultLabel({ label }) {
  if (label === 'ピンゾロ') return (
    <div style={{ fontSize:40, fontWeight:900, letterSpacing:4, animation:'neonPulse 0.7s ease-in-out infinite, resultBounce 0.4s ease-out', color:'#fff' }}>
      ✨ピンゾロ✨
    </div>
  );
  if (label === 'シゴロ') return (
    <div style={{ fontSize:34, fontWeight:900, letterSpacing:3, animation:'cyanPulse 0.9s ease-in-out infinite, resultBounce 0.4s ease-out', color:'#00e5ff' }}>
      シゴロ!!
    </div>
  );
  if (label === 'ヒフミ') return (
    <div style={{ fontSize:30, fontWeight:900, color:'#ff3344', letterSpacing:2, animation:'shake 0.5s ease-out, resultBounce 0.4s ease-out', textShadow:'0 0 12px rgba(255,51,68,0.6)' }}>
      ヒフミ…
    </div>
  );
  if (label.includes('ゾロ目')) return (
    <div style={{ fontSize:28, fontWeight:900, color:'#ffd700', letterSpacing:2, animation:'resultBounce 0.4s ease-out', textShadow:'0 0 14px rgba(255,215,0,0.5)' }}>
      {label}!
    </div>
  );
  if (label === '役なし') return (
    <div style={{ fontSize:20, fontWeight:'bold', color:'#444', animation:'resultBounce 0.35s ease-out' }}>役なし</div>
  );
  return (
    <div style={{ fontSize:26, fontWeight:900, color:'#ddd', animation:'resultBounce 0.35s ease-out' }}>
      {label}
    </div>
  );
}

// 役ごとのサイコログローカラー
function getGlowColor(label) {
  if (!label) return null;
  if (label === 'ピンゾロ') return '#ff1493';
  if (label === 'シゴロ') return '#00e5ff';
  if (label === 'ヒフミ') return '#ff3344';
  if (label.includes('ゾロ目')) return '#ffd700';
  return null;
}

export default function GameScreen({ roomInfo, initialState, onGameOver }) {
  const [players, setPlayers] = useState(initialState.players);
  const [oyaId, setOyaId] = useState(initialState.oyaId);
  const [round, setRound] = useState(initialState.round || 1);
  const [phase, setPhase] = useState('betting');
  const [myBet, setMyBet] = useState(10);
  const [isHost, setIsHost] = useState(roomInfo.isHost);
  const [roundResult, setRoundResult] = useState(null);
  const [rollingPhase, setRollingPhase] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const [gameOverData, setGameOverData] = useState(null);
  const [pinzoroBlast, setPinzoroBlast] = useState(false);

  const isHostRef = useRef(roomInfo.isHost);
  const myId = socket.id;

  const me = players.find(p => p.id === myId) || players[0];
  const oya = players.find(p => p.id === oyaId);
  const isOya = myId === oyaId;
  const myCoins = me?.coins ?? 0;
  const sorted = [...players].sort((a, b) => b.coins - a.coins);

  useEffect(() => {
    socket.on('bet:updated', ({ players: p }) => setPlayers(p));

    socket.on('round:result', (data) => {
      setRollingPhase(true);
      setRevealStep(0);
      setRoundResult(data);

      const totalBattles = data.battles.length;
      setTimeout(() => {
        setRollingPhase(false);
        setRevealStep(1);
        // ピンゾロだったら全画面爆発
        if (data.oyaResult.label === 'ピンゾロ') {
          setPinzoroBlast(true);
          setTimeout(() => setPinzoroBlast(false), 800);
        }
        for (let i = 1; i <= totalBattles; i++) {
          setTimeout(() => {
            setRevealStep(i + 1);
            const b = data.battles[i - 1];
            if (b?.result?.label === 'ピンゾロ') {
              setTimeout(() => {
                setPinzoroBlast(true);
                setTimeout(() => setPinzoroBlast(false), 800);
              }, 100);
            }
          }, i * 950);
        }
        setTimeout(() => {
          setPlayers(data.players);
          setPhase('result');
        }, (totalBattles + 1) * 950 + 300);
      }, 1800);
    });

    socket.on('round:next', ({ oyaId: newOya, players: p, round: r }) => {
      setOyaId(newOya);
      setPlayers(p);
      setRound(r);
      setPhase('betting');
      setRoundResult(null);
      setRevealStep(0);
      const myPlayer = p.find(pl => pl.id === myId);
      if (myPlayer) setMyBet(prev => Math.min(prev, myPlayer.coins || 1));
    });

    socket.on('game:over', ({ players: p }) => {
      setGameOverData([...p].sort((a, b) => b.coins - a.coins));
      setPhase('over');
    });

    socket.on('room:updated', ({ players: p }) => setPlayers(p));
    socket.on('host:changed', ({ hostId, players: p }) => {
      const nowHost = socket.id === hostId;
      isHostRef.current = nowHost;
      setIsHost(nowHost);
      setPlayers(p);
    });

    return () => {
      ['bet:updated','round:result','round:next','game:over','room:updated','host:changed']
        .forEach(e => socket.off(e));
    };
  }, [myId]);

  function sendBet(amount) {
    const v = Math.max(1, Math.min(amount, myCoins));
    setMyBet(v);
    socket.emit('bet:set', { amount: v });
  }

  // ── ゲームオーバー ────────────────────────────────────────
  if (phase === 'over' && gameOverData) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:'32px 20px', background:'#0a0a0f' }}>
        <style>{CSS}</style>
        <div style={{ fontSize:32, fontWeight:900, color:'#ff1493', letterSpacing:4, animation:'neonPulse 1s ease-in-out infinite' }}>RESULT</div>
        <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:10 }}>
          {gameOverData.map((p, i) => (
            <div key={p.id} style={{
              display:'flex', alignItems:'center', gap:14,
              padding:'16px 20px',
              background: i===0 ? 'rgba(255,20,147,0.12)' : 'rgba(255,255,255,0.04)',
              borderRadius:14,
              border: i===0 ? '1px solid rgba(255,20,147,0.5)' : '1px solid rgba(255,255,255,0.07)',
              animation:`slideUp 0.4s ease-out ${i*0.12}s both`,
            }}>
              <div style={{ fontSize: i===0?32:22, minWidth:38, textAlign:'center' }}>
                {i===0?'🏆':i===1?'🥈':i===2?'🥉':`${i+1}位`}
              </div>
              <div style={{ flex:1, fontSize:18, color:'#fff', fontWeight: i===0?900:'normal' }}>{p.name}</div>
              <div style={{ fontSize:22, fontWeight:900, color: p.coins>=100?'#00ff88':p.coins===0?'#ff3344':'#ffd700' }}>
                {p.coins}<span style={{ fontSize:14, color:'#888' }}>枚</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onGameOver} style={{ marginTop:12, padding:'16px 48px', fontSize:18, fontWeight:900, borderRadius:12, border:'2px solid #ff1493', cursor:'pointer', background:'rgba(255,20,147,0.15)', color:'#ff1493', letterSpacing:2 }}>
          BACK
        </button>
      </div>
    );
  }

  // ── メインゲーム ──────────────────────────────────────────
  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'#0a0a0f', overflow:'hidden', position:'relative' }}>
      <style>{CSS}</style>

      {/* ピンゾロ全画面爆発 */}
      {pinzoroBlast && (
        <div style={{
          position:'fixed', inset:0, zIndex:300, pointerEvents:'none',
          background:'radial-gradient(circle at center, rgba(255,20,147,0.7) 0%, rgba(255,20,147,0.2) 50%, transparent 80%)',
          animation:'screenBlast 0.7s ease-out forwards',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <div style={{ fontSize:100, fontWeight:900, color:'#fff', textShadow:'0 0 60px #ff1493', animation:'neonPulse 0.3s ease-in-out infinite', letterSpacing:6 }}>
            ピンゾロ
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div style={{ padding:'7px 12px', background:'rgba(0,0,0,0.85)', borderBottom:'1px solid rgba(255,20,147,0.25)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <div style={{ fontSize:13, fontWeight:900, color:'#ff1493', whiteSpace:'nowrap', letterSpacing:1 }}>第{round}局</div>
        <div style={{ flex:1, display:'flex', gap:3, justifyContent:'center', flexWrap:'wrap' }}>
          {sorted.map(p => (
            <span key={p.id} style={{
              fontSize:11,
              color: p.id===myId ? '#ff1493' : '#aaa',
              background: p.id===oyaId ? 'rgba(255,165,0,0.15)' : p.id===myId ? 'rgba(255,20,147,0.1)' : 'rgba(255,255,255,0.06)',
              border: p.id===oyaId ? '1px solid rgba(255,165,0,0.4)' : p.id===myId ? '1px solid rgba(255,20,147,0.3)' : '1px solid transparent',
              padding:'2px 7px', borderRadius:6, fontWeight: p.id===myId?'bold':'normal',
            }}>
              {p.id===oyaId?'🎲':''}{p.name} {p.coins}
            </span>
          ))}
        </div>
        <div style={{ fontSize:11, color:'#444', whiteSpace:'nowrap' }}>
          {isOya ? '🎲親' : `親:${oya?.name||''}`}
        </div>
      </div>

      {/* コンテンツ */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* ── 賭けフェーズ ── */}
        {phase === 'betting' && (
          <div style={{ animation:'slideUp 0.3s ease-out' }}>

            {/* コイン表示 */}
            <div style={{ textAlign:'center', padding:'16px 0 12px' }}>
              <div style={{ fontSize:11, color:'#555', letterSpacing:3, marginBottom:2 }}>YOUR COINS</div>
              <div style={{ fontSize:62, fontWeight:900, color:'#ff1493', lineHeight:1, textShadow:'0 0 30px rgba(255,20,147,0.35)' }}>
                {myCoins}
              </div>
            </div>

            {isOya ? (
              <div style={{ textAlign:'center', padding:'18px', background:'rgba(255,165,0,0.08)', borderRadius:16, border:'1px solid rgba(255,165,0,0.25)', marginBottom:14 }}>
                <div style={{ fontSize:48, marginBottom:6 }}>🎲</div>
                <div style={{ fontSize:20, fontWeight:900, color:'#ff9500', letterSpacing:2 }}>親</div>
                <div style={{ fontSize:12, color:'#555', marginTop:4 }}>全員の賭けを受けて戦います</div>
              </div>
            ) : (
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:16, border:'1px solid rgba(255,20,147,0.15)', padding:'18px 16px', marginBottom:14 }}>
                <div style={{ fontSize:11, color:'#555', letterSpacing:3, textAlign:'center', marginBottom:14 }}>BET</div>

                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <button onPointerDown={() => sendBet(myBet - 5)} style={neonBtnSm}>－5</button>
                  <div style={{ flex:1, textAlign:'center' }}>
                    <div style={{ fontSize:48, fontWeight:900, color:'#ffd700', textShadow:'0 0 20px rgba(255,215,0,0.35)', lineHeight:1 }}>{myBet}</div>
                    <div style={{ fontSize:10, color:'#555', marginTop:2 }}>COINS</div>
                  </div>
                  <button onPointerDown={() => sendBet(myBet + 5)} style={neonBtnSm}>＋5</button>
                </div>

                <input
                  type="range" min={1} max={myCoins} value={myBet}
                  onChange={e => sendBet(Number(e.target.value))}
                  style={{ width:'100%', accentColor:'#ff1493' }}
                />

                <div style={{ display:'flex', gap:6, marginTop:12 }}>
                  {[10, 25, 50].map(v => (
                    <button key={v} onPointerDown={() => sendBet(v)} style={{ ...neonBtnSm, flex:1, fontSize:13 }}>{v}</button>
                  ))}
                  <button onPointerDown={() => sendBet(myCoins)} style={{ ...neonBtnSm, flex:1, fontSize:12, color:'#ff3344', borderColor:'rgba(255,51,68,0.5)' }}>ALL IN</button>
                </div>
              </div>
            )}

            {/* 他プレイヤーの賭け */}
            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
              {players.filter(p => p.id !== oyaId).map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background:'rgba(255,255,255,0.03)', borderRadius:10, border:'1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: p.id===myId ? '#ff1493':'#888', fontSize:14, fontWeight: p.id===myId?'bold':'normal' }}>{p.name}</span>
                  <span style={{ color:'#ffd700', fontWeight:900, fontSize:16 }}>{p.bet}<span style={{ fontSize:11, color:'#555', marginLeft:2 }}>枚</span></span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                onPointerDown={() => { socket.emit('round:roll'); setPhase('rolling'); }}
                style={{ width:'100%', padding:'18px', fontSize:22, fontWeight:900, borderRadius:14, border:'2px solid #ff1493', cursor:'pointer', background:'rgba(255,20,147,0.15)', color:'#ff1493', letterSpacing:4, boxShadow:'0 0 24px rgba(255,20,147,0.35)', textShadow:'0 0 12px rgba(255,20,147,0.8)' }}
              >
                🎲 ROLL !!
              </button>
            ) : (
              <div style={{ textAlign:'center', color:'#333', fontSize:13, padding:10 }}>ホストのROLLを待っています…</div>
            )}
          </div>
        )}

        {/* ── ローリング & 結果発表 ── */}
        {(phase === 'rolling' || phase === 'result') && roundResult && (
          <div style={{ animation:'slideUp 0.3s ease-out' }}>

            {/* 親エリア */}
            <div style={{
              background:'rgba(255,165,0,0.07)',
              border: revealStep>=1 ? '1px solid rgba(255,165,0,0.4)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius:18, padding:'18px 14px', marginBottom:14, textAlign:'center',
              transition:'border-color 0.4s',
            }}>
              <div style={{ fontSize:11, color:'#ff9500', letterSpacing:3, marginBottom:12 }}>🎲 OYA — {roundResult.oyaName}</div>
              <DiceRow
                dice={roundResult.oyaDice}
                rolling={rollingPhase || revealStep < 1}
                glowColor={revealStep>=1 ? getGlowColor(roundResult.oyaResult.label) : '#ff1493'}
              />
              {revealStep >= 1 && (
                <div style={{ marginTop:14, animation:'impactIn 0.45s ease-out' }}>
                  <ResultLabel label={roundResult.oyaResult.label} />
                </div>
              )}
            </div>

            {/* 子エリア */}
            {roundResult.battles.map((b, i) => {
              const shown = revealStep >= i + 2;
              const isMe = b.playerId === myId;
              const win = b.outcome === 'win';
              const draw = b.outcome === 'draw';
              const borderCol = shown
                ? (win ? 'rgba(0,255,136,0.4)' : draw ? 'rgba(255,255,255,0.1)' : 'rgba(255,51,68,0.35)')
                : (isMe ? 'rgba(255,20,147,0.2)' : 'rgba(255,255,255,0.05)');
              const bgCol = shown
                ? (win ? 'rgba(0,255,136,0.06)' : draw ? 'rgba(255,255,255,0.04)' : 'rgba(255,51,68,0.07)')
                : 'rgba(255,255,255,0.03)';

              return (
                <div key={b.playerId} style={{ background:bgCol, border:`1px solid ${borderCol}`, borderRadius:16, padding:'14px', marginBottom:10, transition:'all 0.4s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontSize:14, color: isMe?'#ff1493':'#888', fontWeight: isMe?'bold':'normal' }}>
                      {isMe ? '● ' : ''}{b.playerName}
                      <span style={{ fontSize:11, color:'#444', marginLeft:6 }}>賭:{b.bet}枚</span>
                    </span>
                    {shown && (
                      <span style={{ fontSize:20, fontWeight:900, color: win?'#00ff88': draw?'#666':'#ff3344', animation:'slideRight 0.3s ease-out' }}>
                        {win ? `+${Math.abs(b.coinChange)}` : draw ? '±0' : `${b.coinChange}`}
                      </span>
                    )}
                  </div>
                  <DiceRow
                    dice={b.dice}
                    rolling={!shown}
                    glowColor={shown ? getGlowColor(b.result.label) : null}
                  />
                  {shown && (
                    <div style={{ marginTop:12, animation:'impactIn 0.4s ease-out' }}>
                      <ResultLabel label={b.result.label} />
                    </div>
                  )}
                  {!shown && (
                    <div style={{ marginTop:10, textAlign:'center', color:'#333', fontSize:12, letterSpacing:2 }}>ROLLING…</div>
                  )}
                </div>
              );
            })}

            {/* 次の局ボタン */}
            {phase === 'result' && isHost && (
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button
                  onPointerDown={() => socket.emit('round:next')}
                  style={{ flex:1, padding:'16px', fontSize:18, fontWeight:900, borderRadius:12, border:'2px solid #ff1493', cursor:'pointer', background:'rgba(255,20,147,0.15)', color:'#ff1493', letterSpacing:3, boxShadow:'0 0 20px rgba(255,20,147,0.3)' }}
                >
                  NEXT ▶
                </button>
                <button
                  onPointerDown={() => socket.emit('game:end')}
                  style={{ padding:'16px 14px', fontSize:12, borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#444', cursor:'pointer' }}
                >
                  END
                </button>
              </div>
            )}
            {phase === 'result' && !isHost && (
              <div style={{ textAlign:'center', color:'#333', fontSize:12, letterSpacing:2, marginTop:10 }}>WAITING NEXT…</div>
            )}
          </div>
        )}

        {phase === 'rolling' && !roundResult && (
          <div style={{ textAlign:'center', padding:48, color:'#333', letterSpacing:3, fontSize:13 }}>ROLLING…</div>
        )}
      </div>
    </div>
  );
}

const neonBtnSm = {
  padding:'10px 14px',
  fontSize:14, fontWeight:'bold',
  borderRadius:10,
  border:'1px solid rgba(255,20,147,0.35)',
  background:'rgba(255,20,147,0.08)',
  color:'#ff1493',
  cursor:'pointer',
};
