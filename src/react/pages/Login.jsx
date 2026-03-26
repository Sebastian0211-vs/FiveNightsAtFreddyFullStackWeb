import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useRef } from 'react';
import overlay      from '../../../assets/FNaF 6/night_assets/986.png';
import light_bulb   from '../../../assets/FNaF 6/night_assets/1009.png';
import frame_969c   from '../../../assets/FNaF 6/night_assets/Baby/table_baby/969_cleared.png';
import frame_970    from '../../../assets/FNaF 6/night_assets/Baby/table_baby/970.png';
import frame_971    from '../../../assets/FNaF 6/night_assets/Baby/table_baby/971.png';
import frame_972    from '../../../assets/FNaF 6/night_assets/Baby/table_baby/972.png';
import frame_973    from '../../../assets/FNaF 6/night_assets/Baby/table_baby/973.png';
import frame_983    from '../../../assets/FNaF 6/night_assets/Baby/table_baby/983.png';
import frame_984    from '../../../assets/FNaF 6/night_assets/Baby/table_baby/984.png';
import frame_985    from '../../../assets/FNaF 6/night_assets/Baby/table_baby/985.png';
import shh2              from '../../../assets/FNaF 6 Audio/Shh2.mp3';
import shouldhaveknown1  from '../../../assets/FNaF 6 Audio/shouldhaveknown1.mp3';

import winds        from '../../../assets/FNaF 6 Audio/winds.mp3';
import crickets     from '../../../assets/FNaF 6 Audio/crickets01.mp3';
import swallow_void from '../../../assets/FNaF 6 Audio/Swallowed By The Void.mp3';
import countdown    from '../../../assets/FNaF 6 Audio/countdown_mod.wav';

const TABLE_FRAMES = [
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/632.png',
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/633.png',
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/634.png',
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/949.png',
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/956.png',
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/957.png',
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/960.png',
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/961.png',
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/962.png',
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/965.png',
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/967.png',
    '../../../assets/FNaF 6/night_assets/Baby/table_baby/968.png',
    frame_969c,
];

const LAST_FRAME  = TABLE_FRAMES.length - 1;
const FPS         = 30;
const ANIM_FPS    = 30;
const MIN_OPACITY = 0.3;
const MAX_OPACITY = 0.4;

// Baby look-up sequence (plays over frame 0 when idle, rare event)
const LOOK_UP_FRAMES = [frame_970, frame_971, frame_972, frame_973, frame_983, frame_984, frame_985];
const LOOK_UP_FPS    = 10;
const LOOK_UP_CHANCE = 0.01;

// Minimum swipe distance in px to trigger the animation
const SWIPE_THRESHOLD = 40;

TABLE_FRAMES.slice(0, -1).forEach(src => { const i = new Image(); i.src = src; });


const STYLES = `
    .tw-input {
        background: transparent;
        border: none;
        border-bottom: 1px solid rgba(60,30,10,0.55);
        outline: none;
        font-family: "Courier New", Courier, monospace;
        font-size: clamp(12px, 1vw + 0.5vh, 18px);
        color: rgba(30, 15, 3, 0.95);
        width: 100%;
        padding: 3px 0;
        caret-color: rgba(40,20,5,0.9);
        pointer-events: auto;
        position: relative;
        z-index: 20;
    }
    .tw-input::placeholder { color: rgba(60,30,10,0.35); }
    .tw-label {
        font-size: clamp(1vw, 0.8vw, 1vw);
        color: rgba(30,15,3,0.7);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        margin-bottom: 0.1vw;
    }
    .tw-btn {
        background: transparent;
        border: 0.05vw solid rgba(40,20,5,0.5);
        font-family: "Courier New", Courier, monospace;
        font-size: clamp(0.5vw, 0.9vw, 1vw);
        color: rgba(30,15,3,0.9);
        letter-spacing: 0.15em;
        text-transform: uppercase;
        padding: 0.5vw 0;
        cursor: pointer;
        width: 100%;
        margin-top: 05.vw;
        transition: background 0.15s;
        pointer-events: auto;
    }
    .tw-btn:hover { background: rgba(40,20,5,0.12); }
    .tw-link {
        font-size: clamp(1vw, 0.72vw, 0.5vw);
        color: rgba(40,20,5,0.55);
        letter-spacing: 0.08em;
        text-align: center;
        cursor: pointer;
        text-decoration: underline;
        background: none;
        border: none;
        font-family: "Courier New", Courier, monospace;
        pointer-events: auto;
    }
    .tw-link:hover { color: rgba(40,20,5,0.9); }
    .tw-link.register { color: rgba(140,20,10,0.8); }
    .tw-link.register:hover { color: rgba(190,30,10,1); }
    .tw-divider { border: none; border-top: 0.05vw solid rgba(40,20,5,0.18); margin: 0.15vw 0; }
`;

