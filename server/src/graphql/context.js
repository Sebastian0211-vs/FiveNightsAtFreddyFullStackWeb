import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { COOKIE_NAME } from '../auth/cookie.js';

// Apollo context: pull JWT from the HttpOnly cookie and attach the user
export async function buildContext({ req }) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return { user: null };
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.id);
        return { user };
    } catch {
        return { user: null };
    }
}
