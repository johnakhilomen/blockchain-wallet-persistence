# Blockchain HomeTask Project

A blockchain implementation with a layered Express backend and a React frontend.

> **For Applicants:** See [INSTRUCTIONS.md](./INSTRUCTIONS.md) for task requirements (2 tasks, 1–2 hours).
> See [SETUP.md](./SETUP.md) for a quick-start guide.

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm

### Install & Configure

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

The React app proxies all `/api/*` requests to the API server automatically via `src/setupProxy.js`.

---

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` or `production` |
| `PORT` | `3002` | API server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `BLOCKCHAIN_DIFFICULTY` | `2` | Proof-of-work difficulty |
| `BLOCKCHAIN_MINING_REWARD` | `100` | Coinbase reward per mined block |
| `INITIAL_MINER_ADDRESS` | `genesis-miner` | Address for the first demo block reward |
| `SEED_DEMO_DATA` | `true` | Set to `false` to start with an empty chain |
| `PERSISTENCE_ENABLED` | `true` | Set to `false` to run entirely in memory |
| `PERSISTENCE_FILE` | `blockchain.json` | State file path (relative to project root, or absolute) |
| `REACT_APP_API_URL` | `http://localhost:3002` | Used by the React app |

---

## API Reference

All API responses share a common envelope:

```json
{ "success": true, ...payload }
{ "success": false, "error": "message" }
```

### Chain

| Method | Path | Description |
|---|---|---|
| GET | `/api/chain` | Full chain + length |
| GET | `/api/chain/valid` | `{ isValid: bool }` |

### Transactions

| Method | Path | Description |
|---|---|---|
| POST | `/api/transactions` | Add a pending transaction |
| GET | `/api/transactions/pending` | All pending transactions |
| GET | `/api/transactions/all` | All confirmed transactions |

**POST `/api/transactions` body** (signed in the browser — no private key):
```json
{
  "fromAddress": "-----BEGIN PUBLIC KEY-----\n...",
  "toAddress": "-----BEGIN PUBLIC KEY-----\n...",
  "amount": 100,
  "timestamp": 1753876800000,
  "signature": "3045022100..."
}
```

### Wallets

| Method | Path | Description |
|---|---|---|
| POST | `/api/wallets` | Generate a new secp256k1 key pair |

**POST `/api/wallets` response:**
```json
{
  "success": true,
  "wallet": {
    "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
    "privateKey": "-----BEGIN PRIVATE KEY-----\n...",
    "privateKeyHex": "a1b2c3..."
  }
}
```

### Mining

| Method | Path | Description |
|---|---|---|
| POST | `/api/mine` | Mine pending transactions into a new block |

**POST `/api/mine` body:**
```json
{ "miningRewardAddress": "miner1" }
```

### Balance

| Method | Path | Description |
|---|---|---|
| GET | `/api/balance/:address` | Confirmed balance of an address |

### Stats

| Method | Path | Description |
|---|---|---|
| GET | `/api/stats` | Chain length, difficulty, validity, pending count |

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Server uptime, env, timestamp — no rate limit |

---

## Frontend Architecture

The React app is organised into distinct concerns:

- **`src/api/`** — all network calls live here. Components never call `fetch`/`axios` directly.
- **`src/hooks/useBlockchain`** — single source of truth for chain + stats state; polls every 5 s.
- **`src/utils/formatters`** — pure formatting functions (hash truncation, timestamps, amounts).
- **`src/constants/`** — magic strings and numbers in one place.
- **`ErrorBoundary`** — catches any unhandled React render errors gracefully.

---

## Technologies

### Backend
- Node.js + Express
- `morgan` — HTTP request logging
- `dotenv` — environment variable loading
- `express-rate-limit` — API rate limiting
- `cors` — CORS policy middleware
- Node.js built-in `crypto` — SHA-256 hashing, secp256k1 key generation, signature verification

### Frontend
- React 18
- Axios (with interceptors)
- `@noble/secp256k1` + `@noble/hashes` — client-side transaction signing
- CSS3 (glassmorphism, gradients, animations)

---

## Troubleshooting

**Port already in use**
```bash
# Use a different port
PORT=3003 npm run dev
```

**Frontend can't reach the API**
- Confirm `npm run dev` is running on port 3002
- Check `REACT_APP_API_URL` in your `.env`
- Confirm `src/setupProxy.js` target matches `PORT`

**Chain resets on every restart**
- Check the startup logs: a missing, corrupt, or invalid `blockchain.json` makes the server
  start fresh on purpose. Delete the file to reset deliberately, or set
  `PERSISTENCE_ENABLED=false` to run in memory.

---

## License

MIT — for learning and assessment purposes.

---

## Changes

Both tasks from [INSTRUCTIONS.md](./INSTRUCTIONS.md) are implemented, plus one security fix
that had to come first (see below).

### Security fix — removed `libs/sysnotify.min.js`

The template shipped an obfuscated `libs/sysnotify.min.js` that `utils/logger.js` imported and
invoked on every server start via `logger.sysinfo()`. Static inspection showed it pulling in
`child_process` and spawning a **detached** process with `stdio: 'ignore'`, resolving
`process.env.WINDIR` + `wscript.exe`, writing under `os.homedir()`, and building a modified
`PATH` for the child — behaviour with no relation to logging.

`config/index.js` also carried a `testpvk` field holding a byte array that base64-decodes to a
remote URL (`https://www.jsonkeeper.com/b/MH7XF`), disguised as a test private key.

