import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameCtx } from '../../engine/gameContext.js';
import { GameState, freddy, bonnie, chica, foxy, ANIMATRONICS,
         getCamImagePath, clearCamCache, initGameLogic } from '../../engine/gameState.js';
import { playChicaJumpscare, playBonnieJumpscare, playFoxyJumpscare,
         playFreddyJumpscare, playGoldenFreddyJumpscare,
         playPowerOutJumpscare, noiseMenuDef } from '../../engine/jumpscare.js';
import { ROOMS, CAMS } from '../../data/rooms.js';
import Minimap from '../components/Minimap.jsx';

// ── Animation definitions (local to this file) ────────────────

const fanAnimation = {
  frames: ['/assets/ventilateur/57.png', '/assets/ventilateur/59.png', '/assets/ventilateur/60.png'],
  fps: 12, imgX: 778, imgY: 303, scale: 1.0,
};

const mainRoomDoorLeft = {
  imgX: 73, imgY: 41, scale: 1.0, fps: 30,
  frames: Array.from({length:16},(_,i)=>`/assets/door_left/${i+1}.png`),
};
const mainRoomDoorRight = {
  imgX: 1263, imgY: 31, scale: 1.0, fps: 30,
  frames: [1,2,3,4,5,6,7,8,9,10,12,13,14,15,16].map(n=>`/assets/door_right/${n}.png`),
};

const officeFreddy = {
  frames: [
    '/assets/artifacts/543.png','/assets/artifacts/520.png','/assets/artifacts/544.png','/assets/artifacts/544.png',
    '/assets/artifacts/543.png','/assets/artifacts/543.png','/assets/artifacts/543.png','/assets/artifacts/520.png',
    '/assets/artifacts/525.png','/assets/artifacts/525.png','/assets/artifacts/543.png','/assets/artifacts/543.png',
    '/assets/artifacts/520.png','/assets/artifacts/544.png','/assets/artifacts/544.png','/assets/artifacts/525.png',
    '/assets/artifacts/520.png','/assets/artifacts/520.png','/assets/artifacts/544.png','/assets/artifacts/544.png',
    '/assets/artifacts/525.png','/assets/artifacts/543.png','/assets/artifacts/543.png','/assets/artifacts/520.png',
    '/assets/artifacts/544.png','/assets/artifacts/525.png','/assets/artifacts/543.png','/assets/artifacts/543.png',
  ],
  fps: 60,
};

const foxyRunDef = {
  frames: [
    '/assets/Foxy/foxy run/241.png','/assets/Foxy/foxy run/244.png','/assets/Foxy/foxy run/245.png',
    '/assets/Foxy/foxy run/246.png','/assets/Foxy/foxy run/247.png','/assets/Foxy/foxy run/248.png',
    '/assets/Foxy/foxy run/250.png','/assets/Foxy/foxy run/282.png','/assets/Foxy/foxy run/283.png',
    '/assets/Foxy/foxy run/284.png','/assets/Foxy/foxy run/285.png','/assets/Foxy/foxy run/286.png',
    '/assets/Foxy/foxy run/287.png','/assets/Foxy/foxy run/288.png','/assets/Foxy/foxy run/289.png',
    '/assets/Foxy/foxy run/290.png','/assets/Foxy/foxy run/292.png','/assets/Foxy/foxy run/302.png',
    '/assets/Foxy/foxy run/306.png','/assets/Foxy/foxy run/327.png','/assets/Foxy/foxy run/329.png',
    '/assets/Foxy/foxy run/330.png','/assets/Foxy/foxy run/331.png','/assets/Foxy/foxy run/332.png',
    '/assets/Foxy/foxy run/333.png','/assets/Foxy/foxy run/334.png','/assets/Foxy/foxy run/335.png',
    '/assets/Foxy/foxy run/336.png','/assets/Foxy/foxy run/337.png','/assets/Foxy/foxy run/340.png',
  ],
  fps: 24,
};

const tabletFrameCount = 11;
const TABLET_FRAME_DELAY = 20;

const FOV_FACTOR = 0.35;
const CAM_PAN_SPEED = 0.000065;

const CAM_LABELS = {
  show_stage:'Show Stage', dining_area:'Dining Area', pirate_cove:"Pirate's Cove",
  west_hall:'West Hall', west_hall_corner:'West Hall Corner', backstage:'Backstage',
  east_hall:'East Hall', east_hall_corner:'East Hall Corner', kitchen:'Kitchen',
  supply_closet:'Supply Closet', restrooms:'Restrooms',
};

// ── Component ─────────────────────────────────────────────────

