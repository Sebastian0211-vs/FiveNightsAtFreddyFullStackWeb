import { Animatronic, getRoom, moveToRoom, FREDDY } from './Animatronic.js';
import { FreddyRooms, ROOMS } from '../../data/rooms.js';
import { ANIM_INTERVALS } from '../../constants/nightConfig.js';
import { gameCtx } from '../../../../../Downloads/gameContext.js';

export class Freddy extends Animatronic {
  constructor() {
    super('Freddy', FreddyRooms);
    this.room  = getRoom(this.name);
    this.valid = FREDDY;
    this.inOffice   = false;
    this._atDoor    = false;
    this._doorTimer = null;
    this.phase2 = false;
    this._tabletWasOpen = false;
    this._musicBoxSfx   = null;
  }

  tryMove() {
    if (this._atDoor || this.inOffice) return;
    if (this._6amTriggered) return;

    const current = getRoom(this.name);

    if (current === 'east_hall_corner') {
      this.phase2  = true;
      this._atDoor = true;
      this._scheduleAttack();
      return;
    }

    if (window.isTabletOpen && window.activeCam === current &&
        ((this.ai_level < 10 && !this.phase2) || this.phase2)) {
      return;
    }

    if (Math.random() * 20 > this.ai_level) return;

    const possibleMoves = FreddyRooms[current]?.connections ?? [];
    if (!possibleMoves.length) return;
    const isInKitchen = current === 'kitchen';

    const nextRoom = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    if (this._musicBoxSfx) {
      this._musicBoxSfx.pause();
      this._musicBoxSfx.currentTime = 0;
      this._musicBoxSfx = null;
    }

    if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0 || ROOMS[nextRoom].who.includes('Chica')) {
      moveToRoom(this.name, nextRoom);
      if (isInKitchen) {
        const laugh = new Audio('/assets/FNaF 1 Audio/Laugh_Giggle_Girl_2d.wav');
        laugh.volume = 0.4;
        laugh.play().catch(() => {});
        this._musicBoxSfx = new Audio('/assets/FNaF 1 Audio/music box.wav');
        this._musicBoxSfx.volume = 0.3;
        this._musicBoxSfx.play().catch(() => {});
      } else {
        const sounds = [
          '/assets/FNaF 1 Audio/Laugh_Giggle_Girl_1.wav',
          '/assets/FNaF 1 Audio/Laugh_Giggle_Girl_2d.wav',
          '/assets/FNaF 1 Audio/Laugh_Giggle_Girl_8d.wav',
        ];
        const sfx = new Audio(sounds[Math.floor(Math.random() * sounds.length)]);
        const volMap = {
          dining_area: 0.15, restrooms: 0.25,
          east_hall: 0.5, east_hall_corner: 0.7,
        };
        sfx.volume = volMap[nextRoom] ?? 0.1;
        sfx.play().catch(() => {});
      }
    }
  }

  _scheduleAttack() {
    if (this._doorTimer) clearTimeout(this._doorTimer);
    this._doorTimer = setTimeout(() => this._tryEnterOffice(), ANIM_INTERVALS.freddy);
  }

  _tryEnterOffice() {
    if (this._6amTriggered) return;

    if (window.isTabletOpen && window.activeCam === 'east_hall_corner') {
      this._scheduleAttack();
      return;
    }

    const state = gameCtx.state;
    if (!state) return;

    if (state.right.door === 'closed') {
      this._atDoor = false;
      this.room    = 'east_hall';
      moveToRoom(this.name, this.room);
      return;
    }

    if (Math.random() * 20 >= this.ai_level) {
      this._scheduleAttack();
      return;
    }

    gameCtx.playFreddyJumpscare?.();
  }

  _resetOfficeState() {
    if (this._doorTimer) { clearTimeout(this._doorTimer); this._doorTimer = null; }
    this._atDoor        = false;
    this.inOffice       = false;
    this._tabletWasOpen = false;
  }

  canAttack()  { return false; }
  get isAtDoor()   { return this._atDoor;  }
  get isInOffice() { return this.inOffice; }
}
