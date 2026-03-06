// ── Chica ─────────────────────────────────────────────────────

class Chica extends Animatronic {
    constructor() {
        super('Chica', ChicaRooms);
        this.room  = getRoom(this.name);
        this.valid = CHICA;
        this.inOffice   = false;
        this._atDoor    = false;
        this._doorTimer = null;
        this._tabletWasOpen = false;
    }


// ── Déplacement normal (appelé par setInterval) ───────────
    tryMove() {
        // Immobile si elle attend devant la porte ou qu'elle est déjà dans le bureau
        if (this._atDoor || this.inOffice) return;

        console.log('[CHICA] tries to move — AI:', this.ai_level);
        if (Math.random() * 20 > this.ai_level) return; // jet raté

        const current       = getRoom(this.name);
        const possibleMoves = ChicaRooms[current]?.connections ?? [];
        if (!possibleMoves.length) return;
        const inCloseSector = ['east_hall', 'kitchen','east_hall_corner'].includes(current);


        const nextRoom = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        console.log(`Chica : ${current} → ${nextRoom}`);

        // Arrivée devant la porte gauche
        if (nextRoom === 'office_right') {
            if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0 || ROOMS[nextRoom].who.includes('Freddy')) {
                moveToRoom(this.name, nextRoom);
                this._atDoor = true;
                window.chicaAtDoor = true;
                console.log('[CHICA] AT THE DOOR — waiting to attack');
                this._scheduleAttack();
            } else {
                console.log(`${nextRoom} NOT empty — stay`);
            }
            return;
        }

        // Déplacement classique
        if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0 || ROOMS[nextRoom].who.includes('Freddy')) {
            moveToRoom(this.name, nextRoom);
            if (inCloseSector) {
                console.log('[Chica] entered close sector — chance to head to door');
                const stepssfx = new Audio('../../assets/FNaF 1 Audio/deep steps.wav');
                stepssfx.volume = 1;
                stepssfx.play().catch(() => {});
            }
        } else {
            console.log(`${nextRoom} NOT empty — stay`);
        }
    }

    _scheduleAttack() {
        if (this._doorTimer) clearTimeout(this._doorTimer);
        this._doorTimer = setTimeout(() => this._tryEnterOffice(), ANIM_INTERVALS.bonnie);
    }

    _tryEnterOffice() {
        if (state.right.door === 'closed') {
            // Porte fermée → retreat
            this._atDoor = false;
            window.chicaAtDoor = false;
            this.room = Math.random() < 0.5 ? 'dining_area' : 'east_hall';
            moveToRoom(this.name, this.room);

            console.log('[Chica] door closed, retreats to', this.room);
            return;
        }

        // Porte ouverte → AI roll
        if (Math.random() * 20 >= this.ai_level) {
            console.log('[Chica] AI fail, stays at door');
            this._scheduleAttack();
            return;
        }

        // Succès → lumière allumée = screamer immédiat, sinon entrée silencieuse
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
    }

    onTabletOpen() {
        if (this.inOffice) {
            this._tabletWasOpen = true;
            console.log('[Chica] Tablet opened while in office — will strike on close');
        }
    }

    // Appelé par mainroom quand la tablette est REFERMÉE
    onTabletClose() {
        if (this.inOffice && this._tabletWasOpen) {
            console.log('[Chica] Tablet closed — JUMPSCARE');
            this._tabletWasOpen   = false;
            this.inOffice         = false;
            window.chicaInOffice = false;
            this._resetOfficeState();
            playChicaJumpscare();
            return;
        }
        // Reset le flag au cas où
        if (!this.inOffice) this._tabletWasOpen = false;
    }

    _resetOfficeState() {
        if (this._doorTimer) { clearTimeout(this._doorTimer); this._doorTimer = null; }
        this._atDoor          = false;
        this.inOffice         = false;
        this._tabletWasOpen   = false;
        window.chicaAtDoor   = false;
        window.chicaInOffice = false;
    }

    canAttack() { return false; } // attaque gérée en interne

    // Getters pour le renderer / minimap
    get isAtDoor()   { return this._atDoor;  }
    get isInOffice() { return this.inOffice; }
}
