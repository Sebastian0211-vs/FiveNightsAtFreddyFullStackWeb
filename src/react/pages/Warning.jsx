import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Warning() {
  const [visible, setVisible] = useState(false);
  const [fading,  setFading]  = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  function handleClick() {
    setFading(true);
    setTimeout(() => navigate('/menu'), 1000);
  }

  return (
    <div
      onClick={handleClick}
      style={{
        background: '#000',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
        opacity: visible && !fading ? 1 : 0,
        transition: 'opacity 1s ease',
      }}
    >
      <img
        src="/assets/menu/warning_trans.png"
        alt="Warning"
        style={{ width: '30%', objectFit: 'contain' }}
      />
      <p style={textStyle}>
        Press F11 for better game experience.<br />
        Click anywhere to continue.
      </p>
      <p style={{ ...textStyle, marginTop: '1%' }}>Better with sound on!</p>
    </div>
  );
}

const textStyle = {
  color: 'white',
  fontFamily: "'FNAF', monospace",
  fontSize: '2vw',
  marginTop: '2%',
  textAlign: 'center',
  opacity: 0.7,
};
