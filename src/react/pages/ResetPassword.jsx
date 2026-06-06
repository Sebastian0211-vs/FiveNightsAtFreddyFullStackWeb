import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const STYLES = `
    @font-face {
        font-family: 'FNAF';
        src: url('/assets/Fonts/five-nights-at-freddys.otf') format('opentype');
    }
    body { background: #000; margin: 0; }

    :root {
        --form-font-base:  clamp(13px, 1.4vw, 22px);
        --form-font-label: clamp(11px, 1.1vw, 18px);
        --form-font-small: clamp(10px, 0.9vw, 15px);
        --form-gap:        clamp(6px,  0.8vh, 14px);
        --form-input-pad:  clamp(4px,  0.5vh, 8px);
    }

    .rp-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #000;
    }

    .rp-box {
        width: clamp(260px, 28vw, 420px);
        padding: clamp(24px, 3vw, 48px);
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(10,10,10,0.95);
        display: flex;
        flex-direction: column;
        gap: var(--form-gap);
        font-family: 'Courier New', Courier, monospace;
    }

    .rp-title {
        font-family: 'FNAF', 'Courier New', monospace;
        font-size: clamp(16px, 2vw, 28px);
        color: #fff;
        letter-spacing: 0.12em;
        margin-bottom: 0.4em;
        text-align: center;
    }

    .rp-input {
        background: transparent;
        border: none;
        border-bottom: 1px solid rgba(255,255,255,0.3);
        outline: none;
        font-family: 'Courier New', Courier, monospace;
        font-size: var(--form-font-base);
        color: #fff;
        width: 100%;
        padding: var(--form-input-pad) 0;
        caret-color: #fff;
        box-sizing: border-box;
    }
    .rp-input::placeholder { color: rgba(255,255,255,0.25); }

    .rp-label {
        font-size: var(--form-font-label);
        color: rgba(255,255,255,0.55);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        margin-bottom: 0.2em;
    }

    .rp-btn {
        background: transparent;
        border: 1px solid rgba(255,255,255,0.35);
        font-family: 'Courier New', Courier, monospace;
        font-size: var(--form-font-base);
        color: #fff;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        padding: clamp(6px, 0.7vh, 12px) 0;
        cursor: pointer;
        width: 100%;
        margin-top: clamp(4px, 0.6vh, 10px);
        transition: background 0.15s;
    }
    .rp-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
    .rp-btn:disabled { opacity: 0.4; cursor: default; }

    .rp-link {
        font-size: var(--form-font-small);
        color: rgba(255,255,255,0.4);
        letter-spacing: 0.08em;
        text-align: center;
        cursor: pointer;
        text-decoration: underline;
        background: none;
        border: none;
        font-family: 'Courier New', Courier, monospace;
    }
    .rp-link:hover { color: rgba(255,255,255,0.8); }

    .rp-error   { color: #c33; font-size: var(--form-font-small); text-align: center; }
    .rp-success { color: rgba(60,200,60,0.9); font-size: var(--form-font-small); text-align: center; line-height: 1.5; }
`;

export default function ResetPassword() {
    const navigate = useNavigate();
    const [token,    setToken]    = useState('');
    const [password, setPassword] = useState('');
    const [confirm,  setConfirm]  = useState('');
    const [status,   setStatus]   = useState(''); // '' | 'loading' | 'done' | 'error'
    const [message,  setMessage]  = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token');
        if (!t) {
            setStatus('error');
            setMessage('Missing or invalid reset link.');
        } else {
            setToken(t);
        }
    }, []);

    async function handleReset() {
        if (!password || !confirm) return;
        if (password !== confirm) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }
        setStatus('loading');
        setMessage('');
        try {
            const API = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${API}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error');
            setStatus('done');
            setMessage('Password updated. Redirecting to login…');
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setStatus('error');
            setMessage(err.message || 'Something went wrong.');
        }
    }

    return (
        <>
            <style>{STYLES}</style>
            <div className="rp-wrap">
                <div className="rp-box">
                    <div className="rp-title">Reset Password</div>

                    {status === 'done' ? (
                        <div className="rp-success">{message}</div>
                    ) : status === 'error' && !token ? (
                        <>
                            <div className="rp-error">{message}</div>
                            <button className="rp-link" onClick={() => navigate('/login')}>← Back to login</button>
                        </>
                    ) : (
                        <>
                            <div>
                                <div className="rp-label">New password</div>
                                <input className="rp-input" type="password" placeholder="* * * * * * * *"
                                       value={password} onChange={e => setPassword(e.target.value)}
                                       onKeyDown={e => e.key === 'Enter' && handleReset()} />
                            </div>
                            <div>
                                <div className="rp-label">Confirm password</div>
                                <input className="rp-input" type="password" placeholder="* * * * * * * *"
                                       value={confirm} onChange={e => setConfirm(e.target.value)}
                                       onKeyDown={e => e.key === 'Enter' && handleReset()} />
                            </div>
                            {message && status === 'error' && <div className="rp-error">{message}</div>}
                            <button className="rp-btn" onClick={handleReset} disabled={status === 'loading'}>
                                {status === 'loading' ? '[ Updating... ]' : '[ Set new password ]'}
                            </button>
                            <button className="rp-link" onClick={() => navigate('/login')}>← Back to login</button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
