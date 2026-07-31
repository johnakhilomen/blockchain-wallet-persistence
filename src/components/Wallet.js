import React, { useCallback, useEffect, useState } from 'react';
import './Wallet.css';

import { fetchBalance, generateWallet } from '../api/blockchain.api';
import { formatAmount } from '../utils/formatters';

/**
 * Wallet panel.
 *
 * Owns the key pair for the session: it calls `POST /api/wallets` to generate
 * one, keeps it in component state only (no localStorage, no sessionStorage,
 * and the private key is never sent back to the server), and reports the wallet
 * upward so the transaction form can sign with it.
 *
 * Balance comes from `GET /api/balance/:address` and is refreshed whenever
 * `refreshToken` changes — the parent passes chain stats through it, so the
 * balance follows new blocks.
 *
 * @param {object} props
 * @param {(wallet: object|null) => void} [props.onWalletChange]
 * @param {string|number} [props.refreshToken]
 */
const Wallet = ({ onWalletChange, refreshToken }) => {
	const [wallet, setWallet] = useState(null);
	const [balance, setBalance] = useState(null);
	const [showPrivate, setShowPrivate] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [balanceLoading, setBalanceLoading] = useState(false);
	const [error, setError] = useState('');
	const [copied, setCopied] = useState(false);

	const publicKey = wallet?.publicKey || '';
	const privateKey = wallet?.privateKey || '';
	const hasWallet = Boolean(publicKey);

	const handleGenerate = useCallback(async () => {
		setGenerating(true);
		setError('');

		try {
			const response = await generateWallet();
			const next = response?.wallet || null;

			if (!next?.publicKey || !next?.privateKeyHex) {
				throw new Error('Wallet response was incomplete');
			}

			setWallet(next);
			setShowPrivate(false);
			setBalance(null);

			if (onWalletChange) {
				onWalletChange(next);
			}
		} catch (err) {
			setError(err.message || 'Failed to generate wallet.');
		} finally {
			setGenerating(false);
		}
	}, [onWalletChange]);

	useEffect(() => {
		if (!publicKey) {
			setBalance(null);
			return;
		}

		let cancelled = false;

		const loadBalance = async () => {
			setBalanceLoading(true);

			try {
				const response = await fetchBalance(publicKey);
				if (!cancelled) setBalance(formatAmount(response?.balance ?? 0));
			} catch (err) {
				if (!cancelled) {
					setBalance(null);
					setError(err.message || 'Failed to fetch wallet balance.');
				}
			} finally {
				if (!cancelled) setBalanceLoading(false);
			}
		};

		loadBalance();

		return () => {
			cancelled = true;
		};
	}, [publicKey, refreshToken]);

	const handleCopy = async () => {
		if (!publicKey || !navigator?.clipboard?.writeText) return;

		try {
			await navigator.clipboard.writeText(publicKey);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			setError('Could not copy the address to the clipboard.');
		}
	};

	const displayBalance = balanceLoading ? '...' : balance ?? '0.00';

	return (
		<section className="wallet">
			<header className="wallet-header">
				<div>
					<h2 className="panel-title wallet-title">Wallet</h2>
					<p className="wallet-subtitle">Generate keys and track balances</p>
				</div>
				<button
					type="button"
					className="wallet-btn"
					onClick={handleGenerate}
					disabled={generating}
				>
					{generating ? 'Generating...' : 'Generate Wallet'}
				</button>
			</header>

			{error && <div className="wallet-error">{error}</div>}

			{!hasWallet && (
				<div className="wallet-empty">
					No wallet yet. Create a key pair to start sending and receiving transactions.
				</div>
			)}

			<div className="wallet-grid">
				<div className="wallet-card">
					<div className="wallet-label">Current Balance</div>
					<div className="wallet-balance">
						<span className="wallet-balance-value">{displayBalance}</span>
						<span className="wallet-unit">TOKEN</span>
					</div>
					<div className="wallet-meta">Synced with chain</div>
				</div>

				<div className="wallet-card">
					<div className="wallet-label">Public Address</div>
					<div className="wallet-address-row">
						<span className={`wallet-address ${publicKey ? '' : 'is-empty'}`}>
							{publicKey || 'Generate a wallet to get an address'}
						</span>
						<button
							type="button"
							className="wallet-btn wallet-btn--ghost"
							onClick={handleCopy}
							disabled={!publicKey}
						>
							{copied ? 'Copied' : 'Copy'}
						</button>
					</div>
					<div className="wallet-hint">
						Use this address to receive mining rewards.
					</div>
				</div>
			</div>

			<div className="wallet-keys">
				<div className="wallet-key">
					<div className="wallet-label">Public Key</div>
					<div className={`wallet-key-value ${publicKey ? '' : 'is-empty'}`}>
						{publicKey || 'Not generated'}
					</div>
				</div>

				<div className="wallet-key">
					<div className="wallet-label">Private Key</div>
					<div
						className={`wallet-key-value ${showPrivate ? '' : 'is-blurred'} ${
							privateKey ? '' : 'is-empty'
						}`}
					>
						{privateKey || 'Not generated'}
					</div>
					<button
						type="button"
						className="wallet-btn wallet-btn--ghost"
						onClick={() => setShowPrivate((prev) => !prev)}
						disabled={!privateKey}
					>
						{showPrivate ? 'Hide Key' : 'Reveal Key'}
					</button>
				</div>
			</div>

			<div className="wallet-note">
				Your private key stays in this browser tab — it is used to sign transactions
				locally and is never sent to the server. It is lost on refresh.
			</div>
		</section>
	);
};

export default Wallet;
