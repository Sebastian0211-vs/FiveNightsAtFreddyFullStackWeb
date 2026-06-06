import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const me = await api('/api/auth/me');
            setUser(me);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const login = useCallback(async (username, password) => {
        const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
        setUser(data);
        return data;
    }, []);

    const register = useCallback(async (username, email, password) => {
        const data = await api('/api/auth/register', { method: 'POST', body: { username, email, password } });
        setUser({ username: data.username, furthestNight: 0 });
        return data;
    }, []);

    const logout = useCallback(async () => {
        await api('/api/auth/logout', { method: 'POST' });
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
