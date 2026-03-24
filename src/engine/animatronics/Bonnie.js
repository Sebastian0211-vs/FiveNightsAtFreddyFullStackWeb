import { Animatronic, getRoom, moveToRoom, BONNIE } from './Animatronic.js';
import { BonnieRooms, ROOMS } from '../../data/rooms.js';
import { ANIM_INTERVALS } from '../../constants/nightConfig.js';
import { gameCtx } from '../gameContext.js';

export class Bonnie extends Animatronic {
  constructor() {
    super('Bonnie', BonnieRooms);
    this.room       = getRoom(this.name);
    this.valid      = BONNIE;
    this.inOffice   = false;
    this._atDoor    = false;
    this._doorTimer = null;
    this._tabletWasOpen = false;
  }

  tryMove() {
    if (this._atDoor || this.inOffice) return;
    if (this._6amTriggered) return;

    console.log('[Bonnie] tries to move — AI:', this.ai_level);
    if (Math.random() * 20 > this.ai_level) return;

    const current       = getRoom(this.name);
    const possibleMoves = BonnieRooms[current]?.connections ?? [];
    const inCloseSector = ['west_hall', 'supply_closet', 'west_hall_corner'].includes(current);
    if (!possibleMoves.length) return;

    const nextRoom = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    console.log(`Bonnie: ${current} → ${nextRoom}`);

    if (nextRoom === 'office_left') {
      if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0) {
        moveToRoom(this.name, nextRoom);
        this._atDoor = true;
        window.bonnieAtDoor = true;
        this._scheduleAttack();
      }
      return;
    }

    if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0) {
      moveToRoom(this.name, nextRoom);
      if (inCloseSector) {
        const sfx = new Audio('/assets/FNaF 1 Audio/deep steps.wav');
        sfx.volume = 1;
        sfx.play().catch(() => {});
      }
    }
  }

  _scheduleAttack() {
    if (this._doorTimer) clearTimeout(this._doorTimer);
    this._doorTimer = setTimeout(() => {
      if (this._6amTriggered) return;
      if (this._powerOutTriggered) return;
      this._tryEnterOffice();
    }, ANIM_INTERVALS.bonnie);
  }

  _tryEnterOffice() {
    const state = gameCtx.state;
    if (!state) return;

    if (state.left.door === 'closed') {
      this._atDoor = false;
      window.bonnieAtDoor = false;
      this.room = Math.random() < 0.5 ? 'dining_area' : 'west_hall';
      moveToRoom(this.name, this.room);
      return;
    }

    if (Math.random() * 20 >= this.ai_level) {
      this._scheduleAttack();
      return;
    }

    const leftLit = state.left.light === 'on';
    if (leftLit) {
      this._atDoor = false;
      window.bonnieAtDoor = false;
      gameCtx.playBonnieJumpscare?.();
    } else {
      this._atDoor  = false;
      this.inOffice = true;
      window.bonnieAtDoor   = false;
      window.bonnieInOffice = true;
    }
  }

  onTabletOpen() {
    if (this.inOffice) this._tabletWasOpen = true;
  }

  onTabletClose() {
    if (this.inOffice && this._tabletWasOpen) {
      this._tabletWasOpen   = false;
      this.inOffice         = false;
      window.bonnieInOffice = false;
      this._resetOfficeState();
      gameCtx.playBonnieJumpscare?.();
      return;
    }
    if (!this.inOffice) this._tabletWasOpen = false;
  }

  _resetOfficeState() {
    if (this._doorTimer) { clearTimeout(this._doorTimer); this._doorTimer = null; }
    this._atDoor          = false;
    this.inOffice         = false;
    this._tabletWasOpen   = false;
    window.bonnieAtDoor   = false;
    window.bonnieInOffice = false;
  }

  canAttack()  { return false; }
  get isAtDoor()   { return this._atDoor;  }
  get isInOffice() { return this.inOffice; }
}
