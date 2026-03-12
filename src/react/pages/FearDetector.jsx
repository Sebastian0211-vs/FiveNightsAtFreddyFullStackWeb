import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'

const MODELS_URL = '/models'

function getColor(score) {
    if (score >= 80) return '#ff0000'
    if (score >= 50) return '#ff6600'
    if (score >= 25) return '#ffcc00'
    return '#00aaff'
}

function getLabel(score) {
    if (score >= 80) return 'CHOQUÉ À MORT 💀'
    if (score >= 60) return 'BIEN SURPRIS 😱'
    if (score >= 40) return 'RÉACTION NETTE 😮'
    if (score >= 20) return 'LÉGÈREMENT SURPRIS'
    return 'AUCUNE RÉACTION'
}

// Détecte un pic de surprise (delta entre avant et après jumpscare)
function computeJumpscareScore(before, after) {
    if (!before || !after) return after ? Math.round(after.surprised * 100) : 0
    // On mesure le DELTA de surprise + fearful par rapport au baseline
    const deltaSuprised = Math.max(0, after.surprised - before.surprised)
    const deltaFearful  = Math.max(0, after.fearful  - before.fearful)
    const deltaDisgust  = Math.max(0, after.disgusted - before.disgusted)
    // Pondération : surprised est le signal principal pour un jumpscare
    return Math.min(100, Math.round((deltaSuprised * 0.6 + deltaFearful * 0.3 + deltaDisgust * 0.1) * 100))
}

