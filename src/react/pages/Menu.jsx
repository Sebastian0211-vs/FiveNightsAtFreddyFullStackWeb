import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useAuth } from '../auth/AuthContext.jsx';
import { apolloClient } from '../lib/apollo.js';
import {
    IMG, AUDIO, FRED_MENU, NOISE_MENU, WHITE_MENU, ensureFnafFont,
} from '../lib/menuAssets.js';
import {
    runFreddyMenu, runNoise, runAnimation, useFramePlayer, useSlideLoop,
    useLoopAudio, tvStatic,
} from '../lib/fnafFx.jsx';

const RESET_PROGRESS = gql`
  mutation ResetProgress {
    resetProgress { id furthestNight }
  }
`;

const STYLES = `
.menu-root { background:#000; margin:0; height:100vh; width:100vw; position:relative; overflow:hidden; }
.menu-container { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:100%; aspect-ratio:16/9; }
.menu-anim, .menu-noise, .menu-white { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; }
.menu-anim  { z-index:1; }
.menu-noise { z-index:2; }
.menu-white { z-index:3; }
.menu-slide { position:fixed; top:5%; left:50%; transform:translateX(-50%); width:100%; opacity:0.5; z-index:5; animation:menuSlideDown 10s linear forwards; }
.FNAFtitle  { position:absolute; top:10%; left:10%; width:15%; pointer-events:none; z-index:10; object-fit:contain; }
.menu-buttons { position:absolute; top:46%; left:10%; width:15%; z-index:20; display:flex; flex-direction:column; gap:20%; }
.menu-selector { position:absolute; left:-25%; width:20%; transition:top 0.1s; pointer-events:none; }
.menu-btn-text { font-family:'FNAF','Courier New',monospace; font-size:clamp(18px,3.5vw,52px); color:#fff; background:none; border:none; cursor:pointer; text-align:left; padding:0; letter-spacing:0.04em; text-shadow:2px 2px 8px rgba(0,0,0,0.95); white-space:nowrap; display:block; }
.menu-btn-text:hover { opacity:0.7; }
.continue-row { display:flex; align-items:baseline; gap:8px; cursor:pointer; white-space:nowrap; }
.continue-row:hover { opacity:0.7; }
.continue-night { font-family:'FNAF','Courier New',monospace; font-size:clamp(18px,3.5vw,52px); color:#fff; letter-spacing:0.04em; white-space:nowrap; text-shadow:2px 2px 8px rgba(0,0,0,0.95); }
.menu-user { position:absolute; bottom:3%; left:3%; font-family:'FNAF','Courier New',monospace; font-size:clamp(10px,1.2vw,18px); color:#fff; letter-spacing:0.08em; text-shadow:2px 2px 6px rgba(0,0,0,0.9); z-index:20; pointer-events:none; }
@keyframes menuSlideDown { from { bottom:100%; } to { top:90%; } }
`;

