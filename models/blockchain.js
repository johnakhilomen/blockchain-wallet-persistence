const crypto = require('crypto');

const keys = require('../utils/keys');

/**
 * A single block in the chain.
 */
class Block {
  /**
   * @param {number} timestamp
   * @param {Transaction[]} transactions
   * @param {string} previousHash
   */
  constructor(timestamp, transactions, previousHash = '') {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.previousHash +
          this.timestamp +
          JSON.stringify(this.transactions) +
          this.nonce
      )
      .digest('hex');
  }

  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join('0');

    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }

  /**
   * @returns {boolean} true when every transaction in the block is valid.
   */
  hasValidTransactions() {
    return this.transactions.every((tx) => tx.isValid());
  }
}

/**
 * A value transfer between two wallet addresses (secp256k1 public keys).
 * A transaction with `fromAddress === null` is a mining reward (coinbase) and
 * is the only kind that may be unsigned.
 */
class Transaction {
  /**
   * @param {string|null} fromAddress PEM public key of the sender, null for a reward
   * @param {string} toAddress PEM public key of the recipient
   * @param {number} amount
   */
  constructor(fromAddress, toAddress, amount) {
    // Addresses are canonicalised on the way in so that the signed hash, the
    // stored chain and balance lookups all agree on one form of the PEM.
    this.fromAddress = fromAddress ? keys.normalizePem(fromAddress) : null;
    this.toAddress = keys.normalizePem(toAddress);
    this.amount = amount;
    this.timestamp = Date.now();
    this.signature = '';
  }

  /**
   * The payload that gets signed. `timestamp` is part of it, so a signature
   * cannot be lifted onto a different transaction.
   *
   * @returns {string} sha256 hex digest
   */
  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(this.fromAddress + this.toAddress + this.amount + this.timestamp)
      .digest('hex');
  }

  /**
   * Signs this transaction with a PEM private key.
   *
   * Used by the demo seeder and by the test script. Transactions coming from
   * the UI are signed in the browser — the server never sees a private key.
   *
   * @param {string} signingKey PKCS#8 PEM private key
   * @throws {Error} if the key is missing, this is a reward transaction, or the
   *   key does not belong to `fromAddress`
   */
  signTransaction(signingKey) {
    if (!signingKey) {
      throw new Error('Private key is required to sign the transaction');
    }

    if (!this.fromAddress) {
      throw new Error('Cannot sign mining reward transactions');
    }

    this.signature = keys.sign(this.calculateHash(), signingKey);

    if (!this.isValid()) {
      this.signature = '';
      throw new Error('You cannot sign transactions for other wallets');
    }
  }

  /**
   * Attaches a signature produced elsewhere (i.e. in the browser). The value is
   * not trusted here — `isValid()` is what enforces it.
   *
   * @param {string} signature DER signature, hex encoded
   */
  setSignature(signature) {
    this.signature = String(signature || '').trim();
  }

  /**
   * Verifies the signature against `fromAddress`.
   *
   * Returns false rather than throwing, so that validating a restored (and
   * possibly tampered) chain can never crash the server.
   *
   * @returns {boolean}
   */
  isValid() {
    // Mining rewards are minted by the chain itself and carry no signature.
    if (this.fromAddress === null) {
      return true;
    }

    if (!this.signature) {
      return false;
    }

    return keys.verify(this.calculateHash(), this.signature, this.fromAddress);
  }
}

/**
 * The chain itself: blocks, the pending pool, and the rules governing both.
 * Persistence is layered on top of this class rather than baked into it —
 * see `services/blockchain.service.js`.
 */
class Blockchain {
  /**
   * @param {number} [difficulty]
   * @param {number} [miningReward]
   */
  constructor(difficulty, miningReward) {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = difficulty || 2;
    this.pendingTransactions = [];
    this.miningReward = miningReward || 100;
  }

  createGenesisBlock() {
    return new Block(Date.now(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Mines every pending transaction into a new block and pays the reward.
   *
   * @param {string} miningRewardAddress address credited with the block reward
   * @returns {Block} the block that was mined
   */
  minePendingTransactions(miningRewardAddress) {
    const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);

    const block = new Block(
      Date.now(),
      [...this.pendingTransactions, rewardTx],
      this.getLatestBlock().hash
    );
    block.mineBlock(this.difficulty);

    this.chain.push(block);
    this.pendingTransactions = [];

    return block;
  }

  /**
   * Adds a transaction to the pending pool after validating it.
   *
   * @param {Transaction} transaction
   * @throws {Error} if the transaction is incomplete, has a non-positive
   *   amount, is unsigned, or is signed by the wrong key
   */
  addTransaction(transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }

    if (transaction.amount <= 0) {
      throw new Error('Transaction amount should be higher than 0');
    }

    if (!transaction.signature) {
      throw new Error('Cannot add an unsigned transaction');
    }

    if (!transaction.isValid()) {
      throw new Error('Cannot add invalid transaction');
    }

    this.pendingTransactions.push(transaction);
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) balance -= trans.amount;
        if (trans.toAddress === address) balance += trans.amount;
      }
    }

    return balance;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (!current.hasValidTransactions()) return false;
      if (current.hash !== current.calculateHash()) return false;
      if (current.previousHash !== previous.hash) return false;
    }

    return true;
  }

  getAllTransactions() {
    return this.chain.flatMap((block) => block.transactions);
  }
}

module.exports = { Blockchain, Block, Transaction };
