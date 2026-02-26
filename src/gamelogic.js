// ============================================================
//  gamelogic.js  —  Game state, power, animatronic AI, jumpscares
//
//  Depends on:  animations.js  (animation defs)
//  Expects these globals from mainroom.html (renderer):
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
const NIGHT_SECS    = 535; //535
const SECS_PER_HOUR = NIGHT_SECS / 6;

// Power drained passively every N seconds (0 = no passive drain on night 1)
const PASSIVE_INTERVAL = { 1: 0, 2: 6, 3: 5, 4: 4, 5: 3, 6: 3, 7: 3 };


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
        if (window.isTabletOpen ) u++;
        return Math.min(u, 5);
    },

    // ── Called every second ──────────────────────────────────
    tick() {
        // Always drain power and advance time first so 6AM can fire even if
        // power runs out on the same tick (or during the power-out sequence).

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

        // 6AM wins even if power is also 0 this tick
        if (this.secondsElapsed >= NIGHT_SECS) {
            this.on6AM();
            return;
        }

        // Power out — kick off the sequence once, then keep returning each tick
        if (this.rawPower <= 0) {
            this.render();
            this.onPowerOut();
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
        document.getElementById('hud-power-val').textContent = `${Math.ceil(this.getDisplayPercent())}%`;
        const batteryMap = { 1: '212', 2: '213', 3: '214', 4: '456', 5: '455' };
        document.getElementById('hud-battery-img').src = `../Assets/Battery/${batteryMap[usage] || '212'}.png`;
    },

    // ── Power out sequence ───────────────────────────────────
    onPowerOut() {
        if (this._powerOutTriggered) return;
        this._powerOutTriggered = true;

        // Collect every setTimeout ID spawned by this sequence so on6AM can
        // cancel them all immediately instead of relying on guard checks.
        this._powerOutTimers = [];
        this._musicBox       = null;

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
        this._powerOutTimers.push(setTimeout(() => {
            if(this._6amTriggered) return; // night over → abort sequence
            const steps1 = new Audio('../Assets/FNaF 1 Audio/deep steps.wav');
            steps1.volume = 0.15;
            steps1.play().catch(() => {});

            steps1.addEventListener('ended', () => {
                const steps2 = new Audio('../Assets/FNaF 1 Audio/deep steps.wav');
                steps2.volume = 0.45;
                steps2.play().catch(() => {});

                setTimeout(() => {
                    if(this._6amTriggered) return; // night over → abort sequence
                    const steps3 = new Audio('../Assets/FNaF 1 Audio/deep steps.wav');
                    steps3.volume = 0.85;
                    steps3.play().catch(() => {});

                    steps3.addEventListener('ended', () => {

                        // ── Freddy music-box + eye flicker ───────────────
                        const musicBox = new Audio('../Assets/FNaF 1 Audio/music box.wav');
                        window._powerOutEyeFrame = '304';

                        this._musicBox = musicBox;

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
                            this._powerOutTimers.push(
                                setTimeout(() => {
                                    if(this._6amTriggered) return;
                                    window._powerOutEyeFrame = img; }, t)
                            )
                        );

                        musicBox.play().catch(() => {});

                        // ── After ~20 s: Freddy jumpscare ────────────────
                        this._powerOutTimers.push(setTimeout(() => {
                            if(this._6amTriggered) return; // night over → abort sequence
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
                                this._powerOutTimers.push(setTimeout(() => {
                                    if(this._6amTriggered) return; // night over → abort sequence
                                    if (play) {
                                        const buzz = new Audio('../Assets/FNaF 1 Audio/Buzz_Fan_Florescent2.wav');
                                        buzz.volume = 1;
                                        buzz.play().catch(() => {});
                                        setTimeout(() => buzz.pause(), duration);
                                        window._powerOutEyeFrame = '304';
                                    } else {
                                        window._powerOutEyeFrame = 'black';
                                    }
                                }, ft));
                                ft += duration;
                            });

                            this._powerOutTimers.push(setTimeout(() => {
                                if(this._6amTriggered) return; // night over → abort sequence
                                window._powerOutEyeFrame = 'black';
                                const steps4 = new Audio('../Assets/FNaF 1 Audio/deep steps.wav');
                                steps4.volume = 1;
                                steps4.play().catch(() => {});
                                steps4.addEventListener('ended', () => {
                                    window._powerOutEyeFrame = 'jumpscare';
                                    playPowerOutJumpscare();
                                });
                            }, 500));

                        }, 20000));
                    });
                }, 4000);
            });
        }, 3000));
    },

    // ── Night complete ───────────────────────────────────────
    on6AM() {
        if (this._6amTriggered) return;
        this._6amTriggered = true;
        console.log('6 AM — night complete');

        // ── Cancel every pending power-out timer ─────────────
        if (this._powerOutTimers) {
            this._powerOutTimers.forEach(id => clearTimeout(id));
            this._powerOutTimers = [];
        }

        // ── Stop the Freddy music-box if it's playing ────────
        if (this._musicBox) {
            this._musicBox.pause();
            this._musicBox.currentTime = 0;
            this._musicBox = null;
        }

        // Reset power-out flags / eye frame
        this._powerOutTriggered  = false;
        powerOut                 = false;
        window._powerOutEyeFrame = null;

        // Hide HUD and interactive elements
        document.getElementById('hud-top-right').style.display = 'none';
        document.getElementById('hud-power').style.display     = 'none';
        document.getElementById('hud-usage').style.display     = 'none';
        document.getElementById('tablet-bar').style.display    = 'none';
        document.querySelectorAll('.btn-zone').forEach(z => z.style.display = 'none');

        // Kill all audio
        [sfxFan, sfxPhone, sfxLight, sfxCameraLoop, camAudio].forEach(a => {
            a.pause(); a.currentTime = 0;
        });
        stopCamVideo();


        //kill Foxy timers to prevent him from attacking during the 6AM sequence or the next night
        const foxy = ANIMATRONICS.find(a => a instanceof Foxy);
        if (foxy) {
            if (foxy.sprintTimer)  { clearTimeout(foxy.sprintTimer);  foxy.sprintTimer  = null; }
            if (foxy._runSfxTimer) { clearTimeout(foxy._runSfxTimer); foxy._runSfxTimer = null; }
            if (foxy.lockTimer)    { clearTimeout(foxy.lockTimer);     foxy.lockTimer    = null; }
            foxy.locked = false;
        }

        // Kill Bonnie's door timer to prevent him from trying to enter the office during the 6AM sequence or the next night
        const bonnie = ANIMATRONICS.find(a => a instanceof Bonnie);
        if (bonnie && bonnie._doorTimer) {
            clearTimeout(bonnie._doorTimer);
            bonnie._doorTimer = null;
        }

        // Reset doors and lights to open/off for the next night
        ['left', 'right'].forEach(side => {
            if (state[side].door !== 'open') {
                state[side].door = 'open';
                startDoorAnim(side, -1);
            }
            state[side].light = 'off';
        });

        // Clear stable camera image cache so next night starts fresh
        Object.keys(_camCache).forEach(k => delete _camCache[k]);


        // SFX
        new Audio('../Assets/FNaF 1 Audio/chimes 2.wav').play().catch(() => {});
        setTimeout(() => {
            new Audio('../Assets/FNaF 1 Audio/CROWD_SMALL_CHIL_EC049202.wav').play().catch(() => {});
        }, 2000);

        // ── Timing constants ─────────────────────────────────
        const FADEIN_MS  = 800;
        const HOLD_MS    = 2200;
        const SLIDE_MS   = 5000;
        const HOLD2_MS   = 3000;
        const FADEOUT_MS = 800;

        const NUM_FONT = 'bold 140px "FNAF", Arial';
        const AM_FONT  = 'bold 80px "FNAF", Arial';
        const COLOR    = '#fff';

        ctx.font = AM_FONT;
        const amW = ctx.measureText(' AM').width;
        const cx  = W / 2 - amW / 2;
        const cy  = H / 2;

        renderPaused = true;

        const drawFrame = (numOffset, alpha) => {
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);
            ctx.save();
            ctx.globalAlpha  = alpha;
            ctx.textBaseline = 'middle';
            ctx.fillStyle    = COLOR;
            ctx.font = AM_FONT;
            ctx.textAlign = 'left';
            ctx.fillText(' AM', cx, cy);
            const clipH = 160;
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, cy - clipH / 2, W, clipH);
            ctx.clip();
            ctx.font      = NUM_FONT;
            ctx.textAlign = 'right';
            ctx.fillText('5', cx, cy + numOffset);
            ctx.fillText('6', cx, cy + numOffset - H);
            ctx.restore();
            ctx.restore();
        };

        const runPhase = (durationMs, fromAlpha, toAlpha, fromOffset, toOffset, onDone) => {
            const start = performance.now();
            const frame = (now) => {
                const t    = Math.min((now - start) / durationMs, 1);
                const ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
                drawFrame(fromOffset + (toOffset - fromOffset) * ease, fromAlpha + (toAlpha - fromAlpha) * ease);
                if (t < 1) requestAnimationFrame(frame);
                else onDone();
            };
            requestAnimationFrame(frame);
        };

        runPhase(FADEIN_MS, 0, 1, 0, 0, () => {
            drawFrame(0, 1);
            setTimeout(() => {
                runPhase(SLIDE_MS, 1, 1, 0, H, () => {
                    drawFrame(H, 1);
                    setTimeout(() => {
                        runPhase(FADEOUT_MS, 1, 0, H, H, () => {
                            if (this.night >= 6) {
                                ctx.fillStyle = '#000';
                                ctx.fillRect(0, 0, W, H);
                                setTimeout(() => { window.location.href = 'menu.html'; }, 1000);
                                return;
                            }
                            this.night++;
                            this.rawPower       = 999;
                            this.secondsElapsed = 0;
                            this.passiveAccum   = 0;
                            this._6amTriggered  = false;

                            ANIMATRONICS.forEach(a => {
                                if (a instanceof Foxy) {
                                    a.stage     = 1;
                                    a.bangCount = 0;
                                    window.foxyRunning     = false;
                                    window.foxyRunAnimDone = false;
                                }
                                if (a instanceof Bonnie) {
                                    a._resetOfficeState();
                                }
                                if (a instanceof Chica) {
                                    a._resetOfficeState();
                                }
                                if (a.valid) {
                                    const cur = getRoom(a.name);
                                    if (cur) ROOMS[cur].who = ROOMS[cur].who.filter(n => n !== a.name);
                                    a.room = 'show_stage';
                                    ROOMS['show_stage'].who.push(a.name);
                                }
                            });

                            renderPaused = false;
                            this.render();
                            document.getElementById('hud-top-right').style.display = '';
                            document.getElementById('hud-power').style.display     = '';
                            document.getElementById('hud-usage').style.display     = '';
                            document.getElementById('tablet-bar').style.display    = 'flex';
                            document.querySelectorAll('.btn-zone').forEach(z => z.style.display = 'block');
                            sfxFan.play().catch(() => {});
                        });
                    }, HOLD2_MS);
                });
            }, HOLD_MS);
        });
    },
};


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

