const fs = require('fs');
const path = require('path');

const config = require('../config');
const logger = require('../utils/logger');

/**
 * Blockchain persistence — a single plain JSON file in the project root
 * (`blockchain.json` by default, override with `PERSISTENCE_FILE`).
 *
 * File shape:
 *
 * {
 *   "version": 1,
 *   "savedAt": "2026-07-30T12:00:00.000Z",
 *   "difficulty": 2,
 *   "miningReward": 100,
 *   "chain": [
 *     {
 *       "timestamp": 1753876800000,
 *       "transactions": [
 *         {
 *           "fromAddress": "-----BEGIN PUBLIC KEY-----\n...",  // null for a mining reward
 *           "toAddress":   "-----BEGIN PUBLIC KEY-----\n...",
 *           "amount": 100,
 *           "timestamp": 1753876800000,
 *           "signature": "3045022100..."                        // hex DER, "" for a reward
 *         }
 *       ],
 *       "previousHash": "0",
 *       "nonce": 0,
 *       "hash": "00a1b2..."
 *     }
 *   ],
 *   "pendingTransactions": [ /* same transaction shape *\/ ]
 * }
 *
 * Every function here is total: I/O and parse failures are logged and swallowed
 * so that a persistence problem can never take the server down.
 */

const SCHEMA_VERSION = 1;

const FILE_PATH = path.isAbsolute(config.persistence.file)
  ? config.persistence.file
  : path.join(process.cwd(), config.persistence.file);

/**
 * Serialises the chain + pending pool and writes it to disk.
 *
 * The write goes to a temporary file first and is then renamed over the target,
 * so a crash mid-write cannot leave a half-written (corrupt) state file behind.
 *
 * @param {import('../models/blockchain').Blockchain} blockchain
 * @returns {boolean} true when the state was written
 */
function save(blockchain) {
  if (!config.persistence.enabled) {
    return false;
  }

  const tempPath = `${FILE_PATH}.tmp`;

  try {
    const data = {
      version: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      difficulty: blockchain.difficulty,
      miningReward: blockchain.miningReward,
      chain: blockchain.chain,
      pendingTransactions: blockchain.pendingTransactions,
    };

    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    fs.renameSync(tempPath, FILE_PATH);

    logger.debug(
      `Blockchain state saved (${data.chain.length} blocks, ` +
        `${data.pendingTransactions.length} pending)`
    );

    return true;
  } catch (error) {
    logger.error(`Failed to save blockchain state: ${error.message}`);

    // Best effort cleanup; a stale .tmp must not break the next save.
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }

    return false;
  }
}

/**
 * Reads and parses the saved state.
 *
 * @returns {object|null} the parsed state, or null when there is no usable file
 *   (missing, unreadable, invalid JSON, or structurally wrong)
 */
function load() {
  if (!config.persistence.enabled) {
    logger.info('Persistence is disabled; starting with a fresh chain');
    return null;
  }

  try {
    if (!fs.existsSync(FILE_PATH)) {
      logger.info(`No persistence file at ${FILE_PATH}; starting fresh`);
      return null;
    }

    const parsed = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));

    if (!parsed || !Array.isArray(parsed.chain) || parsed.chain.length === 0) {
      logger.warn('Persistence file has an unexpected shape; starting fresh');
      return null;
    }

    if (parsed.version !== undefined && parsed.version !== SCHEMA_VERSION) {
      logger.warn(
        `Persistence file version ${parsed.version} != ${SCHEMA_VERSION}; starting fresh`
      );
      return null;
    }

    logger.info(`Blockchain state loaded from ${FILE_PATH}`);

    return parsed;
  } catch (error) {
    logger.warn(`Failed to load blockchain state: ${error.message}. Starting fresh.`);

    return null;
  }
}

/**
 * Deletes the saved state. Useful for tests and for recovering from a bad file.
 *
 * @returns {boolean} true when a file was removed
 */
function clear() {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      return false;
    }

    fs.unlinkSync(FILE_PATH);
    logger.info('Blockchain persistence cleared');

    return true;
  } catch (error) {
    logger.error(`Failed to clear blockchain persistence: ${error.message}`);

    return false;
  }
}

module.exports = { save, load, clear, FILE_PATH, SCHEMA_VERSION };
