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
const API_BASE = window.location.hostname === 'localhost'
    ? `http://localhost:3002`
    : window.location.origin;

async function saveProgress(night) {
    await fetch(`${API_BASE}/api/auth/progress`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ night }),
    }).catch(() => {});
}

const GameState = {
    night:          (window.__startNight || 1),
    rawPower:       999,
    secondsElapsed: 0,
    passiveAccum:   0,

    // ── Per-night stat counters ──────────────────────────────
    cameraFlicks: 0,
    doorCloses:   0,
    _scoreSent:   false, // guard: only submit once per night outcome
    _sessionId:   null,  // server-issued single-use token for this night

    // ── Ask the server for a fresh night-session token ────────
    async _startNightSession() {
        this._sessionId = null;
        const customLevels = window.__customAILevels || null;
        try {
            const res = await fetch(`${API_BASE}/graphql`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `mutation($night:Int!,$isCustomNight:Boolean,$aiFreddy:Int,$aiBonnie:Int,$aiChica:Int,$aiFoxy:Int){
                        startNight(night:$night,isCustomNight:$isCustomNight,aiFreddy:$aiFreddy,aiBonnie:$aiBonnie,aiChica:$aiChica,aiFoxy:$aiFoxy){ sessionId }
                    }`,
                    variables: {
                        night:         this.night,
                        isCustomNight: !!customLevels,
                        aiFreddy:  customLevels?.Freddy ?? null,
                        aiBonnie:  customLevels?.Bonnie ?? null,
                        aiChica:   customLevels?.Chica  ?? null,
                        aiFoxy:    customLevels?.Foxy   ?? null,
                    },
                }),
            });
            const json = await res.json();
            this._sessionId = json?.data?.startNight?.sessionId ?? null;
        } catch { /* non-blocking */ }
    },

    // ── Submit score to GraphQL ──────────────────────────────
    async _submitScore(outcome) {
        if (this._scoreSent) return;
        this._scoreSent = true;
        const powerRemaining  = outcome === 'win' ? parseFloat(this.getDisplayPercent()) : 0;
        const customLevels    = window.__customAILevels || null;
        const isCustomNight   = !!customLevels;
        try {
            await fetch(`${API_BASE}/graphql`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `mutation($sessionId:ID!,$night:Int!,$survivedSeconds:Int!,$outcome:Outcome!,$cameraFlicks:Int,$doorCloses:Int,$powerRemaining:Float,$isCustomNight:Boolean,$aiFreddy:Int,$aiBonnie:Int,$aiChica:Int,$aiFoxy:Int){
                        submitScore(sessionId:$sessionId,night:$night,survivedSeconds:$survivedSeconds,outcome:$outcome,cameraFlicks:$cameraFlicks,doorCloses:$doorCloses,powerRemaining:$powerRemaining,isCustomNight:$isCustomNight,aiFreddy:$aiFreddy,aiBonnie:$aiBonnie,aiChica:$aiChica,aiFoxy:$aiFoxy){ id }
                    }`,
                    variables: {
                        sessionId:       this._sessionId,
                        night:           this.night,
                        survivedSeconds: this.secondsElapsed,
                        outcome,
                        cameraFlicks:    this.cameraFlicks,
                        doorCloses:      this.doorCloses,
                        powerRemaining,
                        isCustomNight,
                        aiFreddy:  customLevels?.Freddy ?? null,
                        aiBonnie:  customLevels?.Bonnie ?? null,
                        aiChica:   customLevels?.Chica  ?? null,
                        aiFoxy:    customLevels?.Foxy   ?? null,
                    },
                }),
            });
        } catch { /* non-blocking */ }
    },

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
        // Frozen while a night-intro title card is showing.
        if (this._introActive) return;

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
        document.getElementById('hud-night').textContent     = window.__customAILevels ? 'Custom Night' : `Night ${this.night}`;
        document.getElementById('hud-time').textContent      = HOURS[this.getCurrentHour()];
        document.getElementById('hud-power-val').textContent = `${Math.ceil(this.getDisplayPercent())}%`;
        const batteryMap = { 1: '212', 2: '213', 3: '214', 4: '456', 5: '455' };
        document.getElementById('hud-battery-img').src = `../../assets/Battery/${batteryMap[usage] || '212'}.png`;
    },

    // ── Freeze every animatronic (cancel in-flight attack timers) ──
    _cancelAllAnimatronicTimers() {
        const foxyInst = (typeof ANIMATRONICS !== 'undefined') ? ANIMATRONICS.find(a => a instanceof Foxy) : null;
        if (foxyInst) {
            if (foxyInst.sprintTimer)  { clearTimeout(foxyInst.sprintTimer);  foxyInst.sprintTimer  = null; }
            if (foxyInst._runSfxTimer) { clearTimeout(foxyInst._runSfxTimer); foxyInst._runSfxTimer = null; }
            if (foxyInst.lockTimer)    { clearTimeout(foxyInst.lockTimer);    foxyInst.lockTimer    = null; }
            foxyInst.locked = false;
        }
        window.foxyRunning             = false;
        window.foxyRunAnimDone         = false;
        window._foxyRunCamSfxTriggered = false;
        if (typeof ANIMATRONICS !== 'undefined') {
            ANIMATRONICS.forEach(a => {
                if (a._doorTimer) { clearTimeout(a._doorTimer); a._doorTimer = null; }
            });
        }
    },

    // ── Night intro: "12:00 AM / Nth Night" ──────────────────────
    // Plays the camera-switch blip and fades a centred black title card in
    // and out (full-screen DOM overlay), then calls onDone. The game stays
    // frozen (see _introActive) while the card is up.
    _showNightIntro(nextNight, onDone) {
        try { new Audio('../../assets/FNaF 1 Audio/blip3.wav').play().catch(() => {}); } catch (e) {}

        const ordinal = (n) => {
            const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };

        const FADE = 900, HOLD = 1600;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed; inset:0; z-index:1200; background:#000;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            gap:2vh; opacity:0; transition:opacity ${FADE}ms ease; pointer-events:none;
            font-family:'FNAF','Courier New',monospace; color:#fff; text-align:center;
        `;
        const l1 = document.createElement('div');
        l1.textContent = '12:00 AM';
        l1.style.cssText = 'font-size:clamp(28px,6vw,90px); letter-spacing:0.05em;';
        const l2 = document.createElement('div');
        l2.textContent = ordinal(nextNight) + ' Night';
        l2.style.cssText = 'font-size:clamp(20px,4vw,60px); letter-spacing:0.05em;';
        overlay.appendChild(l1);
        overlay.appendChild(l2);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => { overlay.style.opacity = '1'; }); // fade in
        setTimeout(() => {
            overlay.style.opacity = '0';                                // fade out
            setTimeout(() => {
                overlay.remove();
                if (onDone) onDone();
            }, FADE);
        }, FADE + HOLD);
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

        // Snap the camera tablet down first (before we hide the controls below).
        if (typeof window.forceTabletDown === 'function') window.forceTabletDown();

        // Hide HUD and interactive elements
        document.getElementById('hud-top-right').style.display = 'none';
        document.getElementById('hud-power').style.display     = 'none';
        document.getElementById('hud-usage').style.display     = 'none';
        document.getElementById('tablet-bar').style.display    = 'none';
        document.querySelectorAll('.btn-zone').forEach(z => z.style.display = 'none');

        // Silence every non-sequence sound so only the blackout sequence plays.
        if (typeof window.stopAllAudio === 'function') window.stopAllAudio();
        [sfxFan, sfxPhone, sfxLight, sfxCameraLoop, camAudio].forEach(a => {
            if (!a) return;
            a.pause();
            a.currentTime = 0;
        });
        stopCamVideo();

        // Freeze the animatronics: cancel every in-flight attack timer so no
        // one else can move or jumpscare during the blackout (incl. Foxy's run).
        this._cancelAllAnimatronicTimers();

        // Open both doors
        ['left', 'right'].forEach(side => {
            state[side].door  = 'open';
            state[side].light = 'off';
            startDoorAnim(side, -1);
        });

        // Power-down sound
        const powerOutsfx = new Audio('../../assets/FNaF 1 Audio/powerdown.wav');
        powerOutsfx.play().catch(() => {});

        // ── Freddy approaches ────────────────────────────────
        this._powerOutTimers.push(setTimeout(() => {
            if(this._6amTriggered) return; // night over → abort sequence
            const steps1 = new Audio('../../assets/FNaF 1 Audio/deep steps.wav');
            steps1.volume = 0.15;
            steps1.play().catch(() => {});

            steps1.addEventListener('ended', () => {
                const steps2 = new Audio('../../assets/FNaF 1 Audio/deep steps.wav');
                steps2.volume = 0.45;
                steps2.play().catch(() => {});

                setTimeout(() => {
                    if(this._6amTriggered) return; // night over → abort sequence
                    const steps3 = new Audio('../../assets/FNaF 1 Audio/deep steps.wav');
                    steps3.volume = 0.85;
                    steps3.play().catch(() => {});

                    steps3.addEventListener('ended', () => {

                        // ── Freddy music-box + eye flicker ───────────────
                        const musicBox = new Audio('../../assets/FNaF 1 Audio/music box.wav');
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
                                        const buzz = new Audio('../../assets/FNaF 1 Audio/Buzz_Fan_Florescent2.wav');
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
                                const steps4 = new Audio('../../assets/FNaF 1 Audio/deep steps.wav');
                                steps4.volume = 1;
                                steps4.play().catch(() => {});
                                steps4.addEventListener('ended', () => {
                                    if (GameState._6amTriggered) return; // 6 AM is absolute
                                    window._powerOutEyeFrame = 'jumpscare';
                                    GameState._submitScore('jumpscare');
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
        //console.log('6 AM - night complete');
        this._submitScore('win');

        // 6 AM is absolute: instantly stop everything — all audio, the camera
        // tablet, and every animatronic timer (this overrides the power-out
        // sequence too).
        if (typeof window.stopAllAudio === 'function') window.stopAllAudio();
        if (typeof window.forceTabletDown === 'function') window.forceTabletDown();
        this._cancelAllAnimatronicTimers();

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
            if (!a) return;
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
        new Audio('../../assets/FNaF 1 Audio/chimes 2.wav').play().catch(() => {});
        setTimeout(() => {
            new Audio('../../assets/FNaF 1 Audio/CROWD_SMALL_CHIL_EC049202.wav').play().catch(() => {});
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
                                saveProgress(6);
                                ctx.fillStyle = '#000';
                                ctx.fillRect(0, 0, W, H);
                                setTimeout(() => { window.location.href = '/menu'; }, 1000);
                                return;
                            }
                            saveProgress(this.night);
                            this.night++;
                            this.rawPower       = 999;
                            this.secondsElapsed = 0;
                            this.passiveAccum   = 0;
                            this._6amTriggered  = false;
                            this.cameraFlicks   = 0;
                            this.doorCloses     = 0;
                            this._scoreSent     = false;
                            this._startNightSession(); // fresh anti-cheat token for the new night

                            ANIMATRONICS.forEach(a => {
                                //set ai level back to base for each animatronic and reset boost flag so they can get the boost again on the next hour
                                a.level = window.__customAILevels?.[a.name] ?? base_ai_level[this.night]?.[a.name] ?? 0;
                                a._boostApplied = false;


                                if (a instanceof Foxy) {
                                    a.stage     = 1;
                                    a.bangCount = 0;
                                    window.foxyRunning     = false;
                                    window.foxyRunAnimDone = false;
                                }
                                if (a instanceof Freddy) {
                                    a._resetOfficeState();
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

                            // Show the "12:00 AM / Nth Night" intro, then reveal the room.
                            this._introActive = true;
                            this._showNightIntro(this.night, () => {
                                this._introActive = false;
                                renderPaused = false;
                                this.render();
                                document.getElementById('hud-top-right').style.display = '';
                                document.getElementById('hud-power').style.display     = '';
                                document.getElementById('hud-usage').style.display     = '';
                                document.getElementById('tablet-bar').style.display    = 'flex';
                                document.querySelectorAll('.btn-zone').forEach(z => z.style.display = 'block');
                                sfxFan.play().catch(() => {});
                                if (typeof window.restartAmbience === 'function') window.restartAmbience();
                            });
                        });
                    }, HOLD2_MS);
                });
            }, HOLD_MS);
        });
    },
};


// ── Instances ─────────────────────────────────────────────────

const freddy = new Freddy();
const bonnie = new Bonnie();
const chica  = new Chica();
const foxy   = new Foxy();

const ANIMATRONICS = [freddy, bonnie, chica, foxy];


// ── Camera image picker ───────────────────────────────────────

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

//Roll for bonnie and chica different image
let _chicaEHCornerRoll = 1;
setInterval(() => {
    _chicaEHCornerRoll = Math.floor(Math.random() * 30) + 1;
}, 50);

let _bonnieWHCornerRoll = 1;
setInterval(() => {
    _bonnieWHCornerRoll = Math.floor(Math.random() * 30) + 1;
}, 50);

// West Hall (CAM 2A) light flicker — random, weighted toward lit
let _westHallLit = true;
setInterval(() => {
    _westHallLit = Math.random() < 0.72;
}, 70);


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
            if (hasFreddy && hasChica)  return _stablePick(room, ['Chica_1.png',  'Chica_2.png']).replace(/^/, CAM_BASE + 'Dining Area/');
            return CAM_BASE + 'Dining Area/Empty.png';

        case 'pirate_cove': {
            if (!foxy || !foxy.valid) return CAM_BASE + 'Pirate Cove/stage_1.png';
            if (foxy.stage === 4)
                return CAM_BASE + 'Pirate Cove/' + (Math.floor(Date.now() / 500) % 2 === 0 ? 'stage_4_1.png' : 'stage_4_2.png');
            return CAM_BASE + `Pirate Cove/stage_${foxy.stage}.png`;
        }

        case 'west_hall':
            // Flicker also applies with Bonnie: toggle between Bonnie (lit) and dark.
            if (hasBonnie) return CAM_BASE + 'West Hall/' + (_westHallLit ? 'Bonnie.png' : 'empty_lightsoff.png');
            return CAM_BASE + 'West Hall/' + (_westHallLit ? 'empty_lightson.png' : 'empty_lightsoff.png');

        case 'west_hall_corner':
            if (GameState.night >= 3){
                if (hasBonnie) {
                    let bonnieImg;
                    if (_bonnieWHCornerRoll >= 25 && _bonnieWHCornerRoll <= 28) bonnieImg = 'Bonnie_2.png';
                    else if (_bonnieWHCornerRoll >= 29) bonnieImg = 'Bonnie_3.png';
                    else bonnieImg = 'Bonnie_1.png';
                    return CAM_BASE + 'West Hall Corner/' + bonnieImg;
                } else if (hasFreddy) return CAM_BASE + 'West Hall Corner/Golden_Freddy.png';
            } else {
                if (hasBonnie) return CAM_BASE + 'West Hall Corner/Bonnie_1.png'
                if (hasFreddy) return CAM_BASE + 'West Hall Corner/Golden_Freddy.png';
            }

            return _stablePick(room, ['Empty_1.png', 'Empty_2.png']).replace(/^/, CAM_BASE + 'West Hall Corner/');

        case 'backstage':
            if (hasBonnie) return _stablePick(room, ['Bonnie.png', 'Bonnie_close.png']).replace(/^/, CAM_BASE + 'Backstage/');
            if (hasFreddy) return CAM_BASE + 'Backstage/Freddy.png';
            return _stablePick(room, ['Empty_1.png', 'Empty_2.png']).replace(/^/, CAM_BASE + 'Backstage/');

        case 'east_hall':
            if (hasChica)  return _stablePick(room, ['Chica_1.png', 'Chica_2.png']).replace(/^/, CAM_BASE + 'East Hall/');
            if (hasFreddy) return CAM_BASE + 'East Hall/Freddy.png';
            if (hasFreddy && hasChica)  return _stablePick(room, ['Chica_1.png', 'Chica_2.png']).replace(/^/, CAM_BASE + 'East Hall/');
            return _stablePick(room, ['Empty_1.png', 'Empty_2.png', 'Empty_3.png']).replace(/^/, CAM_BASE + 'East Hall/');

        case 'east_hall_corner':
            if (GameState.night >= 3){
                if (hasChica) {
                    let chicaImg;
                    if (_chicaEHCornerRoll >= 25 && _chicaEHCornerRoll <= 28) chicaImg = 'Chica_2.png';
                    else if (_chicaEHCornerRoll >= 29) chicaImg = 'Chica_3.png';
                    else chicaImg = 'Chica_1.png';
                    return CAM_BASE + 'East Hall Corner/' + chicaImg;
                } else if (hasFreddy && hasChica) {
                    let chicaImg;
                    if (_chicaEHCornerRoll >= 25 && _chicaEHCornerRoll <= 28) chicaImg = 'Chica_2.png';
                    else if (_chicaEHCornerRoll >= 29) chicaImg = 'Chica_3.png';
                    else chicaImg = 'Chica_1.png';
                    return CAM_BASE + 'East Hall Corner/' + chicaImg;
                } else {
                    if (hasFreddy) return CAM_BASE + 'East Hall Corner/Freddy.png';
                }
            } else {
                if (hasChica) return CAM_BASE + 'East Hall Corner/Chica_1.png'
                if (hasFreddy) return CAM_BASE + 'East Hall Corner/Freddy.png';
                if (hasFreddy && hasChica) return CAM_BASE + 'East Hall Corner/Chica_1.png'
            }
            return _stablePick(room, ['Empty_1.png', 'Empty_2.png', 'Empty_3.png', 'Empty_4.png', 'Empty_5.png']).replace(/^/, CAM_BASE + 'East Hall Corner/');

        case 'restrooms':
            if (hasChica)  return _stablePick(room, ['Chica_1.png', 'Chica_2.png']).replace(/^/, CAM_BASE + 'Restrooms/');
            if (hasFreddy) return CAM_BASE + 'Restrooms/Freddy.png';
            if (hasFreddy && hasChica)  return _stablePick(room, ['Chica_1.png', 'Chica_2.png']).replace(/^/, CAM_BASE + 'Restrooms/');

            return CAM_BASE + 'Restrooms/Empty.png';

        case 'supply_closet':
            if (hasBonnie) return CAM_BASE + 'Supply Closet/Bonnie.png';
            return CAM_BASE + 'Supply Closet/Empty.png';

        default:
            return null;
    }
}


// ── Start the game loop ───────────────────────────────────────
const _foxyPirateAudio = new Audio('../../assets/FNaF 1 Audio/pirate song2.wav');
const _circusAudio     = new Audio('../../assets/FNaF 1 Audio/circus.wav');
_kitchenAudio1 = new Audio('../../assets/FNaF 1 Audio/OVEN-DRA_1_GEN-HDF18119.wav');
_kitchenAudio2 = new Audio('../../assets/FNaF 1 Audio/OVEN-DRA_2_GEN-HDF18120.wav');
_kitchenAudio3 = new Audio('../../assets/FNaF 1 Audio/OVEN-DRA_7_GEN-HDF18121.wav');
_kitchenAudio4 = new Audio('../../assets/FNaF 1 Audio/OVEN-DRAWE_GEN-HDF18122.wav');




function initGameLogic() {
    setInterval(() => GameState.tick(), 1000);
    GameState.render();
    GameState._startNightSession(); // anti-cheat token for the starting night

    // ── Stat tracking: poll at 100 ms to catch all camera/door toggles ──
    let _prevTabletOpen  = false;
    let _prevLeftDoor    = 'open';
    let _prevRightDoor   = 'open';
    setInterval(() => {
        // Camera flick: rising edge of isTabletOpen
        if (window.isTabletOpen && !_prevTabletOpen) GameState.cameraFlicks++;
        _prevTabletOpen = !!window.isTabletOpen;

        // Door close: rising edge of door → 'closed'
        if (state.left.door  === 'closed' && _prevLeftDoor  !== 'closed') GameState.doorCloses++;
        if (state.right.door === 'closed' && _prevRightDoor !== 'closed') GameState.doorCloses++;
        _prevLeftDoor  = state.left.door;
        _prevRightDoor = state.right.door;
    }, 100);

    // Movement is frozen during the power-out blackout, at 6 AM, and while a
    // night-intro card is showing.
    const _frozen = () => GameState._6amTriggered || GameState._powerOutTriggered || GameState._introActive;
    setInterval(() => { if (freddy.valid && !_frozen()) freddy.tryMove(); }, ANIM_INTERVALS.freddy);
    setInterval(() => { if (bonnie.valid && !_frozen()) bonnie.tryMove(); }, ANIM_INTERVALS.bonnie);
    setInterval(() => { if (chica.valid  && !_frozen()) chica.tryMove();  }, ANIM_INTERVALS.chica);
    setInterval(() => { if (foxy.valid   && !_frozen()) foxy.tryMove();   }, ANIM_INTERVALS.foxy);

    window.foxyRunning    = false;
    window.bonnieAtDoor   = false;
    window.bonnieInOffice = false;
    window.chicaAtDoor   = false;
    window.chicaInOffice = false;
    window.isTabletOpen   = false;
    window.activeCam      = null;

    let _chicaKitchenSound = 0;
    setInterval(() => {
        if (ROOMS['kitchen'].who.includes('Chica') && !GameState._6amTriggered && !GameState._powerOutTriggered) {
            //console.log("SOUND CHICA KITCHEN")
            _chicaKitchenSound = Math.floor(Math.random() * 30) + 1;
            switch (_chicaKitchenSound) {
                case 1:
                    _kitchenAudio1.currentTime = 0;
                    _kitchenAudio1.play().catch(() => {});
                    _kitchenAudio1.volume = window.activeCam === 'kitchen' ? 0.6 : 0.2;
                    return
                case 2:
                    _kitchenAudio2.currentTime = 0;
                    _kitchenAudio2.play().catch(() => {});
                    _kitchenAudio2.volume = window.activeCam === 'kitchen' ? 0.6 : 0.2;
                    return
                case 3:
                    _kitchenAudio3.currentTime = 0;
                    _kitchenAudio3.play().catch(() => {});
                    _kitchenAudio3.volume = window.activeCam === 'kitchen' ? 0.6 : 0.2;
                    return
                case 4:
                    _kitchenAudio4.currentTime = 0;
                    _kitchenAudio4.play().catch(() => {});
                    _kitchenAudio4.volume = window.activeCam === 'kitchen' ? 0.6 : 0.2;
                    return
                default:
                    return null;

            }
        }
    }, 4000);

    let _foxyPirateMusic = 0;
    setInterval(() => {
        if (GameState._6amTriggered || GameState._powerOutTriggered) return;
        _foxyPirateMusic = Math.floor(Math.random() * 30) + 1;
        if (_foxyPirateMusic === 1) {
            _foxyPirateAudio.currentTime = 0;
            _foxyPirateAudio.play().catch(() => {});
            _foxyPirateAudio.volume = window.activeCam === 'pirate_cove' ? 0.3 : 0.1;
        }
    }, 4000);

    let _circusMusic = 0;
    setInterval(() => {
        if (GameState._6amTriggered || GameState._powerOutTriggered) return;
        _circusMusic = Math.floor(Math.random() * 30) + 1;
        if (_circusMusic ===1 ) {
            _circusAudio.currentTime = 0;
            _circusAudio.play().catch(() => {});
            _circusAudio.volume = 0.3;

        }
    }, 5000);
}





