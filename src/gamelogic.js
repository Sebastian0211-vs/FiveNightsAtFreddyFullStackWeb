// ============================================================
//  gamelogic.js  —  Game state, power, animatronic AI, jumpscares
//
//  Depends on:  animations.js  (animation defs)
//  Expects these globals from mainroom_test.html (renderer):
//    state            — door/light state object  { left, right }
//    powerOut         — boolean flag (set here, read by renderer)
//    window._powerOutEyeFrame — string flag read by renderer draw()
//    sfxFan, sfxPhone, sfxLight, sfxCameraLoop, camAudio
//    stopCamVideo()
//    startDoorAnim(side, direction)
//    renderPaused     — boolean, pauses the canvas render loop
//    ctx, W, H        — canvas context + dimensions
// ============================================================


// ── Night / time constants ────────────────────────────────────

const HOURS         = ['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM'];
const NIGHT_SECS    = 535;
const SECS_PER_HOUR = NIGHT_SECS / 6;

// Power drained passively every N seconds (0 = no passive drain on night 1)
const PASSIVE_INTERVAL = { 1: 0, 2: 6, 3: 5, 4: 4, 5: 3, 6: 3, 7: 3 };


// ── Jumpscare engine ──────────────────────────────────────────

/**
 * playJumpscare(def, sfxSrc, onDone, maxDurationMs)
 *   def           — animation definition object (from animations.js)
 *   sfxSrc        — Audio object or path string for the scream SFX
 *   onDone        — callback fired when animation ends (optional)
 *   maxDurationMs — hard cut-off in ms (optional)
 */
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

// Audio refs for jumpscares (created once to avoid repeated instantiation)
const SCREAM  = new Audio('../Assets/FNaF 1 Audio/XSCREAM.wav');
const SCREAM2 = new Audio('../Assets/FNaF 1 Audio/XSCREAM2.wav');
const NOISE   = new Audio('../Assets/FNaF 1 Audio/COMPUTER_DIGITAL_L2076505.wav');

const JUMPSCARE_MAX_MS = 1000;

// Navigation callbacks
const GO_MENU = () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    setTimeout(() => { window.location.href = 'menu.html'; }, 1500);
};

const GO_NOISE = () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    setTimeout(() => { playJumpscare(noiseMenu, NOISE, GO_MENU); }, 500);
};

// Named jumpscare triggers (call these from AI logic or debug)
function playChicaJumpscare()        { playJumpscare(chicajumpscare,        SCREAM,  null,      JUMPSCARE_MAX_MS); }
function playBonnieJumpscare()       { playJumpscare(bonnieJumpscare,       SCREAM,  null,      JUMPSCARE_MAX_MS); }
function playFoxyJumpscare()         { playJumpscare(foxyJumpscare,         SCREAM,  null,      JUMPSCARE_MAX_MS); }
function playFreddyJumpscare()       { playJumpscare(freddyJumpscare,       SCREAM,  null,      JUMPSCARE_MAX_MS); }
function playGoldenFreddyJumpscare() { playJumpscare(goldenFreddyJumpscare, SCREAM2, null,      JUMPSCARE_MAX_MS); }
function playPowerOutJumpscare()     { playJumpscare(freddyJumpscarePowerOut, SCREAM, GO_NOISE, JUMPSCARE_MAX_MS); }
function playNoiseMenu()             { playJumpscare(noiseMenu,             NOISE,   GO_MENU,   JUMPSCARE_MAX_MS); }


// ── GameState ─────────────────────────────────────────────────

// ── Animatronics ──────────────────────────────────────────────

const FREDDY = false;
const CHICA  = false;
const BONNIE = true;
const FOXY   = true;

const base_ai_level = {
    1: {Freddy: 0, Bonnie:0, Chica:0, Foxy:0},
    2: {Freddy: 0, Bonnie:3, Chica:1, Foxy:1},
    3: {Freddy: 1, Bonnie:0, Chica:5, Foxy:2},
    41: {Freddy: 1, Bonnie:2, Chica:4, Foxy:6},
    42: {Freddy: 2, Bonnie:2, Chica:4, Foxy:6},
    5: {Freddy: 3, Bonnie:5, Chica:7, Foxy:5},
    6: {Freddy: 4, Bonnie:10, Chica:12, Foxy:16},
}