export default function Menu() {
    const navigate = useNavigate();
    const animRef = useRef(null);
    const noiseRef = useRef(null);
    const whiteRef = useRef(null);
    const slideRef = useRef(null);
    const selectorRef = useRef(null);
    const buttonsRef = useRef(null);
    const selectedIndex = useRef(0);

    const { user, loading, logout } = useAuth();
    const [visible, setVisible] = useState(false);
    const furthestNight = user?.furthestNight ?? 0;
    const username = user?.username ?? null;

    const showContinue = furthestNight > 0;
    const showCustom = furthestNight >= 5;
    const nextNight = Math.min(furthestNight + 1, 6);

    // ── Sprite animations ─────────────────────────────────────
    useFramePlayer(animRef, runFreddyMenu, FRED_MENU);
    useFramePlayer(noiseRef, runNoise, NOISE_MENU);
    useFramePlayer(whiteRef, runAnimation, WHITE_MENU, 0.4);
    useSlideLoop(slideRef);

    // ── Background audio ──────────────────────────────────────
    useLoopAudio([AUDIO.static2, AUDIO.darkness]);

    // ── Fade-in ───────────────────────────────────────────────
    useEffect(() => {
        ensureFnafFont();
        const fadeId = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(fadeId);
    }, []);

    // ── Auth gate (user comes from the GraphQL-backed AuthContext) ──
    useEffect(() => {
        if (!loading && !user) navigate('/unauthorized');
    }, [loading, user, navigate]);

    // ── Keyboard selector ─────────────────────────────────────
    function visibleButtons() {
        return buttonsRef.current
            ? Array.from(buttonsRef.current.querySelectorAll('.menu-btn'))
            : [];
    }
    function moveSelector(index) {
        const buttons = visibleButtons();
        const selector = selectorRef.current;
        if (!buttons.length || !selector) return;
        selectedIndex.current = (index + buttons.length) % buttons.length;
        const btn = buttons[selectedIndex.current];
        selector.style.top =
            btn.offsetTop + btn.offsetHeight / 2 - selector.offsetHeight / 2 + 'px';
    }

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowDown') moveSelector(selectedIndex.current + 1);
            if (e.key === 'ArrowUp') moveSelector(selectedIndex.current - 1);
            if (e.key === 'Enter') visibleButtons()[selectedIndex.current]?.click();
        };
        document.addEventListener('keydown', onKey);
        // position once layout is ready
        const id = requestAnimationFrame(() => moveSelector(0));
        return () => { document.removeEventListener('keydown', onKey); cancelAnimationFrame(id); };
        // re-run when button visibility changes
    }, [showContinue, showCustom]);

    function hoverSelect(e) {
        const i = visibleButtons().indexOf(e.currentTarget);
        if (i >= 0) moveSelector(i);
    }

    // ── Actions ───────────────────────────────────────────────
    const fadeTo = (el, from, to, duration) => new Promise(resolve => {
        el.style.transition = `opacity ${duration}ms ease`;
        el.style.opacity = from;
        void el.offsetWidth;
        el.style.opacity = to;
        setTimeout(resolve, duration);
    });
    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    async function onNewGame() {
        // Reset progress via GraphQL (uses the authenticated user from context)
        await apolloClient.mutate({ mutation: RESET_PROGRESS }).catch(() => {});

        const overlay = document.createElement('div');
        overlay.style.cssText =
            'pointer-events:none;position:fixed;inset:0;z-index:100;background:#000;opacity:0;';
        const img = document.createElement('img');
        img.src = IMG.transition;
        img.style.cssText =
            'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;';
        overlay.appendChild(img);
        document.body.appendChild(overlay);

        await fadeTo(overlay, 0, 1, 700);
        await fadeTo(img, 0, 1, 800);
        await wait(3500);
        await fadeTo(img, 1, 0, 800);
        await wait(500);
        window.location.href = '/mainroom'; // MainRoom is still a standalone HTML page
    }

    function onContinue() {
        const startNight = furthestNight > 0 ? furthestNight + 1 : 1;
        const capped = Math.min(startNight, 6);
        window.location.href = `/mainroom?night=${capped}`;
    }

    function goToCustomNight() {
        tvStatic(AUDIO.camera, () => navigate('/customnight'));
    }
    function goToLeaderboard() {
        tvStatic(AUDIO.camera, () => navigate('/leaderboard'));
    }
    async function onLogout() {
        await logout().catch(() => {});
        setVisible(false);
        setTimeout(() => navigate('/login'), 800);
    }

    return (
        <div className="menu-root" style={{ opacity: visible ? 1 : 0, transition: 'opacity 1s' }}>
            <style>{STYLES}</style>

            <div className="menu-container">
                <img ref={animRef}  className="menu-anim"  src={IMG.menu1} alt="" />
                <img ref={noiseRef} className="menu-noise" src={IMG.staticNoise1} alt="" />
                <img ref={whiteRef} className="menu-white" src={IMG.whiteNoise1} alt="" />
                <img ref={slideRef} className="menu-slide" src={IMG.slide} alt="" />
                <img className="FNAFtitle" src={IMG.fnafTitle} alt="" />

                <div className="menu-buttons" ref={buttonsRef}>
                    <img ref={selectorRef} className="menu-selector" src={IMG.selector} alt="" />

                    <button className="menu-btn menu-btn-text" onClick={onNewGame} onMouseEnter={hoverSelect}>
                        New Game
                    </button>

                    {showContinue && (
                        <div className="continue-row menu-btn" onClick={onContinue} onMouseEnter={hoverSelect}>
                            <span className="menu-btn-text" style={{ display: 'inline' }}>Continue</span>
                            <span className="continue-night">Night {nextNight}</span>
                        </div>
                    )}

                    {showCustom && (
                        <button className="menu-btn menu-btn-text" onClick={goToCustomNight} onMouseEnter={hoverSelect}>
                            Custom Night
                        </button>
                    )}

                    <button className="menu-btn menu-btn-text" onClick={goToLeaderboard} onMouseEnter={hoverSelect}>
                        Leaderboard
                    </button>

                    <button className="menu-btn menu-btn-text" onClick={onLogout} onMouseEnter={hoverSelect}>
                        Log Out
                    </button>
                </div>

                {username && <div className="menu-user">Connected as: {username}</div>}
            </div>
        </div>
    );
}
