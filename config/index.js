require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3002,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  blockchain: {
    difficulty: parseInt(process.env.BLOCKCHAIN_DIFFICULTY, 10) || 2,
    miningReward: parseFloat(process.env.BLOCKCHAIN_MINING_REWARD) || 100,
    initialMinerAddress: process.env.INITIAL_MINER_ADDRESS || 'genesis-miner',
  },
  demoData: {
    enabled: process.env.SEED_DEMO_DATA !== 'false',
  },
  persistence: {
    enabled: process.env.PERSISTENCE_ENABLED !== 'false',
    file: process.env.PERSISTENCE_FILE || 'blockchain.json',
  },
};
