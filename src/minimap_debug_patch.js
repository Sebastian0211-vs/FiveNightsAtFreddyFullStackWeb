// ============================================================
//  minimap_hud.js
//  <script src="minimap_hud.js"></script> après gamelogic.js
//  Appuie sur M pour afficher/masquer la mini-map
// ============================================================

(function () {

    const ROOM_LAYOUT = {
        show_stage:         { x:  128, y:  45,  w: 105,  h:30,  label: 'Show Stage'  },
        dining_area:        { x:  60, y:  75,  w: 240, h: 145, label: 'Dining Area' },
        backstage:          { x:   10, y:  78,  w: 35,  h: 70,  label: 'Backstage'   },
        pirate_cove:        { x:   22, y: 160,  w: 42,  h: 50,  label: 'Pirate Cove' },
        kitchen:            { x:  265, y:  230,  w: 80,  h: 70,  label: 'Kitchen'     },
        east_hall:          { x:  210, y: 230,  w: 40,  h: 55,  label: 'E.Hall'      },
        east_hall_corner:   { x:  210, y: 290,  w: 40,  h: 55,  label: 'E.Corner'    },
        supply_closet:      { x:  55, y: 250,  w: 40,  h: 70,  label: 'Supply'      },
        west_hall:          { x:   105   , y: 230,  w: 40,  h: 55,  label: 'W.Hall'      },
        west_hall_corner:   { x:   105, y: 290,  w: 40,  h: 55,  label: 'W.Corner'    },
        restrooms:          { x:  310, y: 100,  w: 30,  h: 115,  label: 'Restrooms'   },
        office_left:        {    x:  160, y: 295,  w: 10,  h: 65,  label: 'Left Office'         },
        office_right:        {    x:  190, y: 295,  w: 10,  h: 65,  label: 'Right Office'         },

    };

    const ANIM_CFG = {
        Freddy: { color: '#c8763a', short: 'Fr' },
        Bonnie: { color: '#6666ee', short: 'Bo' },
        Chica:  { color: '#ddbb00', short: 'Ch' },
        Foxy:   { color: '#ee4400', short: 'Fx' },
    };

    const IMG_SIZE = 400;
    const MAP_DISPLAY = 420; // taille affichée en px

    // ── Création de l'overlay ───────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'minimap-hud';
    overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 900;
        display: none;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        background: rgba(0,0,0,0.88);
        border: 2px solid #0f0;
        padding: 14px;
        font-family: 'FNAF', 'Courier New', monospace;
    `;

    overlay.innerHTML = `
        <div style="color:#0f0;font-size:14px;letter-spacing:0.1em;">CAMERA MAP</div>
        <div style="position:relative;width:${MAP_DISPLAY}px;height:${MAP_DISPLAY}px;">
            <img id="mm-hud-bg" src="../assets/map/145.png"
                style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;">
            <canvas id="mm-hud-canvas" width="${MAP_DISPLAY}" height="${MAP_DISPLAY}"
                style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
        </div>
        <div id="mm-hud-legend" style="display:flex;gap:10px;font-size:11px;"></div>
        <div id="mm-hud-foxy" style="font-size:11px;color:#ee4400;min-height:14px;"></div>
        <div style="color:#444;font-size:10px;letter-spacing:0.08em;">[ M ] FERMER</div>
    `;

    document.body.appendChild(overlay);

    // Légende
    const legend = document.getElementById('mm-hud-legend');
    Object.entries(ANIM_CFG).forEach(([name, cfg]) => {
        const span = document.createElement('span');
        span.style.color = cfg.color;
        span.textContent = `■ ${name}`;
        legend.appendChild(span);
    });

    // ── Dessin ──────────────────────────────────────────────────
    const mc  = document.getElementById('mm-hud-canvas');
    const ctx = mc.getContext('2d');

    function drawMap() {
        const scaleX = MAP_DISPLAY / IMG_SIZE;
        const scaleY = MAP_DISPLAY / IMG_SIZE;

        ctx.clearRect(0, 0, MAP_DISPLAY, MAP_DISPLAY);

        // Positions par salle
        const byRoom = {};
        function place(name) {
            const key = getRoom(name);
            if (!key) return;
            (byRoom[key] = byRoom[key] || []).push(name);
        }

        place('Freddy');
        place('Bonnie');
        place('Chica');

        if (typeof foxy !== 'undefined' && foxy.valid) {
            const foxyRoom = foxy.stage >= 4 ? 'west_hall' : 'pirate_cove';
            (byRoom[foxyRoom] = byRoom[foxyRoom] || []).push('Foxy');
        }
        // Salles + dots
        Object.entries(ROOM_LAYOUT).forEach(([id, r]) => {
            const rx = r.x * scaleX, ry = r.y * scaleY;
            const rw = r.w * scaleX, rh = r.h * scaleY;
            const names = byRoom[id] || [];

            // Highlight si occupé
            if (names.length > 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.07)';
                ctx.fillRect(rx, ry, rw, rh);
            }

            // Bordures rouges de repérage — retire ces 3 lignes une fois les coords OK
            ctx.strokeStyle = 'red';
            ctx.lineWidth   = 1.5;
            ctx.strokeRect(rx, ry, rw, rh);

            // Label
            ctx.fillStyle    = names.length > 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
            ctx.font         = '10px monospace';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(r.label, rx + rw / 2, ry + 3);

            // Dots
            const DOT = 11, GAP = 3;
            const totalW = names.length * DOT + (names.length - 1) * GAP;
            let sx = rx + rw / 2 - totalW / 2;
            const sy = ry + rh - DOT - 4;
            names.forEach(name => {
                const cfg = ANIM_CFG[name];
                ctx.fillStyle = cfg.color;
                ctx.fillRect(sx, sy, DOT, DOT);
                ctx.fillStyle    = '#fff';
                ctx.font         = '7px monospace';
                ctx.textAlign    = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(cfg.short, sx + DOT / 2, sy + DOT / 2 + 0.5);
                sx += DOT + GAP;
            });
        });

        // Foxy stage
        const foxyEl = document.getElementById('mm-hud-foxy');
        if (foxyEl && typeof foxy !== 'undefined' && foxy.valid) {
            const labels = { 1:'Cove closed', 2:'Peeking', 3:'Out of cove', 4:'🦊 RUNNING!' };
            foxyEl.textContent = `Foxy — stage ${foxy.stage}: ${labels[foxy.stage] || '?'}`;
        }
    }

    // ── Toggle M ────────────────────────────────────────────────
    let visible = false;

    window.addEventListener('keydown', e => {
        if (e.key !== 'm' && e.key !== 'M') return;
        visible = !visible;
        overlay.style.display = visible ? 'flex' : 'none';
    });

    // ── Boucle de rendu ─────────────────────────────────────────
    function tick() {
        if (visible) drawMap();
        setTimeout(tick, 125);
    }
    tick();

})();