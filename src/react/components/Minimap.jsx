import { useEffect, useRef, useCallback } from 'react';
import { ROOMS, CAMS } from '../../data/rooms.js';

// ── Room layout (pixel coords on the 400×400 map image) ───────
const ROOM_LAYOUT = {
  show_stage:         { x:  80, y:  25, w: 105, h:  30, camId: '1A' },
  dining_area:        { x:  60, y:  75, w: 240, h: 145, camId: '1B' },
  backstage:          { x:  10, y:  78, w:  35, h:  70, camId: '3'  },
  pirate_cove:        { x:  22, y: 160, w:  42, h:  50, camId: '1C' },
  kitchen:            { x: 265, y: 230, w:  80, h:  70, camId: '6'  },
  east_hall:          { x: 210, y: 230, w:  40, h:  55, camId: '4A' },
  east_hall_corner:   { x: 210, y: 290, w:  40, h:  55, camId: '4B' },
  supply_closet:      { x:  55, y: 250, w:  40, h:  70, camId: '5'  },
  west_hall:          { x: 105, y: 230, w:  40, h:  55, camId: '2A' },
  west_hall_corner:   { x: 105, y: 290, w:  40, h:  55, camId: '2B' },
  restrooms:          { x: 310, y: 100, w:  30, h: 115, camId: '7'  },
};

const CAM_THUMB = {
  '1A': '/assets/Text_Box/cam_1a_trans.png',
  '1B': '/assets/Text_Box/cam_1b_trans.png',
  '1C': '/assets/Text_Box/cam_1c_trans.png',
  '2A': '/assets/Text_Box/cam_2a_trans.png',
  '2B': '/assets/Text_Box/cam_2b_trans.png',
  '3':  '/assets/Text_Box/cam_3_trans.png',
  '4A': '/assets/Text_Box/cam_4a_trans.png',
  '4B': '/assets/Text_Box/cam_4b.png',
  '5':  '/assets/Text_Box/cam_5_trans.png',
  '6':  '/assets/Text_Box/cam_6_trans.png',
  '7':  '/assets/Text_Box/cam_7_trans.png',
};

const ANIM_CFG = {
  Freddy: { color: '#c8763a', short: 'Fr' },
  Bonnie: { color: '#6666ee', short: 'Bo' },
  Chica:  { color: '#ddbb00', short: 'Ch' },
  Foxy:   { color: '#ee4400', short: 'Fx' },
};

const IMG_SIZE = 400;

function getMapSize() {
  return Math.min(window.innerWidth * 0.30, window.innerHeight * 0.50);
}

