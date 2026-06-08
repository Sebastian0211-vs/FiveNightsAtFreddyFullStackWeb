import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IMG, ensureFnafFont } from '../lib/menuAssets.js';

// Ported from src/pages/Warning.html - click-to-continue splash.
export default function Warning() {
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const leftRef = useRef(false);

    useEffect(() => {
        ensureFnafFont();
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    function handleClick() {
        if (leftRef.current) return;
        leftRef.current = true;
        setLeaving(true);
        setTimeout(() => navigate('/login'), 2000);
    }

    return (
        <div
            onClick={handleClick}
            style={{
                backgroundColor: 'black',
                margin: 0,
                height: '100vh',
                width: '100vw',
                position: 'relative',
                overflow: 'hidden',
                opacity: leaving ? 0 : visible ? 1 : 0,
                transition: 'opacity 1s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
            }}
        >
            <img src={IMG.warning} alt="" style={{ width: '30%', objectFit: 'contain' }} />
            <p style={warnText}>
                Press F11 for better game experience.<br />
                Click anywhere to continue.
            </p>
            <p style={warnText}>Better with sound on !</p>
        </div>
    );
}

const warnText = {
    color: 'white',
    fontFamily: "'FNAF', monospace",
    fontSize: '2vw',
    marginTop: '2%',
    textAlign: 'center',
    opacity: 0.7,
};
