import mongoose from 'mongoose';

// A server-issued, single-use token for one night attempt. Created when a
// night starts (startNight mutation) and consumed when its score is submitted.
// This lets the server bound how fast a "win" can be claimed and tie the
// Custom Night 4/20 unlock to a real, server-initiated session.
const nightSessionSchema = new mongoose.Schema(
    {
        user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        night:      { type: Number,  required: true },
        isCustom:   { type: Boolean, default: false },
        aiFreddy:   { type: Number,  default: null },
        aiBonnie:   { type: Number,  default: null },
        aiChica:    { type: Number,  default: null },
        aiFoxy:     { type: Number,  default: null },
        startedAt:  { type: Date,    default: Date.now },
        consumedAt: { type: Date,    default: null },
    },
    { timestamps: true }
);

// Auto-expire stale sessions after 2 hours so the collection doesn't grow.
nightSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });

export default mongoose.model('NightSession', nightSessionSchema);
