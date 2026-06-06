import { useMemo, useRef, useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { IMG, AUDIO, NOISE_MENU, WHITE_MENU, ensureFnafFont } from '../lib/menuAssets.js';
import { runNoise, runAnimation, useFramePlayer, useSlideLoop, useLoopAudio, tvStatic } from '../lib/fnafFx.jsx';

// FNAF-themed Security Log — ported from src/pages/Leaderboard.html.
const LEADERBOARD_QUERY = gql`
  query Leaderboard {
    leaderboard(limit: 50) {
      id username night survivedSeconds outcome country countryCode
      cameraFlicks doorCloses powerRemaining
      isCustomNight aiFreddy aiBonnie aiChica aiFoxy
    }
  }
`;

const COLS_NORMAL = [
    { label: 'Guard',  field: 'username',       numeric: false },
    { label: 'Night',  field: 'night',          numeric: true },
    { label: 'Cams',   field: 'cameraFlicks',   numeric: true },
    { label: 'Doors',  field: 'doorCloses',     numeric: true },
    { label: 'Power',  field: 'powerRemaining', numeric: true },
    { label: 'Status', field: 'outcome',        numeric: false },
];
const COLS_CUSTOM = [
    { label: 'Guard',  field: 'username',       numeric: false },
    { label: 'Freddy', field: 'aiFreddy',       numeric: true },
    { label: 'Bonnie', field: 'aiBonnie',       numeric: true },
    { label: 'Chica',  field: 'aiChica',        numeric: true },
    { label: 'Foxy',   field: 'aiFoxy',         numeric: true },
    { label: 'Cams',   field: 'cameraFlicks',   numeric: true },
    { label: 'Doors',  field: 'doorCloses',     numeric: true },
    { label: 'Power',  field: 'powerRemaining', numeric: true },
    { label: 'Status', field: 'outcome',        numeric: false },
];

function toFlag(code) {
    if (!code) return '';
    return code.toUpperCase().replace(/./g, c =>
        String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)));
}

const STYLES = `
.lb-root { background:#000; margin:0; height:100vh; width:100vw; position:relative; overflow:hidden; }
.lb-container { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:100%; aspect-ratio:16/9; }
.lb-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:1; filter:brightness(0.55); }
.lb-noise, .lb-white { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; pointer-events:none; }
.lb-noise { z-index:20; } .lb-white { z-index:21; }
.lb-slide { position:fixed; top:5%; left:50%; transform:translateX(-50%); width:100%; opacity:0.5; z-index:22; animation:slideDown 10s linear forwards; }
@keyframes slideDown { from { top:-100%; } to { top:90%; } }
.lb-title { position:absolute; top:8%; left:50%; transform:translateX(-50%); z-index:20; font-family:'FNAF','Courier New',monospace; font-size:4vw; color:#fff; text-shadow:2px 2px 12px rgba(0,0,0,0.95); white-space:nowrap; pointer-events:none; }
.lb-back { position:fixed; top:24px; left:28px; z-index:30; font-family:'FNAF','Courier New',monospace; font-size:clamp(12px,1.4vw,20px); color:#fff; background:none; border:none; cursor:pointer; letter-spacing:0.05em; text-shadow:1px 1px 6px rgba(0,0,0,0.9); white-space:nowrap; }
.lb-back:hover { opacity:0.7; }
.lb-tabs { position:absolute; top:13%; left:50%; transform:translateX(-50%); z-index:20; display:flex; gap:1vw; }
.lb-tab { font-family:'FNAF','Courier New',monospace; font-size:clamp(14px,1.8vw,26px); color:rgba(255,255,255,0.45); background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.15); padding:0.5% 1.4%; cursor:pointer; letter-spacing:0.12em; transition:color 0.15s,border-color 0.15s; white-space:nowrap; }
.lb-tab:hover { color:rgba(255,255,255,0.8); border-color:rgba(255,255,255,0.4); }
.lb-tab.active { color:#fff; border-color:#fff; background:rgba(255,255,255,0.08); }
.lb-tab.custom { border-color:rgba(255,200,80,0.4); color:rgba(255,200,80,0.7); }
.lb-tab.custom.active { color:rgba(255,200,80,1); }
.lb-table-wrap { position:absolute; top:20%; left:50%; transform:translateX(-50%); z-index:20; font-family:'FNAF','Courier New',monospace; color:#fff; width:82%; max-height:72vh; overflow-y:auto; text-shadow:1px 1px 6px rgba(0,0,0,0.9); background:rgba(30,30,30,0.55); padding:1% 2%; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.2) transparent; }
.lb-table-wrap::-webkit-scrollbar { width:4px; }
.lb-table-wrap::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.2); border-radius:2px; }
.lb-table { width:100%; border-collapse:collapse; }
.lb-table th { font-size:clamp(15px,1.9vw,26px); letter-spacing:0.12em; color:rgba(255,255,255,0.6); border-bottom:1px solid rgba(255,255,255,0.2); padding:0.6% 1.2%; text-align:center; white-space:nowrap; }
.lb-table th.sortable { cursor:pointer; }
.lb-table th.sortable:hover { color:rgba(255,255,255,0.9); }
.lb-table th.active { color:#fff; }
.lb-table td { font-size:clamp(16px,2vw,28px); letter-spacing:0.06em; color:rgba(255,255,255,0.85); border-bottom:1px solid rgba(255,255,255,0.06); padding:0.7% 1.2%; text-align:center; }
.lb-stat { color:rgba(255,220,100,0.9); }
.lb-win  { color:rgba(100,255,140,0.9); }
.lb-dead { color:rgba(255,80,80,0.85); }
`;

