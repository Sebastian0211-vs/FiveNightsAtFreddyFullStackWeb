// Thin REST helper, every call sends the auth cookie.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}
