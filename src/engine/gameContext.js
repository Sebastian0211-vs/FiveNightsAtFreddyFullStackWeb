// ── Game Context ──────────────────────────────────────────────
// The React MainRoom component writes into this object after mounting.
// All engine modules read from it at runtime (never at module-eval time).
// This avoids circular imports and keeps the canvas lifecycle in React.

export const gameCtx = {
  // Door / light state — set by MainRoom
  state: null,

  // Canvas + render loop controls — set by MainRoom
  getCtx:         null,   // () => CanvasRenderingContext2D
  getW:           null,   // () => number
  getH:           null,   // () => number
  setRenderPaused: null,  // (bool) => void
  getRenderPaused: null,  // () => bool

  // HUD updater (writes text to DOM refs directly for performance)
  updateHUD: null,        // ({ night, time, powerVal, batteryImg }) => void

  // Door animation
  startDoorAnim: null,    // (side, direction) => void

  // Camera video
  stopCamVideo:  null,    // () => void

  // Jumpscare triggers
  playBonnieJumpscare: null,
  playChicaJumpscare:  null,
  playFoxyJumpscare:   null,
  playFreddyJumpscare: null,
  playPowerOutJumpscare: null,

  // Audio refs (AudioElements)
  sfxFan:        null,
  sfxPhone:      null,
  sfxLight:      null,
  sfxCameraLoop: null,
  camAudio:      null,

  // Power-out eye frame state
  getPowerOutEyeFrame:  null,  // () => string|null
  setPowerOutEyeFrame:  null,  // (string|null) => void

  // Power-out flag
  getPowerOut:  null,          // () => bool
  setPowerOut:  null,          // (bool) => void

  // Hide HUD / show HUD
  hideHUD: null,
};
