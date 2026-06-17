import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket.js';

const CSS = `
  @keyframes dice3D {
    0%   { transform: perspective(160px) rotateX(0deg)   rotateY(0deg)   rotateZ(0deg)   scale(1); }
    13%  { transform: perspective(160px) rotateX(115deg)  rotateY(88deg)  rotateZ(52deg)  scale(1.14); }
    27%  { transform: perspective(160px) rotateX(238deg)  rotateY(175deg) rotateZ(108deg) scale(0.85); }
    41%  { transform: perspective(160px) rotateX(352deg)  rotateY(263deg) rotateZ(162deg) scale(1.1); }
    55%  { transform: perspective(160px) rotateX(467deg)  rotateY(352deg) rotateZ(218deg) scale(0.9); }
    69%  { transform: perspective(160px) rotateX(580deg)  rotateY(440deg) rotateZ(272deg) scale(1.06); }
    83%  { transform: perspective(160px) rotateX(694deg)  rotateY(528deg) rotateZ(328deg) scale(0.94); }
    100% { transform: perspective(160px) rotateX(808deg)  rotateY(618deg) rotateZ(382deg) scale(1); }
  }
  @keyframes diceLand {
    0%   { transform: perspective(160px) rotateX(40deg) rotateY(20deg) scale(1.3) translateY(-10px); }
    40%  { transform: perspective(160px) rotateX(-8deg) rotateY(-4deg) scale(0.9) translateY(4px); }
    65%  { transform: perspective(160px) rotateX(4deg)  rotateY(2deg)  scale(1.06) translateY(-2px); }
    100% { transform: perspective(160px) rotateX(0deg)  rotateY(0deg)  scale(1) translateY(0); }
  }
  @keyframes shonbenFall {
    0%   { opacity:1; transform:translateY(-10px) rotate(-15deg) scale(1); }
    85%  { opacity:0.7; }
    100% { opacity:0; transform:translateY(130px) rotate(25deg) scale(0.5); }
  }
  @keyframes shonbenText {
    0%   { opacity:0; transform:scale(0.4) rotate(-8deg); }
    25%  { opacity:1; transform:scale(1.12) rotate(3deg); }
    70%  { opacity:1; transform:scale(1) rotate(0deg); }
    100% { opacity:0; transform:scale(0.85) translateY(-20px); }
  }
  @keyframes neonPulse {
    0%,100% { text-shadow: 0 0 10px #ff1493, 0 0 25px #ff1493, 0 0 50px #ff1493; }
    50%      { text-shadow: 0 0 22px #ff1493, 0 0 55px #ff1493, 0 0 110px #ff1493; }
  }
  @keyframes cyanPulse {
    0%,100% { text-shadow: 0 0 10px #00e5ff, 0 0 25px #00e5ff; }
    50%      { text-shadow: 0 0 28px #00e5ff, 0 0 65px #00e5ff; }
  }
  @keyframes screenBlast {
    0%   { opacity:0.88; }
    100% { opacity:0; }
  }
  @keyframes shake {
    0%,100% { transform:translateX(0) rotate(0); }
    20%     { transform:translateX(-9px) rotate(-3deg); }
    40%     { transform:translateX(9px) rotate(3deg); }
    60%     { transform:translateX(-5px) rotate(-1.5deg); }
    80%     { transform:translateX(5px) rotate(1.5deg); }
  }
  @keyframes impactIn {
    0%   { opacity:0; transform:scale(3) rotate(-8deg); filter:blur(6px); }
    65%  { opacity:1; transform:scale(0.92) rotate(2deg); filter:blur(0); }
    100% { transform:scale(1) rotate(0deg); }
  }
  @keyframes slideRight {
    from { opacity:0; transform:translateX(-28px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(24px); }
    to   { opacity:1; transform:translateY(0); }
  }
`;

