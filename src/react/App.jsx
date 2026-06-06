import { Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './lib/apollo.js';
import { AuthProvider } from './auth/AuthContext.jsx';

import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import FearDetector from './pages/FearDetector.jsx';

export default function App() {
    return (
        <ApolloProvider client={apolloClient}>
            <AuthProvider>
                <Routes>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />

                        <Route
                            path="/test"
                            element={<ProtectedRoute><FearDetector /></ProtectedRoute>}
                        />
                        <Route
                            path="/play"
                            element={
                                <ProtectedRoute>
                                    <div className="page">
                                        <h1>Play</h1>
                                        <p className="muted">Game canvas mounts here.</p>
                                    </div>
                                </ProtectedRoute>
                            }
                        />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </ApolloProvider>
    );
}
