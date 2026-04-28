import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Non autorisé' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Token invalide' });
    }
}

// REGISTER
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(409).json({ error: 'Username pris' });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(409).json({ error: 'Email déjà utilisé' });

    const hashed = await bcrypt.hash(password, 12);
    await User.create({ username, email, password: hashed });
    res.json({ success: true });
});

// LOGIN
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Inconnu' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Mauvais mdp' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
});

// ME — infos du user connecté
router.get('/me', authMiddleware, async (req, res) => {
    const user = await User.findById(req.user.id).select('username furthestNight');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username, furthestNight: user.furthestNight });
});

// PROGRESS — enregistre la nuit la plus loin atteinte
router.put('/progress', authMiddleware, async (req, res) => {
    const { night } = req.body;
    if (typeof night !== 'number') return res.status(400).json({ error: 'Night invalide' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (night > user.furthestNight) {
        user.furthestNight = night;
        await user.save();
    }
    res.json({ success: true, furthestNight: user.furthestNight });
});

// RESET — nouvelle partie
router.put('/reset', authMiddleware, async (req, res) => {
    await User.findByIdAndUpdate(req.user.id, { furthestNight: 0 });
    res.json({ success: true });
});

export default router;