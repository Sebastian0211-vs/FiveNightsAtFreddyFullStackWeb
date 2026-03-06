// ── Night / time constants ────────────────────────────────────

const HOURS         = ['12 AM','1 AM','2 AM','3 AM','4 AM','5 AM','6 AM'];
const NIGHT_SECS    = 535; //535
const SECS_PER_HOUR = NIGHT_SECS / 6;

// Power drained passively every N seconds (0 = no passive drain on night 1)
const PASSIVE_INTERVAL = { 1: 0, 2: 6, 3: 5, 4: 4, 5: 3, 6: 3, 7: 3 };


const base_ai_level = {
    1:  { Freddy: 0,  Bonnie: 0, Chica: 0,  Foxy: 0  },
    2:  { Freddy: 0,  Bonnie: 3,  Chica: 1,  Foxy: 1  },
    3:  { Freddy: 1,  Bonnie: 0,  Chica: 5,  Foxy: 2  },
    41: { Freddy: 1,  Bonnie: 2,  Chica: 4,  Foxy: 6  },
    42: { Freddy: 2,  Bonnie: 2,  Chica: 4,  Foxy: 6  },
    5:  { Freddy: 3,  Bonnie: 5,  Chica: 7,  Foxy: 5  },
    6:  { Freddy: 4,  Bonnie: 10, Chica: 12, Foxy: 16 },
};

const boost_ai_level = {
    '12 AM': { Freddy: 0, Bonnie: 0, Chica: 0, Foxy: 0 },
    '1 AM':  { Freddy: 0, Bonnie: 0, Chica: 0, Foxy: 0 },
    '2 AM':  { Freddy: 0, Bonnie: 1, Chica: 0, Foxy: 0 },
    '3 AM':  { Freddy: 0, Bonnie: 1, Chica: 1, Foxy: 1 },
    '4 AM':  { Freddy: 0, Bonnie: 1, Chica: 1, Foxy: 1 },
    '5 AM':  { Freddy: 0, Bonnie: 0, Chica: 0, Foxy: 0 },
};

// ── Animatronic movement intervals (ms) ──────────────────────

const ANIM_INTERVALS = {
    freddy: 3020,
    bonnie: 4970,
    chica:  4980,
    foxy:   5010,
};
