const keys = require('./keys');

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * A wallet address is a PEM-encoded secp256k1 public key.
 *
 * @param {string} address
 * @returns {boolean}
 */
const isValidAddress = (address) => keys.isValidPublicKey(address);

const isValidAmount = (amount) => {
  const parsed = parseFloat(amount);
  return !isNaN(parsed) && isFinite(parsed) && parsed > 0;
};

/**
 * A signature is a hex-encoded DER ECDSA signature (~140 hex chars).
 *
 * @param {string} signature
 * @returns {boolean}
 */
const isValidSignature = (signature) =>
  isNonEmptyString(signature) && /^[0-9a-fA-F]+$/.test(signature.trim());

const sanitizeAddress = (address) => keys.normalizePem(address);

const sanitizeAmount = (amount) => parseFloat(amount);

/**
 * Coerces a client-supplied signing timestamp to a millisecond epoch number.
 *
 * @param {unknown} timestamp
 * @returns {number|null} null when the value is not a usable timestamp
 */
const sanitizeTimestamp = (timestamp) => {
  const parsed = Number(timestamp);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.trunc(parsed);
};

module.exports = {
  isNonEmptyString,
  isValidAddress,
  isValidAmount,
  isValidSignature,
  sanitizeAddress,
  sanitizeAmount,
  sanitizeTimestamp,
};
