// ============================================================
//  minimap.js
//  S'affiche en bas-droite uniquement quand la tablette est ouverte.
//  Zones cliquables = petits rectangles avec image cam dedans.
//  M = masquer/afficher dots + infos Foxy (caché par défaut).
//  Entièrement responsive.
// ============================================================

import { CAMS, ROOMS } from '../data/rooms.js';

const ROOM_LAYOUT = {
    show_stage:         { x:  80, y:  25,  w: 105,  h:  30, label: 'Show Stage',    camId: '1A' },
    dining_area:        { x:   60, y:  75,  w: 240,  h: 145, label: 'Dining Area',   camId: '1B' },
    backstage:          { x:   10, y:  78,  w:  35,  h:  70, label: 'Backstage',     camId: '3'  },
    pirate_cove:        { x:   22, y: 160,  w:  42,  h:  50, label: "Pirate's Cove", camId: '1C' },
    kitchen:            { x:  265, y: 230,  w:  80,  h:  70, label: 'Kitchen',       camId: '6'  },
    east_hall:          { x:  210, y: 230,  w:  40,  h:  55, label: 'E. Hall',       camId: '4A' },
    east_hall_corner:   { x:  210, y: 290,  w:  40,  h:  55, label: 'E. Corner',     camId: '4B' },
    supply_closet:      { x:   55, y: 250,  w:  40,  h:  70, label: 'Supply',        camId: '5'  },
    west_hall:          { x:  105, y: 230,  w:  40,  h:  55, label: 'W. Hall',       camId: '2A' },
    west_hall_corner:   { x:  105, y: 290,  w:  40,  h:  55, label: 'W. Corner',     camId: '2B' },
    restrooms:          { x:  310, y: 100,  w:  30,  h: 115, label: 'Restrooms',     camId: '7'  },
    office_left:        { x:  160, y: 295,  w:  10,  h:  65, label: 'Office L',      camId: null },
    office_right:       { x:  190, y: 295,  w:  10,  h:  65, label: 'Office R',      camId: null },
};

const ANIM_CFG = {
    Freddy: { color: '#c8763a', short: 'Fr' },
    Bonnie: { color: '#6666ee', short: 'Bo' },
    Chica:  { color: '#ddbb00', short: 'Ch' },
    Foxy:   { color: '#ee4400', short: 'Fx' },
};

const CAM_THUMB = {
    '1A': './assets/Text_Box/cam_1a_trans.png',
    '1B': './assets/Text_Box/cam_1b_trans.png',
    '1C': './assets/Text_Box/cam_1c_trans.png',
    '2A': './assets/Text_Box/cam_2a_trans.png',
    '2B': './assets/Text_Box/cam_2b_trans.png',
    '3':  './assets/Text_Box/cam_3_trans.png',
    '4A': './assets/Text_Box/cam_4a_trans.png',
    '4B': './assets/Text_Box/cam_4b.png',
    '5':  './assets/Text_Box/cam_5_trans.png',
    '6':  './assets/Text_Box/cam_6_trans.png',
    '7':  './assets/Text_Box/cam_7_trans.png',
};

const IMG_SIZE = 400;

function getMapDisplay() {
    return Math.min(window.innerWidth * 0.30, window.innerHeight * 0.50);
}

