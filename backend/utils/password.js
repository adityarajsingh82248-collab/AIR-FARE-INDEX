import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares plaintext password with stored hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
