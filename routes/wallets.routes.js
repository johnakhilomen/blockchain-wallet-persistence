const { Router } = require('express');
const { writeLimiter } = require('../middleware/rateLimit.middleware');
const { generateWallet } = require('../controllers/wallet.controller');

const router = Router();

// Key generation is a write-ish operation (CPU bound), so it uses the stricter
// limiter. There is no request body to validate.
router.post('/', writeLimiter, generateWallet);

module.exports = router;
