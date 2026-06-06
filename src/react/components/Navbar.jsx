import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Navbar() {
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const close = () => setOpen(false);

    async function handleLogout() {
        close();
        await logout();
        navigate('/login', { replace: true });
    }

    return (
        <nav className="nav">
            <NavLink to="/" className="nav-logo" onClick={close}>
                <span className="nav-logo-mark" aria-hidden>★</span>
                <span>Freddy's</span>
            </NavLink>

            <button
                className="nav-burger"
                aria-label="Menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                {open ? '✕' : '☰'}
            </button>

            <ul className={`nav-links ${open ? 'open' : ''}`}>
                {user ? (
                    <>
                        <li><NavLink to="/play" onClick={close}>Play</NavLink></li>
                        <li><NavLink to="/leaderboard" onClick={close}>Leaderboard</NavLink></li>
                        <li><NavLink to="/test" onClick={close}>Fear Test</NavLink></li>
                        <li className="nav-user">{user.username}</li>
                        <li><button onClick={handleLogout}>Logout</button></li>
                    </>
                ) : (
                    <>
                        <li><NavLink to="/leaderboard" onClick={close}>Leaderboard</NavLink></li>
                        <li><NavLink to="/login" onClick={close}>Login</NavLink></li>
                        <li><NavLink to="/register" onClick={close}>Register</NavLink></li>
                    </>
                )}
            </ul>
        </nav>
    );
}
