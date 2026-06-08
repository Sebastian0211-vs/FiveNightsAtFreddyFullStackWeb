import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { gql } from '@apollo/client';
import { api } from '../lib/api.js';
import { apolloClient } from '../lib/apollo.js';

const AuthContext = createContext(null);

// Session/profile data is fetched via GraphQL (requirement 8.2, all data
// retrieved through GraphQL). Login/register/logout stay on the Passport
// REST endpoints (requirement 7.4) since they set/clear the HttpOnly cookie.
const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      furthestNight
      bestNight
      customNightBeaten
    }
  }
`;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const { data } = await apolloClient.query({
                query: ME_QUERY,
                fetchPolicy: 'network-only',
            });
            setUser(data?.me ?? null);
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
        setUser({ username: data.username, furthestNight: 0, bestNight: 0, customNightBeaten: false });
        return data;
    }, []);

    const logout = useCallback(async () => {
        await api('/api/auth/logout', { method: 'POST' });
        setUser(null);
        await apolloClient.clearStore().catch(() => {});
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
