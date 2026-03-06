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
        const sfx = new Audio('../../assets/FNaF 1 Audio/run.wav');
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
        const bangSfx = new Audio('../../assets/FNaF 1 Audio/knock2.wav');
        bangSfx.volume = 0.8;
        bangSfx.play().catch(() => {});
    }

    canAttack() { return false; }
}
