import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// vi.hoisted ensures the controller exists when vi.mock factory runs
const ctl = vi.hoisted(() => ({ user: null }));

vi.mock('../auth/AuthContext.jsx', () => ({
    useAuth: () => ({ user: ctl.user, logout: vi.fn() }),
}));

// Imported AFTER vi.mock so it uses the mocked module
const { default: Navbar } = await import('../components/Navbar.jsx');

function renderNav() {
    return render(<MemoryRouter><Navbar /></MemoryRouter>);
}

describe('Navbar (logged out)', () => {
    it('shows Login + Register, hides Logout/Play', () => {
        ctl.user = null;
        renderNav();
        expect(screen.getByText(/login/i)).toBeInTheDocument();
        expect(screen.getByText(/register/i)).toBeInTheDocument();
        expect(screen.queryByText(/logout/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/^play$/i)).not.toBeInTheDocument();
    });
});

describe('Navbar (logged in)', () => {
    it('shows username, Play, Logout, hides Login/Register', () => {
        ctl.user = { username: 'mike', furthestNight: 3 };
        renderNav();
        expect(screen.getByText('mike')).toBeInTheDocument();
        expect(screen.getByText(/^play$/i)).toBeInTheDocument();
        expect(screen.getByText(/logout/i)).toBeInTheDocument();
        expect(screen.queryByText(/^login$/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/^register$/i)).not.toBeInTheDocument();
    });
});