export default function Minimap() {
  const containerRef = useRef(null);
  const dotCanvasRef = useRef(null);
  const sizeRef      = useRef(getMapSize());
  const showInfoRef  = useRef(false);    // toggled by M key
  const foxyLabelRef = useRef(null);

  // ── Check if tablet is open (syncs visibility) ────────────────
  function isTabletOpen() {
    const cam = document.getElementById('tablet-cam');
    return cam && cam.style.display !== 'none';
  }

  // ── Compute scaled zone rect ──────────────────────────────────
  function getRoomRect(roomId, mapSize) {
    const r  = ROOM_LAYOUT[roomId];
    if (!r) return null;
    const sc = mapSize / IMG_SIZE;
    const tw = mapSize * 0.145;
    const th = mapSize * 0.092;
    const cx = (r.x + r.w / 2) * sc;
    const cy = (r.y + r.h / 2) * sc;
    return { x: cx - tw / 2, y: cy - th / 2, w: tw, h: th };
  }

  // ── Draw animatronic dots onto the canvas ─────────────────────
  const drawDots = useCallback(() => {
    const canvas = dotCanvasRef.current;
    if (!canvas) return;
    const mapSize = sizeRef.current;
    canvas.width  = mapSize;
    canvas.height = mapSize;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, mapSize, mapSize);

    if (!showInfoRef.current) return;

    const byRoom = {};
    ['Freddy', 'Bonnie', 'Chica'].forEach(name => {
      const key = Object.keys(ROOMS).find(k => ROOMS[k].who?.includes(name));
      if (key) { byRoom[key] = byRoom[key] || []; byRoom[key].push(name); }
    });

    // Foxy
    const foxyStage = window._foxyStage ?? 1;
    const foxyRunning = window.foxyRunning;
    const foxyRoom = (foxyRunning || foxyStage >= 4) ? 'west_hall' : 'pirate_cove';
    byRoom[foxyRoom] = byRoom[foxyRoom] || [];
    byRoom[foxyRoom].push('Foxy');

    const sc  = mapSize / IMG_SIZE;
    const th  = mapSize * 0.092;
    const DOT = Math.max(4, mapSize * 0.027);
    const GAP = Math.max(1, mapSize * 0.008);

    Object.entries(byRoom).forEach(([roomId, names]) => {
      const r = ROOM_LAYOUT[roomId];
      if (!r || !names.length) return;
      const cx = (r.x + r.w / 2) * sc;
      const cy = (r.y + r.h / 2) * sc;
      const totalW = names.length * DOT + (names.length - 1) * GAP;
      let sx = cx - totalW / 2;
      const sy = cy + th / 2 + 3;

      names.forEach(name => {
        const cfg = ANIM_CFG[name];
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur  = 4;
        ctx.fillStyle   = cfg.color;
        ctx.fillRect(sx, sy, DOT, DOT);
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = '#fff';
        ctx.font        = `bold ${Math.max(4, DOT * 0.75)}px monospace`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.short, sx + DOT / 2, sy + DOT / 2 + 0.5);
        sx += DOT + GAP;
      });
    });

    // Foxy label
    if (foxyLabelRef.current) {
      const lbls = { 1: 'Cove closed', 2: 'Peeking', 3: 'Out of cove', 4: '🦊 RUNNING!' };
      foxyLabelRef.current.textContent = `Foxy: ${lbls[foxyStage] || '?'}`;
    }
  }, []);

  // ── Update zone highlights based on activeCam ─────────────────
  const updateHighlights = useCallback(() => {
    const activeCam = window.activeCam;
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll('[data-room]').forEach(zone => {
      const isActive = zone.dataset.room === activeCam;
      zone.style.borderColor     = isActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.55)';
      zone.style.boxShadow       = isActive ? '0 0 5px 1px rgba(255,255,255,0.6)' : '';
      zone.style.backgroundColor = isActive ? 'rgba(139,170,1,1)' : 'rgb(66,66,66)';
    });
  }, []);

  // ── Resize all zones ──────────────────────────────────────────
  const resize = useCallback(() => {
    const mapSize = getMapSize();
    sizeRef.current = mapSize;
    const container = containerRef.current;
    if (!container) return;

    const inner = container.querySelector('[data-inner]');
    if (inner) { inner.style.width = mapSize + 'px'; inner.style.height = mapSize + 'px'; }

    const canvas = dotCanvasRef.current;
    if (canvas) { canvas.width = mapSize; canvas.height = mapSize; }

    const tw = mapSize * 0.145;
    const th = mapSize * 0.092;
    const iw = tw * 0.55;
    const ih = th * 0.79;
    const fontSize = Math.max(7, mapSize * 0.032);

    if (foxyLabelRef.current) foxyLabelRef.current.style.fontSize = fontSize + 'px';

    container.querySelectorAll('[data-room]').forEach(zone => {
      const rect = getRoomRect(zone.dataset.room, mapSize);
      if (!rect) return;
      zone.style.left   = rect.x + 'px';
      zone.style.top    = rect.y + 'px';
      zone.style.width  = tw + 'px';
      zone.style.height = th + 'px';
      const img = zone.querySelector('img');
      if (img) { img.style.width = iw + 'px'; img.style.height = ih + 'px'; }
    });
  }, []);

  // ── Main effect: mount zones + loops ──────────────────────────
  useEffect(() => {
    // Build zone elements dynamically so we only need one useEffect
    const container  = containerRef.current;
    const inner      = container?.querySelector('[data-inner]');
    if (!inner) return;

    const mapSize = sizeRef.current;
    const tw = mapSize * 0.145;
    const th = mapSize * 0.092;
    const iw = tw * 0.55;
    const ih = th * 0.79;

    // Create one clickable zone per room that has a camera
    Object.entries(ROOM_LAYOUT).forEach(([roomId, r]) => {
      if (!r.camId) return;
      const zone = document.createElement('div');
      zone.dataset.room = roomId;
      zone.title = `CAM ${r.camId}`;

      const rect = getRoomRect(roomId, mapSize);
      Object.assign(zone.style, {
        position:        'absolute',
        boxSizing:       'border-box',
        border:          '2px solid rgba(255,255,255,0.55)',
        background:      'rgb(66,66,66)',
        cursor:          'pointer',
        display:         'flex',
        alignItems:      'flex-start',
        justifyContent:  'flex-start',
        left:            (rect?.x ?? 0) + 'px',
        top:             (rect?.y ?? 0) + 'px',
        width:           tw + 'px',
        height:          th + 'px',
      });

      const thumb = document.createElement('img');
      thumb.src = CAM_THUMB[r.camId] || '';
      Object.assign(thumb.style, {
        marginLeft:   '2px',
        objectFit:    'contain',
        display:      'block',
        pointerEvents:'none',
        flexShrink:   '0',
        width:        iw + 'px',
        height:       ih + 'px',
      });
      zone.appendChild(thumb);

      zone.addEventListener('click', () => {
        if (typeof window.selectCam === 'function') {
          window.selectCam(roomId);
        } else {
          window.activeCam = roomId;
        }
      });
      zone.addEventListener('mouseenter', () => {
        zone.style.borderColor = 'rgba(255,255,255,1)';
      });
      zone.addEventListener('mouseleave', () => {
        if (window.activeCam !== roomId) {
          zone.style.borderColor = 'rgba(255,255,255,0.55)';
        }
      });

      inner.appendChild(zone);
    });

    // Tick loop: sync visibility + highlights + dots @ 10 fps
    const visibilityId = setInterval(() => {
      if (!container) return;
      container.style.display = isTabletOpen() ? 'flex' : 'none';
      updateHighlights();
      drawDots();
    }, 100);

    // M key → toggle dots / foxy label
    function onKey(e) {
      if (e.key !== 'm' && e.key !== 'M') return;
      showInfoRef.current = !showInfoRef.current;
      const canvas = dotCanvasRef.current;
      if (canvas) canvas.style.display = showInfoRef.current ? 'block' : 'none';
      if (foxyLabelRef.current) foxyLabelRef.current.style.display = showInfoRef.current ? 'block' : 'none';
    }
    window.addEventListener('keydown', onKey);

    window.addEventListener('resize', resize);

    return () => {
      clearInterval(visibilityId);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', resize);
      // Remove all dynamically created zones
      inner.querySelectorAll('[data-room]').forEach(z => z.remove());
    };
  }, [drawDots, updateHighlights, resize]);

  const mapSize = sizeRef.current;

  return (
    <div
      ref={containerRef}
      id="minimap-tablet"
      style={{
        position:      'fixed',
        bottom:        '2vh',
        right:         '1vw',
        zIndex:        200,
        display:       'none',   // controlled by interval
        flexDirection: 'column',
        alignItems:    'flex-end',
        gap:           3,
        pointerEvents: 'auto',
      }}
    >
      {/* Map wrapper */}
      <div
        data-inner
        style={{
          position:   'relative',
          width:      mapSize,
          height:     mapSize,
          background: 'transparent',
          overflow:   'hidden',
        }}
      >
        {/* Background map image */}
        <img
          src="/assets/map/145.png"
          alt=""
          style={{
            position:      'absolute',
            inset:         0,
            width:         '100%',
            height:        '100%',
            objectFit:     'contain',
            pointerEvents: 'none',
            opacity:       1,
          }}
        />

        {/* Dot canvas — shown only when M is pressed */}
        <canvas
          ref={dotCanvasRef}
          style={{
            position:      'absolute',
            inset:         0,
            width:         '100%',
            height:        '100%',
            pointerEvents: 'none',
            zIndex:        10,
            display:       'none',
          }}
        />
        {/* Room zones are appended to [data-inner] imperatively in useEffect */}
      </div>

      {/* Foxy stage label — hidden until M pressed */}
      <div
        ref={foxyLabelRef}
        style={{
          fontFamily: "'Courier New', monospace",
          color:      '#ee4400',
          minHeight:  12,
          textAlign:  'right',
          textShadow: '0 0 4px #ee4400',
          fontSize:   Math.max(7, mapSize * 0.032),
          display:    'none',
        }}
      />
    </div>
  );
}
