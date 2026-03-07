import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Static assets ─────────────────────────────────────────────
import overlay    from '../../../assets/FNaF 6/night_assets/986.png';
import light_bulb from '../../../assets/FNaF 6/night_assets/1009.png';
import hint_open  from '../../../assets/FNaF 6/night_assets/1998.png';
import hint_close from '../../../assets/FNaF 6/night_assets/1999.png';
import paper_blur from '../../../assets/FNaF 6/night_assets/1439.png';
import paper_idle from '../../../assets/FNaF 6/night_assets/1438_cleared.png';
import taser      from '../../../assets/FNaF 6/night_assets/1442.png';

// ── Afton idle poses ──────────────────────────────────────────
import a_idle_0 from '../../../assets/FNaF 6/night_assets/Afton/1423.png';
import a_idle_1 from '../../../assets/FNaF 6/night_assets/Afton/1430.png';
import a_idle_2 from '../../../assets/FNaF 6/night_assets/Afton/1431.png';

// ── Afton jumpscare frames ────────────────────────────────────
import a_js_0  from '../../../assets/FNaF 6/night_assets/Afton/1499.png';
import a_js_1  from '../../../assets/FNaF 6/night_assets/Afton/1500.png';
import a_js_2  from '../../../assets/FNaF 6/night_assets/Afton/1501.png';
import a_js_3  from '../../../assets/FNaF 6/night_assets/Afton/1502.png';
import a_js_4  from '../../../assets/FNaF 6/night_assets/Afton/1503.png';
import a_js_5  from '../../../assets/FNaF 6/night_assets/Afton/1504.png';
import a_js_6  from '../../../assets/FNaF 6/night_assets/Afton/1505.png';
import a_js_7  from '../../../assets/FNaF 6/night_assets/Afton/1507.png';
import a_js_8  from '../../../assets/FNaF 6/night_assets/Afton/1508.png';
import a_js_9  from '../../../assets/FNaF 6/night_assets/Afton/1509.png';
import a_js_10 from '../../../assets/FNaF 6/night_assets/Afton/1510.png';
import a_js_11 from '../../../assets/FNaF 6/night_assets/Afton/1511.png';
import a_js_12 from '../../../assets/FNaF 6/night_assets/Afton/1512.png';
import a_js_13 from '../../../assets/FNaF 6/night_assets/Afton/1513.png';
import a_js_14 from '../../../assets/FNaF 6/night_assets/Afton/1514.png';

// ── Audio ─────────────────────────────────────────────────────
import swallow_void  from '../../../assets/FNaF 6 Audio/Swallowed By The Void.mp3';
import prompt1       from '../../../assets/FNaF 6 Audio/prompt1_cut.wav';
import pageturn      from '../../../assets/FNaF 6 Audio/pageturn1.mp3';
import pageturn_2    from '../../../assets/FNaF 6 Audio/pageturn2.mp3';
import shock_sfx     from '../../../assets/FNaF 6 Audio/shock.mp3';
import jumpscare_sfx from '../../../assets/FNaF 6 Audio/Jumpscare 9B.wav';
import complete_sfx  from '../../../assets/FNaF 6 Audio/complete.mp3';
import stop4_sfx     from '../../../assets/FNaF 6 Audio/stop4.mp3';

// ── Animatronic definitions ───────────────────────────────────
// For each animatronic provide: idle poses, jumpscare frames,
// heartbeat cue (plays when entering last window), voice line (plays after death screen).
// Fill Freddy / Baby / Lefty when assets are ready.
const ANIMATRONICS = [
    {
        name:       'Afton',
        idle:       [a_idle_0, a_idle_1, a_idle_2],
        jumpscare:  [a_js_0, a_js_1, a_js_2, a_js_3, a_js_4, a_js_5, a_js_6,
            a_js_7, a_js_8, a_js_9, a_js_10, a_js_11, a_js_12, a_js_13, a_js_14],
        heartbeat:  '../../../assets/FNaF 6 Audio/heartbeatsC.mp3',
        voiceLine:  '../../../assets/FNaF 6 Audio/Ialwayscomeback.mp3',
    },
    { name: 'Freddy', idle: [], jumpscare: [], heartbeat: null, voiceLine: null }, // TODO
    { name: 'Baby',   idle: [], jumpscare: [], heartbeat: null, voiceLine: null }, // TODO
    { name: 'Lefty',  idle: [], jumpscare: [], heartbeat: null, voiceLine: null }, // TODO
];

