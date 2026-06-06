import { Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './lib/apollo.js';
import { AuthProvider } from './auth/AuthContext.jsx';

import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import FearDetector from './pages/FearDetector.jsx';
import Play from './pages/Play.jsx';

export default function App() {
    return (
        <ApolloProvider client={apolloClient}>
            <AuthProvider>
                <Routes>
                    <Route path="/login"       element={<Login />} />
                    <Route path="/register"    element={<Register />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/play"        element={<ProtectedRoute><Play /></ProtectedRoute>} />
                    <Route path="/test"        element={<ProtectedRoute><FearDetector /></ProtectedRoute>} />
                    {/* No home route — entry point is Menu.html */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </ApolloProvider>
    );
}
