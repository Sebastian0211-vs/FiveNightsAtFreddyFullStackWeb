import { GraphQLError } from 'graphql';
import User from '../models/User.js';
import Score from '../models/Score.js';

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
            return Score.create({
                user: user._id,
                username: user.username,
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
