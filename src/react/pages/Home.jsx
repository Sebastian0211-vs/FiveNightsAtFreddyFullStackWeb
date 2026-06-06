import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Home() {
    const { user } = useAuth();
    return (
        <div className="page">
            <h1>Welcome{user ? `, ${user.username}` : ''}</h1>
            <div className="card">
                <p>Pizzeria security shift. 12 AM – 6 AM. Stay alive.</p>
                {user ? (
                    <p className="muted" style={{ marginTop: '0.6rem' }}>
                        Furthest night reached: <strong>{user.furthestNight}</strong>
                    </p>
                ) : (
                    <p className="muted" style={{ marginTop: '0.6rem' }}>
                        <Link to="/login" style={{ color: '#c33', textDecoration: 'underline' }}>
                            Sign in
                        </Link> to track your progress.
                    </p>
                )}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {user ? <Link to="/play" className="btn">Start shift</Link> : null}
                <Link to="/leaderboard" className="btn">Leaderboard</Link>
            </div>
        </div>
    );
}
