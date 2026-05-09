/**
 * Kangur Authentication - Password Utilities
 * 
 * Provides secure password hashing and verification routines using bcrypt,
 * specialized for Kangur learner authentication.
 */

import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

/**
 * Hashes a plaintext password using bcrypt.
 * 
 * @param {string} password - The plaintext password.
 * @returns {Promise<string>} The hashed password.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

/**
 * Verifies a plaintext password against a stored hash.
 * 
 * @param {string} password - The plaintext password to check.
 * @param {string} hash - The stored hash.
 * @returns {Promise<boolean>} True if the password matches.
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generates a random, UUID-based initial password for new learners.
 * 
 * @returns {string} A random password string.
 */
export const createLearnerPassword = (): string => randomUUID().replace(/-/g, '');
