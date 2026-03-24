import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Warning      from './pages/Warning.jsx';
import Menu         from './pages/Menu.jsx';
import MainRoom     from './pages/MainRoom.jsx';
import Login        from './pages/Login.jsx';
import Register     from './pages/Register.jsx';
import FearDetector from './pages/FearDetector.jsx';

export default function App() {
  return (
    <Routes>
      {/* Game flow — mirrors Warning.html → Menu.html → MainRoom.html */}
      <Route path="/"        element={<Warning />} />
      <Route path="/menu"    element={<Menu />} />
      <Route path="/game"    element={<MainRoom />} />

      {/* Employee portal */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/test"     element={<FearDetector />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
