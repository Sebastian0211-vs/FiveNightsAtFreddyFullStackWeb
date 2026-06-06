const isProd = process.env.NODE_ENV === 'production';

export const COOKIE_NAME = 'token';

export const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
};

// Cleared cookie must share path/sameSite/secure with the original
export const clearCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
};