const boost_ai_level = {
    AM12: {Freddy: 0, Bonnie:0, Chica:0, Foxy:0},
    AM1: {Freddy: 0, Bonnie:0, Chica:0, Foxy:0},
    AM2: {Freddy: 0, Bonnie:1, Chica:0, Foxy:0},
    AM3: {Freddy: 0, Bonnie:1, Chica:1, Foxy:1},
    AM4: {Freddy: 0, Bonnie:1, Chica:1, Foxy:1},
    AM5: {Freddy: 0, Bonnie:0, Chica:0, Foxy:0},
}


class Animatronic {
    constructor(name, rooms, startRoom = 'show_stage') {
        this.name      = name;
        this.rooms     = rooms;
        this.room      = startRoom;
        this.ai_level  = 10;
        this.moving    = false;
        this.valid     = false;
    }

    tryMove() {
        /*
        if (Math.random() * 20 >= this.ai_level) return;

        const current = this.rooms[this.room];
        if (!current) return;

        const next = current.connections[Math.floor(Math.random() * current.connections.length)];
        if (!next) return;

        ROOMS[this.room].who = ROOMS[this.room].who.filter(n => n !== this.name);
        this.room = next;
        ROOMS[this.room].who.push(this.name);

        console.log(`${this.name} → ${this.room}`);
        */
        return false;
    }

    canAttack(side) {
        return false;
    }
}

class Freddy extends Animatronic {
    constructor() {
        super('Freddy', FreddyRooms);
        this.valid = FREDDY;
    }

    tryMove() {
        if (Math.random() * 20 <= this.ai_level){
            console.log("FREDDY'S MOVING OMG")
        }
        return -1
    }

    canAttack() {
        // Freddy attaque uniquement si la porte droite est ouverte ET que les lumières sont éteintes
        return this.room === 'east_hall_corner'
            && state.right.door === 'open'
            && state.right.light === 'off';
    }
}

class Bonnie extends Animatronic {
    constructor() {
        super('Bonnie', BonnieRooms);
        this.valid = BONNIE;
    }

    tryMove() {
        if (Math.random() * 20 <= this.ai_level){
            console.log("FREDDY'S MOVING OMG")
        }
        return -1
    }

    canAttack() {
        return this.room === 'west_hall_corner'
            && state.left.door === 'open';
    }
}

class Chica extends Animatronic {
    constructor() {
        super('Chica', ChicaRooms);
        this.valid = CHICA;
    }

    tryMove() {
        if (Math.random() * 20 <= this.ai_level){
            console.log("FREDDY'S MOVING OMG")
        }
        return -1
    }

    canAttack() {
        return this.room === 'east_hall_corner'
            && state.right.door === 'open';
    }
}


class Foxy extends Animatronic {
    constructor() {
        super('Foxy', {});
        this.valid      = FOXY;
        this.stage      = 1;       // 1 = cove closed, 2 = peeking, 3 = out, 4 = running
        this.locked     = false;   // post-tablet lock window
        this.lockTimer  = null;
        this.sprintTimer = null;
        this.bangCount  = 0;       // how many times he's banged this night
    }

    // ── Called by mainroom whenever the tablet is closed ─────────
    onTabletClose() {
        const lockMs = (0.83 + Math.random() * (16.67 - 0.83)) * 1000;
        this.locked = true;
        if (this.lockTimer) clearTimeout(this.lockTimer);
        this.lockTimer = setTimeout(() => { this.locked = false; }, lockMs);
        console.log(`[Foxy] locked for ${(lockMs / 1000).toFixed(2)}s`);
    }

    // ── Called every 5.01 s ──────────────────────────────────────
    tryMove() {
        if (this.stage >= 4) return;              // already running, no more ticks needed
        if (this.locked)          return;          // post-tablet lock → auto-fail
        if (window.isTabletOpen)  return;          // tablet open → auto-fail

        if (Math.random() * 20 >= this.ai_level) return; // normal AI roll

        this.stage++;
        console.log(`[Foxy] stage → ${this.stage}`);

        if (this.stage === 4) this._startSprint();
    }

