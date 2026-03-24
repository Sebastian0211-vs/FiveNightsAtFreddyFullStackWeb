import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Inline animation sequences ────────────────────────────────

const NOISE_FRAMES = [
  '/assets/menu/staticNoise1.png', '/assets/menu/staticNoise2.png',
  '/assets/menu/staticNoise3.png', '/assets/menu/staticNoise4.png',
  '/assets/menu/staticNoise5.png', '/assets/menu/staticNoise6.png',
  '/assets/menu/staticNoise7.png', '/assets/menu/staticNoise8.png',
];

const WHITE_FRAMES = [
  '/assets/menu/whiteNoise1.png', '/assets/menu/whiteNoise2.png',
  '/assets/menu/empty.png', '/assets/menu/empty.png',
  '/assets/menu/empty.png', '/assets/menu/empty.png',
  '/assets/menu/empty.png', '/assets/menu/empty.png',
  '/assets/menu/whiteNoise2.png', '/assets/menu/whiteNoise3.png',
  '/assets/menu/empty.png', '/assets/menu/empty.png',
  '/assets/menu/whiteNoise4.png', '/assets/menu/whiteNoise5.png',
  '/assets/menu/empty.png', '/assets/menu/empty.png',
  '/assets/menu/empty.png', '/assets/menu/whiteNoise6.png',
  '/assets/menu/whiteNoise7.png', '/assets/menu/empty.png',
  '/assets/menu/whiteNoise7.png', '/assets/menu/whiteNoise8.png',
  '/assets/menu/whiteNoise9.png', '/assets/menu/empty.png',
  '/assets/menu/empty.png', '/assets/menu/whiteNoise10.png',
  '/assets/menu/whiteNoise11.png', '/assets/menu/whiteNoise12.png',
  '/assets/menu/empty.png', '/assets/menu/empty.png',
  '/assets/menu/empty.png', '/assets/menu/empty.png',
  '/assets/menu/whiteNoise13.png', '/assets/menu/whiteNoise14.png',
  '/assets/menu/empty.png', '/assets/menu/empty.png',
  '/assets/menu/empty.png', '/assets/menu/empty.png',
  '/assets/menu/empty.png', '/assets/menu/empty.png',
  '/assets/menu/empty.png', '/assets/menu/empty.png',
  '/assets/menu/empty.png', '/assets/menu/whiteNoise16.png',
];

// Freddy blink / surprise animation
const FREDDY_RANDOM = [
  '/assets/menu/1.png', '/assets/menu/2.png',
  '/assets/menu/3.png', '/assets/menu/4.png',
];

// ── useAnimLoop hook ──────────────────────────────────────────

function useAnimLoop(frames, fps, enabled = true) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setIndex(i => (i + 1) % frames.length), 1000 / fps);
    return () => clearInterval(id);
  }, [frames.length, fps, enabled]);
  return index;
}

// ── Freddy random blinking ────────────────────────────────────
function useFreddyRandom() {
  const [src, setSrc] = useState(FREDDY_RANDOM[0]);
  useEffect(() => {
    const id = setInterval(() => {
      const roll = Math.floor(Math.random() * 100);
      if      (roll === 97) setSrc(FREDDY_RANDOM[1]);
      else if (roll === 98) setSrc(FREDDY_RANDOM[2]);
      else if (roll === 99) setSrc(FREDDY_RANDOM[3]);
      else                  setSrc(FREDDY_RANDOM[0]);
    }, 100);
    return () => clearInterval(id);
  }, []);
  return src;
}

// ── Noise opacity flicker ─────────────────────────────────────
function useNoiseOpacity() {
  const [opacity, setOpacity] = useState(0.4);
  useEffect(() => {
    const b = { v: Math.floor(Math.random() * 3) };
    const bId = setInterval(() => { b.v = Math.floor(Math.random() * 3); }, 1000);
    const oId = setInterval(() => {
      setOpacity(((150 + Math.random() * 50 + b.v * 15) / 245) * 0.7);
    }, 1000 / 30);
    return () => { clearInterval(bId); clearInterval(oId); };
  }, []);
  return opacity;
}