export default function SurpriseDetector() {
    const videoRef       = useRef(null)
    const baselineRef    = useRef(null) // expressions au repos AVANT le jumpscare
    const intervalRef    = useRef(null)

    const [modelsLoaded, setModelsLoaded]   = useState(false)
    const [cameraReady,  setCameraReady]    = useState(false)
    const [liveExpr,     setLiveExpr]       = useState(null)   // expressions temps réel
    const [jumpScore,    setJumpScore]      = useState(null)   // score du dernier jumpscare
    const [phase,        setPhase]          = useState('idle') // idle | baseline | jumpscare | result
    const [countdown,    setCountdown]      = useState(null)
    const [error,        setError]          = useState(null)

    // Charge les modèles
    useEffect(() => {
        async function load() {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL),
                ])
                setModelsLoaded(true)
            } catch {
                setError('Modèles introuvables — vérifie /public/models/')
            }
        }
        load()
    }, [])

    // Démarre webcam
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.onloadedmetadata = () => setCameraReady(true)
            }
        } catch {
            setError('Accès webcam refusé')
        }
    }, [])

    // Analyse une frame unique
    const analyzeFrame = useCallback(async () => {
        if (!videoRef.current) return null
        const result = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
            .withFaceExpressions()
        return result ? result.expressions : null
    }, [])

    // Analyse en continu pour l'affichage live
    useEffect(() => {
        if (!modelsLoaded || !cameraReady) return
        intervalRef.current = setInterval(async () => {
            const expr = await analyzeFrame()
            if (expr) setLiveExpr(expr)
        }, 200) // 200ms = plus réactif
        return () => clearInterval(intervalRef.current)
    }, [modelsLoaded, cameraReady, analyzeFrame])

    // Séquence complète : baseline → jumpscare → capture → score
    const triggerSequence = useCallback(async () => {
        setJumpScore(null)
        setPhase('baseline')

        // 1. Capture le visage au repos pendant 1s (moyenne de 5 frames)
        const baselineSamples = []
        for (let i = 0; i < 5; i++) {
            const expr = await analyzeFrame()
            if (expr) baselineSamples.push(expr)
            await new Promise(r => setTimeout(r, 200))
        }

        // Moyenne du baseline
        if (baselineSamples.length > 0) {
            const avg = {}
            const keys = Object.keys(baselineSamples[0])
            keys.forEach(k => {
                avg[k] = baselineSamples.reduce((s, e) => s + e[k], 0) / baselineSamples.length
            })
            baselineRef.current = avg
        }

        // 2. Countdown 3-2-1
        setPhase('countdown')
        for (let i = 3; i >= 1; i--) {
            setCountdown(i)
            await new Promise(r => setTimeout(r, 700))
        }
        setCountdown(null)

        // 3. JUMPSCARE
        setPhase('jumpscare')

        // 4. Capture la réaction 300ms après le jumpscare (pic de surprise)
        await new Promise(r => setTimeout(r, 300))
        const reactionSamples = []
        for (let i = 0; i < 3; i++) {
            const expr = await analyzeFrame()
            if (expr) reactionSamples.push(expr)
            await new Promise(r => setTimeout(r, 100))
        }

        const reactionExpr = reactionSamples.length > 0
            ? (() => {
                const avg = {}
                const keys = Object.keys(reactionSamples[0])
                keys.forEach(k => { avg[k] = reactionSamples.reduce((s, e) => s + e[k], 0) / reactionSamples.length })
                return avg
            })()
            : null

        const score = computeJumpscareScore(baselineRef.current, reactionExpr)
        setJumpScore(score)
        setPhase('result')

        await new Promise(r => setTimeout(r, 2000))
        setPhase('idle')
    }, [analyzeFrame])

    const color = jumpScore !== null ? getColor(jumpScore) : '#00aaff'
    const liveSuprise = liveExpr ? Math.round(liveExpr.surprised * 100) : 0

    return (
        <div style={{
            minHeight: '100vh',
            background: '#080808',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Courier New", monospace',
            color: '#fff',
            gap: '1.2rem',
            padding: '2rem',
        }}>
            <h1 style={{ margin: 0, fontSize: '1.3rem', letterSpacing: '0.3em', color: '#ff3300' }}>
                ☠ JUMPSCARE METER
            </h1>

            {/* Webcam */}
            <div style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                border: `2px solid ${phase === 'jumpscare' ? '#ff0000' : '#222'}`,
                boxShadow: phase === 'jumpscare' ? '0 0 40px #ff000088' : 'none',
                transition: 'border-color 0.1s, box-shadow 0.1s',
            }}>
                <video
                    ref={videoRef}
                    autoPlay muted playsInline
                    width={480} height={360}
                    style={{
                        display: 'block',
                        filter: phase === 'jumpscare' ? 'brightness(0.1)' : 'none',
                        transition: 'filter 0.05s',
                    }}
                />

                {/* Jumpscare overlay */}
                {phase === 'jumpscare' && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10rem',
                        animation: 'shake 0.08s infinite',
                    }}>
                        👻
                    </div>
                )}

                {/* Countdown overlay */}
                {phase === 'countdown' && countdown && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)',
                        fontSize: '6rem', fontWeight: 'bold', color: '#ff3300',
                        animation: 'pulse 0.7s ease',
                    }}>
                        {countdown}
                    </div>
                )}

                {/* Baseline overlay */}
                {phase === 'baseline' && (
                    <div style={{
                        position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.8)', padding: '6px 16px', borderRadius: '20px',
                        fontSize: '0.75rem', color: '#aaa', whiteSpace: 'nowrap',
                    }}>
                        📊 Calibration du visage au repos...
                    </div>
                )}

                {/* Result overlay */}
                {phase === 'result' && jumpScore !== null && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.75)',
                    }}>
                        <div style={{ fontSize: '5rem', fontWeight: 'bold', color, textShadow: `0 0 30px ${color}` }}>
                            {jumpScore}%
                        </div>
                        <div style={{ fontSize: '1rem', letterSpacing: '0.15em', color }}>
                            {getLabel(jumpScore)}
                        </div>
                    </div>
                )}

                {/* Live surprise bar en bas */}
                {cameraReady && phase === 'idle' && (
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                        padding: '1.5rem 1rem 0.8rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.65rem', color: '#666' }}>
                            <span>SURPRISE EN DIRECT</span>
                            <span style={{ color: getColor(liveSuprise) }}>{liveSuprise}%</span>
                        </div>
                        <div style={{ height: '4px', background: '#222', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${liveSuprise}%`,
                                background: getColor(liveSuprise),
                                boxShadow: `0 0 6px ${getColor(liveSuprise)}`,
                                borderRadius: '2px',
                                transition: 'width 0.15s ease',
                            }} />
                        </div>
                    </div>
                )}

                {/* Pas encore démarré */}
                {!cameraReady && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: '#0f0f0f', gap: '1rem',
                    }}>
                        {error
                            ? <span style={{ color: '#f00', fontSize: '0.85rem', textAlign: 'center', maxWidth: '300px' }}>⚠ {error}</span>
                            : modelsLoaded
                                ? <button onClick={startCamera} style={{
                                    padding: '0.7rem 2rem', background: 'transparent',
                                    border: '1px solid #ff3300', color: '#ff3300',
                                    fontFamily: '"Courier New", monospace', fontSize: '0.9rem',
                                    letterSpacing: '0.1em', cursor: 'pointer', borderRadius: '4px',
                                }}>ACTIVER LA CAMÉRA</button>
                                : <span style={{ color: '#444', fontSize: '0.8rem' }}>⏳ Chargement des modèles...</span>
                        }
                    </div>
                )}
            </div>

            {/* Bouton jumpscare */}
            {cameraReady && phase === 'idle' && (
                <button
                    onClick={triggerSequence}
                    style={{
                        padding: '0.8rem 3rem',
                        background: 'transparent',
                        border: '1px solid #ff3300',
                        color: '#ff3300',
                        fontFamily: '"Courier New", monospace',
                        fontSize: '1rem',
                        letterSpacing: '0.2em',
                        cursor: 'pointer',
                        borderRadius: '4px',
                    }}
                >
                    👻 TESTER LE JUMPSCARE
                </button>
            )}

            {/* Score du dernier jump */}
            {jumpScore !== null && phase === 'idle' && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#444', letterSpacing: '0.1em' }}>DERNIER SCORE</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color, textShadow: `0 0 15px ${color}` }}>
                        {jumpScore}%
                    </div>
                    <div style={{ fontSize: '0.85rem', color, letterSpacing: '0.1em' }}>{getLabel(jumpScore)}</div>
                </div>
            )}

            <style>{`
        @keyframes shake {
          0%,100% { transform: translate(0,0) rotate(0deg) }
          20% { transform: translate(-8px, 6px) rotate(-2deg) }
          40% { transform: translate(8px, -6px) rotate(2deg) }
          60% { transform: translate(-6px, -8px) rotate(-1deg) }
          80% { transform: translate(6px, 8px) rotate(1deg) }
        }
        @keyframes pulse {
          0% { transform: scale(1.5); opacity: 0 }
          100% { transform: scale(1); opacity: 1 }
        }
      `}</style>
        </div>
    )
}