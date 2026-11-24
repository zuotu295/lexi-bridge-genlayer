# LexiBridge

A cooperative word ladder played by two wallet holders. Begin at **COLD** and reach **CARD** in at most eight accepted moves. Change one letter at a time and use a new dictionary word at each step.

- [Open the public playtest](https://zuotu295.github.io/lexi-bridge-genlayer/)
- [Stable Studionet V2 acceptance evidence](EVIDENCE_V2.md)
- [Historical Stable Studionet V1 evidence](EVIDENCE.md)

## Wallets and seats

Connect MetaMask, OKX Wallet or another compatible injected wallet through EIP-6963 discovery and the selected provider's EIP-1193 account/signing methods. The app adds or switches to Stable Studionet (chain 61999) through the wallet's network RPC methods; it does not call MetaMask Snap APIs or require Snap installation. The wallet approves transactions, and the application never receives or stores its private key. A second distinct wallet can occupy the other seat in the same browser. After reload or on another device, reconnect the same wallet address; the host/guest assignments and current turn are read from chain.

A temporary faucet-funded test wallet remains available for demonstrations. Its key exists only in tab memory and cannot be recovered after closing or reloading the page. If a player loses access to the private key assigned to a seat, the application cannot recover it or change the on-chain seat.

## Dictionary versions

The original deployed contract is V1 and uses the Datamuse English vocabulary API. Its exact source is preserved at `contracts/lexi_bridge_v1.py` so the read-only verifier can compare the historical deployment byte-for-byte. Existing tables continue to execute their original deployed code.

New tables use V2 at `contracts/lexi_bridge.py`, which queries the English Wiktionary MediaWiki Action API. The contract requests page metadata only; it does not download or store definitions. A matching main-namespace page with a page ID is verified. A page marked `missing` or `invalid` is an unknown word. HTTP errors, malformed responses and transport failures are unavailable evidence and cannot advance the board. Validators independently query the API and compare the normalized verdict through GenLayer strict equivalence.

Wiktionary coverage and service availability are external dependencies and are not guaranteed. A page-existence check confirms that an entry page exists; it does not judge whether a word is common, appropriate for a particular dialect, or suitable in every context. Datamuse has announced that unauthenticated access ends on February 1, 2027; V2 uses Wiktionary for new tables. See the [MediaWiki query API](https://www.mediawiki.org/wiki/API:Query) and [English Wiktionary](https://en.wiktionary.org/).

## Game rules

The contract checks the signer, phase, expected board word, single-letter change and reuse rule before querying the dictionary. Verified words advance the shared board and hand over the move. Unknown words consume an attempt while leaving the current word and turn unchanged. Missing or malformed dictionary evidence cannot be treated as an invalid word. Reaching the target seals the ladder in SOLVED. The game has an eight valid-move limit and 32 total-attempt limit. There are no prizes or entry charges.

## Run and verify

Node.js 24, Vue 3, Vite and GenLayerJS 2.0.0. The application targets Stable Studionet (61999).

    npm ci
    npm test
    npm run build
    python -m unittest discover -s tests
    npm run verify

`npm run verify` is read-only and verifies both deployed V1 and V2 sources, finalized receipts, lexical consensus outputs and final boards. To deploy and test a fresh V2 table, run `STUDIONET_FAUCET=1 npm run test:studionet`. This submits real Studionet transactions using disposable test wallets.
