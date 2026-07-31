const { blockchain } = require('../models');
const blockchainService = require('../services/blockchain.service');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { isValidAmount, sanitizeAmount, isValidSignature, sanitizeTimestamp } =
  require('../utils/validator');

/**
 * POST /api/transactions — submits a transaction that was signed in the browser.
 *
 * Body: `{ fromAddress, toAddress, amount, signature, timestamp }`.
 * A `privateKey` field is explicitly rejected: private keys must never leave
 * the client.
 *
 * @type {import('express').RequestHandler}
 */
const addTransaction = (req, res, next) => {
  try {
    const { fromAddress, toAddress, amount, signature, timestamp } = req.body;

    if (req.body.privateKey !== undefined) {
      return sendError(
        res,
        'Private keys must never be sent to the server. Sign the transaction client side.',
        400
      );
    }

    if (!isValidAmount(amount)) {
      return sendError(res, 'Amount must be a positive number', 400);
    }

    if (!isValidSignature(signature)) {
      return sendError(res, 'Signature must be a hex-encoded string', 400);
    }

    const signedAt = sanitizeTimestamp(timestamp);

    if (signedAt === null) {
      return sendError(res, 'Timestamp must be a millisecond epoch number', 400);
    }

    let transaction;

    try {
      transaction = blockchainService.addTransaction({
        fromAddress,
        toAddress,
        amount: sanitizeAmount(amount),
        signature,
        timestamp: signedAt,
      });
    } catch (error) {
      // Domain-level rejections (bad key, bad signature, bad amount) are the
      // client's fault, not a server fault.
      return sendError(res, error.message, 400);
    }

    sendCreated(res, {
      message: 'Transaction added to pending pool',
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

/** @type {import('express').RequestHandler} */
const getPendingTransactions = (req, res) => {
  sendSuccess(res, {
    pendingTransactions: blockchain.pendingTransactions,
    count: blockchain.pendingTransactions.length,
  });
};

/** @type {import('express').RequestHandler} */
const getAllTransactions = (req, res) => {
  const transactions = blockchain.getAllTransactions();
  sendSuccess(res, { transactions, count: transactions.length });
};

module.exports = { addTransaction, getPendingTransactions, getAllTransactions };
