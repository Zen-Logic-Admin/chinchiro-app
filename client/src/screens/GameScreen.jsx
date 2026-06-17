import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket.js';

// ── 物理定数 ──────────────────────────────
const BOWL_R    = 120;   // どんぶりの内径 (px)
const DIE_S     = 54;    // サイコロ一辺
const DIE_R     = DIE_S * 0.48; // 衝突半径
const GRAVITY   = 0.36;
const RESTITUTION = 0.52;
const FRICTION    = 0.972;
const SPIN_DECAY  = 0.95;
const SETTLE_V    = 0.7;
const SETTLE_W    = 0.025;

function rand(a, b) { return a + Math.random() * (b - a); }

const NUM_COLORS = ['','#ff3344','#3399ff','#00cc66','#ff8800','#cc44ff','#ffd700'];

// ── CSS ──────────────────────────────────
const CSS = `
  @keyframes neonPulse {
    0%,100% { text-shadow:0 0 10px #ff1493,0 0 25px #ff1493,0 0 50px #ff1493; }
    50%     { text-shadow:0 0 22px #ff1493,0 0 55px #ff1493,0 0 110px #ff1493; }
  }
  @keyframes cyanPulse {
    0%,100% { text-shadow:0 0 10px #00e5ff,0 0 25px #00e5ff; }
    50%     { text-shadow:0 0 28px #00e5ff,0 0 65px #00e5ff; }
  }
  @keyframes screenBlast {
    0%   { opacity:0.9; }
    100% { opacity:0; }
  }
  @keyframes shake {
    0%,100% { transform:translateX(0); }
    20% { transform:translateX(-9px) rotate(-3deg); }
    40% { transform:translateX(9px) rotate(3deg); }
    60% { transform:translateX(-5px) rotate(-1.5deg); }
    80% { transform:translateX(5px) rotate(1.5deg); }
  }
  @keyframes impactIn {
    0%   { opacity:0; transform:scale(3) rotate(-8deg); filter:blur(6px); }
    65%  { opacity:1; transform:scale(0.92) rotate(2deg); filter:blur(0); }
    100% { transform:scale(1) rotate(0); }
  }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes slideRight {
    from { opacity:0; transform:translateX(-24px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes bowlGlow {
    0%,100% { box-shadow:inset 0 14px 40px rgba(0,0,0,0.95),0 8px 30px rgba(0,0,0,0.9); }
    50%     { box-shadow:inset 0 14px 40px rgba(0,0,0,0.95),0 8px 30px rgba(0,0,0,0.9),0 0 40px rgba(255,20,147,0.25); }
  }
  @keyframes shonbenFall {
    0%   { opacity:1; transform:translateY(0) rotate(-15deg) scale(1); }
    85%  { opacity:0.7; }
    100% { opacity:0; transform:translateY(140px) rotate(25deg) scale(0.5); }
  }
  @keyframes shonbenText {
    0%   { opacity:0; transform:scale(0.4) rotate(-8deg); }
    25%  { opacity:1; transform:scale(1.12) rotate(3deg); }
    70%  { opacity:1; transform:scale(1); }
    100% { opacity:0; transform:scale(0.85) translateY(-20px); }
  }
`;

const DROPS = [
  {x:6,delay:0,size:24},{x:16,delay:0.08,size:18},{x:27,delay:0.16,size:28},
  {x:38,delay:0.04,size:20},{x:50,delay:0.22,size:22},{x:61,delay:0.11,size:26},
  {x:71,delay:0.07,size:18},{x:82,delay:0.19,size:24},{x:24,delay:0.26,size:16},
  {x:66,delay:0.13,size:22},{x:44,delay:0.30,size:20},{x:88,delay:0.02,size:26},
];

