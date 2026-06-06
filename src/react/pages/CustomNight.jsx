import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IMG, AUDIO, NOISE_MENU, WHITE_MENU, GOLDEN_FREDDY_JUMPSCARE, ensureFnafFont,
} from '../lib/menuAssets.js';
import {
    runNoise, runAnimation, useFramePlayer, useSlideLoop, useLoopAudio, tvStatic,
} from '../lib/fnafFx.jsx';

const STYLES = `
.cn-root { background:#000; margin:0; height:100vh; width:100vw; position:relative; overflow:hidden; }
.cn-container { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:100%; aspect-ratio:16/9; }
.cn-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:1; filter:brightness(0.5); }
.cn-noise, .cn-white { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; pointer-events:none; }
.cn-noise { z-index:20; } .cn-white { z-index:21; }
.cn-slide { position:fixed; top:5%; left:50%; transform:translateX(-50%); width:100%; opacity:0.5; z-index:22; animation:slideDown 10s linear forwards; }
@keyframes slideDown { from { top:-100%; } to { top:90%; } }
.cn-title { position:absolute; top:7%; left:50%; transform:translateX(-50%); z-index:25; font-family:'FNAF',monospace; font-size:4vw; color:#fff; text-shadow:2px 2px 12px rgba(0,0,0,0.95); white-space:nowrap; pointer-events:none; }
.cn-back { position:absolute; top:3%; left:3%; z-index:30; font-family:'FNAF',monospace; font-size:clamp(12px,1.4vw,20px); color:#fff; background:none; border:none; cursor:pointer; letter-spacing:0.05em; text-shadow:1px 1px 6px rgba(0,0,0,0.9); white-space:nowrap; }
.cn-back:hover { opacity:0.7; }
.cn-main { position:absolute; top:17%; left:50%; transform:translateX(-50%); z-index:25; display:flex; flex-direction:column; align-items:flex-start; gap:clamp(10px,2vh,24px); }
.cn-animatronics { display:flex; gap:clamp(20px,4vw,60px); align-items:flex-start; }
.cn-card { display:flex; flex-direction:column; align-items:center; gap:clamp(6px,0.8vh,12px); }
.cn-card-name { font-family:'FNAF',monospace; font-size:clamp(12px,2vw,28px); color:#fff; letter-spacing:0.06em; text-shadow:1px 1px 6px rgba(0,0,0,0.9); }
.cn-portrait { width:clamp(80px,13vw,190px); height:clamp(80px,13vw,190px); object-fit:cover; border:2px solid rgba(255,255,255,0.15); }
.cn-ai-label { font-family:'FNAF',monospace; font-size:clamp(9px,1.3vw,18px); color:#fff; letter-spacing:0.06em; margin-top:4px; text-shadow:1px 1px 6px rgba(0,0,0,0.9); }
.cn-ai-control { display:flex; align-items:center; gap:clamp(10px,1.5vw,24px); }
.cn-ai-btn { font-family:'FNAF',monospace; font-size:clamp(14px,2.2vw,32px); color:#fff; background:none; border:none; cursor:pointer; line-height:1; padding:0 4px; user-select:none; text-shadow:1px 1px 6px rgba(0,0,0,0.9); }
.cn-ai-btn:hover { opacity:0.6; } .cn-ai-btn:active { transform:scale(0.9); }
.cn-ai-value { font-family:'FNAF',monospace; font-size:clamp(14px,2.4vw,34px); color:#fff; min-width:2ch; text-align:center; text-shadow:1px 1px 6px rgba(0,0,0,0.9); }
.cn-legend { font-family:'FNAF',monospace; font-size:clamp(28px,4vw,54px); color:rgba(255,255,255,0.65); letter-spacing:0.06em; white-space:nowrap; text-shadow:1px 1px 6px rgba(0,0,0,0.9); }
.cn-ready { position:absolute; bottom:6%; right:4%; z-index:25; font-family:'FNAF',monospace; font-size:clamp(12px,2vw,28px); color:#111; background:#fff; border:none; padding:0.4em 1em; cursor:pointer; letter-spacing:0.1em; }
.cn-ready:hover { background:#ccc; } .cn-ready:active { transform:scale(0.97); }
`;