// しょんべん粒子の固定位置（毎回同じ）
const DROPS = [
  {x:6,  delay:0,    size:24}, {x:16, delay:0.08, size:18},
  {x:27, delay:0.16, size:28}, {x:38, delay:0.04, size:20},
  {x:50, delay:0.22, size:22}, {x:61, delay:0.11, size:26},
  {x:71, delay:0.07, size:18}, {x:82, delay:0.19, size:24},
  {x:23, delay:0.26, size:16}, {x:66, delay:0.13, size:22},
  {x:44, delay:0.30, size:20}, {x:88, delay:0.02, size:26},
];

// 数字の色（1:赤 2:青 3:緑 4:橙 5:紫 6:金）
const NUM_COLORS = ['','#ff3344','#3399ff','#00cc66','#ff8800','#cc44ff','#ffd700'];

function Die({ value, rolling, size = 78, glowColor }) {
  return (
    <div style={{
      width: size, height: size,
      background: '#fff',
      borderRadius: Math.round(size * 0.19),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: rolling
        ? `0 0 22px rgba(255,20,147,0.95), 0 0 44px rgba(255,20,147,0.4), 0 8px 22px rgba(0,0,0,0.95)`
        : glowColor
          ? `0 0 18px ${glowColor}, 0 0 36px ${glowColor}55, 0 5px 16px rgba(0,0,0,0.85)`
          : '0 5px 16px rgba(0,0,0,0.85)',
      animation: rolling
        ? 'dice3D 0.26s ease-in-out infinite'
        : 'diceLand 0.6s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <span style={{
        fontSize: size * 0.56,
        fontWeight: 900,
        fontStyle: 'italic',
        lineHeight: 1,
        userSelect: 'none',
        color: rolling ? '#ff1493' : (value ? NUM_COLORS[value] : '#111'),
        textShadow: !rolling && glowColor ? `0 0 10px ${glowColor}` : 'none',
        transition: 'color 0.15s',
      }}>
        {rolling ? '?' : value}
      </span>
    </div>
  );
}

function DiceRow({ dice, rolling, glowColor }) {
  const [display, setDisplay] = useState([3, 3, 3]);
  useEffect(() => {
    if (!rolling) return;
    const id = setInterval(() => {
      setDisplay([
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
      ]);
    }, 75);
    return () => clearInterval(id);
  }, [rolling]);

  const vals = rolling ? display : (dice || [1,1,1]);
  return (
    <div style={{ display:'flex', gap:10, justifyContent:'center', alignItems:'center' }}>
      {[0,1,2].map(i => <Die key={i} value={vals[i]} rolling={rolling} glowColor={glowColor} />)}
    </div>
  );
}

function ShonbenOverlay({ name }) {
  if (!name) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:260, pointerEvents:'none', overflow:'hidden' }}>
      {DROPS.map((d, i) => (
        <div key={i} style={{
          position:'absolute', left:`${d.x}%`, top:'-8%',
          fontSize: d.size,
          animation: `shonbenFall 0.95s ease-in ${d.delay}s forwards`,
        }}>💦</div>
      ))}
      <div style={{
        position:'absolute', inset:0,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <div style={{
          fontSize:30, fontWeight:900, color:'#00e5ff',
          textShadow:'0 0 24px #00e5ff',
          animation:'shonbenText 2s ease-out forwards',
          textAlign:'center',
          background:'rgba(0,0,0,0.75)',
          padding:'14px 28px', borderRadius:14,
          border:'1px solid rgba(0,229,255,0.35)',
          lineHeight: 1.5,
        }}>
          {name}<br/>
          <span style={{ fontSize:20 }}>しょんべん 💦</span>
        </div>
      </div>
    </div>
  );
}

