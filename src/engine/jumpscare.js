// ── Jumpscare engine ──────────────────────────────────────────

function playJumpscare(def, sfxSrc, onDone, maxDurationMs) {
    if (!def) { console.warn('playJumpscare: missing animation def'); return; }

    // Force the camera tablet down so the scare (drawn on the main canvas)
    // isn't hidden behind the camera feed.
    if (typeof window.forceTabletDown === 'function') window.forceTabletDown();

    renderPaused = true;

    const sfx = typeof sfxSrc === 'string' ? new Audio(sfxSrc) : sfxSrc;
    sfx.currentTime = 0;

    const msPerFrame = 1000 / def.fps;
    let finished = false;

    const frames = def.frames.map(src => {
        const img = new Image();
        img.src = src;
        return img;
    });

    function finish() {
        if (finished) return;
        finished = true;
        sfx.pause();
        sfx.currentTime = 0;
        if (onDone) { onDone(); } else { renderPaused = false; }
    }

    sfx.play().catch(() => {});
    if (maxDurationMs != null) setTimeout(finish, maxDurationMs);

    let frameIdx = 0;
    function nextFrame() {
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
        if (frameIdx < frames.length) {
            setTimeout(nextFrame, msPerFrame);
        } else {
            finish();
        }
    }
    nextFrame();
}

const SCREAM  = new Audio('../../assets/FNaF 1 Audio/XSCREAM.wav');
const SCREAM2 = new Audio('../../assets/FNaF 1 Audio/XSCREAM2.wav');
const NOISE   = new Audio('../../assets/FNaF 1 Audio/COMPUTER_DIGITAL_L2076505.wav');

const JUMPSCARE_MAX_MS = 1000;

const GO_MENU = () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    setTimeout(() => { window.location.href = '/menu'; }, 1500);
};

const GO_NOISE = () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    setTimeout(() => { playJumpscare(noiseMenu, NOISE, GO_MENU); }, 500);
};

// During the power-out blackout only the scripted power-out scare may play;
// at 6 AM nothing may play (the win is absolute and stops everything).
function _regularScareBlocked() {
    return typeof GameState !== 'undefined' && (GameState._6amTriggered || GameState._powerOutTriggered);
}
function playChicaJumpscare()        { if (_regularScareBlocked()) return; playJumpscare(chicajumpscare,          SCREAM,  GO_NOISE,     JUMPSCARE_MAX_MS); }
function playBonnieJumpscare()       { if (_regularScareBlocked()) return; playJumpscare(bonnieJumpscare,         SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
function playFoxyJumpscare()         { if (_regularScareBlocked()) return; playJumpscare(foxyJumpscare,           SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
function playFreddyJumpscare()       { if (_regularScareBlocked()) return; playJumpscare(freddyJumpscare,         SCREAM,  GO_NOISE,     JUMPSCARE_MAX_MS); }
function playGoldenFreddyJumpscare() { if (_regularScareBlocked()) return; playJumpscare(goldenFreddyJumpscare,   SCREAM2, null,     JUMPSCARE_MAX_MS); }
function playPowerOutJumpscare()     { if (typeof GameState !== 'undefined' && GameState._6amTriggered) return; playJumpscare(freddyJumpscarePowerOut, SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
function playNoiseMenu()             { playJumpscare(noiseMenu,               NOISE,   GO_MENU,  JUMPSCARE_MAX_MS); }
