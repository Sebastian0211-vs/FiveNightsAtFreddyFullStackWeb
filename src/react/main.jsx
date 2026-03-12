import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

// ── Global CSS ─────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
    @font-face {
        font-family: 'FNAF';
        src: url('/assets/Fonts/five-nights-at-freddys.otf') format('opentype');
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
        background: #000;
        overflow: hidden;
        width: 100vw;
        height: 100vh;
        opacity: 0;
        transition: opacity 1s;
    }
`;
document.head.appendChild(style);
document.body.style.opacity = '0';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>
);