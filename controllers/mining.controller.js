const { blockchain } = require('../models');
const blockchainService = require('../services/blockchain.service');
const { sendSuccess } = require('../utils/response');
const { isNonEmptyString, sanitizeAddress } = require('../utils/validator');

/**
 * POST /api/mine — mines the pending pool into a new block.
 *
 * Body: `{ miningRewardAddress }` — normally the caller's wallet public key.
 * Falls back to the configured miner address when omitted.
 *
 * @type {import('express').RequestHandler}
 */
const mineBlock = (req, res, next) => {
  try {
    const { miningRewardAddress } = req.body;

    const rewardAddress = isNonEmptyString(miningRewardAddress)
      ? sanitizeAddress(miningRewardAddress)
      : 'miner1';

    const block = blockchainService.mineBlock(rewardAddress);

    sendSuccess(res, {
      message: 'Block mined successfully',
      latestBlock: block,
      chainLength: blockchain.chain.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { mineBlock };