const SCREAM  = new Audio('../Assets/FNaF 1 Audio/XSCREAM.wav');
const SCREAM2 = new Audio('../Assets/FNaF 1 Audio/XSCREAM2.wav');
const NOISE   = new Audio('../Assets/FNaF 1 Audio/COMPUTER_DIGITAL_L2076505.wav');

const JUMPSCARE_MAX_MS = 1000;

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

function playChicaJumpscare()        { playJumpscare(chicajumpscare,          SCREAM,  GO_NOISE,     JUMPSCARE_MAX_MS); }
function playBonnieJumpscare()       { playJumpscare(bonnieJumpscare,         SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
function playFoxyJumpscare()         { playJumpscare(foxyJumpscare,           SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
function playFreddyJumpscare()       { playJumpscare(freddyJumpscare,         SCREAM,  null,     JUMPSCARE_MAX_MS); }
function playGoldenFreddyJumpscare() { playJumpscare(goldenFreddyJumpscare,   SCREAM2, null,     JUMPSCARE_MAX_MS); }
function playPowerOutJumpscare()     { playJumpscare(freddyJumpscarePowerOut, SCREAM,  GO_NOISE, JUMPSCARE_MAX_MS); }
function playNoiseMenu()             { playJumpscare(noiseMenu,               NOISE,   GO_MENU,  JUMPSCARE_MAX_MS); }


// ── Animatronics ──────────────────────────────────────────────

const FREDDY = true;
const CHICA  = true;
const BONNIE = true;
const FOXY   = true;

const base_ai_level = {
    1:  { Freddy: 0,  Bonnie: 0, Chica: 0,  Foxy: 0  },
    2:  { Freddy: 0,  Bonnie: 3,  Chica: 1,  Foxy: 1  },
    3:  { Freddy: 1,  Bonnie: 0,  Chica: 5,  Foxy: 2  },
    41: { Freddy: 1,  Bonnie: 2,  Chica: 4,  Foxy: 6  },
    42: { Freddy: 2,  Bonnie: 2,  Chica: 4,  Foxy: 6  },
    5:  { Freddy: 3,  Bonnie: 5,  Chica: 7,  Foxy: 5  },
    6:  { Freddy: 4,  Bonnie: 10, Chica: 12, Foxy: 16 },
};

const boost_ai_level = {
    '12 AM': { Freddy: 0, Bonnie: 0, Chica: 0, Foxy: 0 },
    '1 AM':  { Freddy: 0, Bonnie: 0, Chica: 0, Foxy: 0 },
    '2 AM':  { Freddy: 0, Bonnie: 1, Chica: 0, Foxy: 0 },
    '3 AM':  { Freddy: 0, Bonnie: 1, Chica: 1, Foxy: 1 },
    '4 AM':  { Freddy: 0, Bonnie: 1, Chica: 1, Foxy: 1 },
    '5 AM':  { Freddy: 0, Bonnie: 0, Chica: 0, Foxy: 0 },
};


class Animatronic {
    constructor(name, rooms, startRoom = 'show_stage') {
        this.name   = name;
        this.rooms  = rooms;
        this.room   = startRoom;
        this.moving = false;
        this.valid  = false;
        this.level = base_ai_level[GameState.night]?.[this.name]               || 0
        this.currentHour = GameState.getCurrentHour();
        this._boostApplied = false;
    }

    get ai_level() {
        const boost = boost_ai_level[HOURS[GameState.getCurrentHour()]]?.[this.name] || 0;
        // only increment on hour change, not every tick, to prevent excessive volatility
        if (GameState.getCurrentHour() !== this.currentHour) {
            this.currentHour = GameState.getCurrentHour();
            this._boostApplied = false; // reset boost flag for new hour
        }
        if (boost > 0 && !this._boostApplied) {
            this._boostApplied = true;
            console.log(`[${this.name}] AI boost applied: +${boost} (hour: ${HOURS[GameState.getCurrentHour()]})`);
            this.level += boost;
        }
        return this.level;
    }

    tryMove()   { return false; }
    canAttack() { return false; }
}

// ── Room helpers ──────────────────────────────────────────────

function getRoom(name) {
    return Object.keys(ROOMS).find(key => ROOMS[key].who.includes(name));
}

function moveToRoom(name, newRoom) {
    const current = getRoom(name);
    if (current) ROOMS[current].who = ROOMS[current].who.filter(n => n !== name);
    if (ROOMS[newRoom]) ROOMS[newRoom].who.push(name);
}


// ── Freddy ────────────────────────────────────────────────────

class Freddy extends Animatronic {
    constructor() {
        super('Freddy', FreddyRooms);
        this.room  = getRoom(this.name);
        this.valid = FREDDY;
    }

    tryMove() {
        console.log('[Freddy] tries to move — AI:', this.ai_level);
        if (Math.random() * 20 <= this.ai_level) {
            console.log("FREDDY'S MOVING OMG");
        }
        return -1;
    }

    canAttack() {
        return this.room === 'east_hall_corner'
            && state.right.door  === 'open'
            && state.right.light === 'off';
    }
}


// ── Bonnie ────────────────────────────────────────────────────
//
//  États :
//    normal          — se déplace dans les couloirs
//    _atDoor = true  — est à office_left, visible si lumière gauche allumée
//                      son timer d'attaque tourne
//    inOffice = true — a réussi à entrer silencieusement dans le bureau
//                      → dès que la tablette est ouverte PUIS refermée : screamer
//
//  Résolution de l'attaque depuis office_left :
//    • Porte fermée              → repart (dining_area ou west_hall)
//    • Porte ouverte + jet raté → reste et replanifie
//    • Porte ouverte + jet OK   → entre silencieusement (inOffice = true)
//
//  window.bonnieAtDoor  — lu par mainroom.html pour afficher l'image
// ─────────────────────────────────────────────────────────────

class Bonnie extends Animatronic {
    constructor() {
        super('Bonnie', BonnieRooms);
        this.room       = getRoom(this.name);
        this.valid      = BONNIE;
        this.inOffice   = false;
        this._atDoor    = false;
        this._doorTimer = null;
        this._tabletWasOpen = false; // surveille le cycle open→close
    }

    // ── Déplacement normal (appelé par setInterval) ───────────
    tryMove() {
        // Immobile s'il attend devant la porte ou qu'il est déjà dans le bureau
        if (this._atDoor || this.inOffice) return;

        console.log('[Bonnie] tries to move — AI:', this.ai_level);
        if (Math.random() * 20 > this.ai_level) return; // jet raté

        const current       = getRoom(this.name);
        const possibleMoves = BonnieRooms[current]?.connections ?? [];
        const inCloseSector = ['west_hall', 'supply closet','west_hall_corner'].includes(current);
        if (!possibleMoves.length) return;

        const nextRoom = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        console.log(`Bonnie: ${current} → ${nextRoom}`);

        // Arrivée devant la porte gauche
        if (nextRoom === 'office_left') {
            if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0) {
                moveToRoom(this.name, nextRoom);
                this._atDoor = true;
                window.bonnieAtDoor = true;
                console.log('[Bonnie] AT THE DOOR — waiting to attack');
                this._scheduleAttack();
            } else {
                console.log(`${nextRoom} NOT empty — stay`);
            }
            return;
        }

        // Déplacement classique
        if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0) {
            moveToRoom(this.name, nextRoom);
            if (inCloseSector) {
                console.log('[Bonnie] entered close sector — chance to head to door');
                const stepssfx = new Audio('../Assets/FNaF 1 Audio/deep steps.wav');
                stepssfx.volume = 1;
                stepssfx.play().catch(() => {});
            }
        } else {
            console.log(`${nextRoom} NOT empty — stay`);
        }

    }

    // ── Planifie la tentative d'entrée (1 cycle de mouvement) ─
    _scheduleAttack() {
        if (this._doorTimer) clearTimeout(this._doorTimer);
        this._doorTimer = setTimeout(() => {
                if(this._6amTriggered) return;
                if(this._powerOutTriggered) return;
                this._tryEnterOffice();
            },
            ANIM_INTERVALS.bonnie);
    }

    // ── Résolution : Bonnie tente d'entrer ───────────────────
    _tryEnterOffice() {
        if (state.left.door === 'closed') {
            // Porte fermée → retreat
            this._atDoor = false;
            window.bonnieAtDoor = false;
            this.room = Math.random() < 0.5 ? 'dining_area' : 'west_hall';
            moveToRoom(this.name, this.room);
            console.log('[Bonnie] door closed, retreats to', this.room);
            return;
        }

        // Porte ouverte → AI roll
        if (Math.random() * 20 >= this.ai_level) {
            // Échec → reste, réessaie dans 5s
            console.log('[Bonnie] AI fail, stays at door');
            return;
        }

        // Succès → lumière allumée = screamer immédiat, sinon entrée silencieuse
        const leftLit = state.left.light === 'on';
        if (leftLit) {
            console.log('[Bonnie] caught in light — jumpscare!');
            this._atDoor = false;
            window.bonnieAtDoor = false;
            playBonnieJumpscare();
        } else {
            console.log('[Bonnie] silent entry');
            this._atDoor  = false;
            this.inOffice = true;
            window.bonnieAtDoor  = false;
            window.bonnieInOffice = true;
        }
    }

    // ── Appelé par mainroom quand la tablette est OUVERTE ─────
    //    On enregistre que la tablette a été ouverte pendant qu'il est dans le bureau
    onTabletOpen() {
        if (this.inOffice) {
            this._tabletWasOpen = true;
            console.log('[Bonnie] Tablet opened while in office — will strike on close');
        }
    }

    // ── Appelé par mainroom quand la tablette est REFERMÉE ────
    onTabletClose() {
        if (this.inOffice && this._tabletWasOpen) {
            console.log('[Bonnie] Tablet closed — JUMPSCARE');
            this._tabletWasOpen   = false;
            this.inOffice         = false;
            window.bonnieInOffice = false;
            this._resetOfficeState();
            playBonnieJumpscare();
            return;
        }
        // Reset le flag au cas où
        if (!this.inOffice) this._tabletWasOpen = false;
    }

    // ── Reset complet (utilisé aussi par on6AM) ───────────────
    _resetOfficeState() {
        if (this._doorTimer) { clearTimeout(this._doorTimer); this._doorTimer = null; }
        this._atDoor          = false;
        this.inOffice         = false;
        this._tabletWasOpen   = false;
        window.bonnieAtDoor   = false;
        window.bonnieInOffice = false;
    }

    canAttack() { return false; } // attaque gérée en interne

    // Getters pour le renderer / minimap
    get isAtDoor()   { return this._atDoor;  }
    get isInOffice() { return this.inOffice; }
}


// ── Chica ─────────────────────────────────────────────────────

class Chica extends Animatronic {
    constructor() {
        super('Chica', ChicaRooms);
        this.room  = getRoom(this.name);
        this.valid = CHICA;
        this.inOffice   = false;
        this._atDoor    = false;
        this._doorTimer = null;
        this._tabletWasOpen = false;
    }


// ── Déplacement normal (appelé par setInterval) ───────────
    tryMove() {
        // Immobile si elle attend devant la porte ou qu'elle est déjà dans le bureau
        if (this._atDoor || this.inOffice) return;

        console.log('[CHICA] tries to move — AI:', this.ai_level);
        if (Math.random() * 20 > this.ai_level) return; // jet raté

        const current       = getRoom(this.name);
        const possibleMoves = ChicaRooms[current]?.connections ?? [];
        if (!possibleMoves.length) return;
        const inCloseSector = ['east_hall', 'kitchen','east_hall_corner'].includes(current);


        const nextRoom = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        console.log(`Chica : ${current} → ${nextRoom}`);

        // Arrivée devant la porte gauche
        if (nextRoom === 'office_right') {
            if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0) {
                moveToRoom(this.name, nextRoom);
                this._atDoor = true;
                window.chicaAtDoor = true;
                console.log('[CHICA] AT THE DOOR — waiting to attack');
                this._scheduleAttack();
            } else {
                console.log(`${nextRoom} NOT empty — stay`);
            }
            return;
        }

        // Déplacement classique
        if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0) {
            moveToRoom(this.name, nextRoom);
            if (inCloseSector) {
                console.log('[Chica] entered close sector — chance to head to door');
                const stepssfx = new Audio('../Assets/FNaF 1 Audio/deep steps.wav');
                stepssfx.volume = 1;
                stepssfx.play().catch(() => {});
            }
        } else {
            console.log(`${nextRoom} NOT empty — stay`);
        }
    }

    _scheduleAttack() {
        if (this._doorTimer) clearTimeout(this._doorTimer);
        this._doorTimer = setTimeout(() => this._tryEnterOffice(), ANIM_INTERVALS.bonnie);
    }

    _tryEnterOffice() {
        if (state.right.door === 'closed') {
            // Porte fermée → retreat
            this._atDoor = false;
            window.chicaAtDoor = false;
            this.room = Math.random() < 0.5 ? 'dining_area' : 'east_hall';
            moveToRoom(this.name, this.room);
            console.log('[Chica] door closed, retreats to', this.room);
            return;
        }

        // Porte ouverte → AI roll
        if (Math.random() * 20 >= this.ai_level) {
            // Échec → reste, réessaie dans 5s
            console.log('[Chica] AI fail, stays at door');
            return;
        }

        // Succès → lumière allumée = screamer immédiat, sinon entrée silencieuse
        const rightlift = state.right.light === 'on';
        if (rightlift) {
            console.log('[Chica] caught in light — jumpscare!');
            this._atDoor = false;
            window.chicaAtDoor = false;
            playChicaJumpscare();
        } else {
            console.log('[Chica] silent entry');
            this._atDoor  = false;
            this.inOffice = true;
            window.chicaAtDoor  = false;
            window.chicaInOffice = true;
        }
    }

    onTabletOpen() {
        if (this.inOffice) {
            this._tabletWasOpen = true;
            console.log('[Chica] Tablet opened while in office — will strike on close');
        }
    }

    // Appelé par mainroom quand la tablette est REFERMÉE
    onTabletClose() {
        if (this.inOffice && this._tabletWasOpen) {
            console.log('[Chica] Tablet closed — JUMPSCARE');
            this._tabletWasOpen   = false;
            this.inOffice         = false;
            window.chicaInOffice = false;
            this._resetOfficeState();
            playChicaJumpscare();
            return;
        }
        // Reset le flag au cas où
        if (!this.inOffice) this._tabletWasOpen = false;
    }

    _resetOfficeState() {
        if (this._doorTimer) { clearTimeout(this._doorTimer); this._doorTimer = null; }
        this._atDoor          = false;
        this.inOffice         = false;
        this._tabletWasOpen   = false;
        window.chicaAtDoor   = false;
        window.chicaInOffice = false;
    }

    canAttack() { return false; } // attaque gérée en interne

    // Getters pour le renderer / minimap
    get isAtDoor()   { return this._atDoor;  }
    get isInOffice() { return this.inOffice; }
}


