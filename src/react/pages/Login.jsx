import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useRef } from 'react';

// ── Static assets (Vite resolves /assets/ at build time) ──────
const overlay    = '/assets/FNaF 6/night_assets/986.png';
const light_bulb = '/assets/FNaF 6/night_assets/1009.png';

// Baby table animation frames
const TABLE_FRAMES = [
  '/assets/FNaF 6/night_assets/Baby/table_baby/632.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/633.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/634.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/949.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/956.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/957.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/960.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/961.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/962.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/965.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/967.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/968.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/969_cleared.png',
];

// Baby look-up frames
const LOOK_UP_FRAMES = [
  '/assets/FNaF 6/night_assets/Baby/table_baby/970.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/971.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/972.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/973.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/983.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/984.png',
  '/assets/FNaF 6/night_assets/Baby/table_baby/985.png',
];

const LAST_FRAME    = TABLE_FRAMES.length - 1;
const FPS           = 30;
const ANIM_FPS      = 30;
const MIN_OPACITY   = 0.3;
const MAX_OPACITY   = 0.4;
const LOOK_UP_FPS   = 10;
const LOOK_UP_CHANCE = 0.01; // chance per second

const STYLES = `
  .tw-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(60,30,10,0.55);
    outline: none;
    font-family: "Courier New", Courier, monospace;
    font-size: clamp(20px, 1.1vw, 14px);
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
    font-size: clamp(20px, 0.8vw, 11px);
    color: rgba(30,15,3,0.7);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .tw-btn {
    background: transparent;
    border: 1px solid rgba(40,20,5,0.5);
    font-family: "Courier New", Courier, monospace;
    font-size: clamp(9px, 0.9vw, 13px);
    color: rgba(30,15,3,0.9);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 6px 0;
    cursor: pointer;
    width: 100%;
    margin-top: 4px;
    transition: background 0.15s;
    pointer-events: auto;
  }
  .tw-btn:hover { background: rgba(40,20,5,0.12); }
  .tw-link {
    font-size: clamp(15px, 0.72vw, 11px);
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
  .tw-divider { border: none; border-top: 1px solid rgba(40,20,5,0.18); margin: 3px 0; }
`;

