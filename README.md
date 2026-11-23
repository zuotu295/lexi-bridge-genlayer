# LexiBridge

A cooperative word ladder played by two wallet holders. Begin at **COLD** and reach **CARD** in at most eight accepted moves. Change one letter at a time and use a new dictionary word at each step.

## Play

Open the [public playtest](https://zuotu295.github.io/lexi-bridge-genlayer/) to inspect both seats, the solved ladder and its rejected attempt. To play, add a test-seat wallet and create a table. Either add a second distinct wallet in the same browser or send the table link to a partner who can generate a wallet and join. The host plays first. Select the wallet whose turn it is, then submit the next four-letter candidate. On a separate device, use **Refresh** to read the latest finalized board.

Keys are generated and kept in session memory. Clearing wallets or leaving the tab discards them. The browser stores only public transaction records. Studionet funds are for testing. The first wallet that joins an open table becomes its guest. The eight valid-move and 32 total-attempt budgets keep table history bounded.

## How the contract resolves a move

The contract checks the signer, phase, expected board word, single-letter change and reuse rule before making an external request. GenLayer validators independently query the [Datamuse English vocabulary API](https://datamuse.com/api/) and apply strict equivalence to a normalized verdict. An exact headword in the results is verified. A valid search response with no exact match is a recorded rejection. Missing or malformed evidence and disagreement between validators cannot add a word or change the turn.

A verified word advances the shared board and hands over the move. Reaching the target seals the ladder in `SOLVED`. An unknown word consumes one attempt while leaving the current word and turn unchanged, unless the total attempt budget ends the game. Only the two assigned players can affect the board. The published rules use one external dictionary, fixed puzzle endpoints and four ASCII letters; dictionary coverage can change. There are no prizes or entry charges.

**Vocabulary service lifetime.** Datamuse announces that unauthenticated access ends on February 1, 2027. Existing games and receipts remain readable while the chain retains them. The current deployment requires a new contract version with a suitable public vocabulary source for new moves after that change. See the [Datamuse API notice](https://datamuse.com/api/).

## Run and verify

Node.js 24, Vue 3, Vite and GenLayerJS 2.0.0. This application targets Stable Studionet (61999). It uses the network's live fee floor and faucet-funded local signatures.

```sh
npm ci
npm run build
python -m unittest discover -s tests
npm run verify
```

The read-only verifier checks the deployed source, finalized receipts, lexical equivalence outputs and solved board. To reproduce signed acceptance with fresh test wallets and a fresh table, run `STUDIONET_FAUCET=1 npm run test:studionet`. See [chain evidence](EVIDENCE.md).
