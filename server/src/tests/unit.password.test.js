import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';

// UNIT TEST #1  password hashing round-trip
describe('password hashing', () => {
    it('hashes a password and verifies it', async () => {
        const plain = 'correct-horse-battery';
        const hash = await bcrypt.hash(plain, 8);

        expect(hash).not.toEqual(plain);
        expect(await bcrypt.compare(plain, hash)).toBe(true);
        expect(await bcrypt.compare('wrong', hash)).toBe(false);
    });
});
