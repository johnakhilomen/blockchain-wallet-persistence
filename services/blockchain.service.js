const { blockchain, Transaction } = require('../models');
const persistenceService = require('./persistence.service');
const keys = require('../utils/keys');
const logger = require('../utils/logger');

/**
 * Application service around the blockchain singleton.
 *
 * Everything that mutates chain state goes through here, which is what makes
 * "save after every successful mine and every accepted transaction" a single
 * rule in one place instead of something controllers have to remember.
 */

/**
 * Validates a browser-signed transaction and adds it to the pending pool.
 *
 * The signature is produced client side; only the public key, amount, timestamp
 * and signature reach the server. No private key is ever accepted.
 *
 * @param {object} input
 * @param {string} input.fromAddress sender PEM public key
 * @param {string} input.toAddress recipient PEM public key
 * @param {number} input.amount
 * @param {string} input.signature hex DER ECDSA signature
 * @param {number} input.timestamp millisecond timestamp used when signing
 * @returns {Transaction} the accepted transaction
 * @throws {Error} if the addresses are not valid public keys or the signature
 *   does not verify
 */
const addTransaction = ({ fromAddress, toAddress, amount, signature, timestamp }) => {
  if (!keys.isValidPublicKey(fromAddress) || !keys.isValidPublicKey(toAddress)) {
    throw new Error('Addresses must be secp256k1 public keys in PEM format');
  }

  // The Transaction constructor canonicalises both addresses.
  const transaction = new Transaction(fromAddress, toAddress, amount);

  transaction.timestamp = timestamp;
  transaction.setSignature(signature);

  blockchain.addTransaction(transaction);
  persistenceService.save(blockchain);

  logger.info(`Transaction accepted (amount ${amount})`);

  return transaction;
};

/**
 * Mines the pending pool into a new block and persists the result.
 *
 * @param {string} miningRewardAddress address credited with the block reward
 * @returns {import('../models/blockchain').Block} the mined block
 */
const mineBlock = (miningRewardAddress) => {
  const block = blockchain.minePendingTransactions(miningRewardAddress);

  persistenceService.save(blockchain);

  logger.info(`Block mined: ${block.hash}`);

  return block;
};

module.exports = { addTransaction, mineBlock };
