import { base_ai_level, boost_ai_level, HOURS, ANIM_INTERVALS } from '../../constants/nightConfig.js';
import { ROOMS } from '../../data/rooms.js';

// GameState ref — set by gameState.js after it initialises GameState.
// Animatronic methods access it at call-time so there is no circular-dep issue.
let _GameState = { night: 1, getCurrentHour: () => 0 };
export function setGameStateRef(ref) { _GameState = ref; }

// ── Shared helpers ────────────────────────────────────────────

export function getRoom(name) {
  return Object.keys(ROOMS).find(key => ROOMS[key].who.includes(name));
}

export function moveToRoom(name, newRoom) {
  const current = getRoom(name);
  if (current) ROOMS[current].who = ROOMS[current].who.filter(n => n !== name);
  if (ROOMS[newRoom]) ROOMS[newRoom].who.push(name);
}

// ── Base class ────────────────────────────────────────────────

export const FREDDY = true;
export const CHICA  = true;
export const BONNIE = true;
export const FOXY   = true;

export class Animatronic {
  constructor(name, rooms, startRoom = 'show_stage') {
    this.name   = name;
    this.rooms  = rooms;
    this.room   = startRoom;
    this.moving = false;
    this.valid  = false;
    this.level  = base_ai_level[_GameState.night]?.[this.name] || 0;
    this.currentHour   = _GameState.getCurrentHour();
    this._boostApplied = false;
  }

  get ai_level() {
    const boost = boost_ai_level[HOURS[_GameState.getCurrentHour()]]?.[this.name] || 0;
    if (_GameState.getCurrentHour() !== this.currentHour) {
      this.currentHour   = _GameState.getCurrentHour();
      this._boostApplied = false;
    }
    if (boost > 0 && !this._boostApplied) {
      this._boostApplied = true;
      this.level += boost;
    }
    return this.level;
  }

  tryMove()   { return false; }
  canAttack() { return false; }
}
