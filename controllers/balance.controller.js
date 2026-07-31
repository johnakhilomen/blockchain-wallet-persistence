const { blockchain } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const { isNonEmptyString, sanitizeAddress } = require('../utils/validator');

/**
 * GET /api/balance/:address — confirmed balance of an address.
 *
 * Read-only, so any non-empty address is accepted rather than only well-formed
 * public keys: legacy/plain miner addresses in older blocks stay queryable.
 *
 * @type {import('express').RequestHandler}
 */
const getBalance = (req, res) => {
  const address = sanitizeAddress(req.params.address);

  if (!isNonEmptyString(address)) {
    return sendError(res, 'Invalid wallet address', 400);
  }

  const balance = blockchain.getBalanceOfAddress(address);

  sendSuccess(res, { address, balance });
};

module.exports = { getBalance };
