import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login        from './pages/Login.jsx';
import Register     from './pages/Register.jsx';
import FearDetector from './pages/FearDetector.jsx'; // ← ajoute ça

export default function App() {
    return (
        <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/test"     element={<FearDetector />} /> {/* ← majuscule */}
            <Route path="*"         element={<Navigate to="/login" replace />} />
        </Routes>
    );
}