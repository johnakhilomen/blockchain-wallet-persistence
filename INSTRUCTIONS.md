# Blockchain HomeTask — Applicant Instructions

## Overview

You have been given a working blockchain application with a professional layered backend
(Express) and a React frontend. Your job is to extend it with the two features below.

Read the codebase before you start — understanding the existing structure is part of
what we are evaluating.

**Time budget: 1–2 hours.**

---

## Phase 1 — Setup & Code Comprehension

```bash
npm install
cp .env.example .env   # then edit .env if you need different ports
```

```bash
# Terminal 1 — API server (port 3002, auto-reload)
npm run dev

# Terminal 2 — React dev server (port 3000)
npm start
```

Open `http://localhost:3000` and verify the UI loads correctly.

### Understand the architecture before coding

| Layer | Location | Purpose |
|---|---|---|
| Config | `config/index.js` | All env-driven settings |
| Domain models | `models/blockchain.js` | Block, Transaction, Blockchain classes |
| Singleton | `models/index.js` | Single shared blockchain instance |
| Utilities | `utils/` | Logger, response builder, validators |
| Middleware | `middleware/` | CORS, request logging, error handler, rate limiter, body validation |
| Routes | `routes/` | One file per resource |
| Controllers | `controllers/` | Business logic called by routes |
| API client | `src/api/` | All frontend HTTP calls go through here |
| Hooks | `src/hooks/` | `useBlockchain` polls the API and owns state |

Be ready to walk through the code in the interview and explain any part of it.

---

## Task 1 — Cryptographic Wallet System

**Goal:** Replace plain-string addresses with real cryptographic wallets.

### Backend

- [ ] Add `POST /api/wallets` — generates and returns a new `{ publicKey, privateKey }` key pair
  - Use Node.js built-in `crypto.generateKeyPairSync` with curve `secp256k1` (or `ec` type)
- [ ] Implement `Transaction.signTransaction(signingKey)` — signs the transaction hash with the private key
- [ ] Implement `Transaction.isValid()` properly — **remove the current demo bypass** (the `return true` shortcut)
- [ ] Update `Blockchain.addTransaction()` to reject any unsigned transaction

### Frontend

- [ ] Create a `Wallet` component that:
  - Calls `POST /api/wallets` to generate a key pair
  - Displays the public key (wallet address) and balance fetched from `GET /api/balance/:address`
  - Stores the private key in local component state (never sent back to the server)
- [ ] Update `TransactionForm` so it signs the transaction with the stored private key before submitting

### Rules

- Add the new endpoint following the existing `routes/` → `controllers/` pattern
- Use `utils/response.js` (`sendSuccess` / `sendError`) for all responses
- Use `validateBody` middleware on the new route where applicable

---

## Task 2 — Blockchain Persistence

**Goal:** Blockchain state must survive server restarts.

### What to build

- [ ] Create `services/persistence.service.js` with three functions:
  - `save(blockchain)` — serialises and writes the chain + pending transactions to disk
  - `load()` — reads and deserialises the saved state; returns `null` if no file exists
  - `clear()` — deletes the saved state (useful for testing)
- [ ] Update `models/index.js` to call `load()` on startup — if a saved state exists, restore it instead of seeding demo data
- [ ] Call `save()` automatically after every successful mine and after every new transaction is added
- [ ] Handle all edge cases gracefully:
  - File does not exist → start fresh, no crash
  - File is corrupt / invalid JSON → log a warning, start fresh, no crash
  - Loaded chain fails `isChainValid()` → log a warning, start fresh

### Storage format

Use a plain JSON file (`blockchain.json` in the project root, already gitignored). Document
the shape of the file in a JSDoc comment at the top of `persistence.service.js`.

### Rules

- All file I/O errors must be caught — the server must never crash due to a persistence failure
- Use `utils/logger.js` to log save, load, and error events
- Do **not** add persistence logic directly in `server.js` or any controller

---

## Phase 3 — Documentation

- [ ] Add a `## Changes` section to `README.md` describing what you built and any new env vars
- [ ] Add JSDoc comments to every new function and class you write
- [ ] Note any known limitations or trade-offs at the bottom of your `README.md` changes
