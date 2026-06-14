import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket.js';

const CSS = `
  @keyframes diceRoll {
    0%   { transform: rotate(0deg)   scale(1); }
    25%  { transform: rotate(15deg)  scale(1.05); }
    50%  { transform: rotate(-10deg) scale(0.95); }
    75%  { transform: rotate(8deg)   scale(1.02); }
    100% { transform: rotate(0deg)   scale(1); }
  }
  @keyframes coinPop {
    0%   { opacity: 0; transform: translateY(0) scale(0.5); }
    50%  { opacity: 1; transform: translateY(-30px) scale(1.2); }
    100% { opacity: 0; transform: translateY(-60px) scale(1); }
  }
  @keyframes resultSlide {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes pinzoroBurst {
    0%   { opacity: 1; transform: scale(1); }
    50%  { opacity: 0.7; transform: scale(1.3); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// サイコロの目を描画
function Die({ value, rolling, size = 52 }) {
  const dotPositions = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
  };
  const face = value >= 1 && value <= 6 ? value : 1;
  const dotSize = Math.round(size * 0.18);

  return (
    <div style={{
      width: size, height: size,
      background: 'linear-gradient(135deg, #fff 60%, #ddd)',
      borderRadius: size * 0.16,
      position: 'relative',
      boxShadow: '0 4px 12px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.8)',
      animation: rolling ? `diceRoll 0.25s ease-in-out infinite` : 'none',
      flexShrink: 0,
    }}>
      {(dotPositions[face] || []).map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute',
          width: dotSize, height: dotSize,
          background: '#1a1a1a',
          borderRadius: '50%',
          left: `${x}%`, top: `${y}%`,
          transform: 'translate(-50%, -50%)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
        }} />
      ))}
    </div>
  );
}

function DiceRow({ dice, rolling }) {
  const display = rolling
    ? [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]
    : dice;
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
      {[0, 1, 2].map(i => <Die key={i} value={display[i]} rolling={rolling} />)}
    </div>
  );
}

// 役名のスタイル
function ResultBadge({ label }) {
  const isPinzoro = label === 'ピンゾロ';
  const isShigoro = label === 'シゴロ';
  const isHifumi = label === 'ヒフミ';
  const isZoro = label.includes('ゾロ目');

  const color = isPinzoro ? '#fff' : isShigoro ? '#fff' : isHifumi ? '#fca5a5' : isZoro ? '#fde68a' : '#d1d5db';
  const bg = isPinzoro
    ? 'linear-gradient(135deg, #b45309, #ffd700, #b45309)'
    : isShigoro ? 'linear-gradient(135deg, #1d4ed8, #60a5fa)'
    : isHifumi ? 'rgba(220,38,38,0.3)'
    : isZoro ? 'rgba(234,179,8,0.25)'
    : 'rgba(255,255,255,0.1)';
  const border = isPinzoro ? '2px solid #ffd700' : isShigoro ? '2px solid #60a5fa' : '1px solid rgba(255,255,255,0.1)';

  return (
    <div style={{
      display: 'inline-block',
      padding: '4px 14px', borderRadius: 20,
      fontSize: isPinzoro ? 16 : 14,
      fontWeight: 'bold', color,
      background: bg, border,
      animation: isPinzoro ? 'pinzoroBurst 0.8s ease-in-out infinite' : 'none',
      letterSpacing: isPinzoro ? 2 : 0,
    }}>
      {isPinzoro ? '✨ ' + label + ' ✨' : label}
    </div>
  );
}

export default function GameScreen({ roomInfo, initialState, onGameOver }) {
  const [players, setPlayers] = useState(initialState.players);
  const [oyaId, setOyaId] = useState(initialState.oyaId);
  const [round, setRound] = useState(initialState.round || 1);
  const [phase, setPhase] = useState('betting'); // betting | rolling | result | over
  const [myBet, setMyBet] = useState(10);
  const [isHost, setIsHost] = useState(roomInfo.isHost);
  const [roundResult, setRoundResult] = useState(null);
  const [rollingPhase, setRollingPhase] = useState(false); // アニメ中
  const [revealStep, setRevealStep] = useState(0); // 何人目まで表示
  const [gameOverData, setGameOverData] = useState(null);

  const isHostRef = useRef(roomInfo.isHost);
  const myId = socket.id;

  const me = players.find(p => p.id === myId) || players[0];
  const oya = players.find(p => p.id === oyaId);
  const isOya = myId === oyaId;

  useEffect(() => {
    socket.on('bet:updated', ({ players: p }) => setPlayers(p));

    socket.on('round:result', (data) => {
      setRollingPhase(true);
      setRevealStep(0);
      setRoundResult(data);

      // アニメーション: 1.5秒後に親公開、その後0.8秒ごとに子公開
      const totalBattles = data.battles.length;
      setTimeout(() => {
        setRollingPhase(false);
        setRevealStep(1); // 親を表示
        for (let i = 1; i <= totalBattles; i++) {
          setTimeout(() => {
            setRevealStep(i + 1);
          }, i * 900);
        }
        // 全部表示後にコイン更新
        setTimeout(() => {
          setPlayers(data.players);
          setPhase('result');
        }, (totalBattles + 1) * 900 + 400);
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
      if (myPlayer) setMyBet(Math.min(myBet, myPlayer.coins));
    });

    socket.on('game:over', ({ players: p }) => {
      const sorted = [...p].sort((a, b) => b.coins - a.coins);
      setGameOverData(sorted);
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
      ['bet:updated', 'round:result', 'round:next', 'game:over', 'room:updated', 'host:changed']
        .forEach(e => socket.off(e));
    };
  }, [myId, myBet]);

  function sendBet(amount) {
    const clamped = Math.max(1, Math.min(amount, me?.coins || 1));
    setMyBet(clamped);
    socket.emit('bet:set', { amount: clamped });
  }

  // ── ゲームオーバー画面 ────────────────────────────────
  if (phase === 'over' && gameOverData) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '32px 20px', background: 'radial-gradient(ellipse at top, #1a0a00, #0a0000)' }}>
        <style>{CSS}</style>
        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ffd700', letterSpacing: 3 }}>🎊 最終結果</div>
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gameOverData.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px',
              background: i === 0 ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
              borderRadius: 14,
              border: i === 0 ? '1px solid rgba(255,215,0,0.5)' : '1px solid rgba(255,255,255,0.08)',
              animation: `slideUp 0.4s ease-out ${i * 0.15}s both`,
            }}>
              <div style={{ fontSize: i === 0 ? 28 : 20, minWidth: 36, textAlign: 'center' }}>
                {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}位`}
              </div>
              <div style={{ flex: 1, fontSize: 17, color: '#fff', fontWeight: i === 0 ? 'bold' : 'normal' }}>{p.name}</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: p.coins >= 100 ? '#4ade80' : p.coins === 0 ? '#f87171' : '#ffd700' }}>
                {p.coins}枚
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onGameOver}
          style={{ marginTop: 8, padding: '14px 40px', fontSize: 17, fontWeight: 'bold', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#ffd700', color: '#1a0800' }}
        >
          トップに戻る
        </button>
      </div>
    );
  }

  // ── メインゲーム画面 ─────────────────────────────────
  const myCoins = me?.coins ?? 0;
  const sorted = [...players].sort((a, b) => b.coins - a.coins);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(ellipse at top, #1a0800 0%, #0a0000 70%)', overflow: 'hidden' }}>
      <style>{CSS}</style>

      {/* ヘッダー */}
      <div style={{ padding: '8px 14px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,215,0,0.2)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: '#ffd700', fontWeight: 'bold', whiteSpace: 'nowrap' }}>第{round}局</div>
        <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          {sorted.map(p => (
            <span key={p.id} style={{
              fontSize: 11,
              color: p.id === myId ? '#ffd700' : '#ccc',
              background: p.id === oyaId ? 'rgba(255,100,0,0.25)' : p.id === myId ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.07)',
              border: p.id === oyaId ? '1px solid rgba(255,100,0,0.5)' : p.id === myId ? '1px solid rgba(255,215,0,0.25)' : '1px solid transparent',
              padding: '2px 7px', borderRadius: 10,
            }}>
              {p.id === oyaId ? '🎲' : ''}{p.name} {p.coins}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
          {isOya ? '🎲あなたが親' : `親:${oya?.name || ''}`}
        </div>
      </div>

      {/* メインエリア */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* 賭けフェーズ */}
        {phase === 'betting' && (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>あなたのコイン</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#ffd700' }}>{myCoins} <span style={{ fontSize: 18 }}>枚</span></div>
            </div>

            {isOya ? (
              <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,100,0,0.1)', borderRadius: 16, border: '1px solid rgba(255,100,0,0.3)', marginBottom: 16 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎲</div>
                <div style={{ color: '#ff9500', fontSize: 16, fontWeight: 'bold' }}>あなたが親です</div>
                <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>全員の賭けを受けて戦います</div>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12, textAlign: 'center' }}>賭け金を設定</div>

                {/* 賭け金スライダー */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <button
                    onPointerDown={() => sendBet(myBet - 5)}
                    style={btnSmall}
                  >－5</button>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: '#ffd700' }}>{myBet}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>コイン</div>
                  </div>
                  <button
                    onPointerDown={() => sendBet(myBet + 5)}
                    style={btnSmall}
                  >＋5</button>
                </div>

                <input
                  type="range"
                  min={1}
                  max={myCoins}
                  value={myBet}
                  onChange={(e) => sendBet(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#ffd700' }}
                />

                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  {[10, 25, 50].map(v => (
                    <button
                      key={v}
                      onPointerDown={() => sendBet(v)}
                      style={{ ...btnSmall, flex: 1, fontSize: 12 }}
                    >{v}</button>
                  ))}
                  <button
                    onPointerDown={() => sendBet(myCoins)}
                    style={{ ...btnSmall, flex: 1, fontSize: 12, color: '#f87171', borderColor: '#f87171' }}
                  >全賭け</button>
                </div>
              </div>
            )}

            {/* 全員の賭け状況 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {players.filter(p => p.id !== oyaId).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                  <span style={{ color: p.id === myId ? '#ffd700' : '#aaa', fontSize: 14 }}>{p.name}</span>
                  <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: 14 }}>{p.bet} <span style={{ fontSize: 11, color: '#888' }}>枚</span></span>
                </div>
              ))}
            </div>

            {isHost && (
              <button
                onPointerDown={() => {
                  socket.emit('round:roll');
                  setPhase('rolling');
                }}
                style={{ width: '100%', padding: '16px', fontSize: 18, fontWeight: 'bold', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #ffd700, #ff8800)', color: '#1a0800', boxShadow: '0 4px 20px rgba(255,140,0,0.5)' }}
              >
                🎲 サイコロを振る！
              </button>
            )}
            {!isHost && <div style={{ textAlign: 'center', color: '#555', fontSize: 13 }}>ホストがサイコロを振るのを待っています…</div>}
          </div>
        )}

        {/* ローリング中 & 結果発表 */}
        {(phase === 'rolling' || phase === 'result') && roundResult && (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>

            {/* 親の結果 */}
            <div style={{
              background: 'rgba(255,100,0,0.12)',
              border: revealStep >= 1 ? '1px solid rgba(255,100,0,0.5)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '16px 20px', marginBottom: 12, textAlign: 'center',
              transition: 'border-color 0.3s',
            }}>
              <div style={{ fontSize: 12, color: '#ff9500', marginBottom: 8 }}>🎲 親 — {roundResult.oyaName}</div>
              <DiceRow dice={roundResult.oyaDice} rolling={rollingPhase || revealStep < 1} />
              {revealStep >= 1 && (
                <div style={{ marginTop: 10, animation: 'resultSlide 0.4s ease-out' }}>
                  <ResultBadge label={roundResult.oyaResult.label} />
                </div>
              )}
            </div>

            {/* 各子の結果 */}
            {roundResult.battles.map((b, i) => {
              const shown = revealStep >= i + 2;
              const isMe = b.playerId === myId;
              const win = b.outcome === 'win';
              const draw = b.outcome === 'draw';
              return (
                <div key={b.playerId} style={{
                  background: shown
                    ? (win ? 'rgba(34,197,94,0.12)' : draw ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.12)')
                    : 'rgba(255,255,255,0.04)',
                  border: shown
                    ? (win ? '1px solid rgba(34,197,94,0.4)' : draw ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(239,68,68,0.35)')
                    : (isMe ? '1px solid rgba(255,215,0,0.2)' : '1px solid rgba(255,255,255,0.06)'),
                  borderRadius: 14, padding: '14px 16px', marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: isMe ? '#ffd700' : '#aaa' }}>
                      {isMe ? '👤 ' : ''}{b.playerName}
                    </span>
                    {shown && (
                      <span style={{
                        fontSize: 14, fontWeight: 'bold',
                        color: win ? '#4ade80' : draw ? '#aaa' : '#f87171',
                        animation: 'resultSlide 0.3s ease-out',
                      }}>
                        {win ? `+${Math.abs(b.coinChange)} 勝ち！` : draw ? '引き分け' : `${b.coinChange} 負け`}
                      </span>
                    )}
                  </div>
                  <DiceRow dice={b.dice} rolling={!shown} />
                  {shown && (
                    <div style={{ marginTop: 10, animation: 'resultSlide 0.4s ease-out' }}>
                      <ResultBadge label={b.result.label} />
                    </div>
                  )}
                  {!shown && (
                    <div style={{ marginTop: 10, textAlign: 'center', color: '#555', fontSize: 13 }}>振っています…</div>
                  )}
                </div>
              );
            })}

            {/* 次のラウンドボタン */}
            {phase === 'result' && isHost && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onPointerDown={() => socket.emit('round:next')}
                  style={{ flex: 1, padding: '15px', fontSize: 16, fontWeight: 'bold', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #ffd700, #ff8800)', color: '#1a0800', boxShadow: '0 4px 16px rgba(255,140,0,0.4)' }}
                >
                  次の局へ ▶
                </button>
                <button
                  onPointerDown={() => socket.emit('game:end')}
                  style={{ padding: '15px 16px', fontSize: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#555', cursor: 'pointer' }}
                >
                  終了
                </button>
              </div>
            )}
            {phase === 'result' && !isHost && (
              <div style={{ textAlign: 'center', color: '#555', fontSize: 13, marginTop: 8 }}>ホストが次のラウンドを始めるのを待っています…</div>
            )}
          </div>
        )}

        {phase === 'rolling' && !roundResult && (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>サイコロを振っています…</div>
        )}
      </div>
    </div>
  );
}

const btnSmall = {
  padding: '10px 14px',
  fontSize: 14,
  fontWeight: 'bold',
  borderRadius: 10,
  border: '1px solid rgba(255,215,0,0.4)',
  background: 'rgba(255,215,0,0.08)',
  color: '#ffd700',
  cursor: 'pointer',
};