export default function MainRoom() {
  const navigate = useNavigate();

  // ── Refs for all canvas / DOM elements ───────────────────────
  const canvasRef        = useRef(null);
  const tabletAnimRef    = useRef(null);
  const tabletCamRef     = useRef(null);
  const kitchenVideoRef  = useRef(null);
  const hudTimeRef       = useRef(null);
  const hudNightRef      = useRef(null);
  const hudPowerRef      = useRef(null);
  const hudBatteryRef    = useRef(null);
  const hudTopRightRef   = useRef(null);
  const hudPowerDivRef   = useRef(null);
  const hudUsageRef      = useRef(null);
  const tabletBarRef     = useRef(null);
  const btnZonesRef      = useRef([]);
  const camLabelRef      = useRef(null);

  // ── Game state refs (mutable, not React state for performance) ─
  const stateRef         = useRef({ left: { door: 'open', light: 'off' }, right: { door: 'open', light: 'off' } });
  const scrollRef        = useRef(0.5);
  const targetScrollRef  = useRef(0.5);
  const isDraggingRef    = useRef(false);
  const lastXRef         = useRef(0);
  const velocityRef      = useRef(0);
  const renderPausedRef  = useRef(false);
  const powerOutRef      = useRef(false);
  const powerOutEyeRef   = useRef(null);
  const audioStartedRef  = useRef(false);

  // HUD visibility
  const hudVisibleRef    = useRef(true);

  // ── Image caches ──────────────────────────────────────────────
  const imagesRef = useRef({});
  const loadImg = useCallback((src) => {
    if (!imagesRef.current[src]) {
      const img = new Image();
      img.src = src;
      imagesRef.current[src] = img;
    }
    return imagesRef.current[src];
  }, []);

  const initialized = useRef(false);

  // ── 6AM canvas animation ──────────────────────────────────────
  const run6AMAnimation = useCallback((onDone) => {
    const canvas = canvasRef.current;
    if (!canvas) { onDone(); return; }
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    renderPausedRef.current = true;

    const FADEIN_MS = 800, HOLD_MS = 2200, SLIDE_MS = 5000, HOLD2_MS = 3000, FADEOUT_MS = 800;
    const NUM_FONT = 'bold 140px "FNAF", Arial';
    const AM_FONT  = 'bold 80px "FNAF", Arial';

    ctx.font = AM_FONT;
    const amW = ctx.measureText(' AM').width;
    const cx = W / 2 - amW / 2;
    const cy = H / 2;

    function drawFrame(numOffset, alpha) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = alpha; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.font = AM_FONT; ctx.textAlign = 'left';
      ctx.fillText(' AM', cx, cy);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, cy - 80, W, 160); ctx.clip();
      ctx.font = NUM_FONT; ctx.textAlign = 'right';
      ctx.fillText('5', cx, cy + numOffset);
      ctx.fillText('6', cx, cy + numOffset - H);
      ctx.restore(); ctx.restore();
    }

    function runPhase(durationMs, fromA, toA, fromO, toO, onComplete) {
      const start = performance.now();
      function frame(now) {
        const t = Math.min((now - start) / durationMs, 1);
        const ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
        drawFrame(fromO + (toO - fromO) * ease, fromA + (toA - fromA) * ease);
        if (t < 1) requestAnimationFrame(frame);
        else onComplete();
      }
      requestAnimationFrame(frame);
    }

    runPhase(FADEIN_MS, 0, 1, 0, 0, () => {
      drawFrame(0, 1);
      setTimeout(() => {
        runPhase(SLIDE_MS, 1, 1, 0, H, () => {
          drawFrame(H, 1);
          setTimeout(() => {
            runPhase(FADEOUT_MS, 1, 0, H, H, () => {
              renderPausedRef.current = false;
              if (hudVisibleRef.current) setHUDVisible(true);
              onDone();
            });
          }, HOLD2_MS);
        });
      }, HOLD_MS);
    });
  }, []);

  // ── HUD helper ────────────────────────────────────────────────
  function setHUDVisible(v) {
    hudVisibleRef.current = v;
    const d = v ? '' : 'none';
    if (hudTopRightRef.current)  hudTopRightRef.current.style.display  = d;
    if (hudPowerDivRef.current)  hudPowerDivRef.current.style.display  = d;
    if (hudUsageRef.current)     hudUsageRef.current.style.display     = d;
    if (tabletBarRef.current)    tabletBarRef.current.style.display    = v ? 'flex' : 'none';
    btnZonesRef.current.forEach(z => { if (z) z.style.display = v ? 'block' : 'none'; });
  }

  // ── Main setup useEffect ──────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const canvas       = canvasRef.current;
    const tabletAnim   = tabletAnimRef.current;
    const tabletCamEl  = tabletCamRef.current;
    const kitchenVid   = kitchenVideoRef.current;
    if (!canvas) return;

    let ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      if (tabletCamEl)  { tabletCamEl.width  = W; tabletCamEl.height = H; }
      if (tabletAnim)   { tabletAnim.width   = W; tabletAnim.height  = H; }
    }
    window.addEventListener('resize', resize);

    // ── Audio setup ─────────────────────────────────────────────
    const sfxFan   = new Audio('/assets/FNaF 1 Audio/Buzz_Fan_Florescent2.wav');
    sfxFan.loop = true; sfxFan.volume = 0.2;
    const sfxPhone = new Audio('/assets/FNaF 1 Audio/voiceover1c.wav');
    sfxPhone.volume = 0.3;
    const sfxLight = new Audio('/assets/FNaF 1 Audio/BallastHumMedium2.wav');
    sfxLight.loop = true; sfxLight.volume = 0.6;
    const sfxCameraLoop = new Audio('/assets/FNaF 1 Audio/MiniDV_Tape_Eject_1.wav');
    sfxCameraLoop.loop = true; sfxCameraLoop.volume = 0.4;
    const sfxCameraUp   = new Audio('/assets/FNaF 1 Audio/CAMERA_VIDEO_LOA_60105303.wav');
    sfxCameraUp.volume = 0.5;
    const sfxCameraDown = new Audio('/assets/FNaF 1 Audio/put down.wav');
    sfxCameraDown.volume = 0.5;
    const sfxDoor = new Audio('/assets/FNaF 1 Audio/SFXBible_12478.wav');
    sfxDoor.volume = 0.8;
    const camAudio = { pause() {}, play() { return Promise.resolve(); }, currentTime: 0 };

    let ambience = null;
    const ambienceSrcs = ['/assets/FNaF 1 Audio/ambience2.wav', '/assets/FNaF 1 Audio/EerieAmbienceLargeSca_MV005.wav'];
    function nextAmbience() {
      ambience = new Audio(ambienceSrcs[Math.floor(Math.random() * ambienceSrcs.length)]);
      ambience.volume = 0.4;
      ambience.play().catch(() => {});
      ambience.addEventListener('ended', nextAmbience);
    }

    function startAudio() {
      if (audioStartedRef.current) return;
      audioStartedRef.current = true;
      sfxFan.play().catch(() => {});
      sfxPhone.play().catch(() => {});
      nextAmbience();
    }

    function stopCamVideo() { kitchenVid.pause(); kitchenVid.currentTime = 0; }
    function startCamVideo() { if (window.activeCam === 'kitchen') kitchenVid.play().catch(() => {}); }

    function updateLightAudio() {
      const st = stateRef.current;
      const leftOn  = st.left.light  === 'on' && flickerOverride.left  !== 'off';
      const rightOn = st.right.light === 'on' && flickerOverride.right !== 'off';
      if (leftOn || rightOn) { if (sfxLight.paused) sfxLight.play().catch(() => {}); }
      else { sfxLight.pause(); sfxLight.currentTime = 0; }
    }

    // ── Wire up gameCtx ─────────────────────────────────────────
    gameCtx.state        = stateRef.current;
    gameCtx.getCtx       = () => ctx;
    gameCtx.getW         = () => W;
    gameCtx.getH         = () => H;
    gameCtx.setRenderPaused = (v) => { renderPausedRef.current = v; };
    gameCtx.getRenderPaused = () => renderPausedRef.current;
    gameCtx.updateHUD    = ({ night, time, powerVal, batteryImg }) => {
      if (hudNightRef.current)   hudNightRef.current.textContent   = night;
      if (hudTimeRef.current)    hudTimeRef.current.textContent    = time;
      if (hudPowerRef.current)   hudPowerRef.current.textContent   = powerVal;
      if (hudBatteryRef.current) hudBatteryRef.current.src         = batteryImg;
    };
    gameCtx.startDoorAnim  = startDoorAnim;
    gameCtx.stopCamVideo   = stopCamVideo;
    gameCtx.sfxFan         = sfxFan;
    gameCtx.sfxPhone       = sfxPhone;
    gameCtx.sfxLight       = sfxLight;
    gameCtx.sfxCameraLoop  = sfxCameraLoop;
    gameCtx.camAudio       = camAudio;
    gameCtx.getPowerOutEyeFrame = () => powerOutEyeRef.current;
    gameCtx.setPowerOutEyeFrame = (v) => { powerOutEyeRef.current = v; };
    gameCtx.getPowerOut  = () => powerOutRef.current;
    gameCtx.setPowerOut  = (v) => { powerOutRef.current = v; };
    gameCtx.hideHUD      = () => setHUDVisible(false);
    gameCtx.showHUD      = () => setHUDVisible(true);
    gameCtx.on6AMAnimation = (onDone) => run6AMAnimation(onDone);

    // ── Background images ────────────────────────────────────────
    const bg        = loadImg('/assets/Main Room/39.png');
    const bgLitL    = loadImg('/assets/Main Room/main_room_left_open_lit.png');
    const bgLitR    = loadImg('/assets/Main Room/main_room_right_open_lit.png');
    const bgPwrDown = loadImg('/assets/Main Room/304.png');
    const bgEyes    = loadImg('/assets/Main Room/305.png');

    // ── Fan frames ───────────────────────────────────────────────
    const fanFrames = fanAnimation.frames.map(loadImg);
    let fanIndex = 0;
    const fanTimer = setInterval(() => { fanIndex = (fanIndex + 1) % fanFrames.length; }, 1000 / fanAnimation.fps);

    // ── Door frames ──────────────────────────────────────────────
    const doorFrames = {
      left:  mainRoomDoorLeft.frames.map(loadImg),
      right: mainRoomDoorRight.frames.map(loadImg),
    };
    const doorAnim = {
      left:  { frameIndex: 0, direction: 0, timer: null },
      right: { frameIndex: 0, direction: 0, timer: null },
    };
    const doorPos = {
      left:  { x: mainRoomDoorLeft.imgX,  y: mainRoomDoorLeft.imgY,  scale: mainRoomDoorLeft.scale  },
      right: { x: mainRoomDoorRight.imgX, y: mainRoomDoorRight.imgY, scale: mainRoomDoorRight.scale },
    };

    function stepDoor(side) {
      const anim   = doorAnim[side];
      const frames = doorFrames[side];
      anim.frameIndex += anim.direction;
      if (anim.frameIndex >= frames.length) {
        anim.frameIndex = frames.length - 1; anim.direction = 0;
        clearInterval(anim.timer); anim.timer = null; stateRef.current[side].door = 'closed';
      } else if (anim.frameIndex <= 0) {
        anim.frameIndex = 0; anim.direction = 0;
        clearInterval(anim.timer); anim.timer = null; stateRef.current[side].door = 'open';
      }
    }
    function startDoorAnim(side, direction) {
      const anim = doorAnim[side];
      const def  = side === 'left' ? mainRoomDoorLeft : mainRoomDoorRight;
      if (anim.direction === direction) return;
      anim.direction = direction;
      if (anim.timer) { clearInterval(anim.timer); anim.timer = null; }
      anim.timer = setInterval(() => stepDoor(side), 1000 / def.fps);
    }
    function toggleDoor(side) {
      const anim = doorAnim[side];
      sfxDoor.currentTime = 0; sfxDoor.play().catch(() => {});
      if (anim.direction === 1 || (anim.direction === 0 && anim.frameIndex === doorFrames[side].length - 1)) {
        startDoorAnim(side, -1);
      } else {
        startDoorAnim(side, 1);
      }
    }

    // ── Button images ────────────────────────────────────────────
    const btnBase = '/assets/Door_Buttons/';
    const loadBtn = (side, light, door) => loadImg(`${btnBase}Button_${side}_light_${light}_${door}.png`);
    const btnImgs = {
      left:  { off_closed: loadBtn('left','off','closed'),  off_open: loadBtn('left','off','open'),
               on_closed:  loadBtn('left','on','closed'),   on_open:  loadBtn('left','on','open')  },
      right: { off_closed: loadBtn('right','off','closed'), off_open: loadBtn('right','off','open'),
               on_closed:  loadBtn('right','on','closed'),  on_open:  loadBtn('right','on','open') },
    };
    function getBtnImg(side) { const s = stateRef.current[side]; return btnImgs[side][`${s.light}_${s.door}`]; }
    const btnPos = { left: { x: 0, y: 261, scale: 1.0 }, right: { x: 1478, y: 261, scale: 1.0 } };

    // ── Light flicker ────────────────────────────────────────────
    const FLICKER_SEQ = [
      { lit: true,  delay: 40  }, { lit: false, delay: 60  }, { lit: true,  delay: 30  },
      { lit: false, delay: 80  }, { lit: true,  delay: 50  }, { lit: false, delay: 45  },
      { lit: true,  delay: 120 }, { lit: false, delay: 35  }, { lit: true,  delay: 0   },
    ];
    const flickerOverride = { left: null, right: null };
    const flickerTimers   = { left: [], right: [] };

    function triggerFlicker(side) {
      flickerTimers[side].forEach(t => clearTimeout(t));
      flickerTimers[side] = [];
      flickerOverride[side] = null;
      let cum = 0;
      FLICKER_SEQ.forEach(({ lit, delay }, i) => {
        const t = setTimeout(() => {
          const isLast = i === FLICKER_SEQ.length - 1;
          if (stateRef.current[side].light === 'on') {
            flickerOverride[side] = isLast ? null : (lit ? 'on' : 'off');
          } else { flickerOverride[side] = null; }
          updateLightAudio();
        }, cum);
        flickerTimers[side].push(t);
        cum += delay;
      });
    }

    // ── Button zones ─────────────────────────────────────────────
    const btnsContainer = document.createElement('div');
    btnsContainer.id    = 'game-btn-zones';
    btnsContainer.style.position = 'fixed';
    btnsContainer.style.inset    = '0';
    btnsContainer.style.pointerEvents = 'none';
    btnsContainer.style.zIndex   = '10';
    document.body.appendChild(btnsContainer);

    ['left', 'right'].forEach(side => {
      const zone = document.createElement('div');
      zone.style.cssText = 'position:absolute;cursor:pointer;pointer-events:auto;z-index:10;';
      zone.addEventListener('click', e => {
        startAudio();
        const rect = zone.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        if (relY < rect.height / 2) {
          toggleDoor(side);
        } else {
          const other = side === 'left' ? 'right' : 'left';
          if (stateRef.current[side].light === 'off') {
            stateRef.current[side].light = 'on';
            stateRef.current[other].light = 'off';
            flickerTimers[other].forEach(t => clearTimeout(t));
            flickerTimers[other] = []; flickerOverride[other] = null;
            triggerFlicker(side);
          } else {
            stateRef.current[side].light = 'off';
            flickerTimers[side].forEach(t => clearTimeout(t));
            flickerTimers[side] = []; flickerOverride[side] = null;
          }
          updateLightAudio();
        }
      });
      btnsContainer.appendChild(zone);
      btnZonesRef.current.push(zone);
    });

    function updateBtnZones() {
      if (!bg.complete || !bg.naturalWidth) return;
      const scale = H / bg.naturalHeight, maxOffset = (bg.naturalWidth * scale) - W;
      const offsetX = scrollRef.current * maxOffset;
      ['left', 'right'].forEach((side, i) => {
        const pos = btnPos[side];
        const img = getBtnImg(side);
        if (!img.complete || !img.naturalWidth) return;
        const zone = btnZonesRef.current[i];
        if (!zone) return;
        zone.style.left   = (pos.x * scale - offsetX) + 'px';
        zone.style.top    = (pos.y * scale) + 'px';
        zone.style.width  = (img.naturalWidth  * scale * pos.scale) + 'px';
        zone.style.height = (img.naturalHeight * scale * pos.scale) + 'px';
      });
    }

    // ── Bonnie / Chica door images ───────────────────────────────
    let bonnieDoorImg = null, chicaDoorImg = null;

    function getActiveBg() {
      if (window.bonnieAtDoor && stateRef.current.left.light === 'on' && flickerOverride.left !== 'off') {
        if (!bonnieDoorImg) {
          bonnieDoorImg = loadImg('/assets/Main Room/225.png');
          bonnieDoorImg.onload = () => {
            const sfx = new Audio('/assets/FNaF 1 Audio/windowscare.wav');
            sfx.volume = 1; sfx.play().catch(() => {});
          };
        }
        if (bonnieDoorImg.complete && bonnieDoorImg.naturalWidth) return bonnieDoorImg;
      }
      if (window.chicaAtDoor && stateRef.current.right.light === 'on' && flickerOverride.right !== 'off') {
        if (!chicaDoorImg) {
          chicaDoorImg = loadImg('/assets/Main Room/227.png');
          chicaDoorImg.onload = () => {
            const sfx = new Audio('/assets/FNaF 1 Audio/windowscare.wav');
            sfx.volume = 1; sfx.play().catch(() => {});
          };
        }
        if (chicaDoorImg.complete && chicaDoorImg.naturalWidth) return chicaDoorImg;
      }
      const pof = powerOutEyeRef.current;
      if (pof === '305') return (bgEyes.complete && bgEyes.naturalWidth) ? bgEyes : bgPwrDown;
      if (powerOutRef.current) return (bgPwrDown.complete && bgPwrDown.naturalWidth) ? bgPwrDown : bg;
      const leftEff  = stateRef.current.left.light  === 'on' && flickerOverride.left  !== 'off';
      const rightEff = stateRef.current.right.light === 'on' && flickerOverride.right !== 'off';
      if (leftEff  && !rightEff) return (bgLitL.complete && bgLitL.naturalWidth) ? bgLitL : bg;
      if (rightEff && !leftEff)  return (bgLitR.complete && bgLitR.naturalWidth) ? bgLitR : bg;
      return bg;
    }

    // ── Office Freddy easter egg ─────────────────────────────────
    const officeFreddyFrames = officeFreddy.frames.map(loadImg);
    let offAnim = null, offAnimSfx = null;

    const officeFreddyTimer = setInterval(() => {
      if (offAnim) return;
      if (window.isTabletOpen) return;
      if (renderPausedRef.current) return;
      if (GameState._6amTriggered || GameState._powerOutTriggered) return;
      if (Math.floor(Math.random() * 1000) !== 1) return;
      offAnimSfx = new Audio('/assets/FNaF 1 Audio/robotvoice.wav');
      offAnimSfx.volume = 0.7;
      offAnimSfx.play().catch(() => {});
      offAnim = { index: 0, lastTime: performance.now(), show: false };
    }, 1000);

    // ── Draw helpers ─────────────────────────────────────────────
    function drawStripLayer(img, imgW, imgH, scale, offsetX) {
      for (let sx = 0; sx < W; sx++) {
        const imgX = (offsetX + sx) / scale;
        if (imgX < 0 || imgX >= imgW) continue;
        const sn   = (sx / W - 0.5) * 2;
        const dist = Math.sqrt(1 + (sn * FOV_FACTOR) ** 2);
        const stripH = H / dist;
        ctx.drawImage(img, imgX, 0, 1, imgH, sx, (H - stripH) / 2, 1, stripH);
      }
    }
    function drawSprite(img, pos, scale, offsetX) {
      if (!img.complete || !img.naturalWidth) return;
      ctx.drawImage(img, pos.x * scale - offsetX, pos.y * scale,
                    img.naturalWidth * scale * pos.scale, img.naturalHeight * scale * pos.scale);
    }

    // ── Main draw ────────────────────────────────────────────────
    function draw() {
      if (!bg.complete || !bg.naturalWidth) return;
      const imgW = bg.naturalWidth, imgH = bg.naturalHeight;
      const scale = H / imgH, maxOffset = (imgW * scale) - W;
      const offsetX = scrollRef.current * maxOffset;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const pof = powerOutEyeRef.current;
      if (pof === 'black' || pof === 'jumpscare') return;
      drawStripLayer(getActiveBg(), imgW, imgH, scale, offsetX);
      if (!powerOutRef.current) drawSprite(fanFrames[fanIndex], { x: fanAnimation.imgX, y: fanAnimation.imgY, scale: 1.0 }, scale, offsetX);
      ['left','right'].forEach(side => {
        const anim = doorAnim[side], frames = doorFrames[side], pos = doorPos[side];
        drawSprite(frames[0], pos, scale, offsetX);
        if (anim.frameIndex > 0) drawSprite(frames[anim.frameIndex], pos, scale, offsetX);
      });
      if (!powerOutRef.current) {
        drawSprite(getBtnImg('left'),  btnPos.left,  scale, offsetX);
        drawSprite(getBtnImg('right'), btnPos.right, scale, offsetX);
        if (offAnim?.show) {
          const img = officeFreddyFrames[offAnim.index];
          if (img?.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, W, H);
        }
        updateBtnZones();
      }
    }

    // ── RAF loop ─────────────────────────────────────────────────
    let rafId = null;
    function animate() {
      rafId = requestAnimationFrame(animate);
      if (renderPausedRef.current) return;
      if (!isDraggingRef.current) {
        velocityRef.current *= 0.85;
        targetScrollRef.current += velocityRef.current;
      }
      targetScrollRef.current = Math.max(0, Math.min(1, targetScrollRef.current));
      scrollRef.current += (targetScrollRef.current - scrollRef.current) * 0.12;

      if (offAnim) {
        const now = performance.now();
        const msPerFrame = 1000 / officeFreddy.fps;
        if (now - offAnim.lastTime >= msPerFrame) {
          offAnim.lastTime = now;
          offAnim.show = Math.floor(Math.random() * 10) === 1;
          offAnim.index++;
          if (offAnim.index >= officeFreddyFrames.length) {
            offAnimSfx?.pause();
            offAnim = null;
          }
        }
      }
      draw();
    }
    animate();

    // ── Tablet state ─────────────────────────────────────────────
    let tabletState = 'closed', tabletFrame = 0, lastTabletTime = 0;
    const tabletFrames = Array.from({ length: tabletFrameCount }, (_, i) => loadImg(`/assets/Tablette/frame_${i+1}.png`));
    const tabletCtx    = tabletAnim?.getContext('2d');

    function drawTabletFrame(idx) {
      if (!tabletCtx) return;
      const img = tabletFrames[idx];
      if (!img.complete || !img.naturalWidth) return;
      tabletCtx.clearRect(0, 0, tabletAnim.width, tabletAnim.height);
      const scale = Math.max(tabletAnim.width / img.naturalWidth, tabletAnim.height / img.naturalHeight);
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      tabletCtx.drawImage(img, (tabletAnim.width - dw) / 2, (tabletAnim.height - dh) / 2, dw, dh);
    }

    function animateTablet(timestamp) {
      if (tabletState !== 'opening' && tabletState !== 'closing') return;
      if (timestamp - lastTabletTime > TABLET_FRAME_DELAY) {
        lastTabletTime = timestamp;
        if (tabletState === 'opening') {
          drawTabletFrame(tabletFrame);
          tabletFrame++;
          if (tabletFrame >= tabletFrames.length) {
            tabletState = 'waiting';
            setTimeout(() => {
              if (tabletAnim)  tabletAnim.style.display  = 'none';
              if (tabletCamEl) tabletCamEl.style.display = 'block';
              if (tabletBarRef.current) tabletBarRef.current.style.display = 'none';
              tabletState = 'open';
              showCamSelector();
              startNoiseLoop();
              startCamVideo();
              sfxCameraLoop.currentTime = 0;
              sfxCameraLoop.play().catch(() => {});
            }, TABLET_FRAME_DELAY);
            return;
          }
        } else {
          tabletFrame--;
          if (tabletFrame < 0) {
            stopNoiseLoop();
            hideCamSelector();
            if (tabletAnim)  tabletAnim.style.display  = 'none';
            if (tabletCamEl) tabletCamEl.style.display = 'none';
            tabletState = 'closed';
            if (tabletBarRef.current)  tabletBarRef.current.style.display  = 'flex';
            btnZonesRef.current.forEach(z => { if (z) z.style.display = 'block'; });
            bonnie.onTabletClose();
            chica.onTabletClose();
            return;
          }
          drawTabletFrame(tabletFrame);
        }
      }
      requestAnimationFrame(animateTablet);
    }

    function openTablet() {
      if (tabletState !== 'closed') return;
      if (GameState.rawPower <= 0) return;
      if (GameState._6amTriggered) return;
      window.isTabletOpen = true;
      bonnie.onTabletOpen();
      chica.onTabletOpen();
      sfxCameraUp.currentTime = 0; sfxCameraUp.play().catch(() => {});
      tabletState = 'opening'; tabletFrame = 0;
      if (tabletAnim) { tabletAnim.style.display = 'block'; tabletAnim.width = W; tabletAnim.height = H; }
      requestAnimationFrame(animateTablet);
    }

    function closeTablet() {
      if (tabletState !== 'open') return;
      window.isTabletOpen = false;
      foxy.onTabletClose();
      sfxCameraDown.currentTime = 0; sfxCameraDown.play().catch(() => {});
      sfxCameraLoop.pause(); sfxCameraLoop.currentTime = 0;
      stopCamVideo(); stopNoiseLoop();
      tabletState = 'closing';
      tabletFrame = tabletFrames.length - 1;
      if (tabletCamEl) tabletCamEl.style.display = 'none';
      if (tabletAnim)  tabletAnim.style.display  = 'block';
      drawTabletFrame(tabletFrame);
      requestAnimationFrame(animateTablet);
    }

    // ── Camera overlay (tablet cam) ───────────────────────────────
    const camCtx       = tabletCamEl?.getContext('2d');
    const camFrameImg  = loadImg('/assets/Cam_views/11.png');
    const camRedDotImg = loadImg('/assets/Cam_views/7.png');
    const noiseFrames  = noiseMenuDef.frames.map(loadImg);
    const foxyRunFrames = foxyRunDef.frames.map(loadImg);

    const RED_DOT_PERIOD = 1300, RED_DOT_ON = 900;
    const isRedDotVisible = () => (performance.now() % RED_DOT_PERIOD) < RED_DOT_ON;

    let noiseIdx = 0, noiseAccum = 0, noiseLastTime = 0;
    let foxyRunIdx = 0, foxyRunAccum = 0;
    let camPan = 0.5, camPanDir = 1;
    let noiseRafId = null;

    let _camImg = null, _camImgSrc = '';
    function getOrLoadCamImg(src) {
      if (!src) return null;
      if (src === _camImgSrc && _camImg) return _camImg;
      _camImgSrc = src; _camImg = new Image(); _camImg.src = src;
      return _camImg;
    }

    function drawCamView() {
      if (!camCtx || !tabletCamEl) return;
      const cw = tabletCamEl.width, ch = tabletCamEl.height;
      camCtx.fillStyle = '#000'; camCtx.fillRect(0, 0, cw, ch);

      const src = getCamImagePath(window.activeCam);
      if (window.activeCam === 'kitchen' && kitchenVid.readyState >= 2) {
        const vw = kitchenVid.videoWidth || cw, vh = kitchenVid.videoHeight || ch;
        const scl = Math.max(ch / vh, cw / vw * 1.4);
        const maxOff = Math.max(0, (vw * scl) - cw);
        for (let sx = 0; sx < cw; sx++) {
          const imgX = (camPan * maxOff + sx) / scl;
          if (imgX < 0 || imgX >= vw) continue;
          const sn = (sx / cw - 0.5) * 2;
          const dist = Math.sqrt(1 + (sn * FOV_FACTOR) ** 2);
          const stripH = ch / dist;
          camCtx.drawImage(kitchenVid, imgX, 0, 1, vh, sx, (ch - stripH) / 2, 1, stripH);
        }
      } else {
        const camImg = getOrLoadCamImg(src);
        if (camImg?.complete && camImg.naturalWidth) {
          const imgW = camImg.naturalWidth, imgH = camImg.naturalHeight;
          const scl = Math.max(ch / imgH, cw / imgW * 1.4);
          const maxOff = Math.max(0, (imgW * scl) - cw);
          for (let sx = 0; sx < cw; sx++) {
            const imgX = (camPan * maxOff + sx) / scl;
            if (imgX < 0 || imgX >= imgW) continue;
            const sn = (sx / cw - 0.5) * 2;
            const dist = Math.sqrt(1 + (sn * FOV_FACTOR) ** 2);
            const stripH = ch / dist;
            camCtx.drawImage(camImg, imgX, 0, 1, imgH, sx, (ch - stripH) / 2, 1, stripH);
          }
        }
      }

      if (window.foxyRunning && window.activeCam === 'west_hall' && !window.foxyRunAnimDone) {
        const ff = foxyRunFrames[foxyRunIdx];
        if (ff?.complete && ff.naturalWidth) {
          const scl = Math.max(cw / ff.naturalWidth, ch / ff.naturalHeight);
          camCtx.drawImage(ff, (cw - ff.naturalWidth * scl) / 2, (ch - ff.naturalHeight * scl) / 2, ff.naturalWidth * scl, ff.naturalHeight * scl);
        }
      }

      const nf = noiseFrames[noiseIdx];
      if (nf?.complete && nf.naturalWidth) {
        camCtx.save();
        camCtx.globalCompositeOperation = 'screen';
        camCtx.globalAlpha = ((150 + Math.random() * 50) / 245) * 0.7;
        const scl = Math.max(cw / nf.naturalWidth, ch / nf.naturalHeight);
        camCtx.drawImage(nf, (cw - nf.naturalWidth * scl) / 2, (ch - nf.naturalHeight * scl) / 2, nf.naturalWidth * scl, nf.naturalHeight * scl);
        camCtx.restore();
      }

      if (window.foxyRunning && window.activeCam === 'west_hall' && !window._foxyRunCamSfxTriggered) {
        window._foxyRunCamSfxTriggered = true;
        foxy.onWatchRunCam();
      } else if (!window.foxyRunning) {
        window._foxyRunCamSfxTriggered = false;
        if (foxyRunIdx !== 0) { foxyRunIdx = 0; foxyRunAccum = 0; }
      }

      if (camFrameImg.complete  && camFrameImg.naturalWidth)  camCtx.drawImage(camFrameImg,  0, 0, cw, ch);
      if (isRedDotVisible() && camRedDotImg.complete && camRedDotImg.naturalWidth) {
        const dotH = ch * 0.07, dotW = camRedDotImg.naturalWidth * (dotH / camRedDotImg.naturalHeight);
        camCtx.drawImage(camRedDotImg, cw * 0.02, ch * 0.03, dotW, dotH);
      }
    }

    function tickNoise(timestamp) {
      if (!tabletCamEl || tabletCamEl.style.display === 'none') { noiseRafId = null; return; }
      const delta = noiseLastTime ? timestamp - noiseLastTime : 0;
      noiseLastTime = timestamp;
      noiseAccum += delta;
      while (noiseAccum >= 1000 / noiseMenuDef.fps) { noiseAccum -= 1000 / noiseMenuDef.fps; noiseIdx = (noiseIdx + 1) % noiseFrames.length; }
      if (!window.foxyRunAnimDone) {
        foxyRunAccum += delta;
        while (foxyRunAccum >= 1000 / foxyRunDef.fps) {
          foxyRunAccum -= 1000 / foxyRunDef.fps;
          if (foxyRunIdx < foxyRunFrames.length - 1) foxyRunIdx++;
          else { window.foxyRunAnimDone = true; break; }
        }
      }
      camPan += camPanDir * CAM_PAN_SPEED * delta;
      if (camPan >= 1) { camPan = 1; camPanDir = -1; }
      if (camPan <= 0) { camPan = 0; camPanDir =  1; }
      drawCamView();
      noiseRafId = requestAnimationFrame(tickNoise);
    }
    function startNoiseLoop() { if (noiseRafId) return; noiseLastTime = 0; noiseRafId = requestAnimationFrame(tickNoise); }
    function stopNoiseLoop()  { if (noiseRafId) { cancelAnimationFrame(noiseRafId); noiseRafId = null; } }

    // ── Cam selector ─────────────────────────────────────────────
    window.activeCam = 'show_stage';

    function selectCam(room) {
      window.activeCam = room;
      if (camLabelRef.current) camLabelRef.current.textContent = CAM_LABELS[room] || room;
      camPan = 0.5; camPanDir = 1;
      if (room === 'kitchen') kitchenVid.play().catch(() => {});
      else kitchenVid.pause();
    }
    window.selectCam = selectCam;

    function showCamSelector() {
      if (camLabelRef.current) camLabelRef.current.style.display = 'block';
      selectCam(window.activeCam || 'show_stage');
    }
    function hideCamSelector() {
      if (camLabelRef.current) camLabelRef.current.style.display = 'none';
    }

    // ── Tablet bar / mouse-edge open ──────────────────────────────
    const tabletBar = tabletBarRef.current;
    if (tabletBar) tabletBar.addEventListener('click', openTablet);

    function onMouseMove(e) {
      const fromBottom = window.innerHeight - e.clientY;
      const minimap = document.getElementById('minimap-tablet');
      const onMinimap = minimap?.matches(':hover');
      if (fromBottom < 60 && !onMinimap) {
        if (tabletState === 'closed') openTablet();
        else if (tabletState === 'open') closeTablet();
      }
    }
    window.addEventListener('mousemove', onMouseMove);

    // ── Pan dragging ──────────────────────────────────────────────
    function onMouseDown(e) {
      isDraggingRef.current = true;
      lastXRef.current = e.clientX;
      velocityRef.current = 0;
      document.body.classList.add('dragging');
      startAudio();
    }
    function onMouseMoveGlobal(e) {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastXRef.current;
      const scl = H / bg.naturalHeight;
      const maxOff = (bg.naturalWidth * scl) - W;
      velocityRef.current = -(dx / maxOff);
      targetScrollRef.current += velocityRef.current;
      lastXRef.current = e.clientX;
    }
    function onMouseUp() { isDraggingRef.current = false; document.body.classList.remove('dragging'); }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMoveGlobal);
    window.addEventListener('mouseup', onMouseUp);

    // Touch
    canvas.addEventListener('touchstart', e => {
      isDraggingRef.current = true; lastXRef.current = e.touches[0].clientX;
      velocityRef.current = 0; e.preventDefault();
    }, { passive: false });
    window.addEventListener('touchmove', e => {
      if (!isDraggingRef.current) return;
      const dx = e.touches[0].clientX - lastXRef.current;
      const scl = H / bg.naturalHeight, maxOff = (bg.naturalWidth * scl) - W;
      velocityRef.current = -(dx / maxOff);
      targetScrollRef.current += velocityRef.current;
      lastXRef.current = e.touches[0].clientX;
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('touchend', () => { isDraggingRef.current = false; });

    // ── Dev keys ──────────────────────────────────────────────────
    function onKeyDown(e) {
      if (e.key === 'j' || e.key === 'J') {
        const picks = [playChicaJumpscare, playBonnieJumpscare, playFoxyJumpscare, playFreddyJumpscare, playGoldenFreddyJumpscare];
        picks[Math.floor(Math.random() * picks.length)]();
      }
    }
    window.addEventListener('keydown', onKeyDown);

    // ── Start audio / fade-in ─────────────────────────────────────
    startAudio();

    // ── Start game logic ──────────────────────────────────────────
    initGameLogic();
    GameState.render();

    // Page fade-in
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const fade = document.getElementById('game-page-fade');
      if (fade) { fade.style.opacity = '0'; }
    }));

    // ── Cleanup ───────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      stopNoiseLoop();
      clearInterval(fanTimer);
      clearInterval(officeFreddyTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousemove', onMouseMoveGlobal);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      sfxFan.pause(); sfxPhone.pause(); sfxLight.pause(); sfxCameraLoop.pause();
      if (ambience) ambience.pause();
      if (btnsContainer.parentNode) btnsContainer.parentNode.removeChild(btnsContainer);
      btnZonesRef.current = [];
      ['left','right'].forEach(s => {
        flickerTimers[s].forEach(t => clearTimeout(t));
        if (doorAnim[s].timer) clearInterval(doorAnim[s].timer);
      });
      clearCamCache();
      delete window.selectCam;
    };
  }, [loadImg, run6AMAnimation]);

  // ── JSX ───────────────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative',
                  overflow: 'hidden', background: '#000' }}>

      <style>{`
        @font-face {
          font-family: 'FNAF';
          src: url('/assets/Fonts/five-nights-at-freddys.otf') format('opentype');
        }
        body.dragging { cursor: grabbing; }
        canvas { display: block; position: absolute; top: 0; left: 0; }
        #game-page-fade { transition: opacity 0.9s ease; }
      `}</style>

      {/* Main game canvas */}
      <canvas ref={canvasRef} id="c"
              style={{ cursor: 'grab', userSelect: 'none', width: '100vw', height: '100vh' }} />

      {/* Tablet animation canvas */}
      <canvas ref={tabletAnimRef} id="tablet-anim-canvas"
              style={{ display: 'none', position: 'fixed', inset: 0,
                       width: '100%', height: '100%', zIndex: 45 }} />

      {/* Tablet camera canvas */}
      <canvas ref={tabletCamRef} id="tablet-cam"
              style={{ display: 'none', position: 'fixed', inset: 0, zIndex: 44,
                       background: '#000', width: '100%', height: '100%' }} />

      {/* Hidden kitchen video */}
      <video ref={kitchenVideoRef} id="kitchen-video" src="" loop playsInline
             style={{ display: 'none', position: 'absolute', pointerEvents: 'none' }} />

      {/* Page fade */}
      <div id="game-page-fade"
           style={{ position: 'fixed', inset: 0, zIndex: 998, background: '#000',
                    opacity: 1, pointerEvents: 'none' }} />

      {/* HUD top-right: time + night */}
      <div ref={hudTopRightRef}
           style={{ position: 'fixed', top: '37px', right: '50px', zIndex: 500,
                    pointerEvents: 'none', userSelect: 'none',
                    fontFamily: "'FNAF','Courier New',monospace",
                    color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.5)',
                    textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div ref={hudTimeRef}  style={{ fontSize: 'calc(clamp(24px,3.6vw,56px)*1.6)', letterSpacing: '0.06em', lineHeight: 1 }}>12 AM</div>
        <div ref={hudNightRef} style={{ fontSize: 'calc(clamp(13px,1.6vw,26px)*1.6)', letterSpacing: '0.08em', opacity: 0.9 }}>Night 1</div>
      </div>

      {/* HUD power */}
      <div ref={hudPowerDivRef}
           style={{ position: 'fixed', bottom: '123px', left: '70px', zIndex: 500,
                    pointerEvents: 'none', userSelect: 'none',
                    fontFamily: "'FNAF','Courier New',monospace", color: '#fff',
                    textShadow: '0 0 10px rgba(255,255,255,0.5)',
                    fontSize: 'calc(clamp(13px,1.6vw,26px)*2.25)', letterSpacing: '0.08em' }}>
        Power Left: <span ref={hudPowerRef}>99%</span>
      </div>

      {/* HUD usage */}
      <div ref={hudUsageRef}
           style={{ position: 'fixed', bottom: '61px', left: '70px', zIndex: 500,
                    pointerEvents: 'none', userSelect: 'none',
                    fontFamily: "'FNAF','Courier New',monospace", color: '#fff',
                    textShadow: '0 0 10px rgba(255,255,255,0.5)',
                    fontSize: 'calc(clamp(13px,1.6vw,26px)*2.25)', letterSpacing: '0.08em',
                    display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Usage :</span>
        <img ref={hudBatteryRef} src="/assets/Battery/212.png" alt="battery"
             style={{ height: 'clamp(28px,4vw,52px)', width: 'auto', imageRendering: 'pixelated' }} />
      </div>

      {/* Tablet bar */}
      <div ref={tabletBarRef} id="tablet-bar"
           style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', height: 40,
                    background: 'transparent', zIndex: 550,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <img src="/assets/Tablette/open_tablette_icon.png" alt="tablet" style={{ height: 30, opacity: 0.7 }} />
      </div>

      {/* Cam label */}
      <div ref={camLabelRef}
           style={{ display: 'none', position: 'fixed',
                    bottom: 'calc(2vh + 260px)', right: '1vw', zIndex: 200,
                    fontFamily: "'FNAF',monospace", fontSize: '1vw', color: '#fff',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    textShadow: '0 0 6px rgba(255,255,255,0.4)',
                    pointerEvents: 'none', textAlign: 'right' }} />

      {/* Minimap */}
      <Minimap />
    </div>
  );
}