const CHOSEN = (() => {
    const valid = ANIMATRONICS.filter(a => a.idle.length > 0);
    return valid[Math.floor(Math.random() * valid.length)] ?? ANIMATRONICS[0];
})();

// ── Constants ─────────────────────────────────────────────────
const FPS           = 30;
const MIN_OPACITY   = 0.3;
const MAX_OPACITY   = 0.4;
const SLIDE_MS      = 500;
const TYPE_DELAY_MS = 120;
const SUBMIT_HOLD_S = 6;
const JS_FPS        = 20;
const TICK_MS       = 100;
const MAX_CHARGES   = 3;
const WIN_MIN_MS    = 8_000;
const WIN_MAX_MS    = 20_000;

function rollWindows() {
    return [
        WIN_MIN_MS + Math.random() * (WIN_MAX_MS - WIN_MIN_MS),
        WIN_MIN_MS + Math.random() * (WIN_MAX_MS - WIN_MIN_MS),
        WIN_MIN_MS + Math.random() * (WIN_MAX_MS - WIN_MIN_MS),
    ];
}

// ── Slow-type input hook ──────────────────────────────────────
function useSlowInput(initialValue = '') {
    const [value, setValue] = useState(initialValue);
    const lastKey = useRef(0);
    const onKeyDown = (e) => {
        const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Enter'];
        if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
        const now = Date.now();
        if (now - lastKey.current < TYPE_DELAY_MS) { e.preventDefault(); return; }
        lastKey.current = now;
    };
    const onPaste  = (e) => e.preventDefault();
    const onChange = (e) => setValue(e.target.value);
    const reset    = ()  => setValue('');
    return { value, onChange, onKeyDown, onPaste, reset };
}

// ── Styles ────────────────────────────────────────────────────
const STYLES = `
    .tw-input {
        background: transparent; border: none;
        border-bottom: 1px solid rgba(60,30,10,0.55);
        outline: none;
        font-family: "Courier New", Courier, monospace;
        font-size: clamp(8px, 1.1vw, 14px);
        color: rgba(30,15,3,0.95); width: 100%;
        padding: 3px 0; caret-color: rgba(40,20,5,0.9);
        pointer-events: auto;
    }
    .tw-input::placeholder { color: rgba(60,30,10,0.35); }
    .tw-label {
        font-size: clamp(7px, 0.8vw, 11px);
        color: rgba(30,15,3,0.7);
        letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 2px;
    }
    .tw-btn {
        background: transparent; border: 1px solid rgba(40,20,5,0.5);
        font-family: "Courier New", Courier, monospace;
        font-size: clamp(7px, 0.9vw, 13px);
        color: rgba(30,15,3,0.9); letter-spacing: 0.15em;
        text-transform: uppercase; padding: 6px 0;
        cursor: pointer; width: 100%; margin-top: 4px;
        transition: background 0.15s, opacity 0.3s; pointer-events: auto;
        position: relative; overflow: hidden;
    }
    .tw-btn:disabled { cursor: not-allowed; opacity: 0.45; }
    .tw-btn:not(:disabled):hover { background: rgba(40,20,5,0.12); }
    .tw-btn-fill {
        position: absolute; left: 0; top: 0; height: 100%;
        background: rgba(40,20,5,0.10);
        transition: width 0.25s linear; pointer-events: none;
    }
    .tw-link {
        font-size: clamp(7px, 0.72vw, 11px); color: rgba(40,20,5,0.55);
        letter-spacing: 0.08em; text-align: center; cursor: pointer;
        text-decoration: underline; background: none; border: none;
        font-family: "Courier New", Courier, monospace; pointer-events: auto;
    }
    .tw-link:hover { color: rgba(40,20,5,0.9); }
    .tw-divider { border: none; border-top: 1px solid rgba(40,20,5,0.18); margin: 3px 0; }
    .tw-hint {
        font-size: clamp(6px, 0.65vw, 9px);
        font-family: "Courier New", Courier, monospace;
        letter-spacing: 0.08em;
        margin-top: 2px;
    }
    .tw-hint-ok  { color: rgba(20, 100, 30, 0.8); }
    .tw-hint-err { color: rgba(160, 30, 10, 0.8); }
    .tw-hint-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 3px; }

    @keyframes taserPulse {
        0%,100% { opacity: 0.9; filter: drop-shadow(0 0 4px rgba(160,210,255,0.5)); }
        50%      { opacity: 1;   filter: drop-shadow(0 0 12px rgba(160,210,255,1)); }
    }
    .taser-ready { animation: taserPulse 1.2s ease-in-out infinite; cursor: pointer; pointer-events: auto; }
    .taser-empty { opacity: 0.25; cursor: not-allowed; filter: grayscale(1); pointer-events: auto; }

    @keyframes failedFadeIn {
        from { opacity: 0; letter-spacing: 0.35em; }
        to   { opacity: 1; letter-spacing: 0.18em; }
    }
    .failed-text {
        animation: failedFadeIn 1.2s ease forwards;
        font-family: "Courier New", Courier, monospace;
        font-size: clamp(14px, 1.8vw, 22px);
        color: rgba(200, 60, 40, 0.9);
        letter-spacing: 0.18em;
        text-transform: uppercase;
        text-shadow: 0 0 20px rgba(200,40,20,0.5);
        text-align: center;
        pointer-events: none;
        user-select: none;
    }
`;

