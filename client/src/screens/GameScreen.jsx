import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket.js';

const BOWL_R      = 130;
const DIE_S       = 52;
const DIE_R       = DIE_S * 0.48;
const GRAVITY     = 0.38;
const RESTITUTION = 0.54;
const FRICTION    = 0.974;
const SPIN_DECAY  = 0.94;
const SETTLE_V    = 0.65;
const SETTLE_W    = 0.022;

function rand(a, b) { return a + Math.random() * (b - a); }

const NUM_COLORS = ['','#ff3344','#3399ff','#00cc66','#ff8800','#cc44ff','#ffd700'];

const PIP_POS = {
  1: [[50,50]],
  2: [[71,27],[29,73]],
  3: [[71,27],[50,50],[29,73]],
  4: [[29,27],[71,27],[29,73],[71,73]],
  5: [[29,27],[71,27],[50,50],[29,73],[71,73]],
  6: [[29,24],[71,24],[29,50],[71,50],[29,76],[71,76]],
};

function DiceFace({ face, color, dim }) {
  const pips = (face && PIP_POS[face]) ? PIP_POS[face] : [];
  return (
    <svg width={DIE_S} height={DIE_S} viewBox="0 0 100 100" style={{display:'block',flexShrink:0}}>
      {pips.map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r={11.5} fill={dim ? '#ccc' : color} opacity={dim ? 0.4 : 1} />
      ))}
    </svg>
  );
}

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
    0%,100% { transform:translate(0,0); }
    20% { transform:translate(-8px,-3px) rotate(-2deg); }
    40% { transform:translate(8px,3px) rotate(2deg); }
    60% { transform:translate(-5px,-2px) rotate(-1deg); }
    80% { transform:translate(5px,2px) rotate(1deg); }
  }
  @keyframes impactIn {
    0%   { opacity:0; transform:scale(3) rotate(-8deg); filter:blur(6px); }
    65%  { opacity:1; transform:scale(0.92) rotate(2deg); filter:blur(0); }
    100% { transform:scale(1) rotate(0); }
  }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes slideRight {
    from { opacity:0; transform:translateX(-14px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes shonbenFall {
    0%   { opacity:1; transform:translateY(0) rotate(-15deg) scale(1); }
    85%  { opacity:0.6; }
    100% { opacity:0; transform:translateY(150px) rotate(30deg) scale(0.4); }
  }
  @keyframes shonbenText {
    0%   { opacity:0; transform:scale(0.4) rotate(-8deg); }
    25%  { opacity:1; transform:scale(1.1) rotate(2deg); }
    70%  { opacity:1; transform:scale(1); }
    100% { opacity:0; transform:scale(0.85) translateY(-24px); }
  }
  @keyframes tapHint {
    0%,100% { opacity:0.2; }
    50%     { opacity:0.5; }
  }
  @keyframes ripple {
    0%   { transform:scale(0); opacity:0.5; }
    100% { transform:scale(5); opacity:0; }
  }
  @keyframes fadeIn {
    from { opacity:0; }
    to   { opacity:1; }
  }
`;

const DROPS = [
  {x:6,delay:0,size:24},{x:16,delay:0.08,size:18},{x:27,delay:0.16,size:28},
  {x:38,delay:0.04,size:20},{x:50,delay:0.22,size:22},{x:61,delay:0.11,size:26},
  {x:71,delay:0.07,size:18},{x:82,delay:0.19,size:24},{x:24,delay:0.26,size:16},
  {x:66,delay:0.13,size:22},{x:44,delay:0.30,size:20},{x:88,delay:0.02,size:26},
];

function ResultLabel({ label }) {
  if (!label) return null;
  if (label === 'ピンゾロ') return (
    <div style={{fontSize:32,fontWeight:900,letterSpacing:4,color:'#fff',animation:'neonPulse 0.7s ease-in-out infinite,impactIn 0.4s ease-out',textAlign:'center'}}>
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
    <div style={{fontSize:22,fontWeight:900,color:'#6699bb',letterSpacing:2,animation:'impactIn 0.35s ease-out',textAlign:'center',textShadow:'0 0 12px rgba(102,153,187,0.5)'}}>
      しょんべん 💦
    </div>
  );
  if (label.includes('ゾロ目')) return (
    <div style={{fontSize:24,fontWeight:900,color:'#ffd700',letterSpacing:2,animation:'impactIn 0.4s ease-out',textAlign:'center',textShadow:'0 0 16px rgba(255,215,0,0.5)'}}>
      {label}!
    </div>
  );
  return (
    <div style={{fontSize:20,fontWeight:900,color:'#999',animation:'impactIn 0.35s ease-out',textAlign:'center',letterSpacing:1}}>
      {label}
    </div>
  );
}

function getGlowColor(label) {
  if (label === 'ピンゾロ')      return '#ff1493';
  if (label === 'シゴロ')        return '#00e5ff';
  if (label === 'ヒフミ')        return '#00e5ff';
  if (label === 'しょんべん')    return '#4477aa';
  if (label?.includes('ゾロ目')) return '#ffd700';
  return null;
}

function ShonbenOverlay({ name }) {
  if (!name) return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:260,pointerEvents:'none',overflow:'hidden'}}>
      {DROPS.map((d,i) => (
        <div key={i} style={{position:'absolute',left:`${d.x}%`,top:'-8%',fontSize:d.size,animation:`shonbenFall 1s ease-in ${d.delay}s forwards`}}>💦</div>
      ))}
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{fontSize:24,fontWeight:900,color:'#88bbdd',textShadow:'0 0 20px rgba(136,187,221,0.8)',animation:'shonbenText 2.2s ease-out forwards',textAlign:'center',background:'rgba(0,0,0,0.88)',padding:'16px 30px',borderRadius:18,border:'1px solid rgba(136,187,221,0.2)',lineHeight:1.7}}>
          {name}<br/><span style={{fontSize:17,color:'#6699bb'}}>しょんべん 💦</span>
        </div>
      </div>
    </div>
  );
}

function Donburi({ diceState, glowColor, shaking, isEscaping }) {
  const diameter = BOWL_R * 2 + 20;
  return (
    <div style={{
      position:'relative',
      width:diameter, height:diameter,
      borderRadius:'50%',
      flexShrink:0,
      background: glowColor
        ? `radial-gradient(ellipse at 30% 28%, ${glowColor}1e 0%, #0e0e1e 50%, #020208 100%)`
        : 'radial-gradient(ellipse at 30% 28%, #1e1e36 0%, #0e0e1e 50%, #020208 100%)',
      border: glowColor ? `6px solid ${glowColor}cc` : '6px solid #181628',
      boxShadow: glowColor
        ? `inset 0 18px 52px rgba(0,0,0,0.97), inset 0 -2px 10px rgba(255,255,255,0.02), 0 10px 44px rgba(0,0,0,0.95), 0 0 44px ${glowColor}44`
        : 'inset 0 18px 52px rgba(0,0,0,0.97), inset 0 -2px 10px rgba(255,255,255,0.02), 0 10px 44px rgba(0,0,0,0.92)',
      transition:'border-color 0.5s, box-shadow 0.5s, background 0.5s',
      animation: shaking ? 'shake 0.35s ease-out' : 'none',
      userSelect:'none', WebkitUserSelect:'none',
    }}>
      {/* Rim rings */}
      <div style={{position:'absolute',top:6,left:6,right:6,bottom:6,borderRadius:'50%',border:'1px solid rgba(255,255,255,0.055)',pointerEvents:'none'}} />
      <div style={{position:'absolute',top:11,left:11,right:11,bottom:11,borderRadius:'50%',border:'1px solid rgba(0,0,0,0.5)',pointerEvents:'none'}} />

      {/* Dice layer — overflow:visible when escaping */}
      <div style={{position:'absolute',inset:0,borderRadius:'50%',overflow:isEscaping?'visible':'hidden'}}>
        {diceState.map((d,i) => {
          const distFromCenter = Math.sqrt(d.x*d.x + d.y*d.y);
          const opacity = d.escaped ? Math.max(0, 1 - (distFromCenter - BOWL_R) / 100) : 1;
          return (
            <div key={i} style={{
              position:'absolute',
              left: d.x + BOWL_R + 10 - DIE_S/2,
              top:  d.y + BOWL_R + 10 - DIE_S/2,
              width:DIE_S, height:DIE_S,
              borderRadius: DIE_S * 0.17,
              background:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center',
              transform:`rotate(${d.angle}rad)`,
              opacity,
              boxShadow: d.settled && glowColor && !d.escaped
                ? `0 0 18px ${glowColor}, 0 0 36px ${glowColor}44, 0 4px 12px rgba(0,0,0,0.9)`
                : '0 4px 14px rgba(0,0,0,0.9)',
              willChange:'transform',
              pointerEvents:'none',
            }}>
              <DiceFace
                face={d.face}
                color={(d.settled && !d.escaped && d.face) ? NUM_COLORS[d.face] : '#bbb'}
                dim={!d.settled || d.escaped}
              />
            </div>
          );
        })}
      </div>

      {diceState.length === 0 && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
          <div style={{fontSize:38,opacity:0.06}}>🎲</div>
        </div>
      )}
    </div>
  );
}