export default function Leaderboard() {
    const navigate = useNavigate();
    const noiseRef = useRef(null);
    const whiteRef = useRef(null);
    const slideRef = useRef(null);
    const [visible, setVisible] = useState(false);
    const [activeNight, setActiveNight] = useState(0); // 0 = all, -1 = custom
    const [sortCol, setSortCol] = useState(null);
    const [sortAsc, setSortAsc] = useState(true);

    useFramePlayer(noiseRef, runNoise, NOISE_MENU);
    useFramePlayer(whiteRef, runAnimation, WHITE_MENU, 0.4);
    useSlideLoop(slideRef);
    useLoopAudio([AUDIO.static2, AUDIO.bonniesLullaby]);

    useEffect(() => {
        ensureFnafFont();
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const { data, loading, error } = useQuery(LEADERBOARD_QUERY, {
        pollInterval: 10000,
        fetchPolicy: 'cache-and-network',
    });
    const allRows = data?.leaderboard ?? [];

    const isCustomView = activeNight === -1;
    const COLS = isCustomView ? COLS_CUSTOM : COLS_NORMAL;

    const nights = useMemo(
        () => [...new Set(allRows.filter(r => !r.isCustomNight).map(r => r.night))].sort((a, b) => a - b),
        [allRows]
    );
    const hasCustom = allRows.some(r => r.isCustomNight);

    const rows = useMemo(() => {
        let base;
        if (isCustomView) base = allRows.filter(s => s.isCustomNight);
        else if (activeNight) base = allRows.filter(s => s.night === activeNight && !s.isCustomNight);
        else base = allRows.filter(s => !s.isCustomNight);

        if (!sortCol) return base;
        return [...base].sort((a, b) => {
            const av = a[sortCol] ?? (typeof a[sortCol] === 'number' ? -1 : '');
            const bv = b[sortCol] ?? (typeof b[sortCol] === 'number' ? -1 : '');
            const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
            return sortAsc ? cmp : -cmp;
        });
    }, [allRows, activeNight, isCustomView, sortCol, sortAsc]);

    function onSort(field) {
        if (sortCol === field) setSortAsc(a => !a);
        else { setSortCol(field); setSortAsc(true); }
    }

    function goToMenu() {
        tvStatic(AUDIO.camera, () => navigate('/menu'));
    }

    const span = 2 + COLS.length;

    return (
        <div className="lb-root" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s' }}>
            <style>{STYLES}</style>

            <div className="lb-container">
                <img className="lb-bg" src={IMG.bonnieMenu} alt="" />
                <img ref={noiseRef} className="lb-noise" src={IMG.staticNoise1} alt="" />
                <img ref={whiteRef} className="lb-white" src={IMG.whiteNoise1} alt="" />
                <img ref={slideRef} className="lb-slide" src={IMG.slide} alt="" />

                <div className="lb-title">Security Log</div>

                <div className="lb-tabs">
                    <button className={`lb-tab${activeNight === 0 ? ' active' : ''}`} onClick={() => setActiveNight(0)}>ALL</button>
                    {nights.map(n => (
                        <button key={n} className={`lb-tab${activeNight === n ? ' active' : ''}`} onClick={() => setActiveNight(n)}>NIGHT {n}</button>
                    ))}
                    {hasCustom && (
                        <button className={`lb-tab custom${isCustomView ? ' active' : ''}`} onClick={() => setActiveNight(-1)}>CUSTOM</button>
                    )}
                </div>

                <div className="lb-table-wrap">
                    <table className="lb-table">
                        <thead>
                            <tr>
                                <th style={{ opacity: 0.4 }}>#</th>
                                <th></th>
                                {COLS.map(c => (
                                    <th
                                        key={c.field}
                                        className={`sortable${sortCol === c.field ? ' active' : ''}`}
                                        onClick={() => onSort(c.field)}
                                    >
                                        {c.label}{sortCol === c.field ? (sortAsc ? ' ▲' : ' ▼') : ' ·'}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && allRows.length === 0 && (
                                <tr><td colSpan={span} style={{ opacity: 0.4, padding: '16px 12px' }}>Loading...</td></tr>
                            )}
                            {error && allRows.length === 0 && (
                                <tr><td colSpan={span} style={{ opacity: 0.4, padding: '16px 12px' }}>[ signal lost ]</td></tr>
                            )}
                            {!loading && !error && rows.length === 0 && (
                                <tr><td colSpan={span} style={{ opacity: 0.4, padding: '16px 12px' }}>No records for this selection.</td></tr>
                            )}
                            {rows.map((s, i) => {
                                const isWin = s.outcome === 'win';
                                const power = s.powerRemaining != null ? `${s.powerRemaining.toFixed(1)}%` : '—';
                                const cams = s.cameraFlicks ?? '—';
                                const doors = s.doorCloses ?? '—';
                                return (
                                    <tr key={s.id ?? i}>
                                        <td style={{ opacity: 0.4 }}>{i + 1}</td>
                                        <td style={{ fontSize: '1.3vw' }}>{toFlag(s.countryCode)}</td>
                                        {isCustomView ? (
                                            <>
                                                <td>{s.username}</td>
                                                <td className="lb-stat">{s.aiFreddy ?? '—'}</td>
                                                <td className="lb-stat">{s.aiBonnie ?? '—'}</td>
                                                <td className="lb-stat">{s.aiChica ?? '—'}</td>
                                                <td className="lb-stat">{s.aiFoxy ?? '—'}</td>
                                                <td className="lb-stat">{cams}</td>
                                                <td className="lb-stat">{doors}</td>
                                                <td className="lb-stat">{power}</td>
                                                <td className={isWin ? 'lb-win' : 'lb-dead'}>{isWin ? '★ survived' : '☠ got you'}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{s.username}</td>
                                                <td style={{ opacity: 0.7 }}>N{s.night}</td>
                                                <td className="lb-stat">{cams}</td>
                                                <td className="lb-stat">{doors}</td>
                                                <td className="lb-stat">{power}</td>
                                                <td className={isWin ? 'lb-win' : 'lb-dead'}>{isWin ? '★ survived' : '☠ got you'}</td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <button className="lb-back" onClick={goToMenu}>Back to Menu</button>
        </div>
    );
}