    // ── Sprint: 25 s countdown, then attack ─────────────────────
    _startSprint() {
        console.log('[Foxy] RUNNING — 25 s to attack');
        window.foxyRunning    = true;
        window.foxyRunAnimDone = false;
        this._runSfxPlayed = false;

        if (this.sprintTimer)  clearTimeout(this.sprintTimer);
        if (this._runSfxTimer) clearTimeout(this._runSfxTimer);

        // Play run SFX at the 22 s mark (last 3 s of the 25 s window)
        this._runSfxTimer = setTimeout(() => this._playRunSfx(), 22000);
        this.sprintTimer  = setTimeout(() => this._attack(),     25000);
    }

    _playRunSfx() {
        if (this._runSfxPlayed) return;
        this._runSfxPlayed = true;
        const sfx = new Audio('../Assets/FNaF 1 Audio/run.wav');
        sfx.volume = 0.9;
        sfx.play().catch(() => {});
    }

    // Called by the renderer when the player switches to cam 2A while Foxy is running
    onWatchRunCam() {
        this._playRunSfx();

        // Cancel the original 25 s countdown and the scheduled sfx timer
        if (this.sprintTimer)  { clearTimeout(this.sprintTimer);  this.sprintTimer  = null; }
        if (this._runSfxTimer) { clearTimeout(this._runSfxTimer); this._runSfxTimer = null; }

        // Give the player 3 s to close the left door
        console.log('[Foxy] Seen running — 3 s to close door');
        this.sprintTimer = setTimeout(() => this._attack(), 3000);
    }

    // ── Attack resolution ────────────────────────────────────────
    _attack() {
        window.foxyRunning = false;
        window._foxyRunCamSfxTriggered = false;
        this.sprintTimer = null;

        if (state.left.door === 'open') {
            // Door open → jumpscare
            playFoxyJumpscare();
        } else {
            // Door closed → bang! power penalty + retreat
            this._bangDoor();
        }
    }

    // ── Door bang: 1% → 7% → 13% → 13% cap ─────────────────────
    _bangDoor() {
        const pct     = Math.min(1 + this.bangCount * 6, 13); // percent
        const rawDrain = pct * 10;                             // rawPower units (999 base = 99.9%)
        GameState.rawPower = Math.max(0, GameState.rawPower - rawDrain);
        this.bangCount++;

        // Retreat to stage 1 or 2 (50/50)
        this.stage = Math.random() < 0.5 ? 1 : 2;
        console.log(`[Foxy] banged door! −${pct}% power. Retreats to stage ${this.stage}`);

        // Door bang SFX
        const bangSfx = new Audio('../Assets/FNaF 1 Audio/knock2.wav');
        bangSfx.volume = 0.8;
        bangSfx.play().catch(() => {});
    }

    canAttack() { return false; } // attack is handled internally via timer
}




const FreddyRooms = {
    show_stage:       { label: 'Show Stage',          connections: ['dining_area'] },
    dining_area:      { label: 'Dining Area',          connections: ['restrooms'] },
    restrooms:        { label: 'Restrooms',            connections: ['kitchen'] },
    kitchen:          { label: 'Kitchen',              connections: ['east_hall'] },
    east_hall:        { label: 'East Hall',            connections: ['east_hall_corner'] },
    east_hall_corner: { label: 'East Hall Corner',     connections: [] }, // fin de chemin
};

const BonnieRooms = {
    show_stage:         { label: 'Show Stage',         connections: ['dining_area', 'backstage'] },
    dining_area:        { label: 'Dining Area',         connections: ['backstage', 'west_hall'] },
    backstage:          { label: 'Backstage',           connections: ['dining_area', 'west_hall'] },
    west_hall:          { label: 'West Hall',           connections: ['dining_area', 'west_hall_corner', 'supply_closet'] },
    supply_closet:      { label: 'Supply Closet',       connections: ['office_left', 'west_hall', 'dining_area'] },
    west_hall_corner:   { label: 'West Hall Corner',    connections: ['supply_closet', 'office_left', 'dining_area'] },
    office_left:        { label: 'Office (Left)',        connections: [] }, // fin de chemin
};