// ── ResultLabel ───────────────────────────
function ResultLabel({ label }) {
  if (!label) return null;
  if (label === 'ピンゾロ') return (
    <div style={{fontSize:34,fontWeight:900,letterSpacing:4,color:'#fff',animation:'neonPulse 0.7s ease-in-out infinite,impactIn 0.4s ease-out',textAlign:'center'}}>
      ✨ピンゾロ✨
    </div>
  );
  if (label === 'シゴロ') return (
    <div style={{fontSize:28,fontWeight:900,letterSpacing:3,color:'#00e5ff',animation:'cyanPulse 0.9s ease-in-out infinite,impactIn 0.4s ease-out',textAlign:'center'}}>
      シゴロ!!
    </div>
  );
  if (label === 'ヒフミ') return (
    <div style={{fontSize:24,fontWeight:900,color:'#00e5ff',letterSpacing:2,animation:'shake 0.5s ease-out,impactIn 0.4s ease-out',textAlign:'center',textShadow:'0 0 18px rgba(0,229,255,0.6)'}}>
      ヒフミ 💦
    </div>
  );
  if (label === 'しょんべん') return (
    <div style={{fontSize:20,fontWeight:900,color:'#88ccff',letterSpacing:2,animation:'impactIn 0.35s ease-out',textAlign:'center',textShadow:'0 0 10px rgba(136,204,255,0.4)'}}>
      しょんべん 💦
    </div>
  );
  if (label.includes('ゾロ目')) return (
    <div style={{fontSize:24,fontWeight:900,color:'#ffd700',letterSpacing:2,animation:'impactIn 0.4s ease-out',textAlign:'center',textShadow:'0 0 14px rgba(255,215,0,0.5)'}}>
      {label}!
    </div>
  );
  return <div style={{fontSize:18,fontWeight:900,color:'#666',animation:'impactIn 0.35s ease-out',textAlign:'center'}}>{label}</div>;
}

function getGlowColor(label) {
  if (label === 'ピンゾロ')      return '#ff1493';
  if (label === 'シゴロ')        return '#00e5ff';
  if (label === 'ヒフミ')        return '#00e5ff';
  if (label === 'しょんべん')    return '#88ccff';
  if (label?.includes('ゾロ目')) return '#ffd700';
  return null;
}

function ShonbenOverlay({ name }) {
  if (!name) return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:260,pointerEvents:'none',overflow:'hidden'}}>
      {DROPS.map((d,i) => (
        <div key={i} style={{position:'absolute',left:`${d.x}%`,top:'-8%',fontSize:d.size,animation:`shonbenFall 0.95s ease-in ${d.delay}s forwards`}}>💦</div>
      ))}
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{fontSize:26,fontWeight:900,color:'#00e5ff',textShadow:'0 0 24px #00e5ff',animation:'shonbenText 2s ease-out forwards',textAlign:'center',background:'rgba(0,0,0,0.8)',padding:'12px 26px',borderRadius:14,border:'1px solid rgba(0,229,255,0.3)',lineHeight:1.6}}>
          {name}<br/><span style={{fontSize:17}}>しょんべん 💦</span>
        </div>
      </div>
    </div>
  );
}

