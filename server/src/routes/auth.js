import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import User from '../models/User.js';
import { requireAuth } from '../auth/passport.js';
import { COOKIE_NAME, cookieOptions, clearCookieOptions } from '../auth/cookie.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const router = express.Router();

function signToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Check username for profanity via purgomalum.com (free, no key)
async function containsProfanity(text) {
    try {
        const res = await fetch(
            `https://www.purgomalum.com/service/containsprofanity?text=${encodeURIComponent(text)}`
        );
        const body = await res.text();
        return body.trim() === 'true';
    } catch {
        return false; // fail open — don't block registration if API is down
    }
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
        if (await containsProfanity(username)) {
            return res.status(400).json({ error: 'Username not allowed' });
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

// FORGOT PASSWORD — send reset email
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email requis' });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        // Always return 200 so we don't leak which emails are registered
        if (!user) return res.json({ ok: true });

        const token = crypto.randomBytes(32).toString('hex');
        user.resetToken       = token;
        user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

        await resend.emails.send({
            from:    'FNAF Security <noreply@fnaf.sy-baubau.ch>',
            to:      user.email,
            subject: 'Password Reset — Five Nights at Freddy\'s',
            html: `
                <div style="background:#000;color:#fff;font-family:'Courier New',monospace;padding:32px;max-width:480px;">
                    <h2 style="color:#fff;letter-spacing:0.15em;">PASSWORD RESET</h2>
                    <p>Hello, ${user.username}.</p>
                    <p>Someone requested a password reset for your account.<br>
                    If this wasn't you, ignore this email.</p>
                    <p>Click the link below within <strong>1 hour</strong>:</p>
                    <a href="${resetUrl}" style="color:#ffcc00;word-break:break-all;">${resetUrl}</a>
                    <p style="margin-top:32px;opacity:0.4;font-size:12px;">— Fazbear Entertainment Security Dept.</p>
                </div>
            `,
        });

        res.json({ ok: true });
    } catch (err) {
        console.error('forgot-password error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// RESET PASSWORD — consume token, set new password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ error: 'Données manquantes' });
        if (password.length < 8) return res.status(400).json({ error: 'Mot de passe trop court (min 8)' });

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: new Date() },
        });
        if (!user) return res.status(400).json({ error: 'Lien invalide ou expiré' });

        user.password         = await bcrypt.hash(password, 12);
        user.resetToken       = null;
        user.resetTokenExpiry = null;
        await user.save();

        res.json({ ok: true });
    } catch (err) {
        console.error('reset-password error:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
