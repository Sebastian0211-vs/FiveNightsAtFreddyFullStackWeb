import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

import { configurePassport } from './auth/passport.js';
import authRoutes from './routes/auth.js';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { buildContext } from './graphql/context.js';

// Build the Express app (no listen, no Mongo connect, for testability)
export async function buildApp() {
    const app = express();

    app.use(
        cors({
            origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
            credentials: true,
        })
    );
    app.use(express.json());
    app.use(cookieParser());

    configurePassport();

    app.get('/health', (_req, res) => res.json({ ok: true }));
    app.use('/api/auth', authRoutes);

    const apollo = new ApolloServer({ typeDefs, resolvers });
    await apollo.start();
    app.use(
        '/graphql',
        expressMiddleware(apollo, { context: buildContext })
    );

    return app;
}
