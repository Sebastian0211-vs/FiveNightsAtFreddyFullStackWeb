import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';

// Mock Resend so the module loads without a real API key in CI/test
vi.mock('resend', () => ({
    Resend: class {
        emails = { send: vi.fn().mockResolvedValue({ id: 'test-id' }) };
    },
}));

// Mock the User model BEFORE importing the app — no real Mongo in tests.
const fakeDb = new Map();
let idCounter = 1;

vi.mock('../models/User.js', () => {
    const make = (doc) => {
        const u = { furthestNight: 0, ...doc, _id: doc._id ?? String(idCounter++) };
        u.save = async function () {
            fakeDb.set(this.username, this);
            return this;
        };
        return u;
    };
    // findById must return a thenable that ALSO supports .select() chaining
    const findByIdQuery = (id) => {
        const exec = async () => {
            for (const u of fakeDb.values()) if (u._id === id) return u;
            return null;
        };
        return {
            select: () => ({ then: (r, rj) => exec().then(r, rj) }),
            then: (r, rj) => exec().then(r, rj),
        };
    };
    return {
        default: {
            findOne: async (q) => {
                if (q.username) return fakeDb.get(q.username) || null;
                if (q.email) {
                    for (const u of fakeDb.values()) if (u.email === q.email) return u;
                    return null;
                }
                return null;
            },
            findById: (id) => findByIdQuery(id),
            create: async (doc) => {
                const u = make(doc);
                fakeDb.set(u.username, u);
                return u;
            },
        },
    };
});

vi.mock('../models/Score.js', () => ({
    default: { find: () => ({ sort: () => ({ limit: () => [] }) }), create: async (d) => d },
}));

let app;
beforeAll(async () => {
    const { buildApp } = await import('../app.js');
    app = await buildApp();
});

// INTEGRATION TEST #1 — REST register + login flow sets HttpOnly cookie
describe('POST /api/auth/register + /login', () => {
    it('registers a user, sets HttpOnly cookie, allows /me', async () => {
        const reg = await request(app)
            .post('/api/auth/register')
            .send({ username: 'alice', email: 'a@x.io', password: 'longenough1' });

        expect(reg.status).toBe(201);
        const setCookie = reg.headers['set-cookie']?.[0] || '';
        expect(setCookie).toMatch(/token=/);
        expect(setCookie).toMatch(/HttpOnly/i);

        const me = await request(app).get('/api/auth/me').set('Cookie', setCookie);
        expect(me.status).toBe(200);
        expect(me.body.username).toBe('alice');
    });

    it('rejects /me without cookie', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });
});

// INTEGRATION TEST #2 — GraphQL me query is gated by the same cookie
describe('GraphQL /graphql', () => {
    it('returns null me when unauthenticated', async () => {
        const res = await request(app)
            .post('/graphql')
            .send({ query: '{ me { username } }' });
        expect(res.status).toBe(200);
        expect(res.body.data.me).toBeNull();
    });

    it('returns the user when authenticated via cookie', async () => {
        const reg = await request(app)
            .post('/api/auth/register')
            .send({ username: 'bob', email: 'b@x.io', password: 'longenough1' });
        const cookie = reg.headers['set-cookie'][0];

        const res = await request(app)
            .post('/graphql')
            .set('Cookie', cookie)
            .send({ query: '{ me { username furthestNight } }' });

        expect(res.status).toBe(200);
        expect(res.body.data.me.username).toBe('bob');
        expect(res.body.data.me.furthestNight).toBe(0);
    });
});
