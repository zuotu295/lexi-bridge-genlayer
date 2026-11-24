# LexiBridge

A cooperative word ladder played by two wallet holders. Begin at **COLD** and reach **CARD** in at most eight accepted moves. Change one letter at a time and use a new dictionary word at each step.

- [Open the public playtest](https://zuotu295.github.io/lexi-bridge-genlayer/)
- [Historical Stable Studionet V1 evidence](EVIDENCE.md)

## Wallets and seats

Connect MetaMask, OKX Wallet or another compatible injected wallet through EIP-6963 discovery and EIP-1193 signing. The application connects the wallet to Stable Studionet (chain 61999), requests transaction approval from the wallet, and never receives or stores its private key. A second distinct wallet can occupy the other seat in the same browser. After reload or on another device, reconnect the same wallet address; the host/guest assignments and current turn are read from chain.

A temporary faucet-funded test wallet remains available for demonstrations. Its key exists only in tab memory and cannot be recovered after closing or reloading the page. If a player loses access to the private key assigned to a seat, the application cannot recover it or change the on-chain seat.

## Dictionary versions

The original deployed contract is V1 and uses the Datamuse English vocabulary API. Its exact source is preserved at `contracts/lexi_bridge_v1.py` so the read-only verifier can compare the historical deployment byte-for-byte. Existing tables continue to execute their original deployed code.

New tables use V2 at `contracts/lexi_bridge.py`, which queries the Free Dictionary API v2 endpoint: https://api.dictionaryapi.dev/api/v2/entries/en/{word}. Validators independently fetch the candidate and compare a normalized verdict through GenLayer strict equivalence. An exact returned headword is verified. An HTTP 404 response with the API's `No Definitions Found` result is a lexical rejection. HTTP 429/5xx responses, malformed data and transport failures are unavailable evidence and cannot advance the board. If validators disagree, the consensus check cannot advance state.

The Free Dictionary API is a public community service without an API key. Its availability, rate limits and vocabulary coverage are external dependencies and are not guaranteed. New tables are explicitly versioned by the source used at deployment. Datamuse has announced that unauthenticated access ends on February 1, 2027; V2 uses a different source for new tables. See the [Datamuse API notice](https://datamuse.com/api/) and [Free Dictionary API](https://dictionaryapi.dev/).

## Game rules

The contract checks the signer, phase, expected board word, single-letter change and reuse rule before querying the dictionary. Verified words advance the shared board and hand over the move. Unknown words consume an attempt while leaving the current word and turn unchanged. Missing or malformed dictionary evidence cannot be treated as an invalid word. Reaching the target seals the ladder in SOLVED. The game has an eight valid-move limit and 32 total-attempt limit. There are no prizes or entry charges.

## Run and verify

Node.js 24, Vue 3, Vite and GenLayerJS 2.0.0. The application targets Stable Studionet (61999).

    npm ci
    npm test
    npm run build
    python -m unittest discover -s tests
    npm run verify

`npm run verify` is read-only and verifies the historical V1 deployment against `contracts/lexi_bridge_v1.py`, its finalized receipts and final board. To deploy and test a fresh V2 table, run `STUDIONET_FAUCET=1 npm run test:studionet`. This submits real Studionet transactions using disposable test wallets.