// ── Foxy ──────────────────────────────────────────────────────

class Foxy extends Animatronic {
    constructor() {
        super('Foxy', {});
        this.valid       = FOXY;
        this.stage       = 1;
        this.locked      = false;
        this.lockTimer   = null;
        this.sprintTimer = null;
        this.bangCount   = 0;
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
        if (this._6amTriggered) return; // night over → auto-fail
        if (this._powerOutTriggered) return; // power out → auto-fail
        if (this.locked)          return;          // post-tablet lock → auto-fail
        if (window.isTabletOpen)  return;          // tablet open → auto-fail
        console.log("[Foxy] tries to move with an AI level of " + this.ai_level);
        if (Math.random() * 20 >= this.ai_level) return; // normal AI roll

        this.stage++;
        console.log(`[Foxy] stage → ${this.stage}`);
        if (this.stage === 4) this._startSprint();
    }

    _startSprint() {
        console.log('[Foxy] RUNNING — 25 s to attack');
        window.foxyRunning     = true;
        window.foxyRunAnimDone = false;
        this._runSfxPlayed     = false;

        if (this.sprintTimer || this._6amTriggered)  clearTimeout(this.sprintTimer);
        if (this._runSfxTimer || this._6amTriggered) clearTimeout(this._runSfxTimer);

        this._runSfxTimer = setTimeout(() => {
            if (this._6amTriggered) return;
            this._playRunSfx();
        }, 22000);
        this.sprintTimer  = setTimeout(() => {
            if (this._6amTriggered) return;
            this._attack();
        }, 25000);
    }

