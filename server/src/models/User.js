import mongoose from 'mongoose';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Username requis'],
            unique: true,
            trim: true,
            minlength: [3, 'Username trop court (min 3)'],
            maxlength: [24, 'Username trop long (max 24)'],
            match: [/^[a-zA-Z0-9_-]+$/, 'Username invalide'],
        },
        email: {
            type: String,
            required: [true, 'Email requis'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [emailRegex, 'Email invalide'],
        },
        password: {
            type: String,
            required: [true, 'Mot de passe requis'],
            minlength: [8, 'Mot de passe trop court (min 8)'],
        },
        furthestNight: {
            type: Number,
            default: 0,
            min: 0,
            max: 7,
        },
        // Highest night ever completed — persists through "New Game" so the
        // Custom Night unlock (>=5) and the menu stars are never lost.
        bestNight: {
            type: Number,
            default: 0,
            min: 0,
            max: 7,
        },
        // Beat Custom Night on 4/20 mode (all AI at 20) — 3rd menu star.
        customNightBeaten: {
            type: Boolean,
            default: false,
        },
        resetToken: {
            type: String,
            default: null,
        },
        resetTokenExpiry: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model('User', userSchema);
