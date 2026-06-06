import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { COOKIE_NAME } from '../auth/cookie.js';

// Apollo context: pull JWT from the HttpOnly cookie and attach the user + client IP
export async function buildContext({ req }) {
    const ip =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        null;

    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return { user: null, ip };
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.id);
        return { user, ip };
    } catch {
        return { user: null, ip };
    }
}