    _playRunSfx() {
        if (this._runSfxPlayed) return;
        this._runSfxPlayed = true;
        const sfx = new Audio('../Assets/FNaF 1 Audio/run.wav');
        sfx.volume = 0.9;
        sfx.play().catch(() => {});
    }

    onWatchRunCam() {
        this._playRunSfx();
        if (this.sprintTimer)  { clearTimeout(this.sprintTimer);  this.sprintTimer  = null; }
        if (this._runSfxTimer) { clearTimeout(this._runSfxTimer); this._runSfxTimer = null; }
        console.log('[Foxy] Seen running — 3 s to close door');
        this.sprintTimer = setTimeout(() => {
            if (this._6amTriggered) return;
            this._attack();
        }, 3000);
    }

    _attack() {
        window.foxyRunning             = false;
        window._foxyRunCamSfxTriggered = false;
        this.sprintTimer               = null;

        if (state.left.door === 'open') {
            playFoxyJumpscare();
        } else {
            this._bangDoor();
        }
    }

    _bangDoor() {
        const pct      = Math.min(1 + this.bangCount * 6, 13);
        const rawDrain = pct * 10;
        GameState.rawPower = Math.max(0, GameState.rawPower - rawDrain);
        this.bangCount++;
        this.stage = Math.random() < 0.5 ? 1 : 2;
        console.log(`[Foxy] banged door! −${pct}% power. Retreats to stage ${this.stage}`);
        const bangSfx = new Audio('../Assets/FNaF 1 Audio/knock2.wav');
        bangSfx.volume = 0.8;
        bangSfx.play().catch(() => {});
    }