const ChicaRooms = {
    show_stage:       { label: 'Show Stage',            connections: ['dining_area'] },
    dining_area:      { label: 'Dining Area',           connections: ['restrooms', 'kitchen'] },
    restrooms:        { label: 'Restrooms',             connections: ['kitchen', 'east_hall'] },
    kitchen:          { label: 'Kitchen',               connections: ['restrooms', 'east_hall'] },
    east_hall:        { label: 'East Hall',             connections: ['dining_area', 'east_hall_corner'] },
    east_hall_corner: { label: 'East Hall Corner',      connections: ['east_hall'] }, // fin de chemin
    office_right:     { label: 'Office (Right)',         connections: [] },
};


// ── Map globale des salles ────────────────────────────────────

const ROOMS = {
    show_stage:         { who: ['Freddy', 'Chica', 'Bonnie'] },
    dining_area:        { who: [] },
    backstage:          { who: [] },
    kitchen:            { who: [] },
    restrooms:          { who: [] },
    east_hall:          { who: [] },
    east_hall_corner:   { who: [] },
    west_hall:          { who: [] },
    west_hall_corner:   { who: [] },
    supply_closet:      { who: [] },
    pirate_cove:        { who: [] },
    office_left:        { who: [] },
    office_right:       { who: [] },
};


// ── Instances ─────────────────────────────────────────────────

const freddy = new Freddy();
const bonnie = new Bonnie();
const chica  = new Chica();
const foxy   = new Foxy();

const ANIMATRONICS = [freddy, bonnie, chica, foxy];

