import { GraphQLError } from 'graphql';
import User from '../models/User.js';
import Score from '../models/Score.js';

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
        me: (_p, _a, ctx) => ctx.user || null,

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
            if (night > user.furthestNight) {
                user.furthestNight = night;
                await user.save();
            }
            return user;
        },

        resetProgress: async (_p, _a, ctx) => {
            const user = requireUser(ctx);
            user.furthestNight = 0;
            await user.save();
            return user;
        },

        submitScore: async (_p, args, ctx) => {
            const user = requireUser(ctx);
            const { country, countryCode } = await geolocateIP(ctx.ip);
            return Score.create({
                user: user._id,
                username: user.username,
                country,
                countryCode,
                ...args,
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