const CARDS = [
    { key: 'freddy', name: 'Freddy', icon: IMG.iconFreddy },
    { key: 'bonnie', name: 'Bonnie', icon: IMG.iconBonnie },
    { key: 'chica',  name: 'Chica',  icon: IMG.iconChica },
    { key: 'foxy',   name: 'Foxy',   icon: IMG.iconFoxy },
];

export default function CustomNight() {
    const navigate = useNavigate();
    const noiseRef = useRef(null);
    const whiteRef = useRef(null);
    const slideRef = useRef(null);
    const [visible, setVisible] = useState(false);
    const [levels, setLevels] = useState({ freddy: 0, bonnie: 0, chica: 0, foxy: 0 });

    useFramePlayer(noiseRef, runNoise, NOISE_MENU);
    useFramePlayer(whiteRef, runAnimation, WHITE_MENU, 0.4);
    useSlideLoop(slideRef);
    const audioRef = useLoopAudio([AUDIO.static2, AUDIO.unraveled]);

    useEffect(() => {
        ensureFnafFont();
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    function change(name, delta) {
        setLevels(prev => ({ ...prev, [name]: Math.max(0, Math.min(20, prev[name] + delta)) }));
    }

    function goToMenu() {
        tvStatic(AUDIO.camera, () => navigate('/menu'));
    }

    function startNight() {
        // 1-9-8-7 easter egg — Golden Freddy
        if (levels.freddy === 1 && levels.bonnie === 9 && levels.chica === 8 && levels.foxy === 7) {
            triggerGoldenFreddy();
            return;
        }
        sessionStorage.setItem('__customNight', JSON.stringify(levels));
        tvStatic(AUDIO.camera, () => { window.location.href = '/mainroom'; });
    }

    function triggerGoldenFreddy() {
        audioRef.current.forEach(a => { a.pause(); a.currentTime = 0; });

        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9999;';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const sfx = new Audio(AUDIO.xscream);
        sfx.play().catch(() => {});

        const frames = GOLDEN_FREDDY_JUMPSCARE.frames.map(src => { const img = new Image(); img.src = src; return img; });
        const msPerFrame = 1000 / GOLDEN_FREDDY_JUMPSCARE.fps;
        let frameIdx = 0;
        const nextFrame = () => {
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
        };
        nextFrame();
        setTimeout(() => navigate('/menu'), 2000);
    }

    return (
        <div className="cn-root" style={{ opacity: visible ? 1 : 0, transition: 'opacity 1s' }}>
            <style>{STYLES}</style>

            <div className="cn-container">
                <img className="cn-bg" src={IMG.chicaMenu} alt="" />
                <img ref={noiseRef} className="cn-noise" src={IMG.staticNoise1} alt="" />
                <img ref={whiteRef} className="cn-white" src={IMG.whiteNoise1} alt="" />
                <img ref={slideRef} className="cn-slide" src={IMG.slide} alt="" />

                <div className="cn-title">Customize Night</div>

                <div className="cn-main">
                    <div className="cn-animatronics">
                        {CARDS.map(c => (
                            <div className="cn-card" key={c.key}>
                                <span className="cn-card-name">{c.name}</span>
                                <img className="cn-portrait" src={c.icon} alt={c.name} />
                                <span className="cn-ai-label">A.I. Level</span>
                                <div className="cn-ai-control">
                                    <button className="cn-ai-btn" onClick={() => change(c.key, -1)}>&#60;</button>
                                    <span className="cn-ai-value">{levels[c.key]}</span>
                                    <button className="cn-ai-btn" onClick={() => change(c.key, 1)}>&#62;</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="cn-legend">(0-2)easy &nbsp; (3-6)med &nbsp; (7-12)hard &nbsp; (12+)extreme</div>
                </div>

                <button className="cn-ready" onClick={startNight}>READY</button>

                <button className="cn-back" onClick={goToMenu}>Back to Menu</button>
            </div>
        </div>
    );
}
