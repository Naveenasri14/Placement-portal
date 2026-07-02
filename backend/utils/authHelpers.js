const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Hash password with bcryptjs
 * @param {string} password 
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare plain text password with hashed password
 * @param {string} password 
 * @param {string} hashed 
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hashed) => {
  return await bcrypt.compare(password, hashed);
};

/**
 * Generate a JWT token containing userId and role
 * @param {string} userId 
 * @param {string} role 
 * @returns {string}
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'fallback_secret_key_123',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken
};
