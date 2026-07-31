const crypto = require('crypto');

/**
 * secp256k1 key helpers.
 *
 * A wallet is an EC key pair on the secp256k1 curve:
 *   - public key  → SPKI / PEM. This IS the wallet address used on the chain.
 *   - private key → PKCS#8 / PEM, plus the raw 32-byte scalar as hex so the
 *     browser can sign without having to parse DER.
 *
 * Signatures are DER-encoded ECDSA over SHA-256, hex encoded — the format
 * produced by both `crypto.sign()` and `@noble/secp256k1`'s `toDERHex()`,
 * so a transaction signed in the browser verifies here unchanged.
 */

const CURVE = 'secp256k1';

/**
 * Normalises a PEM string that has travelled through JSON / a URL / a textarea.
 * Collapses CRLF and trims surrounding whitespace without touching the body.
 *
 * @param {string} pem
 * @returns {string}
 */
const normalizePem = (pem) => String(pem || '').replace(/\r\n/g, '\n').trim();

/**
 * True when the string looks like a PEM-encoded public key that Node can parse.
 *
 * @param {string} pem
 * @returns {boolean}
 */
const isValidPublicKey = (pem) => {
  const normalized = normalizePem(pem);

  if (!normalized.startsWith('-----BEGIN PUBLIC KEY-----')) {
    return false;
  }

  try {
    crypto.createPublicKey(normalized);
    return true;
  } catch {
    return false;
  }
};

/**
 * Generates a new secp256k1 wallet.
 *
 * @returns {{publicKey: string, privateKey: string, privateKeyHex: string}}
 *   `publicKey`/`privateKey` are PEM; `privateKeyHex` is the raw 32-byte
 *   scalar, provided so the frontend can sign locally.
 */
const generateWallet = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: CURVE,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return {
    publicKey,
    privateKey,
    privateKeyHex: privateKeyToHex(privateKey),
  };
};

/**
 * Extracts the raw private scalar from a PKCS#8 PEM private key.
 *
 * @param {string} pem PKCS#8 PEM private key
 * @returns {string} 64-character hex string (32 bytes, zero padded)
 */
const privateKeyToHex = (pem) => {
  const jwk = crypto.createPrivateKey(normalizePem(pem)).export({ format: 'jwk' });

  return Buffer.from(jwk.d, 'base64url').toString('hex').padStart(64, '0');
};

/**
 * Signs a message with a PEM private key.
 *
 * @param {string} message
 * @param {string} privateKeyPem PKCS#8 PEM private key
 * @returns {string} DER signature, hex encoded
 */
const sign = (message, privateKeyPem) =>
  crypto
    .sign('sha256', Buffer.from(message), normalizePem(privateKeyPem))
    .toString('hex');

/**
 * Verifies a hex DER signature against a PEM public key.
 * Never throws — a malformed key or signature is simply invalid.
 *
 * @param {string} message
 * @param {string} signatureHex
 * @param {string} publicKeyPem SPKI PEM public key
 * @returns {boolean}
 */
const verify = (message, signatureHex, publicKeyPem) => {
  try {
    return crypto.verify(
      'sha256',
      Buffer.from(message),
      normalizePem(publicKeyPem),
      Buffer.from(signatureHex, 'hex')
    );
  } catch {
    return false;
  }
};

module.exports = {
  CURVE,
  normalizePem,
  isValidPublicKey,
  generateWallet,
  privateKeyToHex,
  sign,
  verify,
};