export function initMinimap(selectCamFn, foxyInstance) {
    let MAP_DISPLAY = getMapDisplay();
    let scX = MAP_DISPLAY / IMG_SIZE;
    let scY = MAP_DISPLAY / IMG_SIZE;

    function getThumbW() { return MAP_DISPLAY * 0.145; }
    function getThumbH() { return MAP_DISPLAY * 0.092; }
    function getImgW()   { return getThumbW() * 0.55;  }
    function getImgH()   { return getThumbH() * 0.79;  }

    // ── Container principal ─────────────────────────────────────
    const container = document.createElement('div');
    container.id = 'minimap-tablet';
    container.style.cssText = `
        position: fixed; bottom: 2vh; right: 1vw; z-index: 200;
        display: none; flex-direction: column; align-items: flex-end;
        gap: 3px; pointer-events: auto;
    `;

    const inner = document.createElement('div');
    inner.style.cssText = `
        position: relative; width: ${MAP_DISPLAY}px; height: ${MAP_DISPLAY}px;
        background: transparent; overflow: hidden;
    `;

    const bgImg = document.createElement('img');
    bgImg.src = './assets/map/145.png';
    bgImg.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; opacity: 1;`;
    inner.appendChild(bgImg);

    // ── Zones par salle ─────────────────────────────────────────
    const roomZones = {};

    Object.entries(ROOM_LAYOUT).forEach(([id, r]) => {
        if (!r.camId) return;
        const zone = document.createElement('div');
        zone.style.cssText = `
            position: absolute; box-sizing: border-box;
            border: 2px solid rgba(251,254,249,1); background: rgb(66,66,66);
            cursor: pointer; display: flex; align-items: flex-start; justify-content: flex-start;
        `;
        zone.title = r.label + ' [CAM ' + r.camId + ']';
        const thumb = document.createElement('img');
        thumb.src = CAM_THUMB[r.camId] || '';
        thumb.style.cssText = `margin-left: 2px; object-fit: contain; display: block; pointer-events: none; flex-shrink: 0;`;
        zone.appendChild(thumb);
        zone.addEventListener('mouseenter', () => { zone.style.borderColor = 'rgba(255,255,255,1)'; });
        zone.addEventListener('click', () => {
            const cam = CAMS.find(c => c.id === r.camId);
            if (!cam) return;
            if (typeof selectCamFn === 'function') {
                selectCamFn(cam.room, cam.label);
            } else {
                window.activeCam = cam.room;
            }
        });
        inner.appendChild(zone);
        roomZones[id] = zone;
    });

    // ── Canvas pour les dots animatroniques ─────────────────────
    const mc = document.createElement('canvas');
    mc.style.cssText = `position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; display: none;`;
    inner.appendChild(mc);
    const dotCtx = mc.getContext('2d');
    container.appendChild(inner);

    const foxyLabel = document.createElement('div');
    foxyLabel.style.cssText = `font-family: 'Courier New', monospace; color: #ee4400; min-height: 12px; text-align: right; text-shadow: 0 0 4px #ee4400; display: none;`;
    container.appendChild(foxyLabel);

    document.body.appendChild(container);

    // ── Resize ──────────────────────────────────────────────────
    function resizeMinimap() {
        MAP_DISPLAY = getMapDisplay();
        scX = MAP_DISPLAY / IMG_SIZE;
        scY = MAP_DISPLAY / IMG_SIZE;
        inner.style.width  = MAP_DISPLAY + 'px';
        inner.style.height = MAP_DISPLAY + 'px';
        mc.width  = MAP_DISPLAY;
        mc.height = MAP_DISPLAY;
        const tw = getThumbW(), th = getThumbH(), iw = getImgW(), ih = getImgH();
        const fontSize = Math.max(7, MAP_DISPLAY * 0.032);
        foxyLabel.style.fontSize = fontSize + 'px';
        Object.entries(ROOM_LAYOUT).forEach(([id, r]) => {
            const zone = roomZones[id];
            if (!zone) return;
            const cx = (r.x + r.w / 2) * scX;
            const cy = (r.y + r.h / 2) * scY;
            zone.style.left   = (cx - tw / 2) + 'px';
            zone.style.top    = (cy - th / 2) + 'px';
            zone.style.width  = tw + 'px';
            zone.style.height = th + 'px';
            const t = zone.querySelector('img');
            if (t) { t.style.width = iw + 'px'; t.style.height = ih + 'px'; }
        });
    }
    window.addEventListener('resize', resizeMinimap);

    function getRoomOf(name) {
        return Object.keys(ROOMS).find(key => ROOMS[key].who && ROOMS[key].who.includes(name)) || null;
    }

    // ── Dessin ──────────────────────────────────────────────────
    function drawMap() {
        dotCtx.clearRect(0, 0, MAP_DISPLAY, MAP_DISPLAY);
        const byRoom = {};
        ['Freddy','Bonnie','Chica'].forEach(name => {
            const key = getRoomOf(name);
            if (key) (byRoom[key] = byRoom[key] || []).push(name);
        });
        const foxy = foxyInstance;
        if (foxy && foxy.valid) {
            const foxyRoom = foxy.stage >= 4 ? 'west_hall' : 'pirate_cove';
            (byRoom[foxyRoom] = byRoom[foxyRoom] || []).push('Foxy');
        }
        const th = getThumbH();
        const DOT = Math.max(4, MAP_DISPLAY * 0.027);
        const GAP = Math.max(1, MAP_DISPLAY * 0.008);
        Object.entries(byRoom).forEach(([roomId, names]) => {
            const r = ROOM_LAYOUT[roomId];
            if (!r || !names.length) return;
            const cx = (r.x + r.w / 2) * scX;
            const cy = (r.y + r.h / 2) * scY;
            const totalW = names.length * DOT + (names.length - 1) * GAP;
            let sx = cx - totalW / 2;
            const sy = cy + th / 2 + 3;
            names.forEach(name => {
                const cfg = ANIM_CFG[name];
                dotCtx.shadowColor = cfg.color; dotCtx.shadowBlur = 4;
                dotCtx.fillStyle = cfg.color; dotCtx.fillRect(sx, sy, DOT, DOT);
                dotCtx.shadowBlur = 0; dotCtx.fillStyle = '#fff';
                dotCtx.font = `bold ${Math.max(4, DOT * 0.75)}px monospace`;
                dotCtx.textAlign = 'center'; dotCtx.textBaseline = 'middle';
                dotCtx.fillText(cfg.short, sx + DOT / 2, sy + DOT / 2 + 0.5);
                sx += DOT + GAP;
            });
        });
        if (foxy && foxy.valid) {
            const lbls = { 1:'Cove closed', 2:'Peeking', 3:'Out of cove', 4:'🦊 RUNNING!' };
            foxyLabel.textContent = 'Foxy: ' + (lbls[foxy.stage] || '?');
        }
    }

    function syncVisibility() {
        const camCanvas = document.getElementById('tablet-cam');
        const isOpen = camCanvas && camCanvas.style.display !== 'none';
        container.style.display = isOpen ? 'flex' : 'none';
    }
    setInterval(syncVisibility, 100);

    // ── M = masquer/afficher dots + infos Foxy ──────────────────
    let showAnimInfo = false;
    window.addEventListener('keydown', function (e) {
        if (e.key !== 'm' && e.key !== 'M') return;
        showAnimInfo = !showAnimInfo;
        mc.style.display        = showAnimInfo ? 'block' : 'none';
        foxyLabel.style.display = showAnimInfo ? 'block' : 'none';
    });

    function updateHighlight() {
        const activeCam = window.activeCam;
        Object.entries(ROOM_LAYOUT).forEach(([id]) => {
            const zone = roomZones[id];
            if (!zone) return;
            const isActive = (activeCam === id);
            zone.style.borderColor     = isActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.55)';
            zone.style.boxShadow       = isActive ? '0 0 5px 1px rgba(255,255,255,0.6)' : '';
            zone.style.backgroundColor = isActive ? 'rgba(139,170,1,1)' : 'rgb(66,66,66)';
        });
    }

    function tick() {
        if (container.style.display !== 'none') {
            updateHighlight();
            if (showAnimInfo) drawMap();
        }
        setTimeout(tick, 100);
    }

    resizeMinimap();
    tick();

    return container;
}