export default function Login() {
    const [opacity,     setOpacity]     = useState(1);
    const [frameIndex,  setFrameIndex]  = useState(0);
    const [formVisible, setFormVisible] = useState(false);
    const [fading, setFading]           = useState(false);
    const navigate = useNavigate();

    function handleLogin() {
        setFading(true);
        setTimeout(() => navigate('/game'), 1200);
    }

    function goToRegister() {
        const sfx = new Audio(countdown);
        sfx.volume = 0.9;
        sfx.play().catch(() => {});
        setFading(true);
        sfx.addEventListener('ended', () => navigate('/register'));
        setTimeout(() => navigate('/register'), 6000);
    }

    const stateRef     = useRef('idle');
    const frameRef     = useRef(0);
    const animTimer    = useRef(null);
    const scrollLocked = useRef(false);
    const touchStartY  = useRef(null);

    // ── Rare look-up event ────────────────────────────────────
    const [lookUpFrame,   setLookUpFrame]   = useState(null);
    const lookUpTimer  = useRef(null);
    const lookUpActive = useRef(false);

    useEffect(() => {
        const id = setInterval(() => {
            if (lookUpActive.current) return;
            if (stateRef.current !== 'idle' || frameRef.current !== 0) return;
            if (Math.random() > LOOK_UP_CHANCE) return;

            lookUpActive.current = true;

            const lookUpSeq   = [frame_970, frame_971, frame_972, frame_973, frame_983, frame_984, frame_985];
            const lookDownSeq = [frame_984, frame_983, frame_973, frame_972, frame_971, frame_970];

            // Phase 3 — look down, then back to 632
            function playLookDown() {
                let i = 0;
                lookUpTimer.current = setInterval(() => {
                    setLookUpFrame(lookDownSeq[i]);
                    i++;
                    if (i >= lookDownSeq.length) {
                        clearInterval(lookUpTimer.current);
                        lookUpTimer.current = null;
                        setLookUpFrame(null);
                        lookUpActive.current = false;
                    }
                }, 1000 / LOOK_UP_FPS);
            }

            // Phase 2 — play SFX, hold on last frame until it ends
            function playSfxThenDown() {
                const sfx = new Audio(Math.random() < 0.5 ? shh2 : shouldhaveknown1);
                sfx.volume = 0.1;
                sfx.addEventListener('ended', playLookDown);
                sfx.play().catch(() => setTimeout(playLookDown, 1500));
            }

            // Phase 1 — look up frame by frame, then hand off to SFX
            let i = 0;
            setLookUpFrame(lookUpSeq[0]);
            lookUpTimer.current = setInterval(() => {
                i++;
                if (i >= lookUpSeq.length) {
                    clearInterval(lookUpTimer.current);
                    lookUpTimer.current = null;
                    playSfxThenDown();
                    return;
                }
                setLookUpFrame(lookUpSeq[i]);
            }, 1000 / LOOK_UP_FPS);

        }, 1000);

        return () => {
            clearInterval(id);
            clearInterval(lookUpTimer.current);
        };
    }, []);

    // ── Flicker ───────────────────────────────────────────────
    useEffect(() => {
        const id = setInterval(() => {
            setOpacity(MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY));
        }, 1000 / FPS);
        return () => clearInterval(id);
    }, []);

    // ── Audio ─────────────────────────────────────────────────
    useEffect(() => {
        const a1 = new Audio(winds);
        const a2 = new Audio(crickets);
        const a3 = new Audio(swallow_void);
        [a1, a2, a3].forEach(a => { a.loop = true; a.volume = 0.5; a.play().catch(() => {}); });
        return () => { [a1, a2, a3].forEach(a => { a.pause(); a.currentTime = 0; }); };
    }, []);

    // ── Animation stepper ────────────────────────────────────
    function stepForward() {
        if (frameRef.current >= LAST_FRAME) {
            stateRef.current = 'open';
            clearInterval(animTimer.current);
            animTimer.current = null;
            setFormVisible(true);
            return;
        }
        frameRef.current++;
        setFrameIndex(frameRef.current);
    }

    function stepBackward() {
        setFormVisible(false);
        if (frameRef.current <= 0) {
            stateRef.current = 'idle';
            clearInterval(animTimer.current);
            animTimer.current = null;
            return;
        }
        frameRef.current--;
        setFrameIndex(frameRef.current);
    }

    function startAnim(dir) {
        if (animTimer.current) clearInterval(animTimer.current);
        animTimer.current = setInterval(
            dir === 'forward' ? stepForward : stepBackward,
            1000 / ANIM_FPS
        );
    }

    // ── Shared trigger (used by both wheel and swipe) ─────────
    function triggerScroll(directionUp) {
        if (lookUpActive.current) {
            clearInterval(lookUpTimer.current);
            lookUpTimer.current = null;
            setLookUpFrame(null);
            lookUpActive.current = false;
        }

        if (scrollLocked.current) return;
        scrollLocked.current = true;
        setTimeout(() => { scrollLocked.current = false; }, 3000);

        if (directionUp) {
            // swipe up = scroll up = open
            if (stateRef.current === 'idle' || stateRef.current === 'closing') {
                stateRef.current = 'opening'; startAnim('forward');
            }
        } else {
            // swipe down = scroll down = close
            if (stateRef.current === 'open' || stateRef.current === 'opening') {
                stateRef.current = 'closing'; startAnim('backward');
            }
        }
    }

    // ── Scroll (mouse wheel) ──────────────────────────────────
    useEffect(() => {
        function onWheel(e) {
            // deltaY > 0 = scrolling down = opening (moving up toward camera)
            triggerScroll(e.deltaY > 0);
        }
        window.addEventListener('wheel', onWheel, { passive: true });
        return () => window.removeEventListener('wheel', onWheel);
    }, []);

    // ── Touch (mobile swipe) ──────────────────────────────────
    useEffect(() => {
        function onTouchStart(e) {
            touchStartY.current = e.touches[0].clientY;
        }

        function onTouchEnd(e) {
            if (touchStartY.current === null) return;
            const deltaY = touchStartY.current - e.changedTouches[0].clientY;
            touchStartY.current = null;

            if (Math.abs(deltaY) < SWIPE_THRESHOLD) return;

            // Cancel look-up if active
            if (lookUpActive.current) {
                clearInterval(lookUpTimer.current);
                lookUpTimer.current = null;
                setLookUpFrame(null);
                lookUpActive.current = false;
            }

            if (scrollLocked.current) return;
            scrollLocked.current = true;
            setTimeout(() => { scrollLocked.current = false; }, 3000);

            const swipingUp = deltaY > 0; // finger moved up = open
            if (swipingUp) {
                if (stateRef.current === 'idle' || stateRef.current === 'closing') {
                    stateRef.current = 'opening'; startAnim('forward');
                }
            } else {
                if (stateRef.current === 'open' || stateRef.current === 'opening') {
                    stateRef.current = 'closing'; startAnim('backward');
                }
            }
        }

        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchend',   onTouchEnd,   { passive: true });
        return () => {
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchend',   onTouchEnd);
        };
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
            <style>{STYLES}</style>

            {/* z-index 0 — table frame */}
            <img src={TABLE_FRAMES[frameIndex]} style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                zIndex: 0, pointerEvents: 'none',
            }} />

            {/* z-index 0 — Baby look-up rare event */}
            {lookUpFrame && (
                <img src={lookUpFrame} style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    zIndex: 0, pointerEvents: 'none',
                }} />
            )}

            {/* z-index 1 — light bulb sliding up */}
            <img src={light_bulb} style={{
                position: 'absolute',
                top: 0, left: '50%',
                transform: `translate(-50%, calc(-50% - ${frameIndex * (100 / TABLE_FRAMES.length)}%))`,
                height: '100%', width: 'auto',
                opacity: opacity + 0.1,
                zIndex: 1, pointerEvents: 'none',
            }} />

            {/* z-index 2 — flickering 986 overlay */}
            <img src={overlay} style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                opacity: formVisible ? opacity * 0.4 : opacity,
                zIndex: 2, pointerEvents: 'none',
            }} />



            {/* z-index 10 — login form on the paper */}
            {formVisible && (
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '52%',
                    width: '15%',
                    transform: 'translate(-10%, 0) rotate(-2.5deg)',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    fontFamily: '"Courier New", Courier, monospace',
                    zIndex: 10,
                    pointerEvents: 'auto',
                    cursor: 'auto',
                }}>
                    <div>
                        <div className="tw-label">Username</div>
                        <input className="tw-input" type="text" placeholder="_ _ _ _ _ _ _" />
                    </div>
                    <div>
                        <div className="tw-label">Password</div>
                        <input className="tw-input" type="password" placeholder="* * * * * * *" />
                    </div>
                    <button className="tw-btn" onClick={handleLogin}>[ Connect ]</button>
                    <hr className="tw-divider" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <button className="tw-link">Forgot my password</button>
                        <button className="tw-link register" onClick={goToRegister}>Create an account</button>
                    </div>
                </div>
            )}

            {/* Fade to black overlay */}
            <div style={{
                position: 'fixed', inset: 0,
                background: '#000',
                opacity: fading ? 1 : 0,
                transition: 'opacity 1s ease',
                pointerEvents: fading ? 'all' : 'none',
                zIndex: 999,
            }} />

        </div>
    );
}