import { HOURS, NIGHT_SECS, SECS_PER_HOUR, PASSIVE_INTERVAL,
         base_ai_level, ANIM_INTERVALS } from '../constants/nightConfig.js';
import { ROOMS, CAM_BASE } from '../data/rooms.js';
import { gameCtx } from './gameContext.js';
import { setGameStateRef } from './animatronics/Animatronic.js';
import { Freddy } from './animatronics/Freddy.js';
import { Bonnie } from './animatronics/Bonnie.js';
import { Chica  } from './animatronics/Chica.js';
import { Foxy   } from './animatronics/Foxy.js';
import {
  playBonnieJumpscare, playChicaJumpscare,
  playFoxyJumpscare,   playFreddyJumpscare,
  playPowerOutJumpscare,
} from './jumpscare.js';

// ── GameState singleton ───────────────────────────────────────

export const GameState = {
  night:          1,
  rawPower:       999,
  secondsElapsed: 0,
  passiveAccum:   0,
  _powerOutTriggered: false,
  _6amTriggered:      false,
  _powerOutTimers:    [],
  _musicBox:          null,

  getUsage() {
    const state = gameCtx.state;
    if (!state) return 1;
    let u = 1;
    if (state.left.door   === 'closed') u++;
    if (state.right.door  === 'closed') u++;
    if (state.left.light  === 'on')     u++;
    if (state.right.light === 'on')     u++;
    if (window.isTabletOpen)            u++;
    return Math.min(u, 5);
  },

  tick() {
    this.rawPower -= this.getUsage();

    const interval = PASSIVE_INTERVAL[this.night] || 0;
    if (interval > 0) {
      this.passiveAccum++;
      if (this.passiveAccum >= interval) { this.passiveAccum = 0; this.rawPower--; }
    }

    this.rawPower = Math.max(0, this.rawPower);
    this.secondsElapsed++;

    if (this.secondsElapsed >= NIGHT_SECS) { this.on6AM(); return; }
    if (this.rawPower <= 0) { this.render(); this.onPowerOut(); return; }
    this.render();
  },

  getDisplayPercent() { return (Math.round(this.rawPower) / 10).toFixed(1); },
  getCurrentHour()    { return Math.min(6, Math.floor(this.secondsElapsed / SECS_PER_HOUR)); },

  render() {
    const usage = this.getUsage();
    const batteryMap = { 1:'212', 2:'213', 3:'214', 4:'456', 5:'455' };
    gameCtx.updateHUD?.({
      night:      `Night ${this.night}`,
      time:       HOURS[this.getCurrentHour()],
      powerVal:   `${Math.ceil(this.getDisplayPercent())}%`,
      batteryImg: `/assets/Battery/${batteryMap[usage] || '212'}.png`,
    });
  },

  onPowerOut() {
    if (this._powerOutTriggered) return;
    this._powerOutTriggered = true;

    this._powerOutTimers = [];
    this._musicBox       = null;

    gameCtx.setPowerOut?.(true);
    gameCtx.setPowerOutEyeFrame?.('304');
    gameCtx.hideHUD?.();

    const sfxFan        = gameCtx.sfxFan;
    const sfxPhone      = gameCtx.sfxPhone;
    const sfxLight      = gameCtx.sfxLight;
    const sfxCameraLoop = gameCtx.sfxCameraLoop;
    const camAudio      = gameCtx.camAudio;

    [sfxFan, sfxPhone, sfxLight, sfxCameraLoop, camAudio].forEach(a => {
      if (!a) return;
      a.pause(); a.currentTime = 0;
    });
    gameCtx.stopCamVideo?.();

    const state = gameCtx.state;
    if (state) {
      ['left', 'right'].forEach(side => {
        state[side].door  = 'open';
        state[side].light = 'off';
        gameCtx.startDoorAnim?.(side, -1);
      });
    }

    const powerDownSfx = new Audio('/assets/FNaF 1 Audio/powerdown.wav');
    powerDownSfx.play().catch(() => {});

    const scheduleTimer = (fn, ms) => {
      const id = setTimeout(fn, ms);
      this._powerOutTimers.push(id);
      return id;
    };

    scheduleTimer(() => {
      if (this._6amTriggered) return;
      const steps1 = new Audio('/assets/FNaF 1 Audio/deep steps.wav');
      steps1.volume = 0.15;
      steps1.play().catch(() => {});

      steps1.addEventListener('ended', () => {
        const steps2 = new Audio('/assets/FNaF 1 Audio/deep steps.wav');
        steps2.volume = 0.45;
        steps2.play().catch(() => {});

        scheduleTimer(() => {
          if (this._6amTriggered) return;
          const steps3 = new Audio('/assets/FNaF 1 Audio/deep steps.wav');
          steps3.volume = 0.85;
          steps3.play().catch(() => {});

          steps3.addEventListener('ended', () => {
            const musicBox = new Audio('/assets/FNaF 1 Audio/music box.wav');
            gameCtx.setPowerOutEyeFrame?.('304');
            this._musicBox = musicBox;

            // Build flicker pattern
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

            pattern.forEach(({ img, ms: pms }) =>
              scheduleTimer(() => {
                if (this._6amTriggered) return;
                gameCtx.setPowerOutEyeFrame?.(img);
              }, pms)
            );

            musicBox.play().catch(() => {});

            scheduleTimer(() => {
              if (this._6amTriggered) return;
              musicBox.pause();
              gameCtx.setPowerOutEyeFrame?.('black');

              const flickSeq = [
                { play: true, duration: 100 },{ play: false, duration: 50 },
                { play: true, duration: 80  },{ play: false, duration: 50 },
                { play: true, duration: 120 },{ play: false, duration: 100 },
              ];
              let ft = 0;
              flickSeq.forEach(({ play, duration }) => {
                scheduleTimer(() => {
                  if (this._6amTriggered) return;
                  if (play) {
                    const buzz = new Audio('/assets/FNaF 1 Audio/Buzz_Fan_Florescent2.wav');
                    buzz.volume = 1; buzz.play().catch(() => {});
                    setTimeout(() => buzz.pause(), duration);
                    gameCtx.setPowerOutEyeFrame?.('304');
                  } else {
                    gameCtx.setPowerOutEyeFrame?.('black');
                  }
                }, ft);
                ft += duration;
              });

              scheduleTimer(() => {
                if (this._6amTriggered) return;
                gameCtx.setPowerOutEyeFrame?.('black');
                const steps4 = new Audio('/assets/FNaF 1 Audio/deep steps.wav');
                steps4.volume = 1;
                steps4.play().catch(() => {});
                steps4.addEventListener('ended', () => {
                  gameCtx.setPowerOutEyeFrame?.('jumpscare');
                  playPowerOutJumpscare();
                });
              }, 500);
            }, 20000);
          });
        }, 4000);
      });
    }, 3000);
  },

  on6AM() {
    if (this._6amTriggered) return;
    this._6amTriggered = true;

    this._powerOutTimers.forEach(id => clearTimeout(id));
    this._powerOutTimers = [];

    if (this._musicBox) { this._musicBox.pause(); this._musicBox.currentTime = 0; this._musicBox = null; }

    this._powerOutTriggered = false;
    gameCtx.setPowerOut?.(false);
    gameCtx.setPowerOutEyeFrame?.(null);
    gameCtx.hideHUD?.();

    const sfxFan        = gameCtx.sfxFan;
    const sfxPhone      = gameCtx.sfxPhone;
    const sfxLight      = gameCtx.sfxLight;
    const sfxCameraLoop = gameCtx.sfxCameraLoop;
    const camAudio      = gameCtx.camAudio;

    [sfxFan, sfxPhone, sfxLight, sfxCameraLoop, camAudio].forEach(a => {
      if (!a) return;
      a.pause(); a.currentTime = 0;
    });
    gameCtx.stopCamVideo?.();

    const foxy = ANIMATRONICS.find(a => a instanceof Foxy);
    if (foxy) {
      if (foxy.sprintTimer)  { clearTimeout(foxy.sprintTimer);  foxy.sprintTimer  = null; }
      if (foxy._runSfxTimer) { clearTimeout(foxy._runSfxTimer); foxy._runSfxTimer = null; }
      if (foxy.lockTimer)    { clearTimeout(foxy.lockTimer);    foxy.lockTimer    = null; }
      foxy.locked = false;
    }

    const bonnie = ANIMATRONICS.find(a => a instanceof Bonnie);
    if (bonnie && bonnie._doorTimer) { clearTimeout(bonnie._doorTimer); bonnie._doorTimer = null; }

    const state = gameCtx.state;
    if (state) {
      ['left', 'right'].forEach(side => {
        if (state[side].door !== 'open') {
          state[side].door = 'open';
          gameCtx.startDoorAnim?.(side, -1);
        }
        state[side].light = 'off';
      });
    }

    new Audio('/assets/FNaF 1 Audio/chimes 2.wav').play().catch(() => {});
    setTimeout(() => new Audio('/assets/FNaF 1 Audio/CROWD_SMALL_CHIL_EC049202.wav').play().catch(() => {}), 2000);

    // Trigger 6AM canvas animation — delegated back to React via callback
    gameCtx.on6AMAnimation?.(() => {
      if (this.night >= 6) {
        setTimeout(() => { window.location.href = '/menu'; }, 1000);
        return;
      }
      this._advanceToNextNight();
    });
  },

  _advanceToNextNight() {
    this.night++;
    this.rawPower       = 999;
    this.secondsElapsed = 0;
    this.passiveAccum   = 0;
    this._6amTriggered  = false;

    ANIMATRONICS.forEach(a => {
      a.level         = base_ai_level[this.night]?.[a.name] || 0;
      a._boostApplied = false;
      if (a instanceof Foxy) {
        a.stage = 1; a.bangCount = 0;
        window.foxyRunning = false; window.foxyRunAnimDone = false;
      }
      if (a instanceof Bonnie) a._resetOfficeState();
      if (a instanceof Chica)  a._resetOfficeState();
      if (a.valid) {
        const cur = Object.keys(ROOMS).find(k => ROOMS[k].who.includes(a.name));
        if (cur) ROOMS[cur].who = ROOMS[cur].who.filter(n => n !== a.name);
        a.room = 'show_stage';
        ROOMS['show_stage'].who.push(a.name);
      }
    });

    gameCtx.showHUD?.();
    gameCtx.sfxFan?.play().catch(() => {});
    this.render();
  },
};

