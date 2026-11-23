import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abi } from 'genlayer-js';
import { read, reader, verify } from './studionet.mjs';

const file = name => readFile(new URL(name, import.meta.url), 'utf8');
const evidence = JSON.parse(await file('../EVIDENCE.json'));
assert.equal(Number(await reader.request({method:'eth_chainId'})),61999);
assert.equal(await reader.getContractCode(evidence.address),await file('../contracts/lexi_bridge.py'));
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
console.log('Verified source, finalized receipts, dictionary votes and solved board.');
