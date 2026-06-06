import { Navigate } from 'react-router-dom';

// The shift now begins at the migrated Warning splash, which leads
// into the menu and game. Kept as the protected entry point.
export default function Play() {
    return <Navigate to="/warning" replace />;
}
