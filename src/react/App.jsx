import { Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './lib/apollo.js';
import { AuthProvider } from './auth/AuthContext.jsx';

import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login       from './pages/Login.jsx';
import Register    from './pages/Register.jsx';
import Play from './pages/Play.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Menu from './pages/Menu.jsx';
import Warning from './pages/Warning.jsx';
import Unauthorized from './pages/Unauthorized.jsx';
import CustomNight from './pages/CustomNight.jsx';
import ResetPassword from './pages/ResetPassword.jsx'
import {useEffect} from "react";

export default function App() {
    useEffect(() => {
        const blockZoom = (e) => { if (e.ctrlKey) e.preventDefault(); };
        const blockKeys = (e) => {
            if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0'))
                e.preventDefault();
        };
        window.addEventListener('wheel', blockZoom, { passive: false });
        window.addEventListener('keydown', blockKeys);
        return () => {
            window.removeEventListener('wheel', blockZoom);
            window.removeEventListener('keydown', blockKeys);
        };
    }, []);
    return (
        <ApolloProvider client={apolloClient}>
            <AuthProvider>
                <Routes>
                    <Route path="/"               element={<Navigate to="/warning" replace />} />
                    <Route path="/login"          element={<Login />} />
                    <Route path="/register"       element={<Register />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/warning"        element={<Warning />} />
                    <Route path="/menu"           element={<Menu />} />
                    <Route path="/customnight"    element={<CustomNight />} />
                    <Route path="/leaderboard"    element={<Leaderboard />} />
                    <Route path="/unauthorized"   element={<Unauthorized />} />
                    <Route path="/play"     element={<ProtectedRoute><Play /></ProtectedRoute>} />
                    <Route path="*"         element={<Navigate to="/" replace />} />
                </Routes>
                        </AuthProvider>
        </ApolloProvider>
    );

}
