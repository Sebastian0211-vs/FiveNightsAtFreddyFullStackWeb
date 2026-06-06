import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../auth/passport.js';
import { COOKIE_NAME, cookieOptions, clearCookieOptions } from '../auth/cookie.js';

const router = express.Router();

function signToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Champs manquants' });
        }
        if (await User.findOne({ username })) {
            return res.status(409).json({ error: 'Username pris' });
        }
        if (await User.findOne({ email })) {
            return res.status(409).json({ error: 'Email déjà utilisé' });
        }
        const hashed = await bcrypt.hash(password, 12);
        const user = await User.create({ username, email, password: hashed });

        const token = signToken(user._id);
        res.cookie(COOKIE_NAME, token, cookieOptions);
        res.status(201).json({ username: user.username });
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

    const token = signToken(user._id);
    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.json({ username: user.username, furthestNight: user.furthestNight });
});

// LOGOUT
router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME, clearCookieOptions);
    res.json({ success: true });
});

// ME — info on the connected user
router.get('/me', requireAuth, (req, res) => {
    res.json({
        username: req.user.username,
        furthestNight: req.user.furthestNight,
    });
});

export default router;