    canAttack() { return false; }
}


// ── Room definitions ──────────────────────────────────────────

const FreddyRooms = {
    show_stage:       { label: 'Show Stage',       connections: ['dining_area']                              },
    dining_area:      { label: 'Dining Area',       connections: ['restrooms']                               },
    restrooms:        { label: 'Restrooms',         connections: ['kitchen']                                 },
    kitchen:          { label: 'Kitchen',           connections: ['east_hall']                               },
    east_hall:        { label: 'East Hall',         connections: ['east_hall_corner']                        },
    east_hall_corner: { label: 'East Hall Corner',  connections: []                                          },
};

const BonnieRooms = {
    show_stage:       { label: 'Show Stage',        connections: ['dining_area', 'backstage']                },
    dining_area:      { label: 'Dining Area',        connections: ['backstage', 'west_hall']                 },
    backstage:        { label: 'Backstage',          connections: ['dining_area', 'west_hall']               },
    west_hall:        { label: 'West Hall',          connections: ['dining_area', 'west_hall_corner', 'supply_closet'] },
    supply_closet:    { label: 'Supply Closet',      connections: ['office_left', 'west_hall', 'dining_area'] },
    west_hall_corner: { label: 'West Hall Corner',   connections: ['supply_closet', 'office_left', 'dining_area'] },
    office_left:      { label: 'Office (Left)',       connections: []                                         },
};

