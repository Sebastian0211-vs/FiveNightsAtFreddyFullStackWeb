// Test env - keeps the app off real Mongo and gives Passport/JWT a secret.
process.env.JWT_SECRET = 'test-secret-not-for-prod';
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:5173';
