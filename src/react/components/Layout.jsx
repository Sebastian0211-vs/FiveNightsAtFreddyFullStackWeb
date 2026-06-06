import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

export default function Layout() {
    return (
        <div className="layout">
            <Navbar />
            <main className="layout-main">
                <Outlet />
            </main>
        </div>
    );
}
