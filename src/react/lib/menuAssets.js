// ============================================================
//  menuAssets.js — bundled asset URLs + animation frame data
//  for the React-migrated menu-family pages (Menu, Leaderboard,
//  CustomNight, Unauthorized, Warning).
//
//  Uses Vite's import.meta.glob so every referenced asset is
//  hashed and copied into the production build, instead of the
//  raw runtime string paths the old standalone HTML pages used.
// ============================================================

// ── Glob whole folders to URL maps ───────────────────────────
const menuImgs   = import.meta.glob('../../../assets/Menu/*.png',          { eager: true, query: '?url', import: 'default' });
const goldenImgs = import.meta.glob('../../../assets/Golden Freddy/*.png', { eager: true, query: '?url', import: 'default' });
const customAll  = import.meta.glob('../../../assets/Custom/*',            { eager: true, query: '?url', import: 'default' });
const iconImgs   = import.meta.glob('../../../assets/Icons/*.png',         { eager: true, query: '?url', import: 'default' });
const audio1     = import.meta.glob('../../../assets/FNaF 1 Audio/*',      { eager: true, query: '?url', import: 'default' });
const textImgs   = import.meta.glob('../../../assets/Text_Assets/*.png',   { eager: true, query: '?url', import: 'default' });
const fontMap    = import.meta.glob('../../../assets/Fonts/*.otf',         { eager: true, query: '?url', import: 'default' });

// Look up a globbed asset by its file name (case-insensitive).
function pick(map, name) {
    const lname = name.toLowerCase();
    const key = Object.keys(map).find(p => p.toLowerCase().endsWith('/' + lname));
    if (!key) console.warn('[menuAssets] missing asset:', name);
    return map[key];
}

const menu   = (n) => pick(menuImgs, n);
const golden = (n) => pick(goldenImgs, n);
const custom = (n) => pick(customAll, n);
const icon   = (n) => pick(iconImgs, n);
const aud    = (n) => pick(audio1, n);
const text   = (n) => pick(textImgs, n);

// ── Static images ────────────────────────────────────────────
export const IMG = {
    menu1:        menu('1.png'),
    menu2:        menu('2.png'),
    menu3:        menu('3.png'),
    menu4:        menu('4.png'),
    slide:        menu('452.png'),
    fnafTitle:    menu('444-trans.png'),
    selector:     menu('arrow_trans.png'),
    transition:   menu('574.png'),
    warning:      menu('warning_trans.png'),
    staticNoise1: menu('staticNoise1.png'),
    whiteNoise1:  menu('whiteNoise1.png'),
    rotateImg:    menu('screen_rotate.png'),
    star:         text('432.png'),
    goldenFreddy: golden('573.png'),
    bonnieMenu:   custom('Bonnie_Menu.jpg'),
    chicaMenu:    custom('Chica_menu.png'),
    iconFreddy:   icon('527.png'),
    iconBonnie:   icon('528.png'),
    iconChica:    icon('529.png'),
    iconFoxy:     icon('536.png'),
};

// ── Audio ─────────────────────────────────────────────────────
export const AUDIO = {
    camera:        aud('CAMERA_VIDEO_LOA_60105303.wav'),
    darkness:      aud('darkness music.wav'),
    static2:       aud('static2.wav'),
    xscream:       aud('XSCREAM2.wav'),
    bonniesLullaby: custom('Bonnies Lullaby.mp3'),
    unraveled:      custom('Unraveled - Feldup.mp3'),
};

// ── Animation frame arrays (ported from src/data/animations.js) ─
export const FRED_MENU = [menu('1.png'), menu('2.png'), menu('3.png'), menu('4.png')];

export const NOISE_MENU = {
    fps: 30,
    frames: [
        menu('staticNoise1.png'), menu('staticNoise2.png'), menu('staticNoise3.png'),
        menu('staticNoise4.png'), menu('staticNoise5.png'), menu('staticNoise6.png'),
        menu('staticNoise7.png'), menu('staticNoise8.png'),
    ],
};

export const WHITE_MENU = {
    fps: 5,
    frames: [
        menu('whiteNoise1.png'), menu('whiteNoise2.png'), menu('empty.png'), menu('empty.png'),
        menu('empty.png'), menu('empty.png'), menu('empty.png'), menu('empty.png'),
        menu('whiteNoise2.png'), menu('whiteNoise3.png'), menu('empty.png'), menu('empty.png'),
        menu('whiteNoise4.png'), menu('whiteNoise5.png'), menu('empty.png'), menu('empty.png'),
        menu('empty.png'), menu('whiteNoise6.png'), menu('whiteNoise7.png'), menu('empty.png'),
        menu('whiteNoise7.png'), menu('whiteNoise8.png'), menu('whiteNoise9.png'), menu('empty.png'),
        menu('empty.png'), menu('whiteNoise10.png'), menu('whiteNoise11.png'), menu('whiteNoise12.png'),
        menu('empty.png'), menu('empty.png'), menu('empty.png'), menu('empty.png'),
        menu('whiteNoise13.png'), menu('whiteNoise14.png'), menu('empty.png'), menu('empty.png'),
        menu('empty.png'), menu('empty.png'), menu('empty.png'), menu('empty.png'),
        menu('empty.png'), menu('empty.png'), menu('empty.png'), menu('whiteNoise16.png'),
    ],
};

export const GOLDEN_FREDDY_JUMPSCARE = {
    fps: 2,
    frames: [golden('548.png'), golden('548.png'), golden('548.png')],
};

// ── Inject the FNAF @font-face once (idempotent) ──────────────
let fontInjected = false;
export function ensureFnafFont() {
    if (fontInjected || typeof document === 'undefined') return;
    fontInjected = true;
    const url = pick(fontMap, 'five-nights-at-freddys.otf');
    const style = document.createElement('style');
    style.textContent = `@font-face {
        font-family: 'FNAF';
        src: url('${url}') format('opentype');
        font-display: swap;
    }`;
    document.head.appendChild(style);
}
