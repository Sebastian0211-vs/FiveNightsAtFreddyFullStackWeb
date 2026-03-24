import { Animatronic, getRoom, moveToRoom, CHICA } from './Animatronic.js';
import { ChicaRooms, ROOMS } from '../../data/rooms.js';
import { ANIM_INTERVALS } from '../../constants/nightConfig.js';
import { gameCtx } from '../../../../../Downloads/gameContext.js';

export class Chica extends Animatronic {
  constructor() {
    super('Chica', ChicaRooms);
    this.room  = getRoom(this.name);
    this.valid = CHICA;
    this.inOffice   = false;
    this._atDoor    = false;
    this._doorTimer = null;
    this._tabletWasOpen = false;
  }

  tryMove() {
    if (this._atDoor || this.inOffice) return;
    if (this._6amTriggered) return;

    console.log('[CHICA] tries to move — AI:', this.ai_level);
    if (Math.random() * 20 > this.ai_level) return;

    const current       = getRoom(this.name);
    const possibleMoves = ChicaRooms[current]?.connections ?? [];
    if (!possibleMoves.length) return;
    const inCloseSector = ['east_hall', 'kitchen', 'east_hall_corner'].includes(current);

    const nextRoom = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    console.log(`Chica: ${current} → ${nextRoom}`);

    if (nextRoom === 'office_right') {
      if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0 || ROOMS[nextRoom].who.includes('Freddy')) {
        moveToRoom(this.name, nextRoom);
        this._atDoor = true;
        window.chicaAtDoor = true;
        this._scheduleAttack();
      }
      return;
    }

    if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0 || ROOMS[nextRoom].who.includes('Freddy')) {
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
      this._tryEnterOffice();
    }, ANIM_INTERVALS.bonnie);
  }

  _tryEnterOffice() {
    const state = gameCtx.state;
    if (!state) return;

    if (state.right.door === 'closed') {
      this._atDoor = false;
      window.chicaAtDoor = false;
      this.room = Math.random() < 0.5 ? 'dining_area' : 'east_hall';
      moveToRoom(this.name, this.room);
      return;
    }

    if (Math.random() * 20 >= this.ai_level) {
      this._scheduleAttack();
      return;
    }

    const rightLit = state.right.light === 'on';
    if (rightLit) {
      this._atDoor = false;
      window.chicaAtDoor = false;
      gameCtx.playChicaJumpscare?.();
    } else {
      this._atDoor  = false;
      this.inOffice = true;
      window.chicaAtDoor   = false;
      window.chicaInOffice = true;
    }
  }

  onTabletOpen() {
    if (this.inOffice) this._tabletWasOpen = true;
  }

  onTabletClose() {
    if (this.inOffice && this._tabletWasOpen) {
      this._tabletWasOpen  = false;
      this.inOffice        = false;
      window.chicaInOffice = false;
      this._resetOfficeState();
      gameCtx.playChicaJumpscare?.();
      return;
    }
    if (!this.inOffice) this._tabletWasOpen = false;
  }

  _resetOfficeState() {
    if (this._doorTimer) { clearTimeout(this._doorTimer); this._doorTimer = null; }
    this._atDoor         = false;
    this.inOffice        = false;
    this._tabletWasOpen  = false;
    window.chicaAtDoor   = false;
    window.chicaInOffice = false;
  }

  canAttack()  { return false; }
  get isAtDoor()   { return this._atDoor;  }
  get isInOffice() { return this.inOffice; }
}
