import { useState, useEffect } from 'react';
import warningImg from '../../../assets/Menu/warning_trans.png';

export default function Warning() {
    const [opacity, setOpacity] = useState(0);

    // Fade in
    useEffect(() => {
        setTimeout(() => setOpacity(1), 50);
    }, []);

    function handleClick() {
        setOpacity(0);
        setTimeout(() => { window.location.href = '/login'; }, 1000);
    }

    return (
        <div onClick={handleClick} style={{
            background: '#000',
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity,
            transition: 'opacity 1s',
            overflow: 'hidden',
        }}>
            <style>{`
                @font-face {
                    font-family: 'FNAF';
                    src: url('/assets/Fonts/five-nights-at-freddys.otf') format('opentype');
                }
            `}</style>

            <img src={warningImg} style={{ width: '30%', objectFit: 'contain' }} />

            <p style={{ color: '#fff', fontFamily: "'FNAF', monospace", fontSize: '2vw',
                marginTop: '2%', textAlign: 'center', opacity: 0.7 }}>
                Press F11 for better game experience.<br />Click anywhere to continue.
            </p>
            <p style={{ color: '#fff', fontFamily: "'FNAF', monospace", fontSize: '2vw',
                marginTop: '2%', textAlign: 'center', opacity: 0.7 }}>
                Better with sound on !
            </p>
        </div>
    );
}