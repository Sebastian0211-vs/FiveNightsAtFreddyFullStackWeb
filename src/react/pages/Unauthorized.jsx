import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IMG, AUDIO, GOLDEN_FREDDY_JUMPSCARE, ensureFnafFont } from '../lib/menuAssets.js';

const SCARE_AT = 7000;
const REDIRECT_AT = 10000;

// Ported from src/pages/Unauthorized.html — golden-freddy scare then redirect.
export default function Unauthorized() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const [visible, setVisible] = useState(false);
    const [uiVisible, setUiVisible] = useState(true);
    const [remaining, setRemaining] = useState(Math.round(REDIRECT_AT / 1000));

    useEffect(() => {
        ensureFnafFont();
        const fadeId = requestAnimationFrame(() => setVisible(true));

        const countId = setInterval(() => {
            setRemaining(r => (r > 1 ? r - 1 : r));
        }, 1000);

        const scareTimer = setTimeout(() => {
            setUiVisible(false);
            runJumpscare(GOLDEN_FREDDY_JUMPSCARE, AUDIO.xscream, 1000);
        }, SCARE_AT);

        const redirectTimer = setTimeout(() => navigate('/login'), REDIRECT_AT);

        return () => {
            cancelAnimationFrame(fadeId);
            clearInterval(countId);
            clearTimeout(scareTimer);
            clearTimeout(redirectTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function runJumpscare(def, sfxSrc, maxDurationMs) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.display = 'block';

        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        const sfx = new Audio(sfxSrc);
        sfx.currentTime = 0;
        sfx.play().catch(() => {});

        const msPerFrame = 1000 / def.fps;
        let finished = false;
        const frames = def.frames.map(src => { const img = new Image(); img.src = src; return img; });

        const finish = () => { if (finished) return; finished = true; sfx.pause(); };
        if (maxDurationMs != null) setTimeout(finish, maxDurationMs);

        let frameIdx = 0;
        const nextFrame = () => {
            if (finished) return;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);
            const img = frames[frameIdx];
            if (img.naturalWidth) {
                const sc = Math.max(W / img.naturalWidth, H / img.naturalHeight);
                const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
                ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
            }
            frameIdx++;
            if (frameIdx < frames.length) setTimeout(nextFrame, msPerFrame);
            else finish();
        };
        nextFrame();
    }

    return (
        <div style={{
            background: '#000', width: '100vw', height: '100vh', overflow: 'hidden',
            opacity: visible ? 1 : 0, transition: 'opacity 1.2s', position: 'fixed', inset: 0,
        }}>
            <canvas ref={canvasRef} style={{
                position: 'fixed', inset: 0, width: '100%', height: '100%',
                zIndex: 50, display: 'none',
            }} />

            {uiVisible && (
                <div style={{
                    position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', zIndex: 10,
                }}>
                    <img src={IMG.goldenFreddy} alt="" style={{
                        width: 'clamp(200px, 28vw, 420px)', objectFit: 'contain',
                        opacity: 0.55, filter: 'brightness(0.8)',
                    }} />
                    <p style={{
                        fontFamily: "'FNAF', monospace", color: '#fff',
                        fontSize: 'clamp(18px, 2.5vw, 36px)', letterSpacing: '0.1em',
                        textAlign: 'center', marginTop: 40, textShadow: '0 0 18px rgba(255,255,255,0.25)',
                    }}>Unauthorized Entry</p>
                    <p style={{
                        fontFamily: "'FNAF', monospace", color: 'rgba(255,255,255,0.4)',
                        fontSize: 'clamp(10px, 1.1vw, 16px)', letterSpacing: '0.12em', marginTop: 16,
                    }}>Redirecting to login in {remaining}s...</p>
                </div>
            )}
        </div>
    );
}
