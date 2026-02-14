import { hashPassword, verifyPassword } from '../../src/utils/password.js';

describe('password utils', () => {
  test('hashPassword returns a different string', async () => {
    const hash = await hashPassword('Passw0rd!');

    expect(hash).toEqual(expect.any(String));
    expect(hash).not.toBe('Passw0rd!');
  });

  test('verifyPassword returns true for matching password', async () => {
    const plain = 'Passw0rd!';
    const hash = await hashPassword(plain);

    const result = await verifyPassword(plain, hash);

    expect(result).toBe(true);
  });

  test('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('Passw0rd!');

    const result = await verifyPassword('WrongPass1!', hash);

    expect(result).toBe(false);
  });
});
