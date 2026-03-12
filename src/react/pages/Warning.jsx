import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Warning() {
    const navigate = useNavigate();

    useEffect(() => {
        // Fade in on load
        document.body.style.opacity = '1';
    }, []);

    function handleClick() {
        document.body.style.transition = 'opacity 1s';
        document.body.style.opacity = '0';
        setTimeout(() => {
            navigate('/menu');
        }, 2000);
    }

    return (
        <div
            onClick={handleClick}
            style={{
                backgroundColor: 'black',
                margin: 0,
                height: '100vh',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
            }}
        >
            <img
                id="warning-img"
                src="../Assets/Menu/warning_trans.png"
                style={{ width: '30%', objectFit: 'contain' }}
                alt="Warning"
            />
            <p
                id="warning"
                style={{
                    color: 'white',
                    fontSize: '2vw',
                    marginTop: '2%',
                    textAlign: 'center',
                    opacity: 0.7,
                    fontFamily: 'FNAF',
                }}
            >
                Press F11 for better game experience.<br />Click anywhere to continue.
            </p>
            <p
                id="sound"
                style={{
                    color: 'white',
                    fontSize: '2vw',
                    textAlign: 'center',
                    opacity: 0.7,
                    fontFamily: 'FNAF',
                }}
            >
                Better with sound on !
            </p>
        </div>
    );
}