// ── Animatronic instances ─────────────────────────────────────

export const freddy = new Freddy();
export const bonnie = new Bonnie();
export const chica  = new Chica();
export const foxy   = new Foxy();
export const ANIMATRONICS = [freddy, bonnie, chica, foxy];

// Inject GameState reference into base class (solves circular dep)
setGameStateRef(GameState);

// Inject jumpscare callbacks into gameCtx (consumed by animatronics)
gameCtx.playBonnieJumpscare = playBonnieJumpscare;
gameCtx.playChicaJumpscare  = playChicaJumpscare;
gameCtx.playFoxyJumpscare   = playFoxyJumpscare;
gameCtx.playFreddyJumpscare = playFreddyJumpscare;
gameCtx.playPowerOutJumpscare = playPowerOutJumpscare;

// ── Camera image picker ───────────────────────────────────────

function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
const _camCache = {};
function _stablePick(room, arr, extraKey) {
  const who  = (ROOMS[room]?.who ?? []).slice().sort().join(',');
  const key  = who + '|' + (extraKey ?? '');
  const cache = _camCache[room];
  if (cache && cache.key === key) return cache.path;
  const path = _pick(arr);
  _camCache[room] = { key, path };
  return path;
}
export function clearCamCache() { Object.keys(_camCache).forEach(k => delete _camCache[k]); }

