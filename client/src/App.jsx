import { useState, useEffect } from 'react';
import { socket } from './socket.js';
import LobbyScreen from './screens/LobbyScreen.jsx';
import GameScreen from './screens/GameScreen.jsx';

export default function App() {
  const [screen, setScreen] = useState('lobby');
  const [roomInfo, setRoomInfo] = useState(null);
  const [gameInit, setGameInit] = useState(null);

  useEffect(() => {
    socket.connect();

    socket.on('room:created', (data) => {
      setRoomInfo({ roomCode: data.roomCode, players: data.players, isHost: true });
      setScreen('room');
    });
    socket.on('room:joined', (data) => {
      setRoomInfo({ roomCode: data.roomCode, players: data.players, isHost: false });
      setScreen('room');
    });
    socket.on('game:started', (data) => {
      setGameInit(data);
      setScreen('game');
    });
    socket.on('error', ({ message }) => alert(message));

    return () => {
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('game:started');
      socket.off('error');
    };
  }, []);

  if (screen === 'game' && gameInit) {
    return (
      <GameScreen
        roomInfo={roomInfo}
        initialState={gameInit}
        onGameOver={() => { setScreen('lobby'); setRoomInfo(null); setGameInit(null); }}
      />
    );
  }

  return (
    <LobbyScreen
      roomInfo={roomInfo}
      setRoomInfo={setRoomInfo}
    />
  );
}