// ── どんぶりコンポーネント ───────────────
function Donburi({ diceState, glowColor, shaking, onPress, interactive, showHint }) {
  const diameter = BOWL_R * 2 + 20;
  return (
    <div
      onPointerDown={interactive ? onPress : undefined}
      style={{
        position: 'relative',
        width: diameter, height: diameter,
        borderRadius: '50%',
        flexShrink: 0,
        cursor: interactive ? 'pointer' : 'default',
        background: glowColor
          ? `radial-gradient(ellipse at 32% 32%, ${glowColor}18 0%, #0d0d1a 55%, #020208 100%)`
          : 'radial-gradient(ellipse at 32% 32%, #1c1c32 0%, #0d0d1a 55%, #020208 100%)',
        border: glowColor ? `7px solid ${glowColor}bb` : '7px solid #1e1a38',
        boxShadow: glowColor
          ? `inset 0 14px 42px rgba(0,0,0,0.95), inset 0 -4px 14px rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.95), 0 0 32px ${glowColor}44`
          : 'inset 0 14px 42px rgba(0,0,0,0.95), inset 0 -4px 14px rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.9)',
        transition: 'border-color 0.4s, box-shadow 0.4s, background 0.4s',
        transform: shaking ? `translate(${Math.sin(Date.now()*0.1)*5}px,${Math.cos(Date.now()*0.13)*4}px)` : 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Rim highlight */}
      <div style={{position:'absolute',top:6,left:6,right:6,bottom:6,borderRadius:'50%',border:'1px solid rgba(255,255,255,0.04)',pointerEvents:'none'}} />

      {/* Dice (positioned relative to bowl center) */}
      <div style={{position:'absolute',inset:0,borderRadius:'50%',overflow:'hidden'}}>
        {diceState.map((d, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: d.x + BOWL_R + 10 - DIE_S/2,
            top:  d.y + BOWL_R + 10 - DIE_S/2,
            width: DIE_S, height: DIE_S,
            borderRadius: DIE_S * 0.2,
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `rotate(${d.angle}rad)`,
            boxShadow: d.settled && glowColor
              ? `0 0 16px ${glowColor}, 0 0 32px ${glowColor}55, 0 3px 10px rgba(0,0,0,0.9)`
              : '0 3px 10px rgba(0,0,0,0.9)',
            willChange: 'transform',
            pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: DIE_S * 0.56,
              fontWeight: 900,
              fontStyle: 'italic',
              lineHeight: 1,
              color: (d.settled && d.face) ? NUM_COLORS[d.face] : '#bbb',
              textShadow: d.settled && glowColor ? `0 0 8px ${glowColor}` : 'none',
              userSelect: 'none',
            }}>
              {d.face || '?'}
            </span>
          </div>
        ))}
      </div>

      {/* Empty hint */}
      {showHint && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:6,pointerEvents:'none'}}>
          <div style={{fontSize:30,opacity:0.12}}>🎲</div>
          {interactive && <div style={{fontSize:10,color:'#222',letterSpacing:3}}>TAP TO ROLL</div>}
        </div>
      )}
    </div>
  );
}

