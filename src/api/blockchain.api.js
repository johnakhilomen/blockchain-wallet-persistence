import client from './client';
import ENDPOINTS from './endpoints';
import { signTransaction } from '../utils/crypto';

export const fetchChain = () => client.get(ENDPOINTS.CHAIN);

export const fetchChainValidity = () => client.get(ENDPOINTS.CHAIN_VALID);

export const fetchStats = () => client.get(ENDPOINTS.STATS);

export const fetchPendingTransactions = () =>
  client.get(ENDPOINTS.TRANSACTIONS_PENDING);

export const fetchAllTransactions = () =>
  client.get(ENDPOINTS.TRANSACTIONS_ALL);

/**
 * Signs a transaction locally and submits the signature.
 *
 * Only the public data plus the signature crosses the network — the private key
 * stays in this browser tab.
 *
 * @param {object} params
 * @param {string} params.fromAddress sender PEM public key
 * @param {string} params.toAddress recipient PEM public key
 * @param {number|string} params.amount
 * @param {string} params.privateKeyHex raw hex private key held in component state
 * @returns {Promise<object>} API response
 */
export const addTransaction = ({ fromAddress, toAddress, amount, privateKeyHex }) => {
  const payload = {
    fromAddress: fromAddress.trim(),
    toAddress: toAddress.trim(),
    amount: Number(amount),
    timestamp: Date.now(),
  };

  const signature = signTransaction(payload, privateKeyHex);

  return client.post(ENDPOINTS.TRANSACTIONS, { ...payload, signature });
};

export const mineBlock = (miningRewardAddress = 'miner1') =>
  client.post(ENDPOINTS.MINE, { miningRewardAddress });

export const fetchBalance = (address) => client.get(ENDPOINTS.balance(address));

export const generateWallet = () => client.post(ENDPOINTS.WALLETS);

export const fetchDashboard = () =>
  Promise.all([fetchChain(), fetchStats()]).then(([chainData, statsData]) => ({
    chainData,
    statsData,
  }));
