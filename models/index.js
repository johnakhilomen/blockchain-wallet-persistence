const config = require('../config');
const logger = require('../utils/logger');
const keys = require('../utils/keys');
const persistenceService = require('../services/persistence.service');

const { Blockchain, Block, Transaction } = require('./blockchain');

/**
 * The single shared blockchain instance.
 *
 * On startup we try to restore the chain from disk. If there is nothing to
 * restore — or what is on disk is unusable — we fall back to a fresh chain and,
 * when enabled, seed it with demo data.
 */
const blockchain = new Blockchain(
  config.blockchain.difficulty,
  config.blockchain.miningReward
);

/**
 * Rebuilds a Transaction instance from its plain JSON form.
 *
 * @param {object} data
 * @returns {Transaction}
 */
const deserializeTransaction = (data) => {
  const tx = new Transaction(data.fromAddress, data.toAddress, data.amount);

  tx.timestamp = data.timestamp;
  tx.signature = data.signature || '';

  return tx;
};

/**
 * Rebuilds a Block instance from its plain JSON form, preserving the stored
 * hash and nonce (recomputing them would mask tampering).
 *
 * @param {object} data
 * @returns {Block}
 */
const deserializeBlock = (data) => {
  const block = new Block(
    data.timestamp,
    (data.transactions || []).map(deserializeTransaction),
    data.previousHash
  );

  block.nonce = data.nonce;
  block.hash = data.hash;

  return block;
};

/**
 * Restores the singleton from the persisted state.
 *
 * The restored chain is assembled and validated in isolation and only assigned
 * to the live instance once it passes, so a corrupt or tampered file can never
 * leave the server running on a half-restored chain.
 *
 * @returns {boolean} true when the chain was restored
 */
const restoreBlockchain = () => {
  const savedState = persistenceService.load();

  if (!savedState) {
    return false;
  }

  try {
    const candidate = new Blockchain(
      savedState.difficulty ?? config.blockchain.difficulty,
      savedState.miningReward ?? config.blockchain.miningReward
    );

    candidate.chain = savedState.chain.map(deserializeBlock);
    candidate.pendingTransactions = (savedState.pendingTransactions || []).map(
      deserializeTransaction
    );

    if (!candidate.isChainValid()) {
      logger.warn('Restored blockchain failed validation. Starting fresh.');
      return false;
    }

    blockchain.chain = candidate.chain;
    blockchain.pendingTransactions = candidate.pendingTransactions;
    blockchain.difficulty = candidate.difficulty;
    blockchain.miningReward = candidate.miningReward;

    logger.info(
      `Blockchain restored: ${blockchain.chain.length} blocks, ` +
        `${blockchain.pendingTransactions.length} pending transactions`
    );

    return true;
  } catch (error) {
    logger.warn(`Failed to restore blockchain: ${error.message}. Starting fresh.`);

    return false;
  }
};

/**
 * Seeds a fresh chain with two signed demo transactions and mines them, so the
 * UI has something to show on a first run. The demo wallets are generated at
 * startup and their private keys are never logged or persisted.
 *
 * @returns {boolean} true when demo data was seeded
 */
const seedDemoData = () => {
  if (!config.demoData.enabled) {
    return false;
  }

  try {
    const walletA = keys.generateWallet();
    const walletB = keys.generateWallet();

    const first = new Transaction(walletA.publicKey, walletB.publicKey, 100);
    first.signTransaction(walletA.privateKey);

    const second = new Transaction(walletB.publicKey, walletA.publicKey, 50);
    second.signTransaction(walletB.privateKey);

    blockchain.addTransaction(first);
    blockchain.addTransaction(second);
    blockchain.minePendingTransactions(config.blockchain.initialMinerAddress);

    persistenceService.save(blockchain);

    logger.info('Seeded demo blockchain data');

    return true;
  } catch (error) {
    logger.error(`Failed to seed demo data: ${error.message}`);

    return false;
  }
};

if (!restoreBlockchain()) {
  seedDemoData();
}

module.exports = {
  blockchain,
  Blockchain,
  Block,
  Transaction,
};
