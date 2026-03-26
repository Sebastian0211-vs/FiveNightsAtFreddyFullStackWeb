// ── Animatronics ──────────────────────────────────────────────

const FREDDY = true;
const CHICA  = true;
const BONNIE = true;
const FOXY   = true;

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