const ChicaRooms = {
    show_stage:       { label: 'Show Stage',        connections: ['dining_area']                             },
    dining_area:      { label: 'Dining Area',        connections: ['restrooms', 'kitchen']                   },
    restrooms:        { label: 'Restrooms',          connections: ['kitchen', 'east_hall']                   },
    kitchen:          { label: 'Kitchen',            connections: ['restrooms', 'east_hall']                 },
    east_hall:        { label: 'East Hall',          connections: ['dining_area', 'east_hall_corner']        },
    east_hall_corner: { label: 'East Hall Corner',   connections: ['east_hall', 'office_right']                              },
    office_right:     { label: 'Office (Right)',      connections: []                                         },
};


// ── Global room map ───────────────────────────────────────────

const ROOMS = {
    show_stage:       { who: ['Freddy', 'Bonnie', 'Chica'] },
    dining_area:      { who: [] },
    backstage:        { who: [] },
    kitchen:          { who: [] },
    restrooms:        { who: [] },
    east_hall:        { who: [] },
    east_hall_corner: { who: [] },
    west_hall:        { who: [] },
    west_hall_corner: { who: [] },
    supply_closet:    { who: [] },
    pirate_cove:      { who: [] },
    office_left:      { who: [] },
    office_right:     { who: [] },
    office:           { who: [] },
};