// ── Component ─────────────────────────────────────────────────
export default function Register() {

    // ── UI state ──────────────────────────────────────────────
    const [opacity,      setOpacity]      = useState(MIN_OPACITY);
    const [visible,      setVisible]      = useState(false);
    const [fading,       setFading]       = useState(false);
    const [paperState,   setPaperState]   = useState('closed');
    const [paperSettled, setPaperSettled] = useState(false);

    // ── Form state ────────────────────────────────────────────
    const username     = useSlowInput();
    const email        = useSlowInput();
    const confirmEmail = useSlowInput();
    const password     = useSlowInput();
    const confirm      = useSlowInput();
    const [holdProgress, setHoldProgress] = useState(0);
    const [submitReady,  setSubmitReady]  = useState(false);
    const holdTimer   = useRef(null);
    const holdStarted = useRef(false);

    // Random field names generated once on mount — defeats extension heuristics
    const fieldNames = useRef({
        username:     'f_' + Math.random().toString(36).slice(2),
        email:        'f_' + Math.random().toString(36).slice(2),
        confirmEmail: 'f_' + Math.random().toString(36).slice(2),
        password:     'f_' + Math.random().toString(36).slice(2),
        confirm:      'f_' + Math.random().toString(36).slice(2),
    });

    // readOnly-on-mount trick — removed on first focus
    const [roUsername,     setRoUsername]     = useState(true);
    const [roEmail,        setRoEmail]        = useState(true);
    const [roConfirmEmail, setRoConfirmEmail] = useState(true);
    const [roPassword,     setRoPassword]     = useState(true);
    const [roConfirm,      setRoConfirm]      = useState(true);

    // ── Password validation ───────────────────────────────────
    function validatePassword(pw) {
        return {
            length:  pw.length >= 12,
            number:  /[0-9]/.test(pw),
            special: /[^A-Za-z0-9]/.test(pw),
        };
    }
    const pwCheck      = validatePassword(password.value);
    const pwValid      = pwCheck.length && pwCheck.number && pwCheck.special;
    const emailValid   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
    const emailsMatch  = email.value === confirmEmail.value && confirmEmail.value.length > 0;
    const passwordsMatch = password.value === confirm.value && confirm.value.length > 0;

    // ── Salvage state ─────────────────────────────────────────
    const [animSrc,     setAnimSrc]     = useState(CHOSEN.idle[0]);
    const [animStep,    setAnimStep]    = useState(1);
    const [charges,     setCharges]     = useState(MAX_CHARGES);
    const [flickerOn,   setFlickerOn]   = useState(true);
    const [isFlicker,   setIsFlicker]   = useState(false);
    const [isDead,      setIsDead]      = useState(false);

    // ── Death screen state ────────────────────────────────────
    // 'none' | 'red' | 'black' | 'text'
    const [deathScreen, setDeathScreen] = useState('none');

    // ── Salvage refs ──────────────────────────────────────────
    const windowsRef    = useRef(rollWindows());
    const accumRef      = useRef(0);
    const crossedRef    = useRef(0);
    const animStepRef   = useRef(1);
    const chargesRef    = useRef(MAX_CHARGES);
    const accumInterval = useRef(null);
    const jsInterval    = useRef(null);
    const shockFnRef    = useRef(null);
    const paperStateRef = useRef('closed');
    const heartbeatRef  = useRef(null); // Audio instance for heartbeat

    const navigate = useNavigate();
    const hintLock = useRef(false);

    const allFilled = username.value.trim().length > 0
        && emailValid
        && emailsMatch
        && pwValid
        && passwordsMatch;

    const isOpen    = paperState === 'open' || paperState === 'opening';
    const showTaser = !isOpen && !isDead;

    // ── Thresholds ────────────────────────────────────────────
    function getThresholds() {
        const w = windowsRef.current;
        return [w[0], w[0] + w[1], w[0] + w[1] + w[2]];
    }

    // ── Heartbeat helpers ─────────────────────────────────────
    function startHeartbeat() {
        if (heartbeatRef.current || !CHOSEN.heartbeat) return;
        const hb = new Audio(CHOSEN.heartbeat);
        hb.volume = 0.8;
        hb.play().catch(() => {});
        heartbeatRef.current = hb;
    }

    function stopHeartbeat() {
        if (!heartbeatRef.current) return;
        heartbeatRef.current.pause();
        heartbeatRef.current.currentTime = 0;
        heartbeatRef.current = null;
    }

    // ── Flicker ───────────────────────────────────────────────
    function triggerFlicker(onDone) {
        setIsFlicker(true);
        let count = 0;
        const id = setInterval(() => {
            setFlickerOn(v => !v);
            count++;
            if (count >= 14) {
                clearInterval(id);
                setIsFlicker(false);
                setFlickerOn(true);
                onDone?.();
            }
        }, 65);
    }

    // ── Accumulator ───────────────────────────────────────────
    function startAccumulator() {
        if (accumInterval.current) return;
        accumInterval.current = setInterval(() => {
            if (animStepRef.current >= 4) { stopAccumulator(); return; }
            accumRef.current += TICK_MS;
            const thresholds = getThresholds();

            for (let i = crossedRef.current; i < 3; i++) {
                if (accumRef.current >= thresholds[i]) {
                    crossedRef.current = i + 1;
                    const newStep = i + 2; // 2, 3, 4

                    if (newStep === 2 || newStep === 3) {
                        // Invisible swap while paper is up
                        animStepRef.current = newStep;
                        setAnimStep(newStep);
                        setAnimSrc(CHOSEN.idle[newStep - 1]);

                        // Entering last window — start heartbeat warning
                        if (newStep === 3) startHeartbeat();

                    } else {
                        // Step 4 — instant death, no escape
                        animStepRef.current = 4;
                        setAnimStep(4);
                        stopAccumulator();
                        triggerStep4();
                    }
                }
            }
        }, TICK_MS);
    }

    function stopAccumulator() {
        clearInterval(accumInterval.current);
        accumInterval.current = null;
    }

    // ── Reset cycle ───────────────────────────────────────────
    function resetCycle() {
        stopHeartbeat();
        windowsRef.current  = rollWindows();
        accumRef.current    = 0;
        crossedRef.current  = 0;
        animStepRef.current = 1;
        setAnimStep(1);
        setAnimSrc(CHOSEN.idle[0]);
    }

    // ── Step 4 death sequence ─────────────────────────────────
    // heartbeat is already playing from entering last window.
    // Force paper down → play jumpscare frames + scream →
    // red flash → fade to black → show fail text → voice line → navigate
    function triggerStep4() {
        setIsDead(true);
        stopAccumulator();
        clearInterval(jsInterval.current);

        const wasOpen = paperStateRef.current === 'open' || paperStateRef.current === 'opening';

        if (wasOpen) {
            setPaperSettled(false);
            setPaperState('closing');
            paperStateRef.current = 'closing';
            setTimeout(() => {
                setPaperState('closed');
                paperStateRef.current = 'closed';
                playJumpscare();
            }, SLIDE_MS);
        } else {
            playJumpscare();
        }
    }

    function playJumpscare() {
        const frames = CHOSEN.jumpscare;
        if (!frames.length) { runDeathScreen(); return; }

        // Play scream
        new Audio(jumpscare_sfx).play().catch(() => {});

        let frame = 0;
        setAnimSrc(frames[0]);

        jsInterval.current = setInterval(() => {
            frame++;
            if (frame >= frames.length) {
                clearInterval(jsInterval.current);
                stopHeartbeat();
                runDeathScreen();
                return;
            }
            setAnimSrc(frames[frame]);
        }, 1000 / JS_FPS);
    }

    function runDeathScreen() {
        // 1. Flash red quickly
        setDeathScreen('red');

        setTimeout(() => {
            // 2. Fade to black
            setDeathScreen('black');

            setTimeout(() => {
                // 3. Show fail text
                setDeathScreen('text');

                // 4. Play voice line
                if (CHOSEN.voiceLine) {
                    const voice = new Audio(CHOSEN.voiceLine);
                    voice.volume = 0.9;
                    voice.play().catch(() => {});
                    // Navigate when voice ends (or fallback after 5s)
                    const fallback = setTimeout(() => navigate('/login'), 5000);
                    voice.addEventListener('ended', () => {
                        clearTimeout(fallback);
                        setTimeout(() => navigate('/login'), 600);
                    });
                } else {
                    setTimeout(() => navigate('/login'), 3500);
                }
            }, 800);
        }, 300);
    }

    // ── Shock ─────────────────────────────────────────────────
    function shock() {
        if (animStepRef.current >= 4) return;
        if (paperStateRef.current === 'open' || paperStateRef.current === 'opening') return;
        if (chargesRef.current <= 0) {
            const sfx = new Audio(stop4_sfx);
            sfx.volume = 0.9;
            sfx.play().catch(() => {});
            return;
        }

        new Audio(shock_sfx).play().catch(() => {});

        const newCharges = chargesRef.current - 1;
        chargesRef.current = newCharges;
        setCharges(newCharges);

        stopAccumulator();
        triggerFlicker(() => {
            resetCycle();
            if (paperStateRef.current === 'open') startAccumulator();
        });
    }
    shockFnRef.current = shock;

    // ── Paper ─────────────────────────────────────────────────
    function openPaper() {
        if (paperStateRef.current === 'open' || paperStateRef.current === 'opening') return;
        if (isDead) return;

        new Audio(pageturn).play().catch(() => {});
        setPaperState('opening');
        paperStateRef.current = 'opening';
        setPaperSettled(false);
        setTimeout(() => {
            setPaperSettled(true);
            setPaperState('open');
            paperStateRef.current = 'open';
            if (animStepRef.current < 4) startAccumulator();
        }, SLIDE_MS);
    }

    function closePaper() {
        if (paperStateRef.current === 'closed' || paperStateRef.current === 'closing') return;
        if (isDead) return;

        stopAccumulator();
        new Audio(pageturn_2).play().catch(() => {});
        setPaperSettled(false);
        setPaperState('closing');
        paperStateRef.current = 'closing';
        setTimeout(() => {
            setPaperState('closed');
            paperStateRef.current = 'closed';
        }, SLIDE_MS);
    }

    function onHintHover() {
        if (hintLock.current) return;
        hintLock.current = true;
        setTimeout(() => { hintLock.current = false; }, 500);
        const open = paperStateRef.current === 'open' || paperStateRef.current === 'opening';
        open ? closePaper() : openPaper();
    }

    // ── Submit hold ───────────────────────────────────────────
    useEffect(() => {
        if (allFilled && !holdStarted.current) {
            holdStarted.current = true;
            setSubmitReady(false);
            setHoldProgress(0);
            const start = Date.now();
            holdTimer.current = setInterval(() => {
                const elapsed = (Date.now() - start) / 1000;
                const pct = Math.min((elapsed / SUBMIT_HOLD_S) * 100, 100);
                setHoldProgress(pct);
                if (pct >= 100) { clearInterval(holdTimer.current); setSubmitReady(true); }
            }, 80);
        } else if (!allFilled) {
            holdStarted.current = false;
            clearInterval(holdTimer.current);
            setHoldProgress(0);
            setSubmitReady(false);
        }
    }, [allFilled]);

    // ── Mount / unmount ───────────────────────────────────────
    useEffect(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        return () => {
            stopAccumulator();
            stopHeartbeat();
            clearInterval(jsInterval.current);
            clearInterval(holdTimer.current);
        };
    }, []);

    useEffect(() => {
        const voice = new Audio(prompt1);
        voice.volume = 0.4;
        const t = setTimeout(() => voice.play().catch(() => {}), 1200);
        return () => { clearTimeout(t); voice.pause(); };
    }, []);

    useEffect(() => {
        const a = new Audio(swallow_void);
        a.loop = true; a.volume = 0.3;
        a.play().catch(() => {});
        return () => { a.pause(); a.currentTime = 0; };
    }, []);

    useEffect(() => {
        const id = setInterval(() => {
            if (!isFlicker) setOpacity(MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY));
        }, 1000 / FPS);
        return () => clearInterval(id);
    }, [isFlicker]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Control') {
                if (paperStateRef.current === 'open' || paperStateRef.current === 'opening') return;
                e.preventDefault();
                shockFnRef.current?.();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    // ── Navigation ────────────────────────────────────────────
    function goBack() {
        setFading(true);
        setTimeout(() => navigate('/login'), 1200);
    }

    function handleSubmit() {
        if (!submitReady) return;
        console.log('Account created:', username.value);
        // TODO: call API
        const sfx = new Audio(complete_sfx);
        sfx.volume = 0.9;
        sfx.play().catch(() => {});
        setFading(true);
        sfx.addEventListener('ended', () => navigate('/login'));
        setTimeout(() => navigate('/login'), 6000); // fallback
    }

    // ── Visual derivations ────────────────────────────────────
    const paperY       = isOpen ? '0%' : '100%';
    const submitLabel  = submitReady ? '[ Create Account ]' : allFilled ? '[ waiting... ]' : '[ Create Account ]';
    const animOpacity  = isFlicker ? (flickerOn ? 1 : 0) : 1;
    const bulbOpacity  = isFlicker ? (flickerOn ? opacity + 0.1 : 0) : opacity + 0.1;
    const noiseOpacity = isFlicker ? (flickerOn ? opacity : 0) : opacity;
    const taserClass   = charges > 0 ? 'taser-ready' : 'taser-empty';

    // Death overlay derivations
    const deathOverlayColor   = deathScreen === 'red'   ? 'rgba(180,20,10,0.92)'
        : deathScreen === 'black'  ? '#000'
            : deathScreen === 'text'   ? '#000'
                : 'transparent';
    const deathOverlayOpacity = deathScreen === 'none' ? 0 : 1;
    const deathOverlayTransition = deathScreen === 'red'
        ? 'background 0.1s ease, opacity 0.15s ease'
        : 'background 0.7s ease, opacity 0.3s ease';

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
            <style>{STYLES}</style>

            {/* ── Light bulb ─────────────────────────────────── */}
            <img src={light_bulb} style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translate(-50%, -50%)',
                height: '100%', width: 'auto',
                opacity: bulbOpacity,
                zIndex: 0, pointerEvents: 'none',
            }} />

            {/* ── Animatronic ────────────────────────────────── */}
            {animSrc && (
                <img src={animSrc} style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%', objectFit: 'cover',
                    opacity: animOpacity,
                    zIndex: 1, pointerEvents: 'none',
                    transition: isFlicker ? 'none' : 'opacity 0.08s',
                }} />
            )}

            {/* ── Noise overlay ──────────────────────────────── */}
            <img src={overlay} style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: noiseOpacity,
                zIndex: 2, pointerEvents: 'none',
            }} />

            {/* ── Paper ──────────────────────────────────────── */}
            <img
                src={paperSettled ? paper_idle : paper_blur}
                style={{
                    position: 'absolute',
                    bottom: 0, left: '50%',
                    transform: `translateX(-50%) translateY(${paperY})`,
                    transition: `transform ${SLIDE_MS}ms ease`,
                    width: 'auto', height: 'auto',
                    zIndex: 3, pointerEvents: 'none',
                }}
            />

            {/* ── Form ───────────────────────────────────────── */}
            {paperSettled && (
                <div style={{
                    position: 'absolute',
                    top: '28%', left: '40%', width: '22%',
                    transform: 'translate(-10%, 0) rotate(-2.5deg)',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    fontFamily: '"Courier New", Courier, monospace',
                    zIndex: 4, pointerEvents: 'auto', cursor: 'auto',
                }}>
                    {/* Honeypot — hidden from humans, confuses form scanners */}
                    <input
                        type="text" tabIndex={-1} aria-hidden="true"
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
                        name="email" autoComplete="email"
                        defaultValue=""
                    />

                    {/* Username */}
                    <div>
                        <div className="tw-label">Username</div>
                        <input className="tw-input" type="text"
                               placeholder="_ _ _ _ _ _ _"
                               name={fieldNames.current.username}
                               id={fieldNames.current.username}
                               autoComplete="off" data-lpignore="true" data-1p-ignore data-bwignore
                               readOnly={roUsername}
                               onFocus={() => setRoUsername(false)}
                               value={username.value} onChange={username.onChange}
                               onKeyDown={username.onKeyDown} onPaste={username.onPaste} />
                    </div>

                    {/* Email */}
                    <div>
                        <div className="tw-label">Email Address</div>
                        <input className="tw-input" type="text"
                               placeholder="_ _ _@_ _ _._ _ _"
                               name={fieldNames.current.email}
                               id={fieldNames.current.email}
                               autoComplete="off" data-lpignore="true" data-1p-ignore data-bwignore
                               readOnly={roEmail}
                               onFocus={() => setRoEmail(false)}
                               value={email.value} onChange={email.onChange}
                               onKeyDown={email.onKeyDown} onPaste={email.onPaste} />
                        {email.value.length > 0 && !emailValid && (
                            <div className="tw-hint tw-hint-err">✗ invalid address</div>
                        )}
                    </div>

                    {/* Confirm Email */}
                    <div>
                        <div className="tw-label">Confirm Email</div>
                        <input className="tw-input" type="text"
                               placeholder="_ _ _@_ _ _._ _ _"
                               name={fieldNames.current.confirmEmail}
                               id={fieldNames.current.confirmEmail}
                               autoComplete="off" data-lpignore="true" data-1p-ignore data-bwignore
                               readOnly={roConfirmEmail}
                               onFocus={() => setRoConfirmEmail(false)}
                               value={confirmEmail.value} onChange={confirmEmail.onChange}
                               onKeyDown={confirmEmail.onKeyDown} onPaste={confirmEmail.onPaste} />
                        {confirmEmail.value.length > 0 && (
                            <div className={`tw-hint ${emailsMatch ? 'tw-hint-ok' : 'tw-hint-err'}`}>
                                {emailsMatch ? '✓ addresses match' : '✗ addresses do not match'}
                            </div>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <div className="tw-label">Password</div>
                        <input className="tw-input" type="password"
                               placeholder="* * * * * * * * * * * *"
                               name={fieldNames.current.password}
                               id={fieldNames.current.password}
                               autoComplete="new-password" data-lpignore="true" data-1p-ignore data-bwignore
                               readOnly={roPassword}
                               onFocus={() => setRoPassword(false)}
                               value={password.value} onChange={password.onChange}
                               onKeyDown={password.onKeyDown} onPaste={password.onPaste} />
                        {password.value.length > 0 && (
                            <div className="tw-hint-row">
                                <span className={`tw-hint ${pwCheck.length  ? 'tw-hint-ok' : 'tw-hint-err'}`}>{pwCheck.length  ? '✓' : '✗'} 12+ chars</span>
                                <span className={`tw-hint ${pwCheck.number  ? 'tw-hint-ok' : 'tw-hint-err'}`}>{pwCheck.number  ? '✓' : '✗'} number</span>
                                <span className={`tw-hint ${pwCheck.special ? 'tw-hint-ok' : 'tw-hint-err'}`}>{pwCheck.special ? '✓' : '✗'} special</span>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <div className="tw-label">Confirm Password</div>
                        <input className="tw-input" type="password"
                               placeholder="* * * * * * * * * * * *"
                               name={fieldNames.current.confirm}
                               id={fieldNames.current.confirm}
                               autoComplete="new-password" data-lpignore="true" data-1p-ignore data-bwignore
                               readOnly={roConfirm}
                               onFocus={() => setRoConfirm(false)}
                               value={confirm.value} onChange={confirm.onChange}
                               onKeyDown={confirm.onKeyDown} onPaste={confirm.onPaste} />
                        {confirm.value.length > 0 && (
                            <div className={`tw-hint ${passwordsMatch ? 'tw-hint-ok' : 'tw-hint-err'}`}>
                                {passwordsMatch ? '✓ passwords match' : '✗ passwords do not match'}
                            </div>
                        )}
                    </div>

                    <button className="tw-btn" disabled={!submitReady} onClick={handleSubmit}>
                        <span className="tw-btn-fill" style={{ width: `${holdProgress}%` }} />
                        <span style={{ position: 'relative', zIndex: 1 }}>{submitLabel}</span>
                    </button>

                    <hr className="tw-divider" />
                    <button className="tw-link" onClick={goBack}>← back to login</button>
                </div>
            )}

            {/* ── Hint toggle ────────────────────────────────── */}
            <img
                src={isOpen ? hint_close : hint_open}
                onMouseEnter={onHintHover}
                style={{
                    position: 'fixed', bottom: 0, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'auto', height: 'auto',
                    zIndex: 10, cursor: 'pointer', opacity: 0.85,
                    display: isDead ? 'none' : 'block',
                }}
            />

            {/* ── Taser ──────────────────────────────────────── */}
            {showTaser && (
                <div style={{
                    position: 'fixed', bottom: '72px', right: '52px',
                    zIndex: 20,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}>
                    <img
                        src={taser}
                        onClick={shock}
                        className={taserClass}
                        style={{ width: 'auto', height: 'auto', pointerEvents: 'auto' }}
                    />
                    <span style={{
                        fontFamily: '"Courier New", Courier, monospace',
                        fontSize: '11px',
                        color: charges > 0 ? 'rgba(200,230,255,0.85)' : 'rgba(255,255,255,0.25)',
                        letterSpacing: '0.1em',
                        textShadow: charges > 0 ? '0 0 8px rgba(160,210,255,0.6)' : 'none',
                        transition: 'color 0.4s, text-shadow 0.4s',
                    }}>
                        Charge left : {charges}
                    </span>
                </div>
            )}

            {/* ── Step indicator (dev helper — remove in prod) ── */}
            <div style={{
                position: 'fixed', top: 16, left: 16, zIndex: 30,
                display: 'flex', gap: 6, pointerEvents: 'none',
            }}>
                {[1,2,3,4].map(s => (
                    <div key={s} style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: animStep >= s
                            ? (s === 4 ? '#cc2200' : 'rgba(255,220,100,0.9)')
                            : 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: animStep >= s ? `0 0 5px ${s === 4 ? '#cc2200' : '#ffd060'}` : 'none',
                        transition: 'background 0.3s, box-shadow 0.3s',
                    }} />
                ))}
            </div>

            {/* ── Back button ────────────────────────────────── */}
            <button onClick={goBack} style={{
                position: 'fixed', bottom: 24, left: 24,
                background: 'none', border: 'none',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '13px', color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.12em', cursor: 'pointer',
                zIndex: 20, transition: 'color 0.2s',
                display: (isOpen || isDead) ? 'none' : 'block',
            }}
                    onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
            >← back</button>

            {/* ── Death overlay (red flash → black → text) ───── */}
            {deathScreen !== 'none' && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 900,
                    background: deathOverlayColor,
                    opacity: deathOverlayOpacity,
                    transition: deathOverlayTransition,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'all',
                }}>
                    {deathScreen === 'text' && (
                        <p className="failed-text">Failed to create an account</p>
                    )}
                </div>
            )}

            {/* ── Page fade overlay ──────────────────────────── */}
            <div style={{
                position: 'fixed', inset: 0, background: '#000',
                opacity: (!visible || fading) ? 1 : 0,
                transition: 'opacity 1s ease',
                pointerEvents: (!visible || fading) ? 'all' : 'none',
                zIndex: 999,
            }} />
        </div>
    );
}