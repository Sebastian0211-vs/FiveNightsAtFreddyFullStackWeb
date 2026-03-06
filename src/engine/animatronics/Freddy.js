// ── Freddy ────────────────────────────────────────────────────

class Freddy extends Animatronic {
    constructor() {
        super('Freddy', FreddyRooms);
        this.room  = getRoom(this.name);
        this.valid = FREDDY;
        this.inOffice   = false;
        this._atDoor    = false;
        this._doorTimer = null;
        this.phase2 = false;
        this._tabletWasOpen = false; // surveille le cycle open→close
    }

    tryMove() {
        if (this._atDoor || this.inOffice) return;

        const current = getRoom(this.name);

        if (current === 'east_hall_corner') {
            console.log("FREDDY INTO PHASE 2")
            this.phase2 = true;
            this._atDoor = true;        // ← bloque les tryMove suivants
            console.log("FREDDY IS IN THE CORNER PLANIFIY ATTACK")
            this._scheduleAttack();
            return;
        }

        console.log("Is cam active ? ", window.isTabletOpen)
        console.log("ACTIVE CAM : ", window.activeCam, " FREDDY'S ROOM : ", current)
        if (window.isTabletOpen && window.activeCam === current && ((this.ai_level < 10 && !this.phase2) || (this.phase2)))  { //&& ((this.ai_level < 10 && !this.phase2) || (this.phase2)))
            console.log('[Freddy] being watched — no move', this.phase2);
            return;
        }

        console.log('[FREDDY] tries to move — AI:', this.ai_level);
        if (Math.random() * 20 > this.ai_level) return; // jet raté

        const possibleMoves = FreddyRooms[current]?.connections ?? [];
        if (!possibleMoves.length) return;
        const isInKitchen = current === 'kitchen';

        const nextRoom = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        console.log(`Freddy : ${current} → ${nextRoom}`);


        const SOUNDS = [
            '../../assets/FNaF 1 Audio/Laugh_Giggle_Girl_1.wav',
            '../../assets/FNaF 1 Audio/Laugh_Giggle_Girl_2d.wav',
            '../../assets/FNaF 1 Audio/Laugh_Giggle_Girl_8d.wav']

        if (this._musicBoxSfx) {
            this._musicBoxSfx.pause();
            this._musicBoxSfx.currentTime = 0;
            this._musicBoxSfx = null;
        }

        // Déplacement classique
        if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0 || ROOMS[nextRoom].who.includes('Chica')) {
            moveToRoom(this.name, nextRoom);
            if (isInKitchen) {
                console.log('[Freddy] is in kitchen - playing sound')
                const laugh2 = new Audio('../../assets/FNaF 1 Audio/Laugh_Giggle_Girl_2d.wav')
                laugh2.volume = 0.4;
                laugh2.play().catch(() => {
                });
                this._musicBoxSfx = new Audio('../../assets/FNaF 1 Audio/music box.wav');
                this._musicBoxSfx.volume = 0.3;
                this._musicBoxSfx.play().catch(() => {});
            } else {
                let select = new Audio(SOUNDS[Math.round((Math.random() * 3))]);
                switch (this.room){
                    case 'dining_area':
                        select.volume = 0.15;
                        break;
                    case 'restroom':
                        select.volume = 0.25;
                        break;
                    case 'east_hall':
                        select.volume = 0.5;
                        break;
                    case 'east_hall_corner':
                        select.volume = 0.7
                        break;
                }
                select.play().catch(() => {
                });
            }
        } else {
            console.log(`${nextRoom} NOT empty — stay`);
        }
    }

    _scheduleAttack() {
        console.log("FREDDY'S SCHEDULING")
        if (this._doorTimer) clearTimeout(this._doorTimer);
        this._doorTimer = setTimeout(() => this._tryEnterOffice(), ANIM_INTERVALS.freddy);
    }

    _tryEnterOffice() {
        console.log("FREDDY TRY TO ENTER THE OFFICE")

        if (window.isTabletOpen && window.activeCam === 'east_hall_corner') {
            console.log('[Freddy] being watched at door — retry later');
            this._scheduleAttack();
            return;
        }
        if (state.right.door === 'closed') {
            this._atDoor = false;
            this.room = 'east_hall';
            moveToRoom(this.name, this.room);
            console.log('[Freddy] door closed, retreats to', this.room);
            return;
        }

        // Porte ouverte → AI roll
        if (Math.random() * 20 >= this.ai_level) {
            console.log('[Freddy] AI fail, stays at door');
            this._scheduleAttack()
            return;
        }

        console.log('[Freddy] is in -> JUMPSCARE')
        playFreddyJumpscare();

        // Succès → lumière allumée = screamer immédiat, sinon entrée silencieuse
        /*
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

        */
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
