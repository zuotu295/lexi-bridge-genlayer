import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abi } from 'genlayer-js';
import { read, reader, verify } from './studionet.mjs';

const file = name => readFile(new URL(name, import.meta.url), 'utf8');
const evidence = JSON.parse(await file('../EVIDENCE.json'));
assert.equal(Number(await reader.request({method:'eth_chainId'})),61999);
assert.equal(await reader.getContractCode(evidence.address),await file('../contracts/lexi_bridge_v1.py'));
const lexical = {invalid:'UNKNOWN_WORD',first:'VERIFIED',solved:'VERIFIED'};
const cases = ['deployment','joined','invalid','unauthorized','first','solved','closed'];
await Promise.all(cases.map(async name => {
  const item = evidence[name];
  const proof = await verify(item.hash,item.error);
  assert.equal(proof.execution,item.execution,name);
  const tx = await reader.getTransaction({hash:item.hash});
  assert.equal(tx.data?.contract_address ?? tx.to_address,evidence.address,name);
  if(lexical[name]){
    const executor=tx.consensus_data.leader_receipt.find(row=>row.mode==='leader');
    const [result]=Object.values(executor.eq_outputs);
    const data=Buffer.from(typeof result==='string'?result:result.raw,'base64');
    assert.equal(data[0],0,name);
    assert.equal(abi.calldata.decode(data.subarray(1)),lexical[name],name);
  }
}));
assert.deepEqual(await read(evidence.address,'board'),evidence.finished);
console.log('Verified historical V1 source, finalized receipts, lexical votes and solved board.');

const evidenceV2 = JSON.parse(await file('../EVIDENCE_V2.json'));
assert.equal(await reader.getContractCode(evidenceV2.address), await file('../contracts/lexi_bridge.py'));
const lexicalV2 = { invalid: 'UNKNOWN_WORD', first: 'VERIFIED', solved: 'VERIFIED' };
const casesV2 = ['deployment', 'joined', 'invalid', 'unauthorized', 'first', 'solved', 'closed'];
await Promise.all(casesV2.map(async name => {
  const item = evidenceV2[name];
  const proof = await verify(item.hash, item.error);
  assert.equal(proof.state, item.state, name);
  assert.equal(proof.execution, item.execution, name);
  assert.equal(proof.consensus, item.consensus, name);
  assert.equal(proof.from, item.from, name);
  const tx = await reader.getTransaction({ hash: item.hash });
  assert.equal(tx.data?.contract_address ?? tx.to_address, evidenceV2.address, name);
  if (lexicalV2[name]) {
    const executor = tx.consensus_data.leader_receipt.find(row => row.mode === 'leader');
    const [result] = Object.values(executor.eq_outputs);
    const data = Buffer.from(typeof result === 'string' ? result : result.raw, 'base64');
    assert.equal(data[0], 0, name);
    assert.equal(abi.calldata.decode(data.subarray(1)), lexicalV2[name], name);
  }
}));
assert.equal(evidenceV2.afterInvalid.phase, 'PLAYING');
assert.deepEqual(evidenceV2.afterInvalid.track, ['cold']);
assert.equal(evidenceV2.afterInvalid.attempts[0].verdict, 'UNKNOWN_WORD');
assert.deepEqual(await read(evidenceV2.address, 'board'), evidenceV2.finished);
assert.equal(evidenceV2.finished.phase, 'SOLVED');
assert.deepEqual(evidenceV2.finished.track, ['cold', 'cord', 'card']);
console.log('Verified historical V1 and current V2 sources, finalized receipts, strict-equivalence outputs and solved boards.');