function ResultLabel({ label }) {
  if (label === 'ピンゾロ') return (
    <div style={{ fontSize:40, fontWeight:900, letterSpacing:4, color:'#fff', animation:'neonPulse 0.7s ease-in-out infinite, impactIn 0.4s ease-out' }}>
      ✨ピンゾロ✨
    </div>
  );
  if (label === 'シゴロ') return (
    <div style={{ fontSize:34, fontWeight:900, letterSpacing:3, color:'#00e5ff', animation:'cyanPulse 0.9s ease-in-out infinite, impactIn 0.4s ease-out' }}>
      シゴロ!!
    </div>
  );
  if (label === 'ヒフミ') return (
    <div style={{ fontSize:30, fontWeight:900, color:'#00e5ff', letterSpacing:2, animation:'shake 0.5s ease-out, impactIn 0.4s ease-out', textShadow:'0 0 18px rgba(0,229,255,0.6)' }}>
      ヒフミ 💦
    </div>
  );
  if (label.includes('ゾロ目')) return (
    <div style={{ fontSize:28, fontWeight:900, color:'#ffd700', letterSpacing:2, animation:'impactIn 0.4s ease-out', textShadow:'0 0 14px rgba(255,215,0,0.5)' }}>
      {label}!
    </div>
  );
  if (label === 'しょんべん') return (
    <div style={{ fontSize:24, fontWeight:900, color:'#88ccff', letterSpacing:2, animation:'impactIn 0.35s ease-out', textShadow:'0 0 10px rgba(136,204,255,0.35)' }}>
      しょんべん 💦
    </div>
  );
  if (label === '役なし') return (
    <div style={{ fontSize:20, fontWeight:'bold', color:'#3a3a3a', animation:'impactIn 0.35s ease-out' }}>役なし</div>
  );
  return <div style={{ fontSize:26, fontWeight:900, color:'#ccc', animation:'impactIn 0.35s ease-out' }}>{label}</div>;
}

