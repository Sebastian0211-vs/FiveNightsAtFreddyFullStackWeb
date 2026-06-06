import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useAuth } from '../auth/AuthContext.jsx';

// GraphQL: leaderboard + my scores (data driven, reactive)
const LEADERBOARD = gql`
    query Leaderboard($night: Int, $limit: Int) {
        leaderboard(night: $night, limit: $limit) {
            id
            username
            night
            survivedSeconds
            outcome
            createdAt
        }
    }
`;

// External API: jokeapi.dev — a "fear of the day" panel.
// No API key required; safe-mode flag filters NSFW content.
async function fetchDailyJoke() {
    const res = await fetch(
        'https://v2.jokeapi.dev/joke/Spooky?safe-mode&type=single'
    );
    if (!res.ok) throw new Error('External API failed');
    const data = await res.json();
    return data.joke || data.setup || 'Boo.';
}

function NightFilter({ value, onChange }) {
    return (
        <select
            className="btn"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        >
            <option value="">All nights</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>Night {n}</option>
            ))}
        </select>
    );
}

export default function Leaderboard() {
    const { user } = useAuth();
    const [night, setNight] = useState(null);
    const { data, loading, error, refetch } = useQuery(LEADERBOARD, {
        variables: { night, limit: 10 },
    });

    // External API state — refetched on demand
    const [joke, setJoke] = useState(null);
    const [jokeErr, setJokeErr] = useState(null);
    useEffect(() => {
        fetchDailyJoke().then(setJoke).catch((e) => setJokeErr(e.message));
    }, []);

    return (
        <div className="page">
            <h1>Leaderboard</h1>

            <div className="card" aria-label="Fear of the day">
                <div className="muted">Fear of the day · jokeapi.dev</div>
                {jokeErr ? <div className="error">External API: {jokeErr}</div> : null}
                <div style={{ marginTop: '0.4rem' }}>{joke ?? 'Loading…'}</div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem' }}>
                <NightFilter value={night} onChange={setNight} />
                <button className="btn" onClick={() => refetch()}>Refresh</button>
                {user ? <span className="muted">Signed in as {user.username}</span> : null}
            </div>

            {error ? <div className="error">GraphQL error: {error.message}</div> : null}

            <table className="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Player</th>
                        <th>Night</th>
                        <th>Survived (s)</th>
                        <th>Outcome</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && !data ? (
                        <tr><td colSpan={5} className="muted">Loading…</td></tr>
                    ) : (data?.leaderboard ?? []).length === 0 ? (
                        <tr><td colSpan={5} className="muted">No scores yet — be the first to die.</td></tr>
                    ) : (
                        data.leaderboard.map((s, i) => (
                            <tr key={s.id}>
                                <td>{i + 1}</td>
                                <td>{s.username}</td>
                                <td>{s.night}</td>
                                <td>{s.survivedSeconds}</td>
                                <td>{s.outcome === 'win' ? '★ win' : '💀'}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
