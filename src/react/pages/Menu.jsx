import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FredMenu, noiseMenu, whiteMenu } from '../data/animations.js';

// ── Helper functions (identiques à Menu.html) ─────────────────

function playFreddyMenu(el, animDef) {
    if (!el || !animDef || !animDef.frames || !animDef.fps) return;
    let index = 0;
    const msPerFrame = 1000 / animDef.fps;
    function next() {
        el.src = animDef.frames[index];
        index = (index + 1) % animDef.frames.length;
        setTimeout(next, msPerFrame);
    }
    next();
}

function playNoise(el, animDef, alpha) {
    if (!el || !animDef || !animDef.frames || !animDef.fps) return;
    if (alpha !== undefined) el.style.opacity = alpha;
    let index = 0;
    const msPerFrame = 1000 / animDef.fps;
    function next() {
        el.src = animDef.frames[index];
        index = (index + 1) % animDef.frames.length;
        setTimeout(next, msPerFrame);
    }
    next();
}

function playAnimation(el, animDef, alpha) {
    if (!el || !animDef || !animDef.frames || !animDef.fps) return;
    if (alpha !== undefined) el.style.opacity = alpha;
    let index = 0;
    const msPerFrame = 1000 / animDef.fps;
    function next() {
        el.src = animDef.frames[index];
        index = (index + 1) % animDef.frames.length;
        setTimeout(next, msPerFrame);
    }
    next();
}

function fadeTo(el, from, to, duration) {
    return new Promise(resolve => {
        el.style.transition = `opacity ${duration}ms ease`;
        el.style.opacity = from;
        void el.offsetWidth; // force reflow so start value is painted
        el.style.opacity = to;
        setTimeout(resolve, duration);
    });
}

function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

