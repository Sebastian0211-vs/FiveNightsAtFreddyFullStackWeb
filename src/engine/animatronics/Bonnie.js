// ── Bonnie ────────────────────────────────────────────────────
//
//  États :
//    normal          — se déplace dans les couloirs
//    _atDoor = true  — est à office_left, visible si lumière gauche allumée
//                      son timer d'attaque tourne
//    inOffice = true — a réussi à entrer silencieusement dans le bureau
//                      → dès que la tablette est ouverte PUIS refermée : screamer
//
//  Résolution de l'attaque depuis office_left :
//    • Porte fermée              → repart (dining_area ou west_hall)
//    • Porte ouverte + jet raté → reste et replanifie
//    • Porte ouverte + jet OK   → entre silencieusement (inOffice = true)
//
//  window.bonnieAtDoor  — lu par mainroom.html pour afficher l'image
// ─────────────────────────────────────────────────────────────

class Bonnie extends Animatronic {
    constructor() {
        super('Bonnie', BonnieRooms);
        this.room       = getRoom(this.name);
        this.valid      = BONNIE;
        this.inOffice   = false;
        this._atDoor    = false;
        this._doorTimer = null;
        this._tabletWasOpen = false; // surveille le cycle open→close
    }

    // ── Déplacement normal (appelé par setInterval) ───────────
    tryMove() {
        // Immobile s'il attend devant la porte ou qu'il est déjà dans le bureau
        //if (this._atDoor || this.inOffice) return;

        if (this._atDoor || this.inOffice) return;

        console.log('[Bonnie] tries to move — AI:', this.ai_level);
        if (Math.random() * 20 > this.ai_level) return; // jet raté

        const current       = getRoom(this.name);
        const possibleMoves = BonnieRooms[current]?.connections ?? [];
        const inCloseSector = ['west_hall', 'supply closet','west_hall_corner'].includes(current);
        if (!possibleMoves.length) return;

        const nextRoom = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        console.log(`Bonnie: ${current} → ${nextRoom}`);

        // Arrivée devant la porte gauche
        if (nextRoom === 'office_left') {
            if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0) {
                moveToRoom(this.name, nextRoom);
                this._atDoor = true;
                window.bonnieAtDoor = true;
                console.log('[Bonnie] AT THE DOOR — waiting to attack');
                this._scheduleAttack();
            } else {
                console.log(`${nextRoom} NOT empty — stay`);
            }
            return;
        }

        // Déplacement classique
        if (!ROOMS[nextRoom] || ROOMS[nextRoom].who.length === 0 && !this.inOffice) {
            moveToRoom(this.name, nextRoom);
            if (inCloseSector) {
                console.log('[Bonnie] entered close sector — chance to head to door');
                const stepssfx = new Audio('../../assets/FNaF 1 Audio/deep steps.wav');
                stepssfx.volume = 1;
                stepssfx.play().catch(() => {});
            }
        } else {
            console.log(`${nextRoom} NOT empty — stay`);
        }

    }

    // ── Planifie la tentative d'entrée (1 cycle de mouvement) ─
    _scheduleAttack() {
        if (this._doorTimer) clearTimeout(this._doorTimer);
        this._doorTimer = setTimeout(() => {
                if(this._6amTriggered) return;
                if(this._powerOutTriggered) return;
                this._tryEnterOffice();
            },
            ANIM_INTERVALS.bonnie);
    }

    // ── Résolution : Bonnie tente d'entrer ───────────────────
    _tryEnterOffice() {
        if (state.left.door === 'closed') {
            this._atDoor = false;
            window.bonnieAtDoor = false;
            this.room = Math.random() < 0.5 ? 'dining_area' : 'west_hall';
            moveToRoom(this.name, this.room);
            console.log('[Bonnie] door closed, retreats to', this.room);
            return;
        }

        if (Math.random() * 20 >= this.ai_level) {
            console.log('[Bonnie] AI fail, stays at door — retrying');
            this._scheduleAttack();
            return;
        }

        // Succès → lumière allumée = screamer immédiat, sinon entrée silencieuse
        const leftLit = state.left.light === 'on';
        if (leftLit) {
            console.log('[Bonnie] caught in light — jumpscare!');
            this._atDoor = false;
            window.bonnieAtDoor = false;
            playBonnieJumpscare();
        } else {
            console.log('[Bonnie] silent entry');
            this._atDoor  = false;
            this.inOffice = true;
            window.bonnieAtDoor  = false;
            window.bonnieInOffice = true;
        }
    }

    // ── Appelé par mainroom quand la tablette est OUVERTE ─────
    //    On enregistre que la tablette a été ouverte pendant qu'il est dans le bureau
    onTabletOpen() {
        if (this.inOffice) {
            this._tabletWasOpen = true;
            console.log('[Bonnie] Tablet opened while in office — will strike on close');
        }
    }

    // ── Appelé par mainroom quand la tablette est REFERMÉE ────
    onTabletClose() {
        if (this.inOffice && this._tabletWasOpen) {
            console.log('[Bonnie] Tablet closed — JUMPSCARE');
            this._tabletWasOpen   = false;
            this.inOffice         = false;
            window.bonnieInOffice = false;
            this._resetOfficeState();
            playBonnieJumpscare();
            return;
        }
        // Reset le flag au cas où
        if (!this.inOffice) this._tabletWasOpen = false;
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
