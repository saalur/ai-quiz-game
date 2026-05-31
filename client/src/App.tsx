import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomeScreen } from './screens/HomeScreen';
import { HostLobbyScreen } from './screens/HostLobbyScreen';
import { PlayerLobbyScreen } from './screens/PlayerLobbyScreen';
import { HostQuestionScreen } from './screens/HostQuestionScreen';
import { PlayerQuestionScreen } from './screens/PlayerQuestionScreen';
import { FinalScreen } from './screens/FinalScreen';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/host/lobby" element={<HostLobbyScreen />} />
        <Route path="/player/lobby" element={<PlayerLobbyScreen />} />
        <Route path="/host/game" element={<HostQuestionScreen />} />
        <Route path="/player/game" element={<PlayerQuestionScreen />} />
        <Route path="/finished" element={<FinalScreen />} />
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