// ── Instances ─────────────────────────────────────────────────

const freddy = new Freddy();
const bonnie = new Bonnie();
const chica  = new Chica();
const foxy   = new Foxy();

const ANIMATRONICS = [freddy, bonnie, chica, foxy];


// ── Camera system ─────────────────────────────────────────────

const CAM_BASE = '../Assets/Cam_views/';

const CAMS = [
    { id: '1A', label: 'CAM 1A', room: 'show_stage'       },
    { id: '1B', label: 'CAM 1B', room: 'dining_area'      },
    { id: '1C', label: 'CAM 1C', room: 'pirate_cove'      },
    { id: '2A', label: 'CAM 2A', room: 'west_hall'        },
    { id: '2B', label: 'CAM 2B', room: 'west_hall_corner' },
    { id: '3',  label: 'CAM 3',  room: 'backstage'        },
    { id: '6',  label: 'CAM 6',  room: 'kitchen'          },
    { id: '4A', label: 'CAM 4A', room: 'east_hall'        },
    { id: '4B', label: 'CAM 4B', room: 'east_hall_corner' },
    { id: '5',  label: 'CAM 5',  room: 'supply_closet'    },
    { id: '7',  label: 'CAM 7',  room: 'restrooms'        },
];

function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const _camCache = {};