const GameState = {
    night:          1,
    rawPower:       999,
    secondsElapsed: 0,
    passiveAccum:   0,

    // ── Power usage ──────────────────────────────────────────
    // 1 base + 1 per closed door + 1 per active light, capped at 5
    getUsage() {
        let u = 1;
        if (state.left.door   === 'closed') u++;
        if (state.right.door  === 'closed') u++;
        if (state.left.light  === 'on')     u++;
        if (state.right.light === 'on')     u++;
        return Math.min(u, 5);
    },

    // ── Called every second ──────────────────────────────────
    tick() {
        if (this.rawPower <= 0) {
            this.rawPower = 0;
            this.render();
            this.onPowerOut();
            return;
        }

        // Active usage drain
        this.rawPower -= this.getUsage();

        // Passive drain (scales with night)
        const interval = PASSIVE_INTERVAL[this.night] || 0;
        if (interval > 0) {
            this.passiveAccum++;
            if (this.passiveAccum >= interval) {
                this.passiveAccum = 0;
                this.rawPower--;
            }
        }

        this.rawPower = Math.max(0, this.rawPower);
        this.secondsElapsed++;

        if (this.secondsElapsed >= NIGHT_SECS) {
            this.on6AM();
            return;
        }

        this.render();
    },

    // ── HUD helpers ──────────────────────────────────────────
    getDisplayPercent() { return (Math.round(this.rawPower) / 10).toFixed(1); },
    getCurrentHour()    { return Math.min(6, Math.floor(this.secondsElapsed / SECS_PER_HOUR)); },

    // ── HUD render ───────────────────────────────────────────
    render() {
        const usage = this.getUsage();
        document.getElementById('hud-night').textContent     = `Night ${this.night}`;
        document.getElementById('hud-time').textContent      = HOURS[this.getCurrentHour()];
        document.getElementById('hud-power-val').textContent = `${this.getDisplayPercent()}%`;
        const batteryMap = { 1: '212', 2: '213', 3: '214', 4: '456', 5: '455' };
        document.getElementById('hud-battery-img').src = `../Assets/Battery/${batteryMap[usage] || '212'}.png`;
    },

    // ── Power out sequence ───────────────────────────────────
    onPowerOut() {
        if (this._powerOutTriggered) return;
        this._powerOutTriggered = true;

        powerOut = true;
        window._powerOutEyeFrame = '304';

        // Hide HUD and interactive elements
        document.getElementById('hud-top-right').style.display = 'none';
        document.getElementById('hud-power').style.display     = 'none';
        document.getElementById('hud-usage').style.display     = 'none';
        document.getElementById('tablet-bar').style.display    = 'none';
        document.querySelectorAll('.btn-zone').forEach(z => z.style.display = 'none');

        // Kill all audio
        [sfxFan, sfxPhone, sfxLight, sfxCameraLoop, camAudio].forEach(a => {
            a.pause();
            a.currentTime = 0;
        });
        stopCamVideo();

        // Open both doors
        ['left', 'right'].forEach(side => {
            state[side].door  = 'open';
            state[side].light = 'off';
            startDoorAnim(side, -1);
        });

        // Power-down sound
        const powerOutsfx = new Audio('../Assets/FNaF 1 Audio/powerdown.wav');
        powerOutsfx.play().catch(() => {});

        // ── Freddy approaches ────────────────────────────────
        setTimeout(() => {
            const steps1 = new Audio('../Assets/FNaF 1 Audio/deep steps.wav');
            steps1.volume = 0.15;
            steps1.play().catch(() => {});

            steps1.addEventListener('ended', () => {
                const steps2 = new Audio('../Assets/FNaF 1 Audio/deep steps.wav');
                steps2.volume = 0.45;
                steps2.play().catch(() => {});

                setTimeout(() => {
                    const steps3 = new Audio('../Assets/FNaF 1 Audio/deep steps.wav');
                    steps3.volume = 0.85;
                    steps3.play().catch(() => {});

                    steps3.addEventListener('ended', () => {

                        // ── Freddy music-box + eye flicker ───────────────
                        const musicBox = new Audio('../Assets/FNaF 1 Audio/music box.wav');
                        window._powerOutEyeFrame = '304';

                        // Build flicker schedule
                        const schedule = [];
                        const flickerPattern = (() => {
                            const pattern = [];
                            function addPhase1(startT, dur) {
                                let t = startT;
                                while (t < startT + dur) {
                                    pattern.push({ img: '305', t }); t += 50;
                                    pattern.push({ img: '304', t }); t += 25;
                                }
                                return t;
                            }
                            function addPhase2(startT, dur) {
                                let t = startT;
                                while (t < startT + dur) {
                                    pattern.push({ img: '305', t }); t += 250;
                                    pattern.push({ img: '304', t }); t += 150;
                                }
                                return t;
                            }
                            function addPhase2Fast(startT, dur) {
                                let t = startT;
                                while (t < startT + dur) {
                                    pattern.push({ img: '305', t }); t += 100;
                                    pattern.push({ img: '304', t }); t += 80;
                                }
                                return t;
                            }
                            let t = 200;
                            t = addPhase2(t, 4000);
                            t = addPhase1(t, 1500);
                            t = addPhase2(t, 1200);
                            t = addPhase1(t, 1000);
                            t += 200;
                            t = addPhase2(t, 1000);
                            t = addPhase1(t, 1500);
                            t += 200;
                            t = addPhase2(t, 2000);
                            t = addPhase1(t, 1500);
                            t = addPhase2(t, 1200);
                            t = addPhase1(t, 1000);
                            t = addPhase2Fast(t, 3000);
                            return pattern.sort((a, b) => a.t - b.t);
                        })();

                        flickerPattern.forEach(e => schedule.push(e));
                        schedule.sort((a, b) => a.t - b.t);
                        schedule.forEach(({ img, t }) =>
                            setTimeout(() => { window._powerOutEyeFrame = img; }, t)
                        );

                        musicBox.play().catch(() => {});

                        // ── After ~20 s: Freddy jumpscare ────────────────
                        setTimeout(() => {
                            musicBox.pause();
                            window._powerOutEyeFrame = 'black';

                            // Brief light-flicker before jumpscare
                            const flickSeq = [
                                { play: true,  duration: 100 },
                                { play: false, duration: 50  },
                                { play: true,  duration: 80  },
                                { play: false, duration: 50  },
                                { play: true,  duration: 120 },
                                { play: false, duration: 100 },
                            ];
                            let ft = 0;
                            flickSeq.forEach(({ play, duration }) => {
                                setTimeout(() => {
                                    if (play) {
                                        const buzz = new Audio('../Assets/FNaF 1 Audio/Buzz_Fan_Florescent2.wav');
                                        buzz.volume = 1;
                                        buzz.play().catch(() => {});
                                        setTimeout(() => buzz.pause(), duration);
                                        window._powerOutEyeFrame = '304';
                                    } else {
                                        window._powerOutEyeFrame = 'black';
                                    }
                                }, ft);
                                ft += duration;
                            });

                            setTimeout(() => {
                                window._powerOutEyeFrame = 'black';
                                const steps4 = new Audio('../Assets/FNaF 1 Audio/deep steps.wav');
                                steps4.volume = 1;
                                steps4.play().catch(() => {});
                                steps4.addEventListener('ended', () => {
                                    window._powerOutEyeFrame = 'jumpscare';
                                    playPowerOutJumpscare();
                                });
                            }, 500);

                        }, 20000);
                    });
                }, 4000);
            });
        }, 3000);
    },

    // ── Night complete ───────────────────────────────────────
    on6AM() {
        console.log('6 AM — night complete');
        // TODO: show 6 AM screen, increment night, navigate
    },
};


