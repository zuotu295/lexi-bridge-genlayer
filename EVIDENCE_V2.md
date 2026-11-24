# Stable Studionet V2 acceptance evidence

- Chain ID: 61999
- Contract: [`0xe5d2be1ed6054628A13a0Bcb747eAcc58963825b`](https://explorer-studio.genlayer.com/address/0xe5d2be1ed6054628A13a0Bcb747eAcc58963825b)
- Source: [commit `c91a1b6ebb50476cf73e97c947771b4969fe3f57`](https://github.com/zuotu295/lexi-bridge-genlayer/commit/c91a1b6ebb50476cf73e97c947771b4969fe3f57) · Git blob SHA: `ba1c6761d742fb1457977cd6a39c3ed584793e50`
- Automated acceptance: [GitHub Actions run](https://github.com/zuotu295/lexi-bridge-genlayer/actions/runs/45372988511)
- Machine-readable receipts and readback: [EVIDENCE_V2.json](EVIDENCE_V2.json)

| Case | Transaction | Finality | Execution | Result |
| --- | --- | --- | --- | --- |
| Deploy V2 | [`0x50cc886eabfdf7681d502e47d128f4bc27907642bda7f1dbffe06ef581965d17`](https://explorer-studio.genlayer.com/tx/0x50cc886eabfdf7681d502e47d128f4bc27907642bda7f1dbffe06ef581965d17) | FINALIZED | SUCCESS | New Wiktionary-backed table created |
| Join second wallet | [`0x474ef188bd515ddb17e44bfa97b07550a8e1ed20b70105de374456d7197cc9e8`](https://explorer-studio.genlayer.com/tx/0x474ef188bd515ddb17e44bfa97b07550a8e1ed20b70105de374456d7197cc9e8) | FINALIZED | SUCCESS | Independent guest takes the second seat |
| Unknown word COLX | [`0x3043ca2c639121455729548bf805431e0931ef31ab262f467c54ded8b170a680`](https://explorer-studio.genlayer.com/tx/0x3043ca2c639121455729548bf805431e0931ef31ab262f467c54ded8b170a680) | FINALIZED | SUCCESS | Recorded UNKNOWN_WORD; board and host turn retained |
| Wrong player | [`0x30d8d043bdd7b2efa954be92638c798144899b6bc53bc2923e9509cbb29be6bb`](https://explorer-studio.genlayer.com/tx/0x30d8d043bdd7b2efa954be92638c798144899b6bc53bc2923e9509cbb29be6bb) | FINALIZED | ERROR | Other player's turn; rejected |
| COLD → CORD | [`0x9c488bb2435411e398f99bbd00b95b62df3f1c34b5f27e84c406dc5af48f1aa1`](https://explorer-studio.genlayer.com/tx/0x9c488bb2435411e398f99bbd00b95b62df3f1c34b5f27e84c406dc5af48f1aa1) | FINALIZED | SUCCESS | Verified word; guest receives the turn |
| CORD → CARD | [`0xb980e7d22eecfc260615de0ca3f8cc1f6630f4cbdeef3bdc5921d55d0f0cd2e7`](https://explorer-studio.genlayer.com/tx/0xb980e7d22eecfc260615de0ca3f8cc1f6630f4cbdeef3bdc5921d55d0f0cd2e7) | FINALIZED | SUCCESS | Verified word; game reaches SOLVED |
| Move after victory | [`0x5d2d16158527ee620a936d9ce1d7890add38212f33dfc64132b30e504aaf51cd`](https://explorer-studio.genlayer.com/tx/0x5d2d16158527ee620a936d9ce1d7890add38212f33dfc64132b30e504aaf51cd) | FINALIZED | ERROR | Terminal table rejects another move |

The intermediate readback after COLX shows phase PLAYING, track `["cold"]`, the original host turn and an `UNKNOWN_WORD` attempt. The final readback is `SOLVED`, with track `cold → cord → card` and no active turn.

The verifier checks the deployed V2 source against `contracts/lexi_bridge.py`, confirms each finalized receipt and its execution result, decodes the lexical strict-equivalence outputs, and reads back the final board. V1 remains separately documented in [EVIDENCE.md](EVIDENCE.md).

V2 uses English Wiktionary page metadata as a word-entry existence check. It does not assess whether an entry is common or suitable for every dialect; Wiktionary coverage and availability remain external dependencies.
