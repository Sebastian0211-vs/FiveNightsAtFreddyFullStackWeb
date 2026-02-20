// ============================================================
//  animations.js  —  All sprite / animation frame data
// ============================================================


// ── Menu animations ──────────────────────────────────────────

const FreddyMenu = {
    frames : [
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/2.png",
        "../assets/menu/2.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/4.png",
        "../assets/menu/4.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/4.png",
        "../assets/menu/4.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
        "../assets/menu/3.png",
        "../assets/menu/3.png",
        "../assets/menu/1.png",
        "../assets/menu/1.png",
    ],
    fps: 15,
};

const noiseMenu = {
    frames : [
        "../assets/menu/staticNoise1.png",
        "../assets/menu/staticNoise2.png",
        "../assets/menu/staticNoise3.png",
        "../assets/menu/staticNoise4.png",
        "../assets/menu/staticNoise5.png",
        "../assets/menu/staticNoise6.png",
        "../assets/menu/staticNoise7.png",
        "../assets/menu/staticNoise8.png",
    ],
    fps: 30,
};

const whiteMenu = {
    frames : [
        "../assets/menu/whiteNoise1.png",
        "../assets/menu/whiteNoise2.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/whiteNoise2.png",
        "../assets/menu/whiteNoise3.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/whiteNoise4.png",
        "../assets/menu/whiteNoise5.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/whiteNoise6.png",
        "../assets/menu/whiteNoise7.png",
        "../assets/menu/empty.png",
        "../assets/menu/whiteNoise7.png",
        "../assets/menu/whiteNoise8.png",
        "../assets/menu/whiteNoise9.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/whiteNoise10.png",
        "../assets/menu/whiteNoise11.png",
        "../assets/menu/whiteNoise12.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/whiteNoise13.png",
        "../assets/menu/whiteNoise14.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/empty.png",
        "../assets/menu/whiteNoise16.png",
    ],
    fps: 15,
};


// ── Door animations ───────────────────────────────────────────
// imgX / imgY / scale = position in source-image pixel space (same coord system as fan/buttons)

const mainRoomDoorLeft = {
    imgX:  73,
    imgY:  41,
    scale: 1.0,
    fps:   30,
    frames : [
        "../Assets/door_left/1.png",
        "../Assets/door_left/2.png",
        "../Assets/door_left/3.png",
        "../Assets/door_left/4.png",
        "../Assets/door_left/5.png",
        "../Assets/door_left/6.png",
        "../Assets/door_left/7.png",
        "../Assets/door_left/8.png",
        "../Assets/door_left/9.png",
        "../Assets/door_left/10.png",
        "../Assets/door_left/11.png",
        "../Assets/door_left/12.png",
        "../Assets/door_left/13.png",
        "../Assets/door_left/14.png",
        "../Assets/door_left/15.png",
        "../Assets/door_left/16.png",
    ],
};

const mainRoomDoorRight = {
    imgX:  1263,
    imgY:  31,
    scale: 1.0,
    fps:   30,
    frames : [
        "../Assets/door_right/1.png",
        "../Assets/door_right/2.png",
        "../Assets/door_right/3.png",
        "../Assets/door_right/4.png",
        "../Assets/door_right/5.png",
        "../Assets/door_right/6.png",
        "../Assets/door_right/7.png",
        "../Assets/door_right/8.png",
        "../Assets/door_right/9.png",
        "../Assets/door_right/10.png",
        "../Assets/door_right/12.png",
        "../Assets/door_right/13.png",
        "../Assets/door_right/14.png",
        "../Assets/door_right/15.png",
        "../Assets/door_right/16.png",
    ],
};


// ── Fan animation ─────────────────────────────────────────────

const fanAnimation = {
    frames: [
        '../assets/ventilateur/57.png',
        '../assets/ventilateur/59.png',
        '../assets/ventilateur/60.png',
    ],
    fps: 12,
    // Position in source-image pixel space
    imgX:  778,
    imgY:  303,
    scale: 1.0,
};


// ── Tablet open / close animation ────────────────────────────

const tabletAnimation = {
    frameCount: 11,                        // frame_1.png … frame_11.png
    basePath:   '../Assets/Tablette/frame_',
    frameDelay: 50,                        // ms per frame
};