export default function GameScreen({ roomInfo, initialState, onGameOver }) {
  const [players, setPlayers]           = useState(initialState.players);
  const [oyaId, setOyaId]               = useState(initialState.oyaId);
  const [round, setRound]               = useState(initialState.round || 1);
  const [phase, setPhase]               = useState('betting');
  const [myBet, setMyBet]               = useState(10);
  const [isHost, setIsHost]             = useState(roomInfo.isHost);
  const [roundResult, setRoundResult]   = useState(null);
  const [revealStep, setRevealStep]     = useState(0);
  const [gameOverData, setGameOverData] = useState(null);
  const [pinzoroBlast, setPinzoroBlast] = useState(false);
  const [shonbenName, setShonbenName]   = useState(null);
  const [bowlShaking, setBowlShaking]   = useState(false);
  const [bowlKey, setBowlKey]           = useState('oya');
  const [diceRender, setDiceRender]     = useState([]);
  const [isEscaping, setIsEscaping]     = useState(false);
  const [ripples, setRipples]           = useState([]);

  const bowlRef    = useRef(null);
  const dicePhys   = useRef([]);
  const rafId      = useRef(null);
  const settled    = useRef(true);
  const escaping   = useRef(false);
  const isHostRef  = useRef(roomInfo.isHost);

  const myId     = socket.id;
  const me       = players.find(p => p.id === myId) || players[0];
  const oya      = players.find(p => p.id === oyaId);
  const isOya    = myId === oyaId;
  const myCoins  = me?.coins ?? 0;
  const sorted   = [...players].sort((a,b) => b.coins - a.coins);

  function stopPhysics() {
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
  }

  function triggerShonben(name) {
    setShonbenName(name);
    setTimeout(() => setShonbenName(null), 2400);
  }

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
      d.x  += d.vx; d.y += d.vy;
      d.angle += d.omega;
      d.vx *= FRICTION; d.vy *= FRICTION; d.omega *= SPIN_DECAY;

      if (!escaping.current) {
        const dist = Math.sqrt(d.x*d.x + d.y*d.y);
        if (dist > R) {
          const nx = d.x/dist, ny = d.y/dist;
          const dot = d.vx*nx + d.vy*ny;
          if (dot > 0) {
            d.vx = (d.vx - 2*dot*nx) * RESTITUTION;
            d.vy = (d.vy - 2*dot*ny) * RESTITUTION;
            d.omega += (d.vx*ny - d.vy*nx) * 0.05;
            if (Math.abs(dot) > 4) { setBowlShaking(true); setTimeout(()=>setBowlShaking(false),350); }
          }
          d.x = nx*(R-0.5); d.y = ny*(R-0.5);
        }

        if (Math.random() < 0.12) d.face = Math.ceil(Math.random()*6);
        const spd = Math.sqrt(d.vx*d.vx + d.vy*d.vy);
        if (spd < SETTLE_V && Math.abs(d.omega) < SETTLE_W) {
          d.vx=0; d.vy=0; d.omega=0; d.settled=true;
        } else {
          allDone = false;
        }
      } else {
        // escape mode: no wall, mark escaped when outside
        const dist = Math.sqrt(d.x*d.x + d.y*d.y);
        if (dist > BOWL_R) d.escaped = true;
        allDone = false;
      }
    }

    // Die-die collision (normal mode only)
    if (!escaping.current) {
      for (let i=0; i<dice.length; i++) {
        for (let j=i+1; j<dice.length; j++) {
          const a=dice[i], b=dice[j];
          if (a.settled && b.settled) continue;
          const dx=b.x-a.x, dy=b.y-a.y, d2=dx*dx+dy*dy, minD=DIE_R*2;
          if (d2<minD*minD && d2>0.01) {
            const dd=Math.sqrt(d2), nx=dx/dd, ny=dy/dd, ov=(minD-dd)*0.5;
            a.x-=nx*ov; a.y-=ny*ov; b.x+=nx*ov; b.y+=ny*ov;
            const dvx=a.vx-b.vx, dvy=a.vy-b.vy, dot=dvx*nx+dvy*ny;
            a.vx-=dot*nx*RESTITUTION; a.vy-=dot*ny*RESTITUTION;
            b.vx+=dot*nx*RESTITUTION; b.vy+=dot*ny*RESTITUTION;
          }
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

  function launchDice(fromX, fromY) {
    stopPhysics();
    settled.current = false;
    escaping.current = false;
    setIsEscaping(false);
    const R = BOWL_R - DIE_R;
    const dist0 = Math.sqrt(fromX*fromX + fromY*fromY);
    const r0 = Math.min(dist0, R * 0.82);
    const sx = dist0 > 0.01 ? fromX/dist0*r0 : 0;
    const sy = dist0 > 0.01 ? fromY/dist0*r0 : 0;

    dicePhys.current = [0,1,2].map(i => {
      const spread = (i-1)*0.45;
      const toward = Math.atan2(-sy, -sx);
      const ang = toward + spread + rand(-0.3, 0.3);
      const spd = rand(8, 14);
      return {
        x:sx+rand(-6,6), y:sy+rand(-6,6),
        vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd,
        angle:rand(0,Math.PI*2), omega:rand(-0.4,0.4),
        face:Math.ceil(Math.random()*6),
        settled:false, escaped:false,
      };
    });
    setDiceRender(dicePhys.current.map(d=>({...d})));
    rafId.current = requestAnimationFrame(() => tickRef.current());
  }

  // Launch dice outward — used for しょんべん reveal
  function launchEscape() {
    stopPhysics();
    escaping.current = true;
    setIsEscaping(true);

    // If no dice exist yet, create them at center
    if (dicePhys.current.length === 0) {
      dicePhys.current = [0,1,2].map(i => ({
        x:rand(-12,12), y:rand(-12,12),
        vx:0, vy:0, angle:rand(0,Math.PI*2), omega:0,
        face:Math.ceil(Math.random()*6),
        settled:false, escaped:false,
      }));
    }

    const baseAngle = rand(0, Math.PI*2);
    dicePhys.current = dicePhys.current.map((d,i) => {
      const a = baseAngle + (i/3)*Math.PI*2 + rand(-0.25,0.25);
      const spd = rand(14, 22);
      return { ...d, settled:false, escaped:false, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd-3, omega:rand(-0.8,0.8) };
    });
    setDiceRender(dicePhys.current.map(d=>({...d})));
    rafId.current = requestAnimationFrame(() => tickRef.current());

    setTimeout(() => {
      stopPhysics();
      dicePhys.current = [];
      setDiceRender([]);
      escaping.current = false;
      setIsEscaping(false);
    }, 900);
  }

  function settleDice(faces) {
    stopPhysics();
    escaping.current = false;
    setIsEscaping(false);
    if (dicePhys.current.length === 0) {
      dicePhys.current = [0,1,2].map((_, i) => ({
        x:(i-1)*DIE_R*2.4, y:0, vx:0, vy:0,
        angle:rand(0,Math.PI*2), omega:0,
        face:faces[i], settled:true, escaped:false,
      }));
    } else {
      dicePhys.current = dicePhys.current.map((d,i) => ({
        ...d, settled:true, face:faces[i], vx:0, vy:0, omega:0, escaped:false,
      }));
    }
    setDiceRender(dicePhys.current.map(d=>({...d})));
    settled.current = true;
  }

  function scatterThenSettle(faces, delay) {
    if (dicePhys.current.length === 0) {
      dicePhys.current = [0,1,2].map((_, i) => ({
        x:rand(-20,20), y:rand(-20,20), vx:rand(-4,4), vy:rand(-3,3),
        angle:rand(0,Math.PI*2), omega:rand(-0.2,0.2),
        face:Math.ceil(Math.random()*6), settled:false, escaped:false,
      }));
    } else {
      dicePhys.current = dicePhys.current.map(d => ({
        ...d, settled:false, vx:rand(-4,4), vy:rand(-3,3),
        omega:rand(-0.2,0.2), face:Math.ceil(Math.random()*6), escaped:false,
      }));
    }
    escaping.current = false;
    setIsEscaping(false);
    settled.current = false;
    stopPhysics();
    rafId.current = requestAnimationFrame(() => tickRef.current());
    setTimeout(() => settleDice(faces), delay);
  }

  // Show dice statically (for result-row tap)
  function showDiceStatic(faces) {
    stopPhysics();
    escaping.current = false;
    setIsEscaping(false);
    dicePhys.current = [0,1,2].map((_, i) => ({
      x:(i-1)*DIE_R*2.4, y: i===1 ? -8 : 4, vx:0, vy:0,
      angle:rand(0,Math.PI*2), omega:0,
      face:faces[i], settled:true, escaped:false,
    }));
    setDiceRender(dicePhys.current.map(d=>({...d})));
    settled.current = true;
  }

  // ── Socket ──────────────────────────────────────────────────
  useEffect(() => {
    socket.on('bet:updated', ({ players:p }) => setPlayers(p));

    socket.on('round:result', (data) => {
      setRoundResult(data);

      setTimeout(() => {
        setBowlKey('oya');
        const oyaShonben = data.oyaResult.label === 'しょんべん';

        if (oyaShonben) {
          launchEscape();
          setTimeout(() => {
            setRevealStep(1);
            triggerShonben(data.oyaName);
          }, 500);
        } else {
          settleDice(data.oyaDice);
          setRevealStep(1);
          if (data.oyaResult.label === 'ピンゾロ') {
            setPinzoroBlast(true); setTimeout(()=>setPinzoroBlast(false),950);
          } else if (data.oyaResult.label === 'ヒフミ') {
            setTimeout(()=>triggerShonben(data.oyaName),350);
          }
        }

        for (let i=0; i<data.battles.length; i++) {
          const t = 1000 + i*1200;
          setTimeout(() => {
            const b = data.battles[i];
            setBowlKey(b.playerId);
            const isShonben = b.result.label === 'しょんべん';

            if (isShonben) {
              launchEscape();
              setTimeout(() => {
                setRevealStep(i+2);
                triggerShonben(b.playerName);
              }, 500);
            } else {
              scatterThenSettle(b.dice, 550);
              setTimeout(() => {
                setRevealStep(i+2);
                if (b.result.label === 'ピンゾロ') {
                  setPinzoroBlast(true); setTimeout(()=>setPinzoroBlast(false),950);
                } else if (b.result.label === 'ヒフミ') {
                  setTimeout(()=>triggerShonben(b.playerName),350);
                }
              }, 570);
            }
          }, t);
        }

        setTimeout(() => {
          setPlayers(data.players);
          setPhase('result');
        }, 1000 + data.battles.length*1200 + 700);
      }, 1600);
    });

    socket.on('round:next', ({ oyaId:o, players:p, round:r }) => {
      stopPhysics();
      setOyaId(o); setPlayers(p); setRound(r);
      setPhase('betting'); setRoundResult(null); setRevealStep(0); setBowlKey('oya');
      dicePhys.current = []; setDiceRender([]);
      escaping.current = false; setIsEscaping(false);
      const mp = p.find(pl=>pl.id===myId);
      if (mp) setMyBet(prev=>Math.min(prev,mp.coins||1));
    });

    socket.on('game:over', ({ players:p }) => {
      stopPhysics();
      setGameOverData([...p].sort((a,b)=>b.coins-a.coins));
      setPhase('over');
    });

    socket.on('room:updated', ({ players:p }) => setPlayers(p));
    socket.on('host:changed', ({ hostId, players:p }) => {
      const nowHost = socket.id === hostId;
      isHostRef.current = nowHost;
      setIsHost(nowHost);
      setPlayers(p);
    });

    return () => {
      stopPhysics();
      ['bet:updated','round:result','round:next','game:over','room:updated','host:changed']
        .forEach(e=>socket.off(e));
    };
  }, [myId]);

  function sendBet(v) {
    const c = Math.max(1, Math.min(v, myCoins));
    setMyBet(c);
    socket.emit('bet:set', { amount:c });
  }

  function handleScreenTap(e) {
    if (!isHost || phase !== 'betting') return;
    e.preventDefault();

    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX == null) return;

    // Ripple at tap point
    const rect = e.currentTarget.getBoundingClientRect();
    const rid = Date.now();
    setRipples(prev=>[...prev.slice(-4),{x:clientX-rect.left,y:clientY-rect.top,id:rid}]);
    setTimeout(()=>setRipples(prev=>prev.filter(r=>r.id!==rid)),600);

    // Bowl-relative coordinates
    let px=0, py=0;
    if (bowlRef.current) {
      const br = bowlRef.current.getBoundingClientRect();
      px = clientX - (br.left + br.width/2);
      py = clientY - (br.top  + br.height/2);
    }

    launchDice(px, py);
    socket.emit('round:roll');
    setPhase('rolling');
  }

  // ── Bowl display state ──
  let bowlGlow=null, bowlLabel=null, bowlWho='';
  if (revealStep>=1 && roundResult) {
    if (bowlKey==='oya') {
      bowlLabel = roundResult.oyaResult.label;
      bowlWho   = roundResult.oyaName;
      bowlGlow  = getGlowColor(bowlLabel);
    } else {
      const b = roundResult.battles.find(x=>x.playerId===bowlKey);
      if (b) { bowlLabel=b.result.label; bowlWho=b.playerName; bowlGlow=getGlowColor(b.result.label); }
    }
  }

  const canTap = isHost && phase==='betting';

  // ── GAME OVER ──────────────────────────────────────────────
  if (phase==='over' && gameOverData) {
    return (
      <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'40px 20px',background:'#0a0a0f'}}>
        <style>{CSS}</style>
        <div style={{fontSize:11,color:'#333',letterSpacing:6,marginBottom:2}}>● ● ●</div>
        <div style={{fontSize:28,fontWeight:900,color:'#ff1493',letterSpacing:5,animation:'neonPulse 1.2s ease-in-out infinite',marginBottom:10}}>
          RESULT
        </div>
        <div style={{width:'100%',maxWidth:340,display:'flex',flexDirection:'column',gap:8}}>
          {gameOverData.map((p,i)=>(
            <div key={p.id} style={{
              display:'flex',alignItems:'center',gap:14,
              padding:'16px 20px',
              background:i===0?'rgba(255,20,147,0.09)':'rgba(255,255,255,0.03)',
              borderRadius:16,
              border:i===0?'1px solid rgba(255,20,147,0.35)':'1px solid rgba(255,255,255,0.055)',
              animation:`slideUp 0.4s ease-out ${i*0.1}s both`,
            }}>
              <div style={{fontSize:i===0?28:18,minWidth:34,textAlign:'center'}}>
                {i===0?'🏆':i===1?'🥈':i===2?'🥉':`${i+1}`}
              </div>
              <div style={{flex:1,fontSize:16,color:i===0?'#fff':'#666',fontWeight:i===0?900:400,letterSpacing:0.5}}>
                {p.name}
              </div>
              <div style={{fontSize:21,fontWeight:900,color:p.coins>=100?'#00ee77':p.coins===0?'#ff3344':'#ffd700'}}>
                {p.coins}<span style={{fontSize:11,color:'#444',marginLeft:3}}>枚</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onGameOver} style={{...ROLL_BTN,marginTop:10,letterSpacing:5,fontSize:15}}>LOBBY</button>
      </div>
    );
  }

  // ── MAIN ───────────────────────────────────────────────────
  return (
    <div
      style={{height:'100dvh',display:'flex',flexDirection:'column',background:'#0a0a0f',overflow:'hidden',position:'relative',cursor:canTap?'pointer':'default',touchAction:'none'}}
      onPointerDown={canTap ? handleScreenTap : undefined}
    >
      <style>{CSS}</style>
      <ShonbenOverlay name={shonbenName} />

      {pinzoroBlast && (
        <div style={{position:'fixed',inset:0,zIndex:300,pointerEvents:'none',background:'radial-gradient(circle at center,rgba(255,20,147,0.72) 0%,rgba(255,20,147,0.12) 55%,transparent 80%)',animation:'screenBlast 0.85s ease-out forwards',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{fontSize:76,fontWeight:900,color:'#fff',textShadow:'0 0 60px #ff1493',animation:'neonPulse 0.3s ease-in-out infinite',letterSpacing:6}}>ピンゾロ</div>
        </div>
      )}

      {/* Tap ripples */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:5}}>
        {ripples.map(r=>(
          <div key={r.id} style={{position:'absolute',left:r.x,top:r.y,width:36,height:36,marginLeft:-18,marginTop:-18,borderRadius:'50%',border:'2px solid rgba(255,20,147,0.5)',animation:'ripple 0.55s ease-out forwards'}} />
        ))}
      </div>

      {/* Header */}
      <div style={{padding:'8px 14px',background:'linear-gradient(180deg,rgba(0,0,0,0.96) 0%,rgba(8,8,14,0.92) 100%)',borderBottom:'1px solid rgba(255,20,147,0.1)',display:'flex',alignItems:'center',gap:8,flexShrink:0,zIndex:10}}>
        <div style={{fontSize:11,fontWeight:900,color:'#ff1493',letterSpacing:2,whiteSpace:'nowrap'}}>第{round}局</div>
        <div style={{flex:1,display:'flex',gap:3,justifyContent:'center',flexWrap:'wrap'}}>
          {sorted.map(p=>(
            <span key={p.id} style={{
              fontSize:10,
              color:p.id===myId?'#ff1493':'#444',
              background:p.id===oyaId?'rgba(255,160,0,0.11)':p.id===myId?'rgba(255,20,147,0.09)':'rgba(255,255,255,0.035)',
              border:p.id===oyaId?'1px solid rgba(255,160,0,0.28)':p.id===myId?'1px solid rgba(255,20,147,0.22)':'1px solid rgba(255,255,255,0.04)',
              padding:'3px 8px',borderRadius:6,fontWeight:p.id===myId?700:400,letterSpacing:0.3,
            }}>
              {p.id===oyaId?'🎲 ':''}{p.name} {p.coins}
            </span>
          ))}
        </div>
        <div style={{fontSize:10,color:'#2a2a2a',whiteSpace:'nowrap',letterSpacing:1}}>{isOya?'親':'子'}</div>
      </div>

      {/* どんぶりエリア */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'10px 0',position:'relative',overflow:'hidden',pointerEvents:'none'}}>

        {revealStep>=1 && bowlWho && (
          <div style={{fontSize:10,letterSpacing:4,marginBottom:12,fontWeight:700,color:bowlKey===oyaId?'#ff9500':'#444',animation:'slideUp 0.3s ease-out'}}>
            {bowlKey===oyaId?'🎲 OYA':'●'} — {bowlWho}
          </div>
        )}

        <div ref={bowlRef}>
          <Donburi
            diceState={diceRender}
            glowColor={bowlGlow}
            shaking={bowlShaking}
            isEscaping={isEscaping}
          />
        </div>

        {bowlLabel && revealStep>=1 && (
          <div style={{marginTop:16,animation:'impactIn 0.4s ease-out'}}>
            <ResultLabel label={bowlLabel} />
          </div>
        )}

        {/* Result list */}
        {phase==='result' && roundResult && revealStep>=1 && (
          <div style={{width:'100%',maxWidth:320,padding:'0 14px',marginTop:14,pointerEvents:'auto'}}>
            <div
              onClick={()=>{ setBowlKey('oya'); showDiceStatic(roundResult.oyaDice); }}
              style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',background:'rgba(255,160,0,0.05)',borderRadius:10,border:'1px solid rgba(255,160,0,0.14)',marginBottom:6,animation:'slideUp 0.3s ease-out',cursor:'pointer'}}
            >
              <span style={{fontSize:10,color:'#ff9500',fontWeight:700,minWidth:52,letterSpacing:0.5}}>🎲 {roundResult.oyaName}</span>
              <span style={{fontSize:10,color:'#3a3a3a',flex:1,letterSpacing:0.5}}>{roundResult.oyaResult.label}</span>
            </div>
            {roundResult.battles.slice(0,revealStep-1).map((b,i)=>{
              const win=b.outcome==='win', draw=b.outcome==='draw';
              const isMe=b.playerId===myId;
              return (
                <div key={b.playerId}
                  onClick={()=>{ setBowlKey(b.playerId); showDiceStatic(b.dice); }}
                  style={{
                    display:'flex',alignItems:'center',gap:8,
                    padding:'9px 14px',
                    background:win?'rgba(0,238,119,0.045)':draw?'rgba(255,255,255,0.025)':'rgba(255,51,68,0.055)',
                    borderRadius:10,
                    border:`1px solid ${win?'rgba(0,238,119,0.2)':draw?'rgba(255,255,255,0.045)':'rgba(255,51,68,0.2)'}`,
                    marginBottom:5,
                    animation:`slideUp 0.3s ease-out ${i*0.07}s both`,
                    cursor:'pointer',
                  }}
                >
                  <span style={{fontSize:10,color:isMe?'#ff1493':'#444',fontWeight:isMe?700:400,minWidth:52,letterSpacing:0.5}}>{b.playerName}</span>
                  <span style={{fontSize:10,color:'#2e2e2e',flex:1,letterSpacing:0.5}}>{b.result.label}</span>
                  <span style={{fontSize:15,fontWeight:900,color:win?'#00ee77':draw?'#2e2e2e':'#ff3344',animation:'slideRight 0.3s ease-out',minWidth:38,textAlign:'right'}}>
                    {win?`+${Math.abs(b.coinChange)}`:draw?'±0':b.coinChange}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div style={{
        padding:'12px 16px 22px',
        background:'linear-gradient(0deg,rgba(0,0,0,0.98) 0%,rgba(8,8,14,0.94) 100%)',
        borderTop:'1px solid rgba(255,255,255,0.035)',
        flexShrink:0, zIndex:10, pointerEvents:'auto',
      }}>

        {phase==='betting' && (
          <div style={{animation:'slideUp 0.25s ease-out'}}>
            {/* Coins row */}
            <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:12}}>
              <span style={{fontSize:10,color:'#2a2a2a',letterSpacing:3}}>COINS</span>
              <span style={{fontSize:34,fontWeight:900,color:'#ff1493',textShadow:'0 0 20px rgba(255,20,147,0.22)',lineHeight:1}}>{myCoins}</span>
              <span style={{flex:1}}/>
              {!isOya && <>
                <span style={{fontSize:10,color:'#2a2a2a',letterSpacing:3}}>BET</span>
                <span style={{fontSize:34,fontWeight:900,color:'#ffd700',lineHeight:1}}>{myBet}</span>
              </>}
            </div>

            {!isOya && (
              <>
                <input
                  type="range" min={1} max={myCoins} value={myBet}
                  onChange={e=>sendBet(Number(e.target.value))}
                  onPointerDown={e=>e.stopPropagation()}
                  style={{width:'100%',accentColor:'#ff1493',marginBottom:10}}
                />
                <div style={{display:'flex',gap:6,marginBottom:10}}>
                  {[10,25,50].map(v=>(
                    <button key={v}
                      onPointerDown={e=>{e.stopPropagation();sendBet(v);}}
                      style={{...SM_BTN,flex:1}}
                    >{v}</button>
                  ))}
                  <button
                    onPointerDown={e=>{e.stopPropagation();sendBet(myCoins);}}
                    style={{...SM_BTN,flex:1,color:'#ee3344',borderColor:'rgba(238,51,68,0.32)',background:'rgba(238,51,68,0.07)'}}
                  >ALL</button>
                </div>
                <div style={{display:'flex',gap:4,marginBottom:12,flexWrap:'wrap'}}>
                  {players.filter(p=>p.id!==oyaId).map(p=>(
                    <span key={p.id} style={{fontSize:10,color:p.id===myId?'#ffd700':'#2a2a2a',background:'rgba(255,255,255,0.025)',padding:'3px 9px',borderRadius:6,border:'1px solid rgba(255,255,255,0.04)'}}>
                      {p.name} <span style={{color:'#666'}}>{p.bet}</span>
                    </span>
                  ))}
                </div>
              </>
            )}

            {isOya && (
              <div style={{fontSize:11,color:'#2e2e2e',letterSpacing:2,marginBottom:14,textAlign:'center'}}>全員の賭けを受けます</div>
            )}

            {/* Tap hint or waiting */}
            {isHost ? (
              <div style={{textAlign:'center',animation:'tapHint 1.8s ease-in-out infinite',pointerEvents:'none',padding:'6px 0'}}>
                <div style={{fontSize:12,color:'#ff1493',letterSpacing:5,textShadow:'0 0 14px rgba(255,20,147,0.35)',fontWeight:700}}>
                  どこでもタップ
                </div>
                <div style={{fontSize:9,color:'#222',letterSpacing:4,marginTop:5}}>TAP ANYWHERE TO ROLL</div>
              </div>
            ) : (
              <div style={{textAlign:'center',color:'#1e1e1e',fontSize:10,letterSpacing:4,padding:'8px 0'}}>
                ホストのロールを待っています…
              </div>
            )}
          </div>
        )}

        {phase==='rolling' && (
          <div style={{textAlign:'center',padding:'14px 0',color:'#1a1a1a',letterSpacing:5,fontSize:10}}>
            {revealStep===0?'ROLLING…':'確認中…'}
          </div>
        )}

        {phase==='result' && (
          <div style={{animation:'slideUp 0.25s ease-out'}}>
            {isHost ? (
              <div style={{display:'flex',gap:8}}>
                <button
                  onPointerDown={e=>{e.stopPropagation();socket.emit('round:next');}}
                  style={{...ROLL_BTN,flex:1,fontSize:16,letterSpacing:4}}
                >NEXT ▶</button>
                <button
                  onPointerDown={e=>{e.stopPropagation();socket.emit('game:end');}}
                  style={{padding:'14px 16px',fontSize:10,borderRadius:12,border:'1px solid rgba(255,255,255,0.055)',background:'transparent',color:'#222',cursor:'pointer',letterSpacing:2}}
                >END</button>
              </div>
            ) : (
              <div style={{textAlign:'center',color:'#1a1a1a',fontSize:10,letterSpacing:4,padding:'8px 0'}}>WAITING NEXT…</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const ROLL_BTN = {
  width:'100%', padding:'15px', fontSize:17, fontWeight:900,
  borderRadius:13, border:'1px solid rgba(255,20,147,0.45)', cursor:'pointer',
  background:'rgba(255,20,147,0.09)', color:'#ff1493', letterSpacing:3,
  boxShadow:'0 0 18px rgba(255,20,147,0.18)',
  textShadow:'0 0 10px rgba(255,20,147,0.55)',
};
const SM_BTN = {
  padding:'11px 0', fontSize:13, fontWeight:700, borderRadius:10,
  border:'1px solid rgba(255,20,147,0.28)', background:'rgba(255,20,147,0.065)',
  color:'#ff1493', cursor:'pointer', letterSpacing:1,
};