let _chicaEHCornerRoll = 1;
setInterval(() => { _chicaEHCornerRoll = Math.floor(Math.random() * 30) + 1; }, 50);
let _bonnieWHCornerRoll = 1;
setInterval(() => { _bonnieWHCornerRoll = Math.floor(Math.random() * 30) + 1; }, 50);

export function getCamImagePath(room) {
  const who       = ROOMS[room]?.who ?? [];
  const hasFreddy = who.includes('Freddy');
  const hasBonnie = who.includes('Bonnie');
  const hasChica  = who.includes('Chica');

  switch (room) {
    case 'show_stage':
      if (hasFreddy && hasBonnie && hasChica)
        return CAM_BASE + _stablePick(room, ['All_1.png','All_2.png'], 'all');
      if (hasBonnie && hasFreddy) return CAM_BASE + 'show stage/Bonnie_Freddy.png';
      if (hasChica  && hasFreddy) return CAM_BASE + 'show stage/chica_freddy.png';
      if (hasFreddy) return CAM_BASE + _stablePick(room, ['show stage/Freddy_1.png','show stage/Freddy_2.png']);
      return CAM_BASE + 'show stage/Empty.png';

    case 'dining_area':
      if (hasBonnie) return CAM_BASE + _stablePick(room, ['Dining Area/Bonnie_1.png','Dining Area/Bonnie_2.png']);
      if (hasChica)  return CAM_BASE + _stablePick(room, ['Dining Area/Chica_1.png','Dining Area/Chica_2.png']);
      if (hasFreddy) return CAM_BASE + 'Dining Area/Freddy.png';
      return CAM_BASE + 'Dining Area/Empty.png';

    case 'pirate_cove': {
      if (!foxy?.valid) return CAM_BASE + 'Pirate Cove/stage_1.png';
      if (foxy.stage === 4)
        return CAM_BASE + 'Pirate Cove/' + (Math.floor(Date.now() / 500) % 2 === 0 ? 'stage_4_1.png' : 'stage_4_2.png');
      return CAM_BASE + `Pirate Cove/stage_${foxy.stage}.png`;
    }

    case 'west_hall':
      if (hasBonnie) return CAM_BASE + 'West Hall/Bonnie.png';
      return CAM_BASE + 'West Hall/empty_lightson.png';

    case 'west_hall_corner':
      if (hasBonnie) {
        let img = 'Bonnie_1.png';
        if (_bonnieWHCornerRoll >= 25 && _bonnieWHCornerRoll <= 28) img = 'Bonnie_2.png';
        else if (_bonnieWHCornerRoll >= 29) img = 'Bonnie_3.png';
        return CAM_BASE + 'West Hall Corner/' + img;
      }
      if (hasFreddy) return CAM_BASE + 'West Hall Corner/Golden_Freddy.png';
      return CAM_BASE + _stablePick(room, ['West Hall Corner/Empty_1.png','West Hall Corner/Empty_2.png']);

    case 'backstage':
      if (hasBonnie) return CAM_BASE + _stablePick(room, ['Backstage/Bonnie.png','Backstage/Bonnie_close.png']);
      if (hasFreddy) return CAM_BASE + 'Backstage/Freddy.png';
      return CAM_BASE + _stablePick(room, ['Backstage/Empty_1.png','Backstage/Empty_2.png']);

    case 'east_hall':
      if (hasChica)  return CAM_BASE + _stablePick(room, ['East Hall/Chica_1.png','East Hall/Chica_2.png']);
      if (hasFreddy) return CAM_BASE + 'East Hall/Freddy.png';
      return CAM_BASE + _stablePick(room, ['East Hall/Empty_1.png','East Hall/Empty_2.png','East Hall/Empty_3.png']);

    case 'east_hall_corner':
      if (hasChica) {
        let img = 'Chica_1.png';
        if (_chicaEHCornerRoll >= 25 && _chicaEHCornerRoll <= 28) img = 'Chica_2.png';
        else if (_chicaEHCornerRoll >= 29) img = 'Chica_3.png';
        return CAM_BASE + 'East Hall Corner/' + img;
      }
      if (hasFreddy) return CAM_BASE + 'East Hall Corner/Freddy.png';
      return CAM_BASE + _stablePick(room, [
        'East Hall Corner/Empty_1.png','East Hall Corner/Empty_2.png',
        'East Hall Corner/Empty_3.png','East Hall Corner/Empty_4.png','East Hall Corner/Empty_5.png',
      ]);

    case 'restrooms':
      if (hasChica)  return CAM_BASE + _stablePick(room, ['Restrooms/Chica_1.png','Restrooms/Chica_2.png']);
      if (hasFreddy) return CAM_BASE + 'Restrooms/Freddy.png';
      return CAM_BASE + 'Restrooms/Empty.png';

    case 'supply_closet':
      if (hasBonnie) return CAM_BASE + 'Supply Closet/Bonnie.png';
      return CAM_BASE + 'Supply Closet/Empty.png';

    case 'kitchen':
      return null; // video

    default:
      return null;
  }
}

