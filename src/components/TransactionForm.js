import React, { useEffect, useState } from 'react';
import './TransactionForm.css';
import { addTransaction } from '../api/blockchain.api';

/**
 * Create-transaction panel.
 *
 * The sender is always the wallet held by the parent, and the transaction is
 * signed in the browser (see `src/utils/crypto.js`) before submission — the
 * request carries the signature, never the private key.
 *
 * @param {object} props
 * @param {{publicKey: string, privateKeyHex: string}|null} props.wallet
 * @param {() => void} [props.onTransactionAdded]
 */
const TransactionForm = ({ wallet, onTransactionAdded }) => {
  const [formData, setFormData] = useState({
    fromAddress: '',
    toAddress: '',
    amount: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const hasWallet = Boolean(wallet?.publicKey && wallet?.privateKeyHex);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      fromAddress: wallet?.publicKey || '',
    }));
  }, [wallet?.publicKey]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!hasWallet) {
      setMessage('Generate a wallet before creating a transaction.');
      return;
    }

    setLoading(true);

    try {
      await addTransaction({
        fromAddress: formData.fromAddress,
        toAddress: formData.toAddress,
        amount: formData.amount,
        privateKeyHex: wallet.privateKeyHex,
      });

      setMessage('Transaction signed and added successfully!');
      setFormData((prev) => ({ ...prev, toAddress: '', amount: '' }));

      if (onTransactionAdded) {
        onTransactionAdded();
      }
    } catch (err) {
      setMessage(err.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-form">
      <h2 className="panel-title">Create Transaction</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fromAddress">From Address</label>
          <textarea
            id="fromAddress"
            name="fromAddress"
            value={formData.fromAddress}
            rows={4}
            readOnly
            placeholder="Generate a wallet to auto-fill sender address"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="toAddress">To Address</label>
          <textarea
            id="toAddress"
            name="toAddress"
            value={formData.toAddress}
            onChange={handleChange}
            rows={4}
            placeholder="Paste receiver public key (PEM format)"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="e.g., 100"
            step="0.01"
            min="0"
            required
          />
        </div>

        {message && (
          <div className={`form-message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <button type="submit" className="submit-button" disabled={loading || !hasWallet}>
          {loading ? 'Signing...' : 'Sign & Add Transaction'}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