export default function Menu() {
    const navigate = useNavigate();
    const animRef          = useRef(null);
    const noiseRef         = useRef(null);
    const whiteRef         = useRef(null);
    const slideRef         = useRef(null);
    const selectorRef      = useRef(null);
    const overlayRef       = useRef(null);
    const transitionImgRef = useRef(null);
    const selectedIndexRef = useRef(0);

    useEffect(() => {
        // Fade in on load
        document.body.style.opacity = '1';

        // Audio
        const a = new Audio('src/react/Assets/FNaF 1 Audio/darkness music.wav');
        const b = new Audio('src/react/Assets/FNaF 1 Audio/static2.wav');
        a.loop = true;
        b.loop = true;
        b.play()
            .then(() => console.log("Menu audio playing"))
            .catch((e) => console.error("Menu audio not found", e));
        a.play()
            .then(() => console.log("Menu audio playing"))
            .catch((e) => console.error("Menu audio not found", e));

        // Animations
        playFreddyMenu(animRef.current, FredMenu);
        playNoise(noiseRef.current, noiseMenu, 0.4);
        playNoise(noiseRef.current, noiseMenu);
        playAnimation(whiteRef.current, whiteMenu, 0.4);

        // Slide animation loop
        const slide = slideRef.current;
        function loopSlide() {
            slide.style.animation = 'none';
            void slide.offsetWidth;
            slide.style.animation = 'slideDown 10s linear forwards';
        }
        slide.addEventListener('animationend', loopSlide);

        // Selector keyboard nav
        const buttons = document.querySelectorAll('.menu-btn');

        function moveSelector(index) {
            selectedIndexRef.current = index;
            const btn = buttons[index];
            const sel = selectorRef.current;
            if (btn && sel) {
                sel.style.top = btn.offsetTop + btn.offsetHeight / 2 - sel.offsetHeight / 2 + 'px';
            }
        }

        buttons.forEach((btn, i) => {
            btn.addEventListener('mouseenter', () => moveSelector(i));
        });

        function onKeyDown(e) {
            if (e.key === 'ArrowDown') moveSelector((selectedIndexRef.current + 1) % buttons.length);
            if (e.key === 'ArrowUp') moveSelector((selectedIndexRef.current - 1 + buttons.length) % buttons.length);
            if (e.key === 'Enter') buttons[selectedIndexRef.current].click();
        }
        document.addEventListener('keydown', onKeyDown);

        moveSelector(0);

        return () => {
            slide.removeEventListener('animationend', loopSlide);
            document.removeEventListener('keydown', onKeyDown);
            a.pause();
            b.pause();
        };
    }, []);

    async function onNewGame() {
        const overlay = overlayRef.current;
        const img     = transitionImgRef.current;

        overlay.classList.add('active');

        // 1. Fade scene to black
        await fadeTo(overlay, 0, 1, 700);

        // 2. Fade in 574.png over the black
        await fadeTo(img, 0, 1, 800);

        // 3. Hold on 574.png
        await wait(3500);

        // 4. Fade 574.png back out to black
        await fadeTo(img, 1, 0, 800);

        // 5. Brief pause on black
        await wait(500);

        // 6. Navigate — mainroom will fade in on load
        navigate('/mainroom');
    }

    function onContinue() {
        console.log("CONTINUE");
    }

    return (
        <>
            <style>{`
                @keyframes slideDown {
                    from { bottom: 100%; }
                    to   { top: 90%; }
                }
                .slide {
                    position: fixed;
                    top: 5%;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 100%;
                    opacity: 0.5;
                    z-index: 5;
                    animation: slideDown 10s linear forwards;
                }
                #transition-overlay {
                    pointer-events: none;
                    position: fixed;
                    inset: 0;
                    z-index: 100;
                    background: black;
                    opacity: 0;
                    transition: opacity 0.7s ease;
                }
                #transition-img {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0;
                    transition: opacity 0.8s ease;
                }
                .menu-btn:hover { opacity: 0.7; }
            `}</style>

            <div
                style={{
                    backgroundColor: 'black',
                    margin: 0,
                    height: '100vh',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Container 16/9 centré */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '100%',
                    aspectRatio: '16/9',
                }}>
                    <img ref={animRef} id="anim"
                        src="../Assets/Menu/1.png"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, objectFit: 'contain' }}
                        alt=""
                    />
                    <img ref={noiseRef} id="animNoiseMenu"
                        src="../Assets/Menu/noise1.png"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, objectFit: 'contain' }}
                        alt=""
                    />
                    <img ref={whiteRef} id="animWhiteMenu"
                        src="../Assets/Menu/whiteNoise1.png"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 3, objectFit: 'contain' }}
                        alt=""
                    />
                    <img ref={slideRef} className="slide"
                        src="../Assets/Menu/452.png"
                        alt=""
                    />
                    <img id="title" className="FNAFtitle"
                        src="../Assets/Menu/444-trans.png"
                        style={{ position: 'absolute', top: '10%', left: '10%', width: '15%', pointerEvents: 'none', zIndex: 10, objectFit: 'contain' }}
                        alt=""
                    />

                    {/* Menu buttons */}
                    <div className="menu-buttons" style={{
                        position: 'absolute',
                        top: '50%',
                        left: '10%',
                        width: '15%',
                        height: '12%',
                        zIndex: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '60%',
                    }}>
                        <img ref={selectorRef} id="selector"
                            src="../Assets/Menu/arrow_trans.png"
                            style={{ position: 'absolute', left: '-25%', width: '20%', transition: 'top 0.1s', pointerEvents: 'none' }}
                            alt=""
                        />
                        <img className="menu-btn"
                            src="../Assets/Menu/new_game_trans.png"
                            style={{ width: '100%', cursor: 'pointer', display: 'block' }}
                            onClick={onNewGame}
                            alt="New Game"
                        />
                        <img className="menu-btn"
                            src="../Assets/Menu/continue_trans.png"
                            style={{ width: '100%', cursor: 'pointer', display: 'block' }}
                            onClick={onContinue}
                            alt="Continue"
                        />
                    </div>
                </div>

                {/* Full-screen transition overlay */}
                <div id="transition-overlay" ref={overlayRef}>
                    <img ref={transitionImgRef} id="transition-img" src="../Assets/Menu/574.png" alt="" />
                </div>
            </div>
        </>
    );
}
