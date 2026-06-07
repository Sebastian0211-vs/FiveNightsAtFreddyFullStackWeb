import { GraphQLError } from 'graphql';
import User from '../models/User.js';
import Score from '../models/Score.js';
import NightSession from '../models/NightSession.js';

// Real-time length of one night, in seconds. Keep in sync with the client's
// NIGHT_SECS (src/constants/nightConfig.js).
const NIGHT_SECS = 535;

function badInput(message) {
    return new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

// Fetch country from IP using ip-api.com (free, no key needed)
async function geolocateIP(ip) {
    try {
        // Skip loopback / private IPs (dev environment)
        if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return { country: null, countryCode: null };
        }
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,status`);
        const data = await res.json();
        if (data.status !== 'success') return { country: null, countryCode: null };
        return { country: data.country, countryCode: data.countryCode };
    } catch {
        return { country: null, countryCode: null };
    }
}

function requireUser(ctx) {
    if (!ctx.user) {
        throw new GraphQLError('Non authentifié', {
            extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
        });
    }
    return ctx.user;
}

export const resolvers = {
    Query: {
        me: async (_p, _a, ctx) => {
            const user = ctx.user;
            if (!user) return null;
            // Backfill bestNight for accounts created before it existed.
            if ((user.bestNight ?? 0) < (user.furthestNight ?? 0)) {
                user.bestNight = user.furthestNight;
                await user.save().catch(() => {});
            }
            return user;
        },

        leaderboard: async (_p, { night, limit }) => {
            const filter = night ? { night } : {};
            return Score.find(filter)
                .sort({ survivedSeconds: -1, createdAt: 1 })
                .limit(Math.min(limit ?? 10, 50));
        },

        myScores: async (_p, _a, ctx) => {
            const user = requireUser(ctx);
            return Score.find({ user: user._id }).sort({ createdAt: -1 });
        },
    },

    Mutation: {
        updateProgress: async (_p, { night }, ctx) => {
            const user = requireUser(ctx);
            if (night < 0 || night > 7) {
                throw new GraphQLError('Night invalide', {
                    extensions: { code: 'BAD_USER_INPUT' },
                });
            }
            let changed = false;
            if (night > user.furthestNight) { user.furthestNight = night; changed = true; }
            if (night > user.bestNight)     { user.bestNight     = night; changed = true; }
            if (changed) await user.save();
            return user;
        },

        resetProgress: async (_p, _a, ctx) => {
            const user = requireUser(ctx);
            user.furthestNight = 0;
            await user.save();
            return user;
        },

        // Issue a single-use token when a night begins. The client must hand
        // it back with submitScore, which lets us bound how fast a win can be
        // claimed and tie the Custom Night star to a real session.
        startNight: async (_p, args, ctx) => {
            const user = requireUser(ctx);
            if (args.night < 1 || args.night > 7) throw badInput('Night invalide');
            for (const k of ['aiFreddy', 'aiBonnie', 'aiChica', 'aiFoxy']) {
                if (args[k] != null && (args[k] < 0 || args[k] > 20)) throw badInput('AI hors limites');
            }
            const session = await NightSession.create({
                user:     user._id,
                night:    args.night,
                isCustom: !!args.isCustomNight,
                aiFreddy: args.aiFreddy ?? null,
                aiBonnie: args.aiBonnie ?? null,
                aiChica:  args.aiChica  ?? null,
                aiFoxy:   args.aiFoxy   ?? null,
                startedAt: new Date(),
            });
            return {
                sessionId: session._id.toString(),
                night:     session.night,
                startedAt: session.startedAt.toISOString(),
            };
        },

        submitScore: async (_p, args, ctx) => {
            const user = requireUser(ctx);
            const { sessionId, ...score } = args;

            // ── Session must exist, belong to this user, and be unused ──
            const session = await NightSession.findById(sessionId).catch(() => null);
            if (!session || String(session.user) !== String(user._id)) throw badInput('Session invalide');
            if (session.consumedAt) throw badInput('Session déjà utilisée');

            // ── Submission must match what the session was issued for ──
            const aiMismatch = session.isCustom && (
                score.aiFreddy !== session.aiFreddy || score.aiBonnie !== session.aiBonnie ||
                score.aiChica  !== session.aiChica  || score.aiFoxy  !== session.aiFoxy
            );
            if (score.night !== session.night || !!score.isCustomNight !== session.isCustom || aiMismatch) {
                throw badInput('Score incohérent avec la session');
            }

            // ── Bounds checks ──
            if (score.night < 1 || score.night > 7) throw badInput('night hors limites');
            if (score.survivedSeconds < 0 || score.survivedSeconds > NIGHT_SECS + 5) throw badInput('survivedSeconds hors limites');
            if (score.powerRemaining != null && (score.powerRemaining < 0 || score.powerRemaining > 100)) throw badInput('powerRemaining hors limites');
            for (const k of ['aiFreddy', 'aiBonnie', 'aiChica', 'aiFoxy']) {
                if (score[k] != null && (score[k] < 0 || score[k] > 20)) throw badInput(`${k} hors limites`);
            }

            // ── Time gate: a real playthrough takes wall-clock time ──
            const elapsedMs   = Date.now() - session.startedAt.getTime();
            const fullNightMs = NIGHT_SECS * 1000;
            if (score.outcome === 'win') {
                if (score.survivedSeconds < NIGHT_SECS * 0.9 || elapsedMs < fullNightMs * 0.85) {
                    throw badInput('Win trop rapide pour être réel');
                }
            } else if (score.survivedSeconds > elapsedMs / 1000 + 5) {
                throw badInput('Survie incohérente avec le temps écoulé');
            }

            // ── Consume the session (single-use) ──
            session.consumedAt = new Date();
            await session.save();

            // 3rd menu star: Custom Night 4/20 — now validated against the session.
            if (
                score.outcome === 'win' && session.isCustom &&
                session.aiFreddy === 20 && session.aiBonnie === 20 &&
                session.aiChica === 20 && session.aiFoxy === 20 &&
                !user.customNightBeaten
            ) {
                user.customNightBeaten = true;
                await user.save();
            }

            const { country, countryCode } = await geolocateIP(ctx.ip);
            return Score.create({
                user: user._id,
                username: user.username,
                country,
                countryCode,
                ...score,
            });
        },
    },

    User: {
        id: (u) => u._id?.toString() ?? u.id,
    },
    Score: {
        id: (s) => s._id.toString(),
        createdAt: (s) => s.createdAt.toISOString(),
    },
};
