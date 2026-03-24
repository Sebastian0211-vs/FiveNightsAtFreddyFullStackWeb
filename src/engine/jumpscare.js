import { gameCtx } from '../../../../Downloads/files (6)/gameContext.js';

// ── Core jumpscare engine ─────────────────────────────────────

export function playJumpscare(def, sfxSrc, onDone, maxDurationMs) {
  if (!def) return;

  const ctx = gameCtx.getCtx?.();
  const W   = gameCtx.getW?.() ?? window.innerWidth;
  const H   = gameCtx.getH?.() ?? window.innerHeight;
  gameCtx.setRenderPaused?.(true);

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
    if (onDone) { onDone(); } else { gameCtx.setRenderPaused?.(false); }
  }

  sfx.play().catch(() => {});
  if (maxDurationMs != null) setTimeout(finish, maxDurationMs);

  let frameIdx = 0;
  function nextFrame() {
    if (finished) return;
    const c = gameCtx.getCtx?.();
    const w = gameCtx.getW?.() ?? W;
    const h = gameCtx.getH?.() ?? H;
    if (!c) { setTimeout(nextFrame, msPerFrame); return; }
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);
    const img = frames[frameIdx];
    if (img.naturalWidth) {
      const sc = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
      c.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
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

// ── Animation defs (inline to avoid circular dep with animations.js) ──
// These are self-contained so jumpscare.js has no external asset-path deps.

const chicajumpscare = {
  frames: [
    '/assets/Chica/65.png','/assets/Chica/69.png','/assets/Chica/216.png',
    '/assets/Chica/228.png','/assets/Chica/229.png','/assets/Chica/230.png',
    '/assets/Chica/231.png','/assets/Chica/232.png','/assets/Chica/233.png',
    '/assets/Chica/234.png','/assets/Chica/235.png','/assets/Chica/236.png',
    '/assets/Chica/237.png','/assets/Chica/239.png','/assets/Chica/279.png',
    '/assets/Chica/281.png','/assets/Chica/279.png','/assets/Chica/239.png',
    '/assets/Chica/237.png','/assets/Chica/236.png','/assets/Chica/235.png','/assets/Chica/234.png',
  ],
  fps: 30, loop: false,
};

const bonnieJumpscare = {
  frames: [
    '/assets/Bonnie/291.png','/assets/Bonnie/293.png','/assets/Bonnie/294.png',
    '/assets/Bonnie/295.png','/assets/Bonnie/296.png','/assets/Bonnie/297.png',
    '/assets/Bonnie/298.png','/assets/Bonnie/299.png','/assets/Bonnie/300.png',
    '/assets/Bonnie/301.png','/assets/Bonnie/303.png','/assets/Bonnie/291.png',
    '/assets/Bonnie/293.png','/assets/Bonnie/294.png','/assets/Bonnie/295.png',
    '/assets/Bonnie/296.png','/assets/Bonnie/297.png','/assets/Bonnie/298.png',
    '/assets/Bonnie/299.png','/assets/Bonnie/300.png','/assets/Bonnie/301.png','/assets/Bonnie/303.png',
  ],
  fps: 30, loop: false,
};

const foxyJumpscare = {
  frames: [
    '/assets/Foxy/foxy jumpscare/242.png','/assets/Foxy/foxy jumpscare/413.png',
    '/assets/Foxy/foxy jumpscare/415.png','/assets/Foxy/foxy jumpscare/243.png',
    '/assets/Foxy/foxy jumpscare/396.png','/assets/Foxy/foxy jumpscare/397.png',
    '/assets/Foxy/foxy jumpscare/398.png','/assets/Foxy/foxy jumpscare/399.png',
    '/assets/Foxy/foxy jumpscare/400.png','/assets/Foxy/foxy jumpscare/401.png',
    '/assets/Foxy/foxy jumpscare/402.png','/assets/Foxy/foxy jumpscare/403.png',
    '/assets/Foxy/foxy jumpscare/404.png','/assets/Foxy/foxy jumpscare/405.png',
    '/assets/Foxy/foxy jumpscare/406.png','/assets/Foxy/foxy jumpscare/407.png',
    '/assets/Foxy/foxy jumpscare/408.png','/assets/Foxy/foxy jumpscare/409.png',
    '/assets/Foxy/foxy jumpscare/410.png','/assets/Foxy/foxy jumpscare/411.png',
    '/assets/Foxy/foxy jumpscare/412.png','/assets/Foxy/foxy jumpscare/413.png',
  ],
  fps: 30, loop: false,
};

const goldenFreddyJumpscare = {
  frames: [
    '/assets/Golden Freddy/548.png',
    '/assets/Golden Freddy/548.png',
    '/assets/Golden Freddy/548.png',
  ],
  fps: 2, loop: false,
};

const freddyJumpscare = {
  frames: [
    '/assets/Freddy/519.png','/assets/Freddy/521.png','/assets/Freddy/489.png',
    '/assets/Freddy/490.png','/assets/Freddy/491.png','/assets/Freddy/493.png',
    '/assets/Freddy/495.png','/assets/Freddy/496.png','/assets/Freddy/497.png',
    '/assets/Freddy/498.png','/assets/Freddy/499.png','/assets/Freddy/500.png',
    '/assets/Freddy/501.png','/assets/Freddy/502.png','/assets/Freddy/503.png',
    '/assets/Freddy/504.png','/assets/Freddy/505.png','/assets/Freddy/506.png',
    '/assets/Freddy/507.png','/assets/Freddy/508.png','/assets/Freddy/509.png',
    '/assets/Freddy/509.png','/assets/Freddy/510.png','/assets/Freddy/511.png',
    '/assets/Freddy/512.png','/assets/Freddy/513.png','/assets/Freddy/514.png',
    '/assets/Freddy/515.png','/assets/Freddy/516.png','/assets/Freddy/517.png','/assets/Freddy/518.png',
  ],
  fps: 30, loop: false,
};

const freddyJumpscarePowerOut = {
  frames: [
    '/assets/Freddy/326.png','/assets/Freddy/348.png','/assets/Freddy/307.png',
    '/assets/Freddy/308.png','/assets/Freddy/309.png','/assets/Freddy/310.png',
    '/assets/Freddy/311.png','/assets/Freddy/312.png','/assets/Freddy/313.png',
    '/assets/Freddy/314.png','/assets/Freddy/315.png','/assets/Freddy/316.png',
    '/assets/Freddy/317.png','/assets/Freddy/318.png','/assets/Freddy/319.png',
    '/assets/Freddy/320.png','/assets/Freddy/321.png','/assets/Freddy/322.png',
    '/assets/Freddy/323.png','/assets/Freddy/324.png','/assets/Freddy/325.png',
  ],
  fps: 30, loop: false,
};

export const noiseMenuDef = {
  frames: [
    '/assets/menu/staticNoise1.png','/assets/menu/staticNoise2.png',
    '/assets/menu/staticNoise3.png','/assets/menu/staticNoise4.png',
    '/assets/menu/staticNoise5.png','/assets/menu/staticNoise6.png',
    '/assets/menu/staticNoise7.png','/assets/menu/staticNoise8.png',
  ],
  fps: 30,
};

// ── Audio singletons ──────────────────────────────────────────
const SCREAM  = new Audio('/assets/FNaF 1 Audio/XSCREAM.wav');
const SCREAM2 = new Audio('/assets/FNaF 1 Audio/XSCREAM2.wav');
const NOISE   = new Audio('/assets/FNaF 1 Audio/COMPUTER_DIGITAL_L2076505.wav');

const JUMPSCARE_MAX_MS = 1000;

const GO_MENU = () => {
  const ctx = gameCtx.getCtx?.();
  const W   = gameCtx.getW?.() ?? window.innerWidth;
  const H   = gameCtx.getH?.() ?? window.innerHeight;
  if (ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  setTimeout(() => { window.location.href = '/menu'; }, 1500);
};

const GO_NOISE = () => {
  const ctx = gameCtx.getCtx?.();
  const W   = gameCtx.getW?.() ?? window.innerWidth;
  const H   = gameCtx.getH?.() ?? window.innerHeight;
  if (ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  setTimeout(() => { playJumpscare(noiseMenuDef, NOISE, GO_MENU); }, 500);
};

export function playChicaJumpscare()        { playJumpscare(chicajumpscare,        SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
export function playBonnieJumpscare()       { playJumpscare(bonnieJumpscare,       SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
export function playFoxyJumpscare()         { playJumpscare(foxyJumpscare,         SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
export function playFreddyJumpscare()       { playJumpscare(freddyJumpscare,       SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
export function playGoldenFreddyJumpscare() { playJumpscare(goldenFreddyJumpscare, SCREAM2, null,     JUMPSCARE_MAX_MS); }
export function playPowerOutJumpscare()     { playJumpscare(freddyJumpscarePowerOut, SCREAM, GO_NOISE, JUMPSCARE_MAX_MS); }
export function playNoiseMenu()             { playJumpscare(noiseMenuDef,           NOISE,  GO_MENU,  JUMPSCARE_MAX_MS); }