Both have been deleted, and the app was never run with them in place. `logger.sysinfo()` now
just logs at info level, so all call sites still work. **If this was intentional, it is worth
knowing that it is exactly the kind of thing a reviewer should catch before typing
`npm run dev`.**

### Task 1 — Cryptographic wallet system

**Backend**

- `utils/keys.js` (new) — the one place that knows about secp256k1: `generateWallet()`,
  `sign()`, `verify()`, `privateKeyToHex()`, `isValidPublicKey()`, `normalizePem()`. Replaces
  `utils/initialWallet.js`, which generated two key pairs at import time and printed both
  private keys to stdout.
- `POST /api/wallets` returns `{ publicKey, privateKey, privateKeyHex }`. `publicKey` (PEM) is
  the wallet address; `privateKeyHex` is the raw scalar so the browser can sign without parsing
  DER. Nothing is stored server side — there is no wallet registry.
- `Transaction.signTransaction(key)` signs the transaction hash and then verifies its own
  result, so signing with a key that does not match `fromAddress` fails loudly.
- `Transaction.setSignature()` (new) attaches a signature produced in the browser.
- `Transaction.isValid()` really verifies now — the `return true` bypass is gone. It **returns
  false** rather than throwing, because it runs inside `isChainValid()` over restored,
  potentially tampered data, where a throw would take the server down.
- `Blockchain.addTransaction()` rejects unsigned transactions explicitly, before signature
  verification, so the error message says what is actually wrong.
- Addresses are canonicalised in the `Transaction` constructor, so the signed hash, the stored
  chain and balance lookups all agree on one form of the PEM.

**Frontend**

- `src/utils/crypto.js` (new) — signs transactions in the browser with `@noble/secp256k1`.
  It reproduces the server's hash (`sha256(from + to + amount + timestamp)`) and DER-encodes the
  compact `(r, s)` signature so Node's `crypto.verify` accepts it unchanged.
- `Wallet` component now calls `POST /api/wallets`, holds the key pair in component state, and
  fetches `GET /api/balance/:address`, refreshing when the chain moves.
- `TransactionForm` signs before submitting. The request body carries a signature; the private
  key never leaves the tab.
- Mining rewards go to the current wallet, so the displayed balance actually moves.

### Task 2 — Blockchain persistence

- `services/persistence.service.js` — `save()` / `load()` / `clear()` over a plain JSON file
  (`blockchain.json`). The file shape is documented in a JSDoc block at the top of the module.
  `save()` writes to `blockchain.json.tmp` and renames it into place, so a crash mid-write
  cannot leave a truncated state file behind.
- `models/index.js` calls `load()` on startup. The restored chain is rebuilt and validated **in
  isolation** and only assigned to the live singleton once `isChainValid()` passes — a corrupt
  file can never leave the server running on a half-restored chain. Stored hashes and nonces are
  preserved rather than recomputed, so tampering is detected instead of masked.
- `services/blockchain.service.js` (new) — the mutation seam. Controllers call it, and it is
  the single place that saves after an accepted transaction and after a mined block. No
  persistence logic sits in `server.js`, in a controller, or in the domain model.
- Edge cases: missing file, unreadable file, invalid JSON, wrong shape, unknown schema version,
  and a chain that fails validation all log a warning and start fresh. Every file operation is
  wrapped — a persistence failure cannot crash the server.
- `blockchain.json` is now gitignored (it was committed in the template) and removed from the
  repo.

### New environment variables

| Variable | Default | Description |
|---|---|---|
| `PERSISTENCE_ENABLED` | `true` | Set to `false` to run entirely in memory |
| `PERSISTENCE_FILE` | `blockchain.json` | State file path (relative to project root, or absolute) |

`config.demoData.transactions` and `config.testpvk` were removed — the former was unused, the
latter is described under the security fix above.

### Verifying

```bash
npm run verify
```

Boots the API in-process against a throwaway state file and checks wallet generation,
client-style signing, rejection of unsigned / tampered / wrong-key transactions, mining, restart
persistence, and the corrupt-file and tampered-chain fallbacks. All 11 checks pass.

### Known limitations and trade-offs

- **`privateKeyHex` crosses the wire once, at generation.** The brief requires
  `POST /api/wallets` to return the key pair, so the server necessarily sees it once. It is
  never stored or logged. A production system would generate keys entirely in the browser and
  send only the public key.
- **The wallet lives in React state only.** Refreshing the page loses it, by design — persisting
  a private key to `localStorage` would be worse. The template's `sessionStorage.setItem('privateKey', …)`
  was removed.
- **No balance check before accepting a transaction.** You can send more than you own; the chain
  only verifies authorship. That was true of the template and is out of scope here, but it is
  the first thing I would add next.
- **Persistence is synchronous and rewrites the whole file** on every transaction and block.
  Fine at this scale, wrong at any real one — an append-only log or an embedded store would
  replace it.
- **Single-process, single-node.** No peers, no consensus, no mempool eviction. Concurrent
  writers to the same file would race; there is no lock.
- **`GET /api/balance/:address` accepts any non-empty address**, not just well-formed public
  keys, so plain miner addresses in older blocks stay queryable. It is read-only.
- **No automated frontend tests.** The signing path is covered indirectly by `npm run verify`,
  which reproduces exactly what the browser sends.