function getGlowColor(label) {
  if (label === 'ピンゾロ')   return '#ff1493';
  if (label === 'シゴロ')     return '#00e5ff';
  if (label === 'ヒフミ')     return '#00e5ff';
  if (label === 'しょんべん') return '#88ccff';
  if (label?.includes('ゾロ目')) return '#ffd700';
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
  const [rolling, setRolling] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const [gameOverData, setGameOverData] = useState(null);
  const [pinzoroBlast, setPinzoroBlast] = useState(false);
  const [shonbenName, setShonbenName] = useState(null);

  const isHostRef = useRef(roomInfo.isHost);
  const myId = socket.id;
  const me = players.find(p => p.id === myId) || players[0];
  const oya = players.find(p => p.id === oyaId);
  const isOya = myId === oyaId;
  const myCoins = me?.coins ?? 0;
  const sorted = [...players].sort((a, b) => b.coins - a.coins);

  function triggerShonben(name) {
    setShonbenName(name);
    setTimeout(() => setShonbenName(null), 2200);
  }

  useEffect(() => {
    socket.on('bet:updated', ({ players: p }) => setPlayers(p));

    socket.on('round:result', (data) => {
      setRolling(true);
      setRevealStep(0);
      setRoundResult(data);

      const total = data.battles.length;
      setTimeout(() => {
        setRolling(false);
        setRevealStep(1);

        if (data.oyaResult.label === 'ピンゾロ') {
          setPinzoroBlast(true);
          setTimeout(() => setPinzoroBlast(false), 950);
        } else if (data.oyaResult.label === 'ヒフミ') {
          setTimeout(() => triggerShonben(data.oyaName), 400);
        }

        for (let i = 1; i <= total; i++) {
          setTimeout(() => {
            setRevealStep(i + 1);
            const b = data.battles[i - 1];
            if (b?.result?.label === 'ピンゾロ') {
              setTimeout(() => { setPinzoroBlast(true); setTimeout(() => setPinzoroBlast(false), 950); }, 150);
            } else if (b?.result?.label === 'ヒフミ') {
              setTimeout(() => triggerShonben(b.playerName), 400);
            }
          }, i * 980);
        }

        setTimeout(() => {
          setPlayers(data.players);
          setPhase('result');
        }, (total + 1) * 980 + 300);
      }, 1900);
    });

    socket.on('round:next', ({ oyaId: o, players: p, round: r }) => {
      setOyaId(o); setPlayers(p); setRound(r);
      setPhase('betting'); setRoundResult(null); setRevealStep(0);
      const mp = p.find(pl => pl.id === myId);
      if (mp) setMyBet(prev => Math.min(prev, mp.coins || 1));
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

  function sendBet(v) {
    const clamped = Math.max(1, Math.min(v, myCoins));
    setMyBet(clamped);
    socket.emit('bet:set', { amount: clamped });
  }

  // ── ゲームオーバー ─────────────────────────────────────
  if (phase === 'over' && gameOverData) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:'32px 20px', background:'#0a0a0f' }}>
        <style>{CSS}</style>
        <div style={{ fontSize:32, fontWeight:900, color:'#ff1493', letterSpacing:4, animation:'neonPulse 1s ease-in-out infinite' }}>RESULT</div>
        <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:10 }}>
          {gameOverData.map((p, i) => (
            <div key={p.id} style={{
              display:'flex', alignItems:'center', gap:14, padding:'16px 20px',
              background: i===0 ? 'rgba(255,20,147,0.12)' : 'rgba(255,255,255,0.04)',
              borderRadius:14,
              border: i===0 ? '1px solid rgba(255,20,147,0.5)' : '1px solid rgba(255,255,255,0.07)',
              animation: `slideUp 0.4s ease-out ${i*0.12}s both`,
            }}>
              <div style={{ fontSize:i===0?32:22, minWidth:38, textAlign:'center' }}>
                {i===0?'🏆':i===1?'🥈':i===2?'🥉':`${i+1}位`}
              </div>
              <div style={{ flex:1, fontSize:18, color:'#fff', fontWeight:i===0?900:'normal' }}>{p.name}</div>
              <div style={{ fontSize:22, fontWeight:900, color:p.coins>=100?'#00ff88':p.coins===0?'#ff3344':'#ffd700' }}>
                {p.coins}<span style={{ fontSize:14, color:'#888' }}>枚</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onGameOver} style={rollBtn}>BACK</button>
      </div>
    );
  }

  // ── メインゲーム ──────────────────────────────────────
  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'#0a0a0f', overflow:'hidden', position:'relative' }}>
      <style>{CSS}</style>

      <ShonbenOverlay name={shonbenName} />

      {pinzoroBlast && (
        <div style={{ position:'fixed', inset:0, zIndex:300, pointerEvents:'none', background:'radial-gradient(circle at center, rgba(255,20,147,0.78) 0%, rgba(255,20,147,0.2) 55%, transparent 80%)', animation:'screenBlast 0.75s ease-out forwards', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontSize:92, fontWeight:900, color:'#fff', textShadow:'0 0 60px #ff1493', animation:'neonPulse 0.3s ease-in-out infinite', letterSpacing:6 }}>ピンゾロ</div>
        </div>
      )}

      {/* ヘッダー */}
      <div style={{ padding:'7px 12px', background:'rgba(0,0,0,0.88)', borderBottom:'1px solid rgba(255,20,147,0.22)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <div style={{ fontSize:13, fontWeight:900, color:'#ff1493', whiteSpace:'nowrap' }}>第{round}局</div>
        <div style={{ flex:1, display:'flex', gap:3, justifyContent:'center', flexWrap:'wrap' }}>
          {sorted.map(p => (
            <span key={p.id} style={{
              fontSize:11,
              color: p.id===myId?'#ff1493':'#aaa',
              background: p.id===oyaId?'rgba(255,165,0,0.15)':p.id===myId?'rgba(255,20,147,0.1)':'rgba(255,255,255,0.06)',
              border: p.id===oyaId?'1px solid rgba(255,165,0,0.4)':p.id===myId?'1px solid rgba(255,20,147,0.3)':'1px solid transparent',
              padding:'2px 7px', borderRadius:6, fontWeight:p.id===myId?'bold':'normal',
            }}>
              {p.id===oyaId?'🎲':''}{p.name} {p.coins}
            </span>
          ))}
        </div>
        <div style={{ fontSize:11, color:'#444', whiteSpace:'nowrap' }}>
          {isOya ? '🎲親' : `親:${oya?.name||''}`}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* 賭けフェーズ */}
        {phase === 'betting' && (
          <div style={{ animation:'slideUp 0.3s ease-out' }}>
            <div style={{ textAlign:'center', padding:'16px 0 12px' }}>
              <div style={{ fontSize:11, color:'#444', letterSpacing:3, marginBottom:2 }}>YOUR COINS</div>
              <div style={{ fontSize:62, fontWeight:900, color:'#ff1493', lineHeight:1, textShadow:'0 0 30px rgba(255,20,147,0.35)' }}>{myCoins}</div>
            </div>

            {isOya ? (
              <div style={{ textAlign:'center', padding:'18px', background:'rgba(255,165,0,0.08)', borderRadius:16, border:'1px solid rgba(255,165,0,0.25)', marginBottom:14 }}>
                <div style={{ fontSize:48, marginBottom:6 }}>🎲</div>
                <div style={{ fontSize:20, fontWeight:900, color:'#ff9500', letterSpacing:2 }}>親</div>
                <div style={{ fontSize:12, color:'#555', marginTop:4 }}>全員の賭けを受けて戦います</div>
              </div>
            ) : (
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:16, border:'1px solid rgba(255,20,147,0.12)', padding:'18px 16px', marginBottom:14 }}>
                <div style={{ fontSize:11, color:'#444', letterSpacing:3, textAlign:'center', marginBottom:14 }}>BET</div>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                  <button onPointerDown={() => sendBet(myBet-5)} style={smBtn}>－5</button>
                  <div style={{ flex:1, textAlign:'center' }}>
                    <div style={{ fontSize:52, fontWeight:900, color:'#ffd700', textShadow:'0 0 20px rgba(255,215,0,0.35)', lineHeight:1 }}>{myBet}</div>
                    <div style={{ fontSize:10, color:'#555', marginTop:2 }}>COINS</div>
                  </div>
                  <button onPointerDown={() => sendBet(myBet+5)} style={smBtn}>＋5</button>
                </div>
                <input type="range" min={1} max={myCoins} value={myBet} onChange={e => sendBet(Number(e.target.value))} style={{ width:'100%', accentColor:'#ff1493' }} />
                <div style={{ display:'flex', gap:6, marginTop:12 }}>
                  {[10,25,50].map(v => (
                    <button key={v} onPointerDown={() => sendBet(v)} style={{ ...smBtn, flex:1, fontSize:13 }}>{v}</button>
                  ))}
                  <button onPointerDown={() => sendBet(myCoins)} style={{ ...smBtn, flex:1, fontSize:12, color:'#ff3344', borderColor:'rgba(255,51,68,0.5)' }}>ALL IN</button>
                </div>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
              {players.filter(p => p.id !== oyaId).map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background:'rgba(255,255,255,0.03)', borderRadius:10, border:'1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color:p.id===myId?'#ff1493':'#888', fontSize:14, fontWeight:p.id===myId?'bold':'normal' }}>{p.name}</span>
                  <span style={{ color:'#ffd700', fontWeight:900, fontSize:16 }}>{p.bet}<span style={{ fontSize:11, color:'#555', marginLeft:2 }}>枚</span></span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button onPointerDown={() => { socket.emit('round:roll'); setPhase('rolling'); }} style={rollBtn}>
                🎲 ROLL !!
              </button>
            ) : (
              <div style={{ textAlign:'center', color:'#333', fontSize:13, padding:10 }}>ホストのROLLを待っています…</div>
            )}
          </div>
        )}

        {/* ローリング & 結果 */}
        {(phase === 'rolling' || phase === 'result') && roundResult && (
          <div style={{ animation:'slideUp 0.3s ease-out' }}>
            {/* 親 */}
            <div style={{ background:'rgba(255,165,0,0.07)', border:`1px solid ${revealStep>=1?'rgba(255,165,0,0.4)':'rgba(255,255,255,0.06)'}`, borderRadius:18, padding:'18px 14px', marginBottom:14, textAlign:'center', transition:'border-color 0.4s' }}>
              <div style={{ fontSize:11, color:'#ff9500', letterSpacing:3, marginBottom:14 }}>🎲 OYA — {roundResult.oyaName}</div>
              <DiceRow dice={roundResult.oyaDice} rolling={rolling || revealStep<1} glowColor={revealStep>=1 ? getGlowColor(roundResult.oyaResult.label) : '#ff1493'} />
              {revealStep>=1 && (
                <div style={{ marginTop:14, animation:'impactIn 0.45s ease-out' }}>
                  <ResultLabel label={roundResult.oyaResult.label} />
                </div>
              )}
            </div>

            {/* 子 */}
            {roundResult.battles.map((b, i) => {
              const shown = revealStep >= i+2;
              const isMe = b.playerId === myId;
              const win = b.outcome==='win', draw = b.outcome==='draw';
              return (
                <div key={b.playerId} style={{
                  background: shown?(win?'rgba(0,255,136,0.06)':draw?'rgba(255,255,255,0.04)':'rgba(255,51,68,0.07)'):'rgba(255,255,255,0.03)',
                  border:`1px solid ${shown?(win?'rgba(0,255,136,0.4)':draw?'rgba(255,255,255,0.1)':'rgba(255,51,68,0.35)'):(isMe?'rgba(255,20,147,0.2)':'rgba(255,255,255,0.05)')}`,
                  borderRadius:16, padding:'14px', marginBottom:10, transition:'all 0.4s',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontSize:14, color:isMe?'#ff1493':'#888', fontWeight:isMe?'bold':'normal' }}>
                      {isMe?'● ':''}{b.playerName}
                      <span style={{ fontSize:11, color:'#444', marginLeft:6 }}>賭:{b.bet}枚</span>
                    </span>
                    {shown && (
                      <span style={{ fontSize:20, fontWeight:900, color:win?'#00ff88':draw?'#555':'#ff3344', animation:'slideRight 0.3s ease-out' }}>
                        {win?`+${Math.abs(b.coinChange)}`:draw?'±0':b.coinChange}
                      </span>
                    )}
                  </div>
                  <DiceRow dice={b.dice} rolling={!shown} glowColor={shown?getGlowColor(b.result.label):null} />
                  {shown && (
                    <div style={{ marginTop:12, animation:'impactIn 0.4s ease-out' }}>
                      <ResultLabel label={b.result.label} />
                    </div>
                  )}
                  {!shown && <div style={{ marginTop:10, textAlign:'center', color:'#2a2a2a', fontSize:12, letterSpacing:2 }}>ROLLING…</div>}
                </div>
              );
            })}

            {phase==='result' && isHost && (
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button onPointerDown={() => socket.emit('round:next')} style={{ ...rollBtn, letterSpacing:3, fontSize:18 }}>NEXT ▶</button>
                <button onPointerDown={() => socket.emit('game:end')} style={{ padding:'16px 14px', fontSize:12, borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#444', cursor:'pointer' }}>END</button>
              </div>
            )}
            {phase==='result' && !isHost && (
              <div style={{ textAlign:'center', color:'#2a2a2a', fontSize:12, letterSpacing:2, marginTop:10 }}>WAITING NEXT…</div>
            )}
          </div>
        )}

        {phase==='rolling' && !roundResult && (
          <div style={{ textAlign:'center', padding:48, color:'#2a2a2a', letterSpacing:3, fontSize:13 }}>ROLLING…</div>
        )}
      </div>
    </div>
  );
}

const rollBtn = {
  width:'100%', padding:'18px', fontSize:22, fontWeight:900,
  borderRadius:14, border:'2px solid #ff1493', cursor:'pointer',
  background:'rgba(255,20,147,0.15)', color:'#ff1493', letterSpacing:4,
  boxShadow:'0 0 24px rgba(255,20,147,0.35)',
  textShadow:'0 0 12px rgba(255,20,147,0.8)',
};
const smBtn = {
  padding:'10px 14px', fontSize:14, fontWeight:'bold', borderRadius:10,
  border:'1px solid rgba(255,20,147,0.35)', background:'rgba(255,20,147,0.08)',
  color:'#ff1493', cursor:'pointer',
};
