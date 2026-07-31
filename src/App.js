import React, { useCallback, useState } from 'react';
import './App.css';

import BlockchainViewer from './components/BlockchainViewer';
import TransactionForm from './components/TransactionForm';
import StatsPanel from './components/StatsPanel';
import Header from './components/Header';
import Wallet from './components/Wallet';

import useBlockchain from './hooks/useBlockchain';
import { mineBlock } from './api/blockchain.api';

function App() {
  const { chain, stats, loading, error, refresh } = useBlockchain();
  // Held in memory only. The Wallet component generates it; the transaction
  // form signs with it. It is never persisted and never sent to the server.
  const [wallet, setWallet] = useState(null);
  const [mineError, setMineError] = useState('');

  const handleWalletChange = useCallback((next) => {
    setWallet(next);
  }, []);

  const handleMine = async () => {
    setMineError('');

    try {
      // Mining rewards go to the current wallet when there is one, so the
      // balance shown in the wallet panel actually moves.
      await mineBlock(wallet?.publicKey || undefined);
      await refresh();
    } catch (err) {
      setMineError(err.message || 'Mining failed.');
    }
  };

  const bannerMessage = [error, mineError].filter(Boolean).join(' | ');
  const balanceRefreshToken = `${stats?.chainLength ?? 0}:${stats?.pendingTransactions ?? 0}`;

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading Blockchain...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <Header />
      <div className="app-container">
        {bannerMessage && (
          <div className="error-banner">
            <p>{bannerMessage}</p>
          </div>
        )}

        <div className="main-content">
          <div className="left-panel">
            <Wallet
              onWalletChange={handleWalletChange}
              refreshToken={balanceRefreshToken}
            />
            <StatsPanel stats={stats} onMine={handleMine} />
            <TransactionForm wallet={wallet} onTransactionAdded={refresh} />
          </div>

          <div className="right-panel">
            <BlockchainViewer blockchain={chain} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
