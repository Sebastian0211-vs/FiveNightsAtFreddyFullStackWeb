import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth/AuthContext.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

let fetchImpl;
beforeEach(() => {
    fetchImpl = vi.fn();
    global.fetch = (...args) => fetchImpl(...args);
});

function LoginStub() {
    const { login, user } = useAuth();
    return (
        <div>
            <button onClick={() => login('alice', 'secret123')}>do-login</button>
            <div data-testid="who">{user ? user.username : 'anon'}</div>
        </div>
    );
}

function setup(initialPath = '/protected') {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginStub />} />
                    <Route
                        path="/protected"
                        element={
                            <ProtectedRoute>
                                <div>Secret room</div>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </AuthProvider>
        </MemoryRouter>
    );
}

describe('ProtectedRoute', () => {
    it('redirects to /login when /me returns 401', async () => {
        fetchImpl.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
        setup('/protected');
        expect(await screen.findByText('do-login')).toBeInTheDocument();
        expect(screen.queryByText('Secret room')).not.toBeInTheDocument();
    });
});

describe('login flow', () => {
    it('login() updates the user', async () => {
        // /me fails → user=null
        fetchImpl.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
        setup('/login');

        // Wait for AuthProvider's initial /me to settle
        await waitFor(() =>
            expect(screen.getByTestId('who')).toHaveTextContent('anon')
        );

        // Now mock the login response
        fetchImpl.mockResolvedValueOnce({
            ok: true, status: 200,
            json: async () => ({ username: 'alice', furthestNight: 2 }),
        });

        await userEvent.click(screen.getByText('do-login'));
        await waitFor(() =>
            expect(screen.getByTestId('who')).toHaveTextContent('alice')
        );
    });
});