export default function Login() {
  const [opacity,     setOpacity]     = useState(1);
  const [frameIndex,  setFrameIndex]  = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [fading,      setFading]      = useState(false);
  const navigate = useNavigate();

  // ── Rare Baby look-up event ───────────────────────────────────
  const [lookUpFrame,  setLookUpFrame]  = useState(null);
  const lookUpTimer  = useRef(null);
  const lookUpActive = useRef(false);
  const stateRef     = useRef('idle');
  const frameRef     = useRef(0);
  const animTimer    = useRef(null);
  const scrollLocked = useRef(false);

  function handleLogin() {
    setFading(true);
    setTimeout(() => navigate('/game'), 1200);
  }

  function goToRegister() {
    const sfx = new Audio('/assets/FNaF 6 Audio/countdown_mod.wav');
    sfx.volume = 0.9;
    sfx.play().catch(() => {});
    setFading(true);
    sfx.addEventListener('ended', () => navigate('/register'));
    setTimeout(() => navigate('/register'), 6000);
  }

  // ── Rare look-up event (same logic as original) ───────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (lookUpActive.current) return;
      if (stateRef.current !== 'idle' || frameRef.current !== 0) return;
      if (Math.random() > LOOK_UP_CHANCE) return;

      lookUpActive.current = true;

      const lookDownSeq = [
        '/assets/FNaF 6/night_assets/Baby/table_baby/984.png',
        '/assets/FNaF 6/night_assets/Baby/table_baby/983.png',
        '/assets/FNaF 6/night_assets/Baby/table_baby/973.png',
        '/assets/FNaF 6/night_assets/Baby/table_baby/972.png',
        '/assets/FNaF 6/night_assets/Baby/table_baby/971.png',
        '/assets/FNaF 6/night_assets/Baby/table_baby/970.png',
      ];

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

      function playSfxThenDown() {
        const sfx = new Audio(
          Math.random() < 0.5
            ? '/assets/FNaF 6 Audio/Shh2.mp3'
            : '/assets/FNaF 6 Audio/shouldhaveknown1.mp3'
        );
        sfx.volume = 0.1;
        sfx.addEventListener('ended', playLookDown);
        sfx.play().catch(() => setTimeout(playLookDown, 1500));
      }

      let i = 0;
      setLookUpFrame(LOOK_UP_FRAMES[0]);
      lookUpTimer.current = setInterval(() => {
        i++;
        if (i >= LOOK_UP_FRAMES.length) {
          clearInterval(lookUpTimer.current);
          lookUpTimer.current = null;
          playSfxThenDown();
          return;
        }
        setLookUpFrame(LOOK_UP_FRAMES[i]);
      }, 1000 / LOOK_UP_FPS);
    }, 1000);

    return () => {
      clearInterval(id);
      clearInterval(lookUpTimer.current);
    };
  }, []);

  // ── Opacity flicker ───────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setOpacity(MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY));
    }, 1000 / FPS);
    return () => clearInterval(id);
  }, []);

  // ── Ambient audio ─────────────────────────────────────────────
  useEffect(() => {
    const a1 = new Audio('/assets/FNaF 6 Audio/winds.mp3');
    const a2 = new Audio('/assets/FNaF 6 Audio/crickets01.mp3');
    const a3 = new Audio('/assets/FNaF 6 Audio/Swallowed By The Void.mp3');
    [a1, a2, a3].forEach(a => { a.loop = true; a.volume = 0.5; a.play().catch(() => {}); });
    return () => { [a1, a2, a3].forEach(a => { a.pause(); a.currentTime = 0; }); };
  }, []);

  // ── Animation stepper ─────────────────────────────────────────
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

  // ── Scroll handler ────────────────────────────────────────────
  useEffect(() => {
    function onWheel() {
      if (scrollLocked.current) return;
      scrollLocked.current = true;
      setTimeout(() => { scrollLocked.current = false; }, 600);
      if (stateRef.current === 'idle' || stateRef.current === 'closing') {
        stateRef.current = 'opening'; startAnim('forward');
      } else if (stateRef.current === 'open' || stateRef.current === 'opening') {
        stateRef.current = 'closing'; startAnim('backward');
      }
    }
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
      <style>{STYLES}</style>

      {/* Table frame */}
      <img src={TABLE_FRAMES[frameIndex]} style={fullCover(0)} alt="" />

      {/* Baby rare look-up */}
      {lookUpFrame && <img src={lookUpFrame} style={fullCover(0)} alt="" />}

      {/* Light bulb sliding up */}
      <img src={light_bulb} style={{
        position: 'absolute',
        top: 0, left: '50%',
        transform: `translate(-50%, calc(-50% - ${frameIndex * (100 / TABLE_FRAMES.length)}%))`,
        height: '100%', width: 'auto',
        opacity: opacity + 0.1,
        zIndex: 1, pointerEvents: 'none',
      }} alt="" />

      {/* Noise overlay */}
      <img src={overlay} style={{ ...fullCover(2), opacity: formVisible ? opacity * 0.4 : opacity }} alt="" />

      {/* Login form */}
      {formVisible && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '52%',
          width: '15%',
          transform: 'translate(-10%, 0) rotate(-2.5deg)',
          display: 'flex', flexDirection: 'column', gap: '10px',
          fontFamily: '"Courier New", Courier, monospace',
          zIndex: 10, pointerEvents: 'auto', cursor: 'auto',
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

      {/* Fade overlay */}
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

function fullCover(zIndex) {
  return {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    objectFit: 'cover',
    zIndex,
    pointerEvents: 'none',
  };
}
