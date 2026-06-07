// ============================================================
//  seedDebugUser.js — create/refresh a fully-unlocked debug user
//
//  Everything unlocked: furthest night, best night (all stars) and
//  the Custom Night 4/20 star.
//
//  Run from the project root (so dotenv picks up the root .env):
//      node server/src/scripts/seedDebugUser.js
//    or
//      npm run seed:debug
//
//  Override the credentials with env vars if you like:
//      DEBUG_USERNAME=tester DEBUG_PASSWORD=supersecret \
//      DEBUG_EMAIL=tester@example.com npm run seed:debug
// ============================================================
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const USERNAME = process.env.DEBUG_USERNAME || 'debug';
const PASSWORD = process.env.DEBUG_PASSWORD || 'debug1234';
const EMAIL    = process.env.DEBUG_EMAIL    || 'debug@debug.local';

// Everything unlocked.
const UNLOCKED = {
    furthestNight:     6,    // Continue available, beaten the main game
    bestNight:         6,    // Star 1 (Night 5) + Star 2 (Night 6)
    customNightBeaten: true, // Star 3 (Custom Night 4/20)
};

async function main() {
    if (!process.env.MONGO_URI) {
        console.error('Missing MONGO_URI in .env (run from the project root).');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const hashed = await bcrypt.hash(PASSWORD, 12);

    let user = await User.findOne({ username: USERNAME });
    if (user) {
        user.email             = EMAIL;
        user.password          = hashed;
        user.furthestNight     = UNLOCKED.furthestNight;
        user.bestNight         = UNLOCKED.bestNight;
        user.customNightBeaten = UNLOCKED.customNightBeaten;
        await user.save();
        console.log(`Updated existing debug user "${USERNAME}".`);
    } else {
        user = await User.create({
            username: USERNAME,
            email:    EMAIL,
            password: hashed,
            ...UNLOCKED,
        });
        console.log(`Created debug user "${USERNAME}".`);
    }

    console.log('--------------------------------------------');
    console.log('  Login:    ', USERNAME);
    console.log('  Password: ', PASSWORD);
    console.log('  Email:    ', EMAIL);
    console.log('  furthestNight:', user.furthestNight);
    console.log('  bestNight:    ', user.bestNight, '(stars 1 & 2)');
    console.log('  customNightBeaten:', user.customNightBeaten, '(star 3)');
    console.log('--------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(async (err) => {
    console.error('Seed failed:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
