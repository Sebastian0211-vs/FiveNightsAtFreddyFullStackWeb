// ============================================================
//  fnafFx.jsx — shared visual/audio effects for the migrated
//  menu-family pages. React-idiomatic ports of the helpers that
//  used to live in src/pages/player.js plus the inline scripts.
// ============================================================
import { useEffect, useRef } from 'react';

// ── Frame players (ported from player.js) ─────────────────────
// Cycle an <img>'s src through an animation's frames. Returns a
// cleanup function that clears the timers.

export function runAnimation(imgEl, animation, opacity = 1) {
    if (!imgEl) return () => {};
    imgEl.style.opacity = opacity;
    let index = 0;
    const interval = 1000 / animation.fps;
    const id = setInterval(() => {
        imgEl.src = animation.frames[index];
        index = (index + 1) % animation.frames.length;
    }, interval);
    return () => clearInterval(id);
}

export function runNoise(imgEl, animation) {
    if (!imgEl) return () => {};
    let index = 0;
    const interval = 1000 / animation.fps;
    let b = Math.floor(Math.random() * 3);
    const idB = setInterval(() => { b = Math.floor(Math.random() * 3); }, 1000);
    const idF = setInterval(() => {
        imgEl.style.opacity = ((150 + Math.random() * 50 + b * 15) / 245) * 0.7;
        imgEl.src = animation.frames[index];
        index = (index + 1) % animation.frames.length;
    }, interval);
    return () => { clearInterval(idB); clearInterval(idF); };
}

// Freddy menu idle: mostly frame 1, rare twitch to 2/3/4.
export function runFreddyMenu(imgEl, frames) {
    if (!imgEl) return () => {};
    const [f1, f2, f3, f4] = frames;
    const id = setInterval(() => {
        const roll = Math.floor(Math.random() * 100);
        imgEl.src = roll === 97 ? f2 : roll === 98 ? f3 : roll === 99 ? f4 : f1;
    }, 100);
    return () => clearInterval(id);
}

// ── Hook: attach a noise/animation player to a ref'd <img> ────
export function useFramePlayer(ref, runner, ...args) {
    useEffect(() => {
        const cleanup = runner(ref.current, ...args);
        return cleanup;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}

// ── Looping slide strip: restart the CSS animation each cycle ──
export function useSlideLoop(ref) {
    useEffect(() => {
        const slide = ref.current;
        if (!slide) return;
        const onEnd = () => {
            slide.style.animation = 'none';
            void slide.offsetWidth;
            slide.style.animation = 'slideDown 10s linear forwards';
        };
        slide.addEventListener('animationend', onEnd);
        return () => slide.removeEventListener('animationend', onEnd);
    }, [ref]);
}

// ── TV channel-switch transition ──────────────────────────────
// Plays the camera SFX, flashes a white-noise overlay, fades to
// black, then invokes `done()` (use it to navigate).
export function tvStatic(cameraSfxSrc, done) {
    try {
        const sfx = new Audio(cameraSfxSrc);
        sfx.play().catch(() => {});
    } catch { /* ignore */ }

    const overlay = document.createElement('div');
    overlay.style.cssText =
        'position:fixed;inset:0;z-index:9999;pointer-events:all;background:#fff;opacity:0;';
    document.body.appendChild(overlay);

    const flickers = [0.9, 0, 0.7, 0, 1, 0, 0.5, 0.8, 0, 1];
    let i = 0;
    const flicker = setInterval(() => {
        overlay.style.opacity = flickers[i] ?? 0;
        i++;
        if (i >= flickers.length) {
            clearInterval(flicker);
            overlay.style.transition = 'opacity 0.3s';
            overlay.style.background = '#000';
            overlay.style.opacity = '1';
            setTimeout(() => {
                done?.();
                // overlay left in place to cover the SPA route swap;
                // the destination page paints over it.
                setTimeout(() => overlay.remove(), 1200);
            }, 350);
        }
    }, 60);
}

// ── Looped background audio that auto-cleans on unmount ───────
// `tracks` = array of { src, volume? }. Returns the Audio[] in a ref.
export function useLoopAudio(tracks) {
    const audiosRef = useRef([]);
    useEffect(() => {
        const audios = tracks.filter(Boolean).map(t => {
            const a = new Audio(typeof t === 'string' ? t : t.src);
            a.loop = true;
            if (typeof t === 'object' && t.volume != null) a.volume = t.volume;
            a.play().catch(() => {});
            return a;
        });
        audiosRef.current = audios;
        return () => audios.forEach(a => { a.pause(); a.currentTime = 0; });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return audiosRef;
}

// Shared keyframes + helpers used by several pages.
export const SLIDE_KEYFRAMES = `@keyframes slideDown { from { top: -100%; } to { top: 90%; } }`;
