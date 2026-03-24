import { Animatronic, FOXY } from './Animatronic.js';
import { gameCtx } from '../gameContext.js';
import { ANIM_INTERVALS } from '../../constants/nightConfig.js';

export class Foxy extends Animatronic {
  constructor() {
    super('Foxy', {});
    this.valid       = FOXY;
    this.stage       = 1;
    this.locked      = false;
    this.lockTimer   = null;
    this.sprintTimer = null;
    this.bangCount   = 0;
  }

  onTabletClose() {
    const lockMs = (0.83 + Math.random() * (16.67 - 0.83)) * 1000;
    this.locked = true;
    if (this.lockTimer) clearTimeout(this.lockTimer);
    this.lockTimer = setTimeout(() => { this.locked = false; }, lockMs);
  }

  tryMove() {
    if (this.stage >= 4)          return;
    if (this._6amTriggered)       return;
    if (this._powerOutTriggered)  return;
    if (this.locked)              return;
    if (window.isTabletOpen)      return;
    if (Math.random() * 20 >= this.ai_level) return;

    this.stage++;
    if (this.stage === 4) this._startSprint();
  }

  _startSprint() {
    window.foxyRunning     = true;
    window.foxyRunAnimDone = false;
    this._runSfxPlayed     = false;

    if (this.sprintTimer)  clearTimeout(this.sprintTimer);
    if (this._runSfxTimer) clearTimeout(this._runSfxTimer);

    this._runSfxTimer = setTimeout(() => {
      if (this._6amTriggered) return;
      this._playRunSfx();
    }, 22000);

    this.sprintTimer = setTimeout(() => {
      if (this._6amTriggered) return;
      this._attack();
    }, 25000);
  }

  _playRunSfx() {
    if (this._runSfxPlayed) return;
    this._runSfxPlayed = true;
    const sfx = new Audio('/assets/FNaF 1 Audio/run.wav');
    sfx.volume = 0.9;
    sfx.play().catch(() => {});
  }

  onWatchRunCam() {
    this._playRunSfx();
    if (this.sprintTimer)  { clearTimeout(this.sprintTimer);  this.sprintTimer  = null; }
    if (this._runSfxTimer) { clearTimeout(this._runSfxTimer); this._runSfxTimer = null; }
    this.sprintTimer = setTimeout(() => {
      if (this._6amTriggered) return;
      this._attack();
    }, 3000);
  }

  _attack() {
    window.foxyRunning             = false;
    window._foxyRunCamSfxTriggered = false;
    this.sprintTimer               = null;

    const state = gameCtx.state;
    if (!state) return;

    if (state.left.door === 'open') {
      gameCtx.playFoxyJumpscare?.();
    } else {
      this._bangDoor();
    }
  }

  _bangDoor() {
    const pct      = Math.min(1 + this.bangCount * 6, 13);
    const rawDrain = pct * 10;
    // Access GameState via the GameState module (safe — called at runtime)
    import('../../../../../Downloads/gameState.js').then(({ GameState }) => {
      GameState.rawPower = Math.max(0, GameState.rawPower - rawDrain);
    });
    this.bangCount++;
    this.stage = Math.random() < 0.5 ? 1 : 2;
    const sfx = new Audio('/assets/FNaF 1 Audio/knock2.wav');
    sfx.volume = 0.8;
    sfx.play().catch(() => {});
  }

  canAttack() { return false; }
}
