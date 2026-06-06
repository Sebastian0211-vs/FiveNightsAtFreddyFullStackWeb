import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        username: {
            type: String,
            required: true,
            trim: true,
        },
        night: {
            type: Number,
            required: true,
            min: 1,
            max: 7,
        },
        survivedSeconds: {
            type: Number,
            required: true,
            min: 0,
        },
        outcome: {
            type: String,
            enum: ['win', 'jumpscare'],
            required: true,
        },
        country: {
            type: String,
            default: null,
        },
        countryCode: {
            type: String,
            default: null,
        },
        cameraFlicks: {
            type: Number,
            default: 0,
            min: 0,
        },
        doorCloses: {
            type: Number,
            default: 0,
            min: 0,
        },
        powerRemaining: {
            type: Number,
            default: 0,
            min: 0,
        },
        isCustomNight: { type: Boolean, default: false },
        aiFreddy:      { type: Number, default: null },
        aiBonnie:      { type: Number, default: null },
        aiChica:       { type: Number, default: null },
        aiFoxy:        { type: Number, default: null },
    },
    { timestamps: true }
);

scoreSchema.index({ night: 1, survivedSeconds: -1 });

export default mongoose.model('Score', scoreSchema);