// ── Slide loop ────────────────────────────────────────────────
function SlideImg() {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const el = document.getElementById('menu-slide');
    if (!el) return;
    const onEnd = () => setKey(k => k + 1);
    el.addEventListener('animationend', onEnd);
    return () => el.removeEventListener('animationend', onEnd);
  }, []);
  return (
    <img
      key={key}
      id="menu-slide"
      src="/assets/menu/452.png"
      alt=""
      style={{
        position: 'fixed',
        top: '5%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        opacity: 0.5,
        zIndex: 5,
        pointerEvents: 'none',
        animation: 'slideDown 10s linear forwards',
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────
export default function Menu() {
  const [visible, setVisible] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [transImgVisible, setTransImgVisible] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const navigate = useNavigate();

  const freddySrc    = useFreddyRandom();
  const noiseIdx     = useAnimLoop(NOISE_FRAMES, 30);
  const whiteIdx     = useAnimLoop(WHITE_FRAMES, 5);
  const noiseOpacity = useNoiseOpacity();

  // Start audio on mount
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    const a = new Audio('/assets/FNaF 1 Audio/darkness music.wav');
    const b = new Audio('/assets/FNaF 1 Audio/static2.wav');
    a.loop = true; b.loop = true;
    a.volume = 0.6; b.volume = 0.3;
    a.play().catch(() => {});
    b.play().catch(() => {});
    return () => { a.pause(); b.pause(); };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowDown') setSelectedIdx(i => (i + 1) % 2);
      if (e.key === 'ArrowUp')   setSelectedIdx(i => (i - 1 + 2) % 2);
      if (e.key === 'Enter') {
        if (selectedIdx === 0) onNewGame();
        if (selectedIdx === 1) onContinue();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIdx]);

  async function onNewGame() {
    if (transitioning) return;
    setTransitioning(true);
    setOverlayVisible(true);
    await wait(700);
    setTransImgVisible(true);
    await wait(3500);
    setTransImgVisible(false);
    await wait(800);
    navigate('/game');
  }

  function onContinue() { console.log('Continue'); }

  function goToLogin() {
    setOverlayVisible(true);
    setTimeout(() => navigate('/login'), 800);
  }

  // Selector Y position
  const BTN_Y = [175, 265]; // approximate % of container
  const selectorY = BTN_Y[selectedIdx];

  return (
    <div style={{ background: '#000', width: '100vw', height: '100vh',
                  overflow: 'hidden', position: 'relative',
                  opacity: visible ? 1 : 0, transition: 'opacity 1s' }}>

      <style>{`
        @font-face {
          font-family: 'FNAF';
          src: url('/assets/Fonts/five-nights-at-freddys.otf') format('opentype');
        }
        @keyframes slideDown {
          from { top: -100%; }
          to   { top: 90%;   }
        }
      `}</style>

      {/* Slide decor */}
      <SlideImg />

      {/* Container centered */}
      <div style={containerStyle}>
        {/* Freddy base */}
        <img src={freddySrc} alt="" style={layerStyle(1)} />
        {/* Noise overlay */}
        <img src={NOISE_FRAMES[noiseIdx]} alt=""
             style={{ ...layerStyle(2), opacity: noiseOpacity, mixBlendMode: 'screen' }} />
        {/* White noise */}
        <img src={WHITE_FRAMES[whiteIdx]} alt=""
             style={{ ...layerStyle(3), opacity: 0.4 }} />
        {/* Title */}
        <img src="/assets/menu/444-trans.png" alt="FNAF"
             style={{ position: 'absolute', top: '10%', left: '10%', width: '15%',
                      pointerEvents: 'none', zIndex: 10, objectFit: 'contain' }} />

        {/* Menu buttons */}
        <div style={{ position: 'absolute', top: '50%', left: '10%',
                      width: '15%', zIndex: 20, userSelect: 'none' }}>

          {/* Selector arrow */}
          <img src="/assets/menu/arrow_trans.png" alt=""
               style={{ position: 'absolute', left: '-25%', width: '20%',
                        top: selectorY + 'px',
                        transition: 'top 0.1s', pointerEvents: 'none' }} />

          <img src="/assets/menu/new_game_trans.png" alt="New Game"
               onClick={onNewGame}
               onMouseEnter={() => setSelectedIdx(0)}
               style={{ ...btnStyle, marginBottom: '60%',
                        opacity: selectedIdx === 0 ? 1 : 0.75 }} />

          <img src="/assets/menu/continue_trans.png" alt="Continue"
               onClick={onContinue}
               onMouseEnter={() => setSelectedIdx(1)}
               style={{ ...btnStyle,
                        opacity: selectedIdx === 1 ? 1 : 0.75 }} />
        </div>
      </div>

      {/* Employee login — bottom right */}
      <button onClick={goToLogin} style={loginBtnStyle}>
        Employee Login
      </button>

      {/* Transition overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: '#000',
        opacity: overlayVisible ? 1 : 0,
        transition: 'opacity 0.7s ease',
        pointerEvents: overlayVisible ? 'all' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src="/assets/Menu/574.png" alt=""
             style={{ width: '100%', height: '100%', objectFit: 'cover',
                      opacity: transImgVisible ? 1 : 0,
                      transition: 'opacity 0.8s ease' }} />
      </div>
    </div>
  );
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

const containerStyle = {
  position: 'absolute',
  top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '100%',
  aspectRatio: '16/9',
};

const layerStyle = (z) => ({
  position: 'absolute', inset: 0,
  width: '100%', height: '100%',
  objectFit: 'contain',
  pointerEvents: 'none',
  zIndex: z,
});

const btnStyle = {
  width: '100%',
  cursor: 'pointer',
  display: 'block',
  transition: 'opacity 0.15s',
};

const loginBtnStyle = {
  position: 'fixed',
  bottom: 28, right: 36,
  zIndex: 50,
  fontFamily: "'FNAF', 'Courier New', monospace",
  fontSize: 'clamp(9px, 1.1vw, 13px)',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'rgba(200,160,120,0.65)',
  background: 'transparent',
  border: '1px solid rgba(180,120,60,0.3)',
  padding: '8px 18px',
  cursor: 'pointer',
  transition: 'color 0.25s, border-color 0.25s',
};
