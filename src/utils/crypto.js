import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';

/**
 * Client-side transaction signing.
 *
 * This module is the reason the private key never leaves the browser: the
 * wallet's raw scalar is used here to produce an ECDSA signature that the API
 * verifies with the public key it already has.
 *
 * Two details make the signature interoperable with the Node backend:
 *   1. The backend calls `crypto.verify('sha256', Buffer.from(hashHex), ...)`,
 *      so the message we sign is the *hex string* of the transaction hash and
 *      the digest we hand to secp256k1 is sha256 of those ASCII bytes.
 *   2. Node expects a DER-encoded signature; @noble/secp256k1 v2 only emits the
 *      compact (r, s) form, so `toDerHex` re-encodes it.
 */

// @noble/secp256k1 v2 needs an HMAC-SHA256 implementation injected for
// synchronous (RFC 6979 deterministic) signing.
secp.etc.hmacSha256Sync = (key, ...messages) =>
  hmac(sha256, key, secp.etc.concatBytes(...messages));

const encoder = new TextEncoder();

/**
 * Encodes a single DER INTEGER (minimal length, sign-padded).
 *
 * @param {bigint} value
 * @returns {number[]} DER bytes
 */
const derInteger = (value) => {
  let hex = value.toString(16);
  if (hex.length % 2) hex = `0${hex}`;

  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }

  // Strip redundant leading zero bytes, then re-add one if the high bit is set
  // (DER INTEGERs are signed).
  while (bytes.length > 1 && bytes[0] === 0 && bytes[1] < 0x80) bytes.shift();
  if (bytes[0] & 0x80) bytes.unshift(0);

  return [0x02, bytes.length, ...bytes];
};

/**
 * Converts a compact (r, s) signature into a hex-encoded DER SEQUENCE.
 *
 * @param {bigint} r
 * @param {bigint} s
 * @returns {string} hex DER signature
 */
const toDerHex = (r, s) => {
  const body = [...derInteger(r), ...derInteger(s)];

  return [0x30, body.length, ...body]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * sha256 of a UTF-8 string, hex encoded.
 *
 * @param {string} value
 * @returns {string}
 */
export const sha256Hex = (value) =>
  Array.from(sha256(encoder.encode(value)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

/**
 * Recomputes the transaction hash exactly as `Transaction.calculateHash()` does
 * on the server: `sha256(fromAddress + toAddress + amount + timestamp)`.
 *
 * @param {{fromAddress: string, toAddress: string, amount: number, timestamp: number}} tx
 * @returns {string} hex digest
 */
export const calculateTransactionHash = ({ fromAddress, toAddress, amount, timestamp }) =>
  sha256Hex(`${fromAddress}${toAddress}${amount}${timestamp}`);

/**
 * Signs a transaction with the wallet's raw private scalar.
 *
 * @param {{fromAddress: string, toAddress: string, amount: number, timestamp: number}} tx
 * @param {string} privateKeyHex 64-character hex private key
 * @returns {string} hex DER ECDSA signature
 * @throws {Error} if the private key is missing or malformed
 */
export const signTransaction = (tx, privateKeyHex) => {
  if (!/^[0-9a-fA-F]{64}$/.test(String(privateKeyHex || ''))) {
    throw new Error('A valid wallet private key is required to sign');
  }

  const hash = calculateTransactionHash(tx);
  const signature = secp.sign(sha256(encoder.encode(hash)), privateKeyHex);

  return toDerHex(signature.r, signature.s);
};