// ── Game initialiser — called from the React component ───────

export function initGameLogic() {
  setInterval(() => GameState.tick(), 1000);
  GameState.render();

  setInterval(() => { if (freddy.valid) freddy.tryMove(); }, ANIM_INTERVALS.freddy);
  setInterval(() => { if (bonnie.valid) bonnie.tryMove(); }, ANIM_INTERVALS.bonnie);
  setInterval(() => { if (chica.valid)  chica.tryMove();  }, ANIM_INTERVALS.chica);
  setInterval(() => { if (foxy.valid)   foxy.tryMove();   }, ANIM_INTERVALS.foxy);

  window.foxyRunning    = false;
  window.bonnieAtDoor   = false;
  window.bonnieInOffice = false;
  window.chicaAtDoor    = false;
  window.chicaInOffice  = false;
  window.isTabletOpen   = false;
  window.activeCam      = 'show_stage';

  // Ambient kitchen / pirate / circus sounds
  const _kitchenAudios = [
    new Audio('/assets/FNaF 1 Audio/OVEN-DRA_1_GEN-HDF18119.wav'),
    new Audio('/assets/FNaF 1 Audio/OVEN-DRA_2_GEN-HDF18120.wav'),
    new Audio('/assets/FNaF 1 Audio/OVEN-DRA_7_GEN-HDF18121.wav'),
    new Audio('/assets/FNaF 1 Audio/OVEN-DRAWE_GEN-HDF18122.wav'),
  ];
  const _foxyPirateAudio = new Audio('/assets/FNaF 1 Audio/pirate song2.wav');
  const _circusAudio     = new Audio('/assets/FNaF 1 Audio/circus.wav');

  setInterval(() => {
    if (GameState._6amTriggered || GameState._powerOutTriggered) return;
    if (!ROOMS['kitchen'].who.includes('Chica')) return;
    const pick = Math.floor(Math.random() * 30) + 1;
    if (pick <= 4) {
      const a = _kitchenAudios[pick - 1];
      a.currentTime = 0;
      a.volume = window.activeCam === 'kitchen' ? 0.6 : 0.2;
      a.play().catch(() => {});
    }
  }, 4000);

  setInterval(() => {
    if (GameState._6amTriggered || GameState._powerOutTriggered) return;
    if (Math.floor(Math.random() * 30) + 1 === 1) {
      _foxyPirateAudio.currentTime = 0;
      _foxyPirateAudio.volume = window.activeCam === 'pirate_cove' ? 0.3 : 0.1;
      _foxyPirateAudio.play().catch(() => {});
    }
  }, 4000);

  setInterval(() => {
    if (GameState._6amTriggered || GameState._powerOutTriggered) return;
    if (Math.floor(Math.random() * 30) + 1 === 1) {
      _circusAudio.currentTime = 0;
      _circusAudio.volume = 0.3;
      _circusAudio.play().catch(() => {});
    }
  }, 5000);
}