// ── Camera system ────────────────────────────────────────────

const CAM_BASE = '../Assets/Cam_views/';

// All selectable cameras
const CAMS = [
    { id: '1A', label: 'CAM 1A', room: 'show_stage'       },
    { id: '1B', label: 'CAM 1B', room: 'dining_area'      },
    { id: '1C', label: 'CAM 1C', room: 'pirate_cove'      },
    { id: '2A', label: 'CAM 2A', room: 'west_hall'        },
    { id: '2B', label: 'CAM 2B', room: 'west_hall_corner' },
    { id: '3',  label: 'CAM 3',  room: 'backstage'        },
    { id: '4A', label: 'CAM 4A', room: 'east_hall'        },
    { id: '4B', label: 'CAM 4B', room: 'east_hall_corner' },
    { id: '5',  label: 'CAM 5',  room: 'supply_closet'    },
    { id: '7',  label: 'CAM 7',  room: 'restrooms'        },
];

// Pick one randomly from an array
function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Per-room cache: { key: string, path: string }
const _camCache = {};

// Stable pick — only re-rolls when room occupants or foxy stage changes
function _stablePick(room, arr, extraKey) {
    const who   = (ROOMS[room] && ROOMS[room].who) ? [...ROOMS[room].who].sort().join(',') : '';
    const key   = who + '|' + (extraKey ?? '');
    const cache = _camCache[room];
    if (cache && cache.key === key) return cache.path;
    const path = _pick(arr);
    _camCache[room] = { key, path };
    return path;
}

