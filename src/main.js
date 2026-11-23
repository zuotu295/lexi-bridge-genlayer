import { createApp, ref, computed, onMounted, onUnmounted } from 'vue/dist/vue.esm-bundler.js';
import { createAccount, createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant, transactionsStatusNumberToName } from 'genlayer-js/types';
import { feeOptions } from './fees.js';
import source from '../contracts/lexi_bridge.py?raw';
import demo from './demo.json';
import './style.css';

const reader = createClient({chain:studionet});
const explorer = 'https://explorer-studio.genlayer.com/tx/';
const addressFormat = /^0x[a-f0-9]{40}$/i;
const finished = ['Finalized','Failed','Canceled'];
const same = (a,b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const short = (address) => address.slice(0,7) + '…' + address.slice(-5);
const showPhase = {WAITING:'Waiting for partner',PLAYING:'In play',SOLVED:'Bridge complete',EXHAUSTED:'Table exhausted'};

createApp({
 setup(){
  const query = new URLSearchParams(location.search).get('table');
  const address = ref(addressFormat.test(query) ? query : demo.address);
  const board = ref(null), wallets = ref([]), selected = ref(-1), candidate = ref(''), lookup = ref('');
  const error = ref(''), notice = ref(''), busy = ref(false), loading = ref(false), txs = ref([]);
  const wallet = computed(() => wallets.value[selected.value]);
  const moveAllowed = computed(() => board.value?.phase === 'PLAYING' && same(wallet.value?.address,board.value.turn));
  const seatOpen = computed(() => board.value?.phase === 'WAITING' && wallet.value && !same(wallet.value.address,board.value.host));
  const pending = computed(() => txs.value.some(tx => !finished.includes(tx.state) && (tx.kind==='create' || tx.table===address.value)));
  const track = computed(() => board.value?.track ?? []);
  const last = computed(() => track.value.at(-1));
  const changeCount = computed(() => candidate.value.length === 4 ? [...candidate.value].filter((letter,i)=>letter!==last.value?.[i]).length : 0);
  const attempts = computed(() => [...(board.value?.attempts ?? [])].map((entry,i)=>({...entry,id:i+1})).reverse());
  let clients = [], version = 0, polling = false, timer;
  function message(e){ return String(e?.shortMessage || e?.message || e).slice(0,220); }
  function save(){ try { localStorage.setItem('lexibridge-txs',JSON.stringify(txs.value)); } catch {} }
  async function refresh(){
    const target=address.value, generation=++version;
    loading.value=true;
    try {
      const raw=await reader.readContract({address:target,functionName:'board',args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
      if(generation===version) board.value=JSON.parse(raw);
    } catch(e){if(generation===version) { board.value=null;error.value=message(e); }}
    finally { if(generation===version) loading.value=false; }
  }
  async function open(next){
    if(!addressFormat.test(next)){error.value='Enter the exact Studionet table address.';return;}
    address.value=next; board.value=null; candidate.value='';error.value='';
    history.replaceState(null,'','?table='+next);
    await refresh();
  }
  async function addWallet(){
    if(busy.value || wallets.value.length>=2)return;
    busy.value=true;error.value='';
    try {
      const account=createAccount();
      const client=createClient({chain:studionet,account});
      await client.request({method:'sim_fundAccount',params:[account.address,10**18]});
      const balance=await client.request({method:'eth_getBalance',params:[account.address,'latest']});
      clients.push(client);
      wallets.value.push({address:account.address,balance:(Number(BigInt(balance))/1e18).toFixed(3)});
      selected.value=wallets.value.length-1;
    }catch(e){error.value=message(e);}finally{busy.value=false;}
  }
  function resetWallets(){clients=[];wallets.value=[];selected.value=-1;}
  async function poll(){
    if(polling)return;
    polling=true;
    try {
      for(const entry of txs.value.filter(x=>!finished.includes(x.state))){
        try {
          const tx=await reader.getTransaction({hash:entry.hash});
          const state=tx.statusName || tx.status_name || transactionsStatusNumberToName[tx.status] || tx.status;
          entry.detail=state;
          if(state==='CANCELED'){entry.state='Canceled';continue;}
          if(state!=='FINALIZED'){entry.state=state==='ACCEPTED'?'Accepted':'In consensus';continue;}
          const leader=tx.consensus_data?.leader_receipt?.find(x=>x.mode==='leader');
          if(!leader)continue;
          if(leader.execution_result!=='SUCCESS'){entry.state='Failed';entry.detail=leader.result?.payload || 'Rejected';continue;}
          if(entry.kind==='create'){
            entry.table=tx.data?.contract_address ?? tx.to_address;
            if(!addressFormat.test(entry.table))continue;
            await open(entry.table);
          }else if(entry.table===address.value)await refresh();
          entry.state='Finalized';
          entry.detail='Execution succeeded. Check the board for the game result.';
        }catch{entry.detail='Waiting for the Studionet RPC';}
      }
      save();
    }finally{polling=false;}
  }
  async function act(kind){
    if(!wallet.value || busy.value || pending.value)return;
    if(kind==='join'&&!seatOpen.value || kind==='move'&&(!moveAllowed.value || changeCount.value!==1))return;
    const word=candidate.value, target=address.value, current=last.value, client=clients[selected.value];
    const label=kind==='move'?'Play '+word.toUpperCase():kind==='join'?'Join table':'Create puzzle table';
    if(!confirm(label+'\nStable Studionet 61999\nSigner: '+wallet.value.address))return;
    busy.value=true;error.value='';
    try {
      const fees=await feeOptions(client);
      const hash=kind==='create'
        ? await client.deployContract({code:source,args:[],fees,leaderOnly:false})
        : await client.writeContract({address:target,functionName:kind,args:kind==='move'?[word,current]:[],fees,value:0n,leaderOnly:false});
      txs.value.unshift({hash,kind,label,table:target,state:'Submitted',detail:''});
      save(); if(kind==='move')candidate.value='';void poll();
    }catch(e){error.value=message(e);}finally{busy.value=false;}
  }
  async function share(){
    try {const url=new URL(location.href);url.searchParams.set('table',address.value);await navigator.clipboard.writeText(url.href);notice.value='Table link copied.';}
    catch{notice.value=address.value;}
  }
  onMounted(()=>{
    try {const cache=JSON.parse(localStorage.getItem('lexibridge-txs')||'[]'); if(Array.isArray(cache))txs.value=cache;}catch{}
    void refresh();void poll();timer=setInterval(poll,7000);
  });
  onUnmounted(()=>clearInterval(timer));
  return {address,board,wallets,wallet,selected,candidate,lookup,error,notice,busy,loading,txs,moveAllowed,seatOpen,pending,track,last,
          changeCount,attempts,demo,explorer,same,short,showPhase,open,refresh,addWallet,resetWallets,act,share};
 },
 template:`
<header><a href="./" class="brand">Lexi<span>Bridge</span></a><span class="network">STUDIONET 61999</span><button @click="open(demo.address)">Public playtest</button></header>
<main>
<section class="intro"><p>COOPERATIVE WORD LADDER</p><h1>Cross one letter at a time.</h1><p>Two players. Four-letter words. Make a path to the target together.</p></section>
<section class="tools"><div><button @click="addWallet" :disabled="busy || wallets.length===2">Add test seat wallet</button><button @click="act('create')" :disabled="!wallet || busy || pending">Create table</button><button v-if="wallets.length" @click="resetWallets" :disabled="busy">Clear wallets</button></div>
<form @submit.prevent="open(lookup.trim())"><input v-model="lookup" aria-label="Table address" placeholder="Studionet table address"><button>Open table</button></form>
<div class="wallets" v-if="wallets.length"><button v-for="(w,i) in wallets" :key="w.address" @click="selected=i" :aria-pressed="selected===i">Wallet {{i+1}} · {{short(w.address)}} · {{w.balance}} test GEN</button><small>Session-only test keys. Reloading discards them.</small></div>
</section>
<p v-if="error" role="alert" class="alert">{{error}}</p><p v-if="notice" role="status">{{notice}}</p>
<p v-if="loading" role="status">Reading finalized board…</p>
<section class="game" v-if="board">
<div class="gamebar"><strong>{{showPhase[board.phase]}}</strong><span>Target <b>{{board.goal.toUpperCase()}}</b> · {{track.length-1}} / {{board.limit}} moves</span><button @click="refresh">Refresh</button><button @click="share">Copy table link</button></div>
<div class="table">
<div class="ladder" aria-label="Finalized word ladder">
<div class="step" v-for="(word,i) in track" :key="word"><span>{{i===0?'Start':'Move '+i}}</span><b v-for="(letter,j) in word" :key="j" :class="{changed:i && track[i-1][j]!==letter}">{{letter.toUpperCase()}}</b></div>
<div class="step goal" v-if="board.phase!=='SOLVED'"><span>Goal</span><b v-for="(letter,i) in board.goal" :key="i">{{letter.toUpperCase()}}</b></div>
</div>
<aside><h2>Seats</h2><p><strong>Host</strong> <code>{{board.host}}</code></p><p><strong>Partner</strong> <code>{{board.phase==='WAITING'?'Open seat':board.guest}}</code></p>
<p v-if="board.turn">Next move: <strong>{{same(board.turn,board.host)?'Host':'Partner'}}</strong></p>
<button v-if="seatOpen" @click="act('join')" :disabled="busy || pending">Join as partner</button>
<form v-if="moveAllowed" @submit.prevent="act('move')"><label for="move">Next word</label><input id="move" :value="candidate" @input="candidate=$event.target.value.toLowerCase().replace(/[^a-z]/g,'').slice(0,4)" maxlength="4" autocomplete="off"><button :disabled="busy || pending || changeCount!==1">Verify and play</button></form>
<p v-else-if="board.phase==='PLAYING'">Switch to the highlighted turn’s wallet to make a move.</p>
<p v-if="board.phase==='SOLVED'">Both players completed the bridge. This path is final.</p>
</aside></div></section>
<section v-if="attempts.length" class="journal"><h2>Move journal</h2><article v-for="entry in attempts" :key="entry.id"><strong>{{entry.from.toUpperCase()}} → {{entry.word.toUpperCase()}}</strong><span :class="{bad:entry.verdict!=='VERIFIED'}">{{entry.verdict==='VERIFIED'?(entry.word===board.goal?'Word verified · bridge completed':'Word verified · turn advanced'):'No dictionary entry · same turn'}}</span><code>{{entry.actor}}</code><a v-if="address===demo.address && demo.proof[entry.id]" :href="explorer+demo.proof[entry.id]" target="_blank" rel="noreferrer">Transaction ↗</a></article></section>
<section v-if="txs.length" class="journal"><h2>Your transactions</h2><article v-for="tx in txs" :key="tx.hash"><strong>{{tx.label}} · {{tx.state}}</strong><span>{{tx.detail}}</span><a :href="explorer+tx.hash" target="_blank" rel="noreferrer">Explorer ↗</a><button v-if="tx.state==='Finalized' && tx.table" @click="open(tx.table)">Open table</button></article></section>
</main><footer>LexiBridge · Words checked against <a href="https://datamuse.com/api/" rel="noreferrer" target="_blank">Datamuse vocabulary ↗</a></footer>
`,
}).mount('#app');
