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
    },
    { timestamps: true }
);

scoreSchema.index({ night: 1, survivedSeconds: -1 });

export default mongoose.model('Score', scoreSchema);