// Returns the image path to display for a given room, based on who's there
function getCamImagePath(room) {
    const who = (ROOMS[room] && ROOMS[room].who) ? ROOMS[room].who : [];
    const hasFreddy = who.includes('Freddy');
    const hasBonnie = who.includes('Bonnie');
    const hasChica  = who.includes('Chica');

    switch (room) {

        case 'show_stage':
            if (hasFreddy && hasBonnie && hasChica)
                return _stablePick(room, ['All_1.png', 'All_2.png']).replace(/^/, CAM_BASE + 'show stage/');
            if (hasBonnie && hasFreddy)  return CAM_BASE + 'show stage/Bonnie_Freddy.png';
            if (hasChica  && hasFreddy)  return CAM_BASE + 'show stage/chica_freddy.png';
            if (hasFreddy)               return _stablePick(room, ['Freddy_1.png', 'Freddy_2.png']).replace(/^/, CAM_BASE + 'show stage/');
            return CAM_BASE + 'show stage/Empty.png';

        case 'dining_area':
            if (hasBonnie) return _stablePick(room, ['Bonnie_1.png', 'Bonnie_2.png']).replace(/^/, CAM_BASE + 'Dining Area/');
            if (hasChica)  return _stablePick(room, ['Chica_1.png',  'Chica_2.png']).replace(/^/, CAM_BASE + 'Dining Area/');
            if (hasFreddy) return CAM_BASE + 'Dining Area/Freddy.png';
            return CAM_BASE + 'Dining Area/Empty.png';

        case 'pirate_cove': {
            if (!foxy || !foxy.valid) return CAM_BASE + 'Pirate Cove/stage_1.png';
            if (foxy.stage === 4)
                return CAM_BASE + 'Pirate Cove/' + (Math.floor(Date.now() / 500) % 2 === 0 ? 'stage_4_1.png' : 'stage_4_2.png');
            return CAM_BASE + `Pirate Cove/stage_${foxy.stage}.png`;
        }

        case 'west_hall':
            if (hasBonnie) return CAM_BASE + 'West Hall/Bonnie.png';
            return CAM_BASE + 'West Hall/empty_lightson.png';

        case 'west_hall_corner':
            if (hasBonnie) return _stablePick(room, ['Bonnie_1.png', 'Bonnie_2.png', 'Bonnie_3.png']).replace(/^/, CAM_BASE + 'West Hall Corner/');
            if (hasFreddy) return CAM_BASE + 'West Hall Corner/Golden_Freddy.png';
            return _stablePick(room, ['Empty_1.png', 'Empty_2.png']).replace(/^/, CAM_BASE + 'West Hall Corner/');

        case 'backstage':
            if (hasBonnie) return _stablePick(room, ['Bonnie.png', 'Bonnie_close.png']).replace(/^/, CAM_BASE + 'Backstage/');
            if (hasFreddy) return CAM_BASE + 'Backstage/Freddy.png';
            return _stablePick(room, ['Empty_1.png', 'Empty_2.png']).replace(/^/, CAM_BASE + 'Backstage/');

        case 'east_hall':
            if (hasChica)  return _stablePick(room, ['Chica_1.png', 'Chica_2.png']).replace(/^/, CAM_BASE + 'East Hall/');
            if (hasFreddy) return CAM_BASE + 'East Hall/Freddy.png';
            return _stablePick(room, ['Empty_1.png', 'Empty_2.png', 'Empty_3.png']).replace(/^/, CAM_BASE + 'East Hall/');

        case 'east_hall_corner':
            if (hasChica)  return _stablePick(room, ['Chica_1.png', 'Chica_2.png', 'Chica_3.png']).replace(/^/, CAM_BASE + 'East Hall Corner/');
            if (hasFreddy) return CAM_BASE + 'East Hall Corner/Freddy.png';
            return _stablePick(room, ['Empty_1.png', 'Empty_2.png', 'Empty_3.png', 'Empty_4.png', 'Empty_5.png']).replace(/^/, CAM_BASE + 'East Hall Corner/');

        case 'restrooms':
            if (hasChica)  return _stablePick(room, ['Chica_1.png', 'Chica_2.png']).replace(/^/, CAM_BASE + 'Restrooms/');
            if (hasFreddy) return CAM_BASE + 'Restrooms/Freddy.png';
            return CAM_BASE + 'Restrooms/Empty.png';

        case 'supply_closet':
            if (hasBonnie) return CAM_BASE + 'Supply Closet/Bonnie.png';
            return CAM_BASE + 'Supply Closet/Empty.png';

        default:
            return null;
    }
}


// ── Animatronic movement intervals (ms) ──────────────────────
const ANIM_INTERVALS = {
    freddy: 3020,
    bonnie: 4970,
    chica:  4980,
    foxy:   5010,
};

// ── Start the game loop ───────────────────────────────────────
function initGameLogic() {
    // Power / time tick — every 1 s
    setInterval(() => GameState.tick(), 1000);
    GameState.render();

    // Independent animatronic movement ticks
    setInterval(() => { if (freddy.valid) freddy.tryMove(); }, ANIM_INTERVALS.freddy);
    setInterval(() => { if (bonnie.valid) bonnie.tryMove(); }, ANIM_INTERVALS.bonnie);
    setInterval(() => { if (chica.valid)  chica.tryMove();  }, ANIM_INTERVALS.chica);
    setInterval(() => { if (foxy.valid)   foxy.tryMove();   }, ANIM_INTERVALS.foxy);

    // Expose globals the renderer needs
    window.foxyRunning  = false;
    window.isTabletOpen = false;
    window.activeCam    = null;    // set by cam selector when built — 'west_hall', etc.
}