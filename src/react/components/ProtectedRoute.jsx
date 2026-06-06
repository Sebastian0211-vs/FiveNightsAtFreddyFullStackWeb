import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div style={{ color: '#888', padding: 32 }}>Chargement…</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}
