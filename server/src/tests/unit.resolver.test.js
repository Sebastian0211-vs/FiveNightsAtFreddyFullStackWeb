import { describe, it, expect, vi } from 'vitest';
import { resolvers } from '../graphql/resolvers.js';

// UNIT TEST #2 — resolver logic (no DB, no network)
describe('updateProgress resolver', () => {
    it('throws when called unauthenticated', async () => {
        await expect(
            resolvers.Mutation.updateProgress(null, { night: 3 }, { user: null })
        ).rejects.toThrow(/authentif/i);
    });

    it('rejects out-of-range nights', async () => {
        const user = { furthestNight: 2, save: vi.fn() };
        await expect(
            resolvers.Mutation.updateProgress(null, { night: 99 }, { user })
        ).rejects.toThrow(/invalide/i);
        expect(user.save).not.toHaveBeenCalled();
    });

    it('updates furthestNight only when strictly greater', async () => {
        const user = { furthestNight: 2, save: vi.fn().mockResolvedValue() };
        await resolvers.Mutation.updateProgress(null, { night: 4 }, { user });
        expect(user.furthestNight).toBe(4);
        expect(user.save).toHaveBeenCalledOnce();

        user.save.mockClear();
        await resolvers.Mutation.updateProgress(null, { night: 1 }, { user });
        expect(user.furthestNight).toBe(4);
        expect(user.save).not.toHaveBeenCalled();
    });
});
