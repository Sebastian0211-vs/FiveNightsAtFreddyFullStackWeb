import 'dotenv/config';
import mongoose from 'mongoose';
import { buildApp } from './app.js';

const PORT = process.env.PORT || 3002;

async function main() {
    if (!process.env.MONGO_URI) {
        console.error('Missing MONGO_URI in .env');
        process.exit(1);
    }
    if (!process.env.JWT_SECRET) {
        console.error('Missing JWT_SECRET in .env');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connecté');

    const app = await buildApp();
    app.listen(PORT, () => console.log(`Server on :${PORT} (GraphQL at /graphql)`));
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