function _stablePick(room, arr, extraKey) {
    const who   = (ROOMS[room] && ROOMS[room].who) ? [...ROOMS[room].who].sort().join(',') : '';
    const key   = who + '|' + (extraKey ?? '');
    const cache = _camCache[room];
    if (cache && cache.key === key) return cache.path;
    const path = _pick(arr);
    _camCache[room] = { key, path };
    return path;
}

function getCamImagePath(room) {
    const who       = (ROOMS[room] && ROOMS[room].who) ? ROOMS[room].who : [];
    const hasFreddy = who.includes('Freddy');
    const hasBonnie = who.includes('Bonnie');
    const hasChica  = who.includes('Chica');



    switch (room) {
        case 'show_stage':
            if (hasFreddy && hasBonnie && hasChica)
                return _stablePick(room, ['All_1.png', 'All_2.png']).replace(/^/, CAM_BASE + 'show stage/');
            if (hasBonnie && hasFreddy) return CAM_BASE + 'show stage/Bonnie_Freddy.png';
            if (hasChica  && hasFreddy) return CAM_BASE + 'show stage/chica_freddy.png';
            if (hasFreddy)              return _stablePick(room, ['Freddy_1.png', 'Freddy_2.png']).replace(/^/, CAM_BASE + 'show stage/');
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
    setInterval(() => GameState.tick(), 1000);
    GameState.render();

    setInterval(() => { if (freddy.valid) freddy.tryMove(); }, ANIM_INTERVALS.freddy);
    setInterval(() => { if (bonnie.valid) bonnie.tryMove(); }, ANIM_INTERVALS.bonnie);
    setInterval(() => { if (chica.valid)  chica.tryMove();  }, ANIM_INTERVALS.chica);
    setInterval(() => { if (foxy.valid)   foxy.tryMove();   }, ANIM_INTERVALS.foxy);

    window.foxyRunning    = false;
    window.bonnieAtDoor   = false;   // lu par mainroom pour afficher l'image de Bonnie
    window.bonnieInOffice = false;   // lu par mainroom si besoin
    window.chicaAtDoor   = false;   // lu par mainroom pour afficher l'image de Bonnie
    window.chicaInOffice = false;   // lu par mainroom si besoin
    window.isTabletOpen   = false;
    window.activeCam      = null;
}