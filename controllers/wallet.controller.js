const { sendCreated } = require('../utils/response');
const keys = require('../utils/keys');
const logger = require('../utils/logger');

/**
 * POST /api/wallets — generates a new secp256k1 key pair.
 *
 * The key pair is generated here but never stored: there is no wallet registry
 * on the server, and the private key exists on this machine only for the
 * lifetime of the response. Holding it is the client's job.
 *
 * Response: `{ success, wallet: { publicKey, privateKey, privateKeyHex } }`,
 * where `publicKey` (PEM) doubles as the wallet address and `privateKeyHex` is
 * the raw 32-byte scalar the browser signs with.
 *
 * @type {import('express').RequestHandler}
 */
const generateWallet = (req, res, next) => {
  try {
    const wallet = keys.generateWallet();

    logger.info('Generated a new wallet key pair');

    sendCreated(res, { wallet });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateWallet };
