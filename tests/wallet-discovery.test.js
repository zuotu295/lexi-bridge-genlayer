import test from 'node:test';
import assert from 'node:assert/strict';
import { watchInjectedProviders } from '../src/wallet-discovery.js';

class FakeWindow {
  constructor(ethereum){this.ethereum=ethereum;this.listeners=new Map();}
  addEventListener(name,handler){
    const handlers=this.listeners.get(name)||new Set();
    handlers.add(handler);
    this.listeners.set(name,handlers);
  }
  removeEventListener(name,handler){this.listeners.get(name)?.delete(handler);}
  dispatchEvent(event){
    for(const handler of this.listeners.get(event.type)||[])handler(event);
    return true;
  }
}

test('discovers a legacy injected wallet',()=>{
  const provider={isMetaMask:true,request:async()=>[]};
  globalThis.window=new FakeWindow(provider);
  const found=[];
  const stop=watchInjectedProviders(item=>found.push(item));
  assert.equal(found.length,1);
  assert.equal(found[0].name,'MetaMask');
  assert.equal(found[0].provider,provider);
  stop();
});

test('discovers multiple legacy wallets and deduplicates EIP-6963 announcements',()=>{
  const first={isMetaMask:true,request:async()=>[]};
  const second={isOkxWallet:true,request:async()=>[]};
  globalThis.window=new FakeWindow({providers:[first,second]});
  const found=[];
  const stop=watchInjectedProviders(item=>found.push(item));
  const duplicate=new Event('eip6963:announceProvider');
  Object.defineProperty(duplicate,'detail',{value:{info:{name:'MetaMask',uuid:'metamask'},provider:first}});
  const announced=new Event('eip6963:announceProvider');
  const third={request:async()=>[]};
  Object.defineProperty(announced,'detail',{value:{info:{name:'Example Wallet',uuid:'example.wallet'},provider:third}});
  window.dispatchEvent(duplicate);
  window.dispatchEvent(announced);
  assert.equal(found.length,3);
  assert.equal(found[1].name,'OKX Wallet');
  assert.equal(found[2].name,'Example Wallet');
  stop();
});

test('removes the announcement listener on cleanup',()=>{
  globalThis.window=new FakeWindow(undefined);
  const found=[];
  const stop=watchInjectedProviders(item=>found.push(item));
  stop();
  const announced=new Event('eip6963:announceProvider');
  Object.defineProperty(announced,'detail',{value:{provider:{request:async()=>[]}}});
  window.dispatchEvent(announced);
  assert.equal(found.length,0);
});
