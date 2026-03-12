// ── Jumpscare engine ──────────────────────────────────────────

function playJumpscare(def, sfxSrc, onDone, maxDurationMs) {
    if (!def) { console.warn('playJumpscare: missing animation def'); return; }

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
    setTimeout(() => { window.location.href = '../pages/menu.html'; }, 1500);
};

const GO_NOISE = () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    setTimeout(() => { playJumpscare(noiseMenu, NOISE, GO_MENU); }, 500);
};

function playChicaJumpscare()        { playJumpscare(chicajumpscare,          SCREAM,  GO_NOISE,     JUMPSCARE_MAX_MS); }
function playBonnieJumpscare()       { playJumpscare(bonnieJumpscare,         SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
function playFoxyJumpscare()         { playJumpscare(foxyJumpscare,           SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
function playFreddyJumpscare()       { playJumpscare(freddyJumpscare,         SCREAM,  GO_NOISE,     JUMPSCARE_MAX_MS); }
function playGoldenFreddyJumpscare() { playJumpscare(goldenFreddyJumpscare,   SCREAM2, null,     JUMPSCARE_MAX_MS); }
function playPowerOutJumpscare()     { playJumpscare(freddyJumpscarePowerOut, SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
function playNoiseMenu()             { playJumpscare(noiseMenu,               NOISE,   GO_MENU,  JUMPSCARE_MAX_MS); }

export {
    playJumpscare,
    SCREAM, SCREAM2, NOISE,
    JUMPSCARE_MAX_MS,
    GO_MENU, GO_NOISE,
    playChicaJumpscare,
    playBonnieJumpscare,
    playFoxyJumpscare,
    playFreddyJumpscare,
    playGoldenFreddyJumpscare,
    playPowerOutJumpscare,
    playNoiseMenu,
};
