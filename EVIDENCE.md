# Historical Stable Studionet V1 playtest

The records below belong to the original Datamuse-backed V1 contract deployed at the address shown. They are not acceptance evidence for the new V2 source.

- [V1 table](https://explorer-studio.genlayer.com/address/0x15c85f90447b251dBF2CD82B06F05f397511cD8d) · chain ID 61999
- [Preserved V1 source](contracts/lexi_bridge_v1.py)
- Source SHA-256: `e2be44e33a790e489d4727eb0e3a78189ff1cfab0a65ef66035f039a5780f291`

| Case | Transaction | Finality | Execution | Business outcome |
| --- | --- | --- | --- | --- |
| Deploy | [`0x851b399fed…c8481e`](https://explorer-studio.genlayer.com/tx/0x851b399fed224e6ec27902921ef1ddc92c751806b3344d8b217cc4855bc8481e) | FINALIZED | SUCCESS | Host opens table |
| Join | [`0xc949818110…678d64`](https://explorer-studio.genlayer.com/tx/0xc94981811068a68680cee5203c2f355ffa5e3ecafb60f122367099b56e678d64) | FINALIZED | SUCCESS | Distinct guest takes second seat |
| COLD → COLX | [`0xc80d46abdd…905544`](https://explorer-studio.genlayer.com/tx/0xc80d46abdd97f6c0440f0c4b0f5409b1cde7000c1b11f317b593cd48a0905544) | FINALIZED | SUCCESS | No exact match; COLD and host turn retained |
| Third wallet move | [`0x9c404df572…185a8d`](https://explorer-studio.genlayer.com/tx/0x9c404df572f3d088bd6d49a873aa42c73293ad3fbad79a13634e46dd46185a8d) | FINALIZED | ERROR | Move denied |
| COLD → CORD | [`0x96a1662617…04f23d`](https://explorer-studio.genlayer.com/tx/0x96a1662617dfb5fd17b2f405fbaa28aa1b99230042664e77a83755045104f23d) | FINALIZED | SUCCESS | Verified; guest receives turn |
| CORD → CARD | [`0xd016f65f13…140028`](https://explorer-studio.genlayer.com/tx/0xd016f65f136e7b80661ba602edd41536777387ab11f7b3dedb1dc7715f140028) | FINALIZED | SUCCESS | Verified; board reaches SOLVED |
| Move after victory | [`0xb265a9a00f…a1499f`](https://explorer-studio.genlayer.com/tx/0xb265a9a00fd3a6fae8308b8cad9e53e33876a7824f405c120c0b867bf4a1499f) | FINALIZED | ERROR | Terminal transition denied |

The final V1 board reads COLD → CORD → CARD. The rejected lexical attempt is a successful decision record, distinct from protocol errors for a third-wallet move or post-victory submission.

An [earlier V1 integration attempt](https://explorer-studio.genlayer.com/tx/0xce9cd61c60cd1bb55f000972857e99a9841600864d17b18b80648911fe1ec45d) returned a finalized dictionary-unavailable error. The released V1 source uses Datamuse; the preserved file remains the reference for this deployment.

Run `npm run verify` to recheck only this V1 evidence. V2 requires its own fresh Studionet deployment and transaction evidence before it can be described as accepted.
