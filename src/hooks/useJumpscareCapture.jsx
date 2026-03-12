import { useRef } from 'react';
import * as faceapi from 'face-api.js';

const MODELS_URL = '/models';

export function useJumpscareCapture() {
    const streamRef  = useRef(null);
    const videoRef   = useRef(null);
    const modelsRef  = useRef(false);

    function getVideoElement() {
        if (videoRef.current && document.body.contains(videoRef.current)) {
            return videoRef.current;
        }
        const video = document.createElement('video');
        video.muted       = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        Object.assign(video.style, {
            position:      'fixed',
            left:          '-9999px',
            top:           '-9999px',
            width:         '320px',
            height:        '240px',
            pointerEvents: 'none',
            zIndex:        '-1',
        });
        document.body.appendChild(video);
        videoRef.current = video;
        return video;
    }

    function removeVideoElement() {
        if (videoRef.current && document.body.contains(videoRef.current)) {
            document.body.removeChild(videoRef.current);
        }
        videoRef.current = null;
    }

    async function capture({
                               animatronicName  = 'unknown',
                               sampleDurationMs = 1500,
                               sampleIntervalMs = 150,
                           } = {}) {
        try {
            console.log('[capture] starting for', animatronicName);

            if (!modelsRef.current) {
                console.log('[capture] loading face-api models...');
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL),
                ]);
                modelsRef.current = true;
                console.log('[capture] models loaded');
            }

            const video = getVideoElement();

            if (!streamRef.current) {
                console.log('[capture] requesting webcam...');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                video.srcObject = stream;
                await video.play();
                await new Promise(r => {
                    if (video.videoWidth > 0) return r();
                    video.addEventListener('loadeddata', r, { once: true });
                    setTimeout(r, 1000);
                });
                console.log('[capture] webcam ready:', video.videoWidth, 'x', video.videoHeight);
            }

            let peakScore  = -1;
            let peakCanvas = null;
            const sampleCount = Math.ceil(sampleDurationMs / sampleIntervalMs);
            console.log('[capture] sampling', sampleCount, 'frames...');

            for (let i = 0; i < sampleCount; i++) {
                await new Promise(r => setTimeout(r, sampleIntervalMs));

                const c = document.createElement('canvas');
                c.width  = video.videoWidth  || 640;
                c.height = video.videoHeight || 480;
                c.getContext('2d').drawImage(video, 0, 0);

                let score = 0;
                try {
                    const result = await faceapi
                        .detectSingleFace(c, new faceapi.TinyFaceDetectorOptions({ inputSize: 512 }))
                        .withFaceExpressions();
                    if (result) {
                        const { surprised = 0, fearful = 0 } = result.expressions;
                        score = Math.round((surprised * 0.7 + fearful * 0.3) * 100);
                    }
                } catch { }

                console.log('[capture] frame', i + 1, '/', sampleCount, 'score=', score);
                if (score > peakScore) { peakScore = score; peakCanvas = c; }
            }

            console.log('[capture] peak score:', peakScore);

            if (!peakCanvas) {
                peakCanvas = document.createElement('canvas');
                peakCanvas.width  = video.videoWidth  || 640;
                peakCanvas.height = video.videoHeight || 480;
                peakCanvas.getContext('2d').drawImage(video, 0, 0);
                peakScore = 0;
            }

            drawOverlay(peakCanvas, peakScore, animatronicName);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const link      = document.createElement('a');
            link.download   = `jumpscare_${animatronicName}_${timestamp}.png`;
            link.href       = peakCanvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log('[capture] download triggered:', link.download);

        } catch (e) {
            console.warn('[useJumpscareCapture] failed:', e);
        } finally {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            removeVideoElement();
        }
    }

    return { capture };
}

function getColor(score) {
    if (score >= 80) return '#ff2200';
    if (score >= 50) return '#ff8800';
    if (score >= 25) return '#ffdd00';
    return '#00ffaa';
}

function getLabel(score) {
    if (score >= 80) return 'TERREUR ABSOLUE';
    if (score >= 60) return 'GROSSE FRAYEUR';
    if (score >= 40) return 'BIEN SURPRIS';
    if (score >= 20) return 'UN PEU CHOQUÉ';
    return 'MÊME PAS PEUR';
}

function drawOverlay(canvas, score, animatronicName) {
    const ctx = canvas.getContext('2d');
    const w   = canvas.width;
    const h   = canvas.height;
    const color = getColor(score);
    const label = getLabel(score);

    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.fillRect(0, h - 80, w, 80);

    ctx.font = `bold ${Math.round(w * 0.09)}px "Courier New", monospace`;
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 18;
    ctx.textAlign = 'right';
    ctx.fillText(`${score}%`, w - 20, h - 18);

    ctx.shadowBlur = 6;
    ctx.font = `${Math.round(w * 0.035)}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'left';
    ctx.fillText(`☠ SURPRISE METER — ${label}`, 16, h - 18);

    ctx.shadowBlur = 0;
    ctx.font = `${Math.round(w * 0.028)}px "Courier New", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`killed by ${animatronicName.toUpperCase()}`, 12, 28);
}