// ── メインコンポーネント ──────────────────
export default function GameScreen({ roomInfo, initialState, onGameOver }) {
  const [players, setPlayers]         = useState(initialState.players);
  const [oyaId, setOyaId]             = useState(initialState.oyaId);
  const [round, setRound]             = useState(initialState.round || 1);
  const [phase, setPhase]             = useState('betting');
  const [myBet, setMyBet]             = useState(10);
  const [isHost, setIsHost]           = useState(roomInfo.isHost);
  const [roundResult, setRoundResult] = useState(null);
  const [revealStep, setRevealStep]   = useState(0);
  const [gameOverData, setGameOverData] = useState(null);
  const [pinzoroBlast, setPinzoroBlast] = useState(false);
  const [shonbenName, setShonbenName]   = useState(null);
  const [bowlShaking, setBowlShaking]   = useState(false);
  const [bowlKey, setBowlKey]           = useState('oya'); // which result is shown
  const [diceRender, setDiceRender]     = useState([]);

  const isHostRef = useRef(roomInfo.isHost);
  const myId = socket.id;
  const me   = players.find(p => p.id === myId) || players[0];
  const oya  = players.find(p => p.id === oyaId);
  const isOya   = myId === oyaId;
  const myCoins = me?.coins ?? 0;
  const sorted  = [...players].sort((a,b) => b.coins - a.coins);

  // Physics refs
  const dicePhys = useRef([]);
  const rafId    = useRef(null);
  const settled  = useRef(true);

  function stopPhysics() {
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
  }

  function triggerShonben(name) {
    setShonbenName(name);
    setTimeout(() => setShonbenName(null), 2200);
  }

  // Physics tick function (stored in ref to avoid stale closures)
  const tickRef = useRef(null);
  tickRef.current = function tick() {
    const dice = dicePhys.current;
    if (!dice.length) return;
    const R = BOWL_R - DIE_R;
    let allDone = true;

    for (const d of dice) {
      if (d.settled) continue;
      allDone = false;

      d.vy += GRAVITY;
      d.x  += d.vx;
      d.y  += d.vy;
      d.angle += d.omega;
      d.vx    *= FRICTION;
      d.vy    *= FRICTION;
      d.omega *= SPIN_DECAY;

      // Circular bowl wall
      const dist = Math.sqrt(d.x*d.x + d.y*d.y);
      if (dist > R) {
        const nx = d.x/dist, ny = d.y/dist;
        const dot = d.vx*nx + d.vy*ny;
        if (dot > 0) {
          d.vx = (d.vx - 2*dot*nx) * RESTITUTION;
          d.vy = (d.vy - 2*dot*ny) * RESTITUTION;
          d.omega += (d.vx*ny - d.vy*nx) * 0.05;
          // Bowl shake on hard hit
          if (Math.abs(dot) > 4) {
            setBowlShaking(true);
            setTimeout(() => setBowlShaking(false), 300);
          }
        }
        d.x = nx * (R - 0.5);
        d.y = ny * (R - 0.5);
      }

      // Random face spin during roll
      if (Math.random() < 0.12) d.face = Math.ceil(Math.random() * 6);

      const spd = Math.sqrt(d.vx*d.vx + d.vy*d.vy);
      if (spd < SETTLE_V && Math.abs(d.omega) < SETTLE_W) {
        d.vx = 0; d.vy = 0; d.omega = 0;
        d.settled = true;
      } else {
        allDone = false;
      }
    }

    // Die-die collision
    for (let i = 0; i < dice.length; i++) {
      for (let j = i+1; j < dice.length; j++) {
        const a = dice[i], b = dice[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx*dx + dy*dy;
        const minD = DIE_R * 2;
        if (d2 < minD*minD && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const nx = dx/d, ny = dy/d;
          const ov = (minD - d) * 0.5;
          a.x -= nx*ov; a.y -= ny*ov;
          b.x += nx*ov; b.y += ny*ov;
          const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
          const dot = dvx*nx + dvy*ny;
          a.vx -= dot*nx*RESTITUTION; a.vy -= dot*ny*RESTITUTION;
          b.vx += dot*nx*RESTITUTION; b.vy += dot*ny*RESTITUTION;
        }
      }
    }

    setDiceRender(dice.map(d => ({...d})));

    if (!allDone) {
      rafId.current = requestAnimationFrame(() => tickRef.current());
    } else {
      settled.current = true;
    }
  };

  function launchDice(fromX, fromY, finalFaces) {
    // fromX/fromY: relative to bowl center
    stopPhysics();
    settled.current = false;
    const R = BOWL_R - DIE_R;
    // clamp start to inside bowl
    const dist0 = Math.sqrt(fromX*fromX + fromY*fromY);
    const r0 = Math.min(dist0, R * 0.85);
    const sx = dist0 > 0.01 ? fromX/dist0*r0 : 0;
    const sy = dist0 > 0.01 ? fromY/dist0*r0 : 0;

    dicePhys.current = [0,1,2].map(i => {
      const spread = (i-1) * 0.45;
      const towardCenter = Math.atan2(-sy, -sx);
      const ang = towardCenter + spread + rand(-0.35, 0.35);
      const spd = rand(7, 12);
      return {
        x: sx + rand(-6,6), y: sy + rand(-6,6),
        vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd,
        angle: rand(0, Math.PI*2),
        omega: rand(-0.35, 0.35),
        face: Math.ceil(Math.random()*6),
        settled: false,
        _final: finalFaces?.[i] ?? null,
      };
    });
    setDiceRender(dicePhys.current.map(d => ({...d})));
    rafId.current = requestAnimationFrame(() => tickRef.current());
  }

  function settleDice(faces) {
    stopPhysics();
    dicePhys.current = dicePhys.current.map((d, i) => ({
      ...d, settled: true, face: faces[i],
      vx: 0, vy: 0, omega: 0,
    }));
    setDiceRender(dicePhys.current.map(d => ({...d})));
    settled.current = true;
  }

  function scatterThenSettle(faces, delay) {
    // Small scatter animation then settle
    dicePhys.current = dicePhys.current.map(d => ({
      ...d, settled: false,
      vx: rand(-4,4), vy: rand(-3,3),
      omega: rand(-0.2, 0.2),
      face: Math.ceil(Math.random()*6),
    }));
    settled.current = false;
    stopPhysics();
    rafId.current = requestAnimationFrame(() => tickRef.current());
    setTimeout(() => {
      settleDice(faces);
    }, delay);
  }

  // ── Socket ──────────────────────────────
  useEffect(() => {
    socket.on('bet:updated', ({ players: p }) => setPlayers(p));

    socket.on('round:result', (data) => {
      setRoundResult(data);

      // OYA dice reveal after physics (1.6s from roll)
      setTimeout(() => {
        stopPhysics();
        settleDice(data.oyaDice);
        setRevealStep(1);
        setBowlKey('oya');

        if (data.oyaResult.label === 'ピンゾロ') {
          setPinzoroBlast(true); setTimeout(() => setPinzoroBlast(false), 950);
        } else if (data.oyaResult.label === 'ヒフミ') {
          setTimeout(() => triggerShonben(data.oyaName), 350);
        }

        // Each KO
        for (let i = 0; i < data.battles.length; i++) {
          const t = 1000 + i * 1100;
          setTimeout(() => {
            const b = data.battles[i];
            setBowlKey(b.playerId);
            scatterThenSettle(b.dice, 600);
            setTimeout(() => {
              setRevealStep(i + 2);
              if (b.result.label === 'ピンゾロ') {
                setPinzoroBlast(true); setTimeout(() => setPinzoroBlast(false), 950);
              } else if (b.result.label === 'ヒフミ') {
                setTimeout(() => triggerShonben(b.playerName), 350);
              }
            }, 620);
          }, t);
        }

        setTimeout(() => {
          setPlayers(data.players);
          setPhase('result');
        }, 1000 + data.battles.length * 1100 + 700);
      }, 1600);
    });

    socket.on('round:next', ({ oyaId: o, players: p, round: r }) => {
      stopPhysics();
      setOyaId(o); setPlayers(p); setRound(r);
      setPhase('betting'); setRoundResult(null); setRevealStep(0); setBowlKey('oya');
      dicePhys.current = []; setDiceRender([]);
      const mp = p.find(pl => pl.id === myId);
      if (mp) setMyBet(prev => Math.min(prev, mp.coins || 1));
    });

    socket.on('game:over', ({ players: p }) => {
      stopPhysics();
      setGameOverData([...p].sort((a,b) => b.coins - a.coins));
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
      stopPhysics();
      ['bet:updated','round:result','round:next','game:over','room:updated','host:changed']
        .forEach(e => socket.off(e));
    };
  }, [myId]);

  function sendBet(v) {
    const c = Math.max(1, Math.min(v, myCoins));
    setMyBet(c);
    socket.emit('bet:set', { amount: c });
  }

  function handleRoll(e) {
    if (!isHost || phase !== 'betting') return;
    e.preventDefault();

    // Compute touch position relative to the element's center
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top  + rect.height/2;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? cx;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? cy;
    const px = clientX - cx;
    const py = clientY - cy;

    launchDice(px, py, null);
    socket.emit('round:roll');
    setPhase('rolling');
  }

  // ── What to show in bowl ──
  let bowlGlow = null, bowlLabel = null, bowlWho = '';
  if (revealStep >= 1 && roundResult) {
    if (bowlKey === 'oya') {
      bowlLabel = roundResult.oyaResult.label;
      bowlWho   = roundResult.oyaName;
      bowlGlow  = getGlowColor(bowlLabel);
    } else {
      const b = roundResult.battles.find(x => x.playerId === bowlKey);
      if (b) { bowlLabel = b.result.label; bowlWho = b.playerName; bowlGlow = getGlowColor(b.result.label); }
    }
  }

  // ── GAME OVER ─────────────────────────
  if (phase === 'over' && gameOverData) {
    return (
      <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:'32px 20px',background:'#0a0a0f'}}>
        <style>{CSS}</style>
        <div style={{fontSize:32,fontWeight:900,color:'#ff1493',letterSpacing:4,animation:'neonPulse 1s ease-in-out infinite'}}>RESULT</div>
        <div style={{width:'100%',maxWidth:360,display:'flex',flexDirection:'column',gap:10}}>
          {gameOverData.map((p,i) => (
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',background:i===0?'rgba(255,20,147,0.12)':'rgba(255,255,255,0.04)',borderRadius:14,border:i===0?'1px solid rgba(255,20,147,0.5)':'1px solid rgba(255,255,255,0.07)',animation:`slideUp 0.4s ease-out ${i*0.12}s both`}}>
              <div style={{fontSize:i===0?32:22,minWidth:38,textAlign:'center'}}>{i===0?'🏆':i===1?'🥈':i===2?'🥉':`${i+1}位`}</div>
              <div style={{flex:1,fontSize:18,color:'#fff',fontWeight:i===0?900:'normal'}}>{p.name}</div>
              <div style={{fontSize:22,fontWeight:900,color:p.coins>=100?'#00ff88':p.coins===0?'#ff3344':'#ffd700'}}>{p.coins}<span style={{fontSize:14,color:'#888'}}>枚</span></div>
            </div>
          ))}
        </div>
        <button onClick={onGameOver} style={ROLL_BTN}>BACK</button>
      </div>
    );
  }

  // ── MAIN ─────────────────────────────
  return (
    <div style={{height:'100dvh',display:'flex',flexDirection:'column',background:'#0a0a0f',overflow:'hidden',position:'relative'}}>
      <style>{CSS}</style>
      <ShonbenOverlay name={shonbenName} />

      {pinzoroBlast && (
        <div style={{position:'fixed',inset:0,zIndex:300,pointerEvents:'none',background:'radial-gradient(circle at center,rgba(255,20,147,0.8) 0%,rgba(255,20,147,0.2) 55%,transparent 80%)',animation:'screenBlast 0.75s ease-out forwards',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{fontSize:86,fontWeight:900,color:'#fff',textShadow:'0 0 60px #ff1493',animation:'neonPulse 0.3s ease-in-out infinite',letterSpacing:6}}>ピンゾロ</div>
        </div>
      )}

      {/* ヘッダー */}
      <div style={{padding:'6px 12px',background:'rgba(0,0,0,0.9)',borderBottom:'1px solid rgba(255,20,147,0.2)',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        <div style={{fontSize:13,fontWeight:900,color:'#ff1493',whiteSpace:'nowrap'}}>第{round}局</div>
        <div style={{flex:1,display:'flex',gap:3,justifyContent:'center',flexWrap:'wrap'}}>
          {sorted.map(p => (
            <span key={p.id} style={{fontSize:10,color:p.id===myId?'#ff1493':'#aaa',background:p.id===oyaId?'rgba(255,165,0,0.15)':p.id===myId?'rgba(255,20,147,0.1)':'rgba(255,255,255,0.05)',border:p.id===oyaId?'1px solid rgba(255,165,0,0.35)':p.id===myId?'1px solid rgba(255,20,147,0.3)':'1px solid transparent',padding:'2px 6px',borderRadius:5,fontWeight:p.id===myId?'bold':'normal'}}>
              {p.id===oyaId?'🎲':''}{p.name} {p.coins}
            </span>
          ))}
        </div>
        <div style={{fontSize:10,color:'#444',whiteSpace:'nowrap'}}>{isOya?'🎲親':`親:${oya?.name||''}`}</div>
      </div>

      {/* どんぶりエリア */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'8px 0',position:'relative',overflow:'hidden'}}>

        {/* 誰の出目か */}
        {revealStep >= 1 && bowlWho && (
          <div style={{fontSize:11,color: bowlKey===oyaId?'#ff9500':'#888',letterSpacing:3,marginBottom:10,fontWeight:900,animation:'slideUp 0.3s ease-out'}}>
            {bowlKey===oyaId?'🎲 OYA':'●'} — {bowlWho}
          </div>
        )}

        {/* どんぶり本体 */}
        <Donburi
          diceState={diceRender}
          glowColor={bowlGlow}
          shaking={bowlShaking}
          onPress={handleRoll}
          interactive={isHost && phase === 'betting'}
          showHint={diceRender.length === 0}
        />

        {/* 役ラベル */}
        {bowlLabel && revealStep >= 1 && (
          <div style={{marginTop:14,animation:'impactIn 0.4s ease-out'}}>
            <ResultLabel label={bowlLabel} />
          </div>
        )}

        {/* 子の結果リスト (result phase) */}
        {phase === 'result' && roundResult && revealStep >= 1 && (
          <div style={{width:'100%',maxWidth:340,padding:'0 14px',marginTop:12}}>
            {/* OYA row */}
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:'rgba(255,165,0,0.07)',borderRadius:8,border:'1px solid rgba(255,165,0,0.2)',marginBottom:5,animation:'slideUp 0.3s ease-out'}}>
              <span style={{fontSize:11,color:'#ff9500',fontWeight:900,minWidth:60}}>🎲 {roundResult.oyaName}</span>
              <span style={{fontSize:11,color:'#555',flex:1}}>{roundResult.oyaResult.label}</span>
            </div>
            {/* KO rows */}
            {roundResult.battles.slice(0, revealStep - 1).map((b, i) => {
              const win = b.outcome==='win', draw = b.outcome==='draw';
              const isMe = b.playerId === myId;
              return (
                <div key={b.playerId} onClick={() => setBowlKey(b.playerId)} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',background:win?'rgba(0,255,136,0.06)':draw?'rgba(255,255,255,0.03)':'rgba(255,51,68,0.07)',borderRadius:8,border:`1px solid ${win?'rgba(0,255,136,0.3)':draw?'rgba(255,255,255,0.06)':'rgba(255,51,68,0.28)'}`,marginBottom:5,animation:`slideUp 0.3s ease-out ${i*0.08}s both`,cursor:'pointer'}}>
                  <span style={{fontSize:11,color:isMe?'#ff1493':'#888',fontWeight:isMe?'bold':'normal',minWidth:60}}>{isMe?'● ':''}{b.playerName}</span>
                  <span style={{fontSize:11,color:'#444',flex:1}}>{b.result.label}</span>
                  <span style={{fontSize:14,fontWeight:900,color:win?'#00ff88':draw?'#444':'#ff3344',animation:'slideRight 0.3s ease-out'}}>
                    {win?`+${Math.abs(b.coinChange)}`:draw?'±0':b.coinChange}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ボトムパネル ── */}
      <div style={{padding:'10px 14px 18px',background:'rgba(0,0,0,0.92)',borderTop:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>

        {/* BETTING */}
        {phase === 'betting' && (
          <div style={{animation:'slideUp 0.25s ease-out'}}>
            {/* コイン表示 */}
            <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:10}}>
              <span style={{fontSize:11,color:'#444',letterSpacing:2}}>COINS</span>
              <span style={{fontSize:28,fontWeight:900,color:'#ff1493',textShadow:'0 0 20px rgba(255,20,147,0.3)'}}>{myCoins}</span>
              <span style={{flex:1}}/>
              {!isOya && <>
                <span style={{fontSize:11,color:'#444',letterSpacing:2}}>BET</span>
                <span style={{fontSize:28,fontWeight:900,color:'#ffd700'}}>{myBet}</span>
              </>}
            </div>

            {!isOya && (
              <>
                <input type="range" min={1} max={myCoins} value={myBet} onChange={e=>sendBet(Number(e.target.value))} style={{width:'100%',accentColor:'#ff1493',marginBottom:8}} />
                <div style={{display:'flex',gap:5,marginBottom:10}}>
                  {[10,25,50].map(v=>(
                    <button key={v} onPointerDown={()=>sendBet(v)} style={{...SM_BTN,flex:1}}>{v}</button>
                  ))}
                  <button onPointerDown={()=>sendBet(myCoins)} style={{...SM_BTN,flex:1,color:'#ff3344',borderColor:'rgba(255,51,68,0.4)'}}>ALL IN</button>
                </div>
                {/* 他プレイヤーBET */}
                <div style={{display:'flex',gap:5,marginBottom:10,flexWrap:'wrap'}}>
                  {players.filter(p=>p.id!==oyaId).map(p=>(
                    <span key={p.id} style={{fontSize:10,color:p.id===myId?'#ffd700':'#444',background:'rgba(255,255,255,0.03)',padding:'2px 8px',borderRadius:5}}>
                      {p.name} {p.bet}
                    </span>
                  ))}
                </div>
              </>
            )}

            {isOya && (
              <div style={{textAlign:'center',padding:'8px 0',color:'#ff9500',fontSize:13,marginBottom:8,letterSpacing:1}}>
                全員の賭けを受けます
              </div>
            )}

            {isHost ? (
              <button onPointerDown={handleRoll} style={ROLL_BTN}>
                🎲 ROLL !!
              </button>
            ) : (
              <div style={{textAlign:'center',color:'#2a2a2a',fontSize:12,letterSpacing:3,padding:'8px 0'}}>
                ホストのROLLを待っています…
              </div>
            )}
          </div>
        )}

        {/* ROLLING */}
        {phase === 'rolling' && (
          <div style={{textAlign:'center',padding:'10px 0',color:'#2a2a2a',letterSpacing:3,fontSize:12}}>
            {revealStep === 0 ? 'ROLLING…' : '確認中…'}
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && (
          <div style={{animation:'slideUp 0.25s ease-out'}}>
            {isHost ? (
              <div style={{display:'flex',gap:8}}>
                <button onPointerDown={()=>socket.emit('round:next')} style={{...ROLL_BTN,letterSpacing:3,fontSize:18}}>NEXT ▶</button>
                <button onPointerDown={()=>socket.emit('game:end')} style={{padding:'14px',fontSize:12,borderRadius:12,border:'1px solid rgba(255,255,255,0.07)',background:'transparent',color:'#333',cursor:'pointer'}}>END</button>
              </div>
            ) : (
              <div style={{textAlign:'center',color:'#2a2a2a',fontSize:12,letterSpacing:3,padding:'8px 0'}}>WAITING NEXT…</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const ROLL_BTN = {
  width:'100%', padding:'15px', fontSize:22, fontWeight:900,
  borderRadius:14, border:'2px solid #ff1493', cursor:'pointer',
  background:'rgba(255,20,147,0.15)', color:'#ff1493', letterSpacing:4,
  boxShadow:'0 0 24px rgba(255,20,147,0.35)',
  textShadow:'0 0 12px rgba(255,20,147,0.8)',
};
const SM_BTN = {
  padding:'8px', fontSize:13, fontWeight:'bold', borderRadius:8,
  border:'1px solid rgba(255,20,147,0.35)', background:'rgba(255,20,147,0.08)',
  color:'#ff1493', cursor:'pointer',
};
