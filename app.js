function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
'use strict';

// ── 언어 ──
let lang = localStorage.getItem('lang') || 'ko';
const LABELS = {
  ko: {탐색기:'탐색기', 도구:'도구', 시각화:'시각화', 통계:'통계', 노드:'노드', 지도:'지도', 포트폴리오:'포트폴리오', 전송:'전송', 배우기:'배우기', 앱모음:'앱모음'},
  en: {탐색기:'Explorer', 도구:'Tools', 시각화:'Viz', 통계:'Stats', 노드:'Nodes', 지도:'Map', 포트폴리오:'Portfolio', 전송:'TX', 배우기:'Learn', 앱모음:'Apps'},
  ja: {탐색기:'探索', 도구:'ツール', 시각화:'可視化', 통계:'統計', 노드:'ノード', 지도:'地図', 포트폴리오:'資産', 전송:'送金', 배우기:'学習', 앱모음:'アプリ'},
};
function setLang(l){
  lang=l; localStorage.setItem('lang',lang);
  const btn=document.getElementById('lang-btn');
  if(btn) btn.textContent={ko:'KO',en:'EN',ja:'JA'}[lang]||'KO';
  document.getElementById('lang-menu')?.classList.remove('open');
  document.querySelectorAll('[data-ko]').forEach(el=>{
    const val=el.dataset[lang]||el.dataset.en||el.dataset.ko;
    if(val) el.textContent=val;
  });
}
function toggleLang(){document.getElementById('lang-menu')?.classList.toggle('open');}
document.addEventListener('click',e=>{const m=document.getElementById('lang-menu');if(m&&!e.target.closest('.lang-dropdown'))m.classList.remove('open');});
(function(){setLang(lang);})();

const API='https://mempool.space/api';
(function(){
  const t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');
  document.documentElement.setAttribute('data-theme',t);
  updateThemeBtn();
})();
function updateThemeBtn(){
  const btn=document.getElementById('theme-btn');if(!btn)return;
  const isDark=document.documentElement.getAttribute('data-theme')!=='light';
  btn.innerHTML=isDark?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  btn.title=isDark?'라이트 모드로 전환':'다크 모드로 전환';
}
function toggleTheme(){
  const h=document.documentElement;
  const n=h.getAttribute('data-theme')==='dark'?'light':'dark';
  h.setAttribute('data-theme',n);localStorage.setItem('theme',n);
  updateThemeBtn();
}

let activeTab='broadcast';
function switchTab(tab,panel,btn){
  activeTab=tab;
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.style.display='none');
  (btn||event?.target)?.classList.add('active');
  document.getElementById(panel).style.display='block';
}

function getHex(){return(document.getElementById('raw-tx')||{}).value?.trim()||'';}
function clearTx(){document.getElementById('raw-tx').value='';['decode-preview','broadcast-result'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});}

function showResult(id,html,show=true){const el=document.getElementById(id);if(!el)return;el.innerHTML=html;el.style.display=show?'block':'none';}

function parseTxHex(hex){
  // 간략한 raw tx 파서 (버전 / vin / vout 개수)
  try{
    let off=0;
    const b=hex;
    const read=(n)=>{const s=b.slice(off*2,off*2+n*2);off+=n;return s;};
    const readLE=(n)=>parseInt(read(n).match(/../g).reverse().join(''),16);
    const readVarInt=()=>{const f=parseInt(read(1),16);if(f<0xfd)return f;if(f===0xfd)return readLE(2);if(f===0xfe)return readLE(4);return readLE(8);};
    const version=readLE(4);
    // segwit marker check
    let segwit=false;
    const marker=parseInt(b.slice(off*2,off*2+2),16);
    if(marker===0){off++;const flag=parseInt(read(1),16);if(flag===1)segwit=true;}
    const inCount=readVarInt();
    const ins=[];
    for(let i=0;i<inCount;i++){
      const prevHash=read(32).match(/../g).reverse().join('');
      const prevIdx=readLE(4);
      const scriptLen=readVarInt();const script=read(scriptLen);
      const seq=readLE(4);
      ins.push({prevHash,prevIdx,scriptLen,script,seq});
    }
    const outCount=readVarInt();
    const outs=[];
    for(let i=0;i<outCount;i++){
      const valueSat=BigInt('0x'+read(8).match(/../g).reverse().join(''));
      const scriptLen=readVarInt();const script=read(scriptLen);
      outs.push({value:Number(valueSat),script});
    }
    const totalOut=outs.reduce((s,o)=>s+o.value,0);
    return{version,segwit,inCount,outCount,ins,outs,totalOut,size:hex.length/2};
  }catch(e){return null;}
}

function scriptToType(script){
  if(script.startsWith('76a914')&&script.endsWith('88ac'))return'P2PKH';
  if(script.startsWith('a914')&&script.endsWith('87'))return'P2SH';
  if(script.startsWith('0014'))return'P2WPKH';
  if(script.startsWith('0020'))return'P2WSH';
  if(script.startsWith('5120'))return'P2TR';
  if(script.startsWith('6a'))return'OP_RETURN';
  return'Unknown';
}

function decodeTx(standalone){
  const hex=(standalone?document.getElementById('decode-tx'):document.getElementById('raw-tx'))?.value.trim();
  const resultId=standalone?'decode-result':'decode-preview';
  if(!hex||!/^[0-9a-fA-F]+$/.test(hex)||hex.length>2000000){showResult(resultId,'<span class="result-err">유효한 hex를 입력하세요 (최대 1MB)</span>');return;}
  const tx=parseTxHex(hex);
  if(!tx){showResult(resultId,'<span class="result-err">파싱 실패: 올바른 Raw TX hex가 아닙니다</span>');return;}
  const html=`
    <div><span style="color:var(--text3)">버전:</span> <span style="color:var(--accent)">${tx.version}</span> · <span style="color:var(--text3)">크기:</span> ${tx.size} bytes · ${tx.segwit?'<span class="badge badge-blue">SegWit</span>':'Legacy'}</div>
    <div class="tx-section">
      <div class="tx-section-title">입력 (${tx.inCount}개)</div>
      ${tx.ins.map((v,i)=>`<div class="io-row"><span class="io-addr">${v.prevHash.slice(0,20)}…:${v.prevIdx}</span><span style="color:var(--text3);font-size:.65rem">${scriptToType(v.script)}</span></div>`).join('')}
    </div>
    <div class="tx-section">
      <div class="tx-section-title">출력 (${tx.outCount}개)</div>
      ${tx.outs.map((o,i)=>`<div class="io-row"><span class="io-addr">${scriptToType(o.script)}</span><span class="io-val">${(o.value/1e8).toFixed(8)} BTC</span></div>`).join('')}
    </div>
    <div style="margin-top:10px;color:var(--accent)">총 출력: ${(tx.totalOut/1e8).toFixed(8)} BTC</div>`;
  showResult(resultId,html);
}

async function broadcastTx(){
  const hex=getHex();
  if(!hex){showResult('broadcast-result','<span class="result-err">Raw TX hex를 입력하세요</span>');return;}
  if(!confirm('이 트랜잭션을 비트코인 메인넷에 브로드캐스트하시겠습니까?\n한 번 전송하면 취소할 수 없습니다.'))return;
  showResult('broadcast-result','전송 중…');
  try{
    const res=await fetch(`${API}/tx`,{method:'POST',body:hex,headers:{'Content-Type':'text/plain'},signal:AbortSignal.timeout(15000)});
    const txid=await res.text();
    if(res.ok){
      const isTxid=/^[0-9a-fA-F]{64}$/.test(txid.trim());
      const txLink=isTxid?`<a href="https://txid.uk/#/tx/${txid.trim()}" style="color:var(--accent)" target="_blank">${txid.trim()}</a>`:escHtml(txid);
      showResult('broadcast-result',`<div class="result-ok">✓ 브로드캐스트 성공!</div><div style="margin-top:8px;color:var(--text2)">TXID: ${txLink}</div>`);
    }
    else{showResult('broadcast-result',`<span class="result-err">❌ 오류: ${escHtml(txid.slice(0,200))}</span>`);}
  }catch(e){showResult('broadcast-result',`<span class="result-err">네트워크 오류: ${e.message}</span>`);}
}

async function lookupTx(){
  const txid=document.getElementById('txid-input').value.trim();
  if(!/^[0-9a-fA-F]{64}$/.test(txid)){showResult('lookup-result','<span class="result-err">유효한 TXID를 입력하세요 (64자 hex)</span>');return;}
  showResult('lookup-result','조회 중…');
  try{
    const tx=await fetch(`${API}/tx/${txid}`,{signal:AbortSignal.timeout(10000)}).then(r=>r.json());
    const totalIn=tx.vin.reduce((s,v)=>s+(v.prevout?.value||0),0);
    const totalOut=tx.vout.reduce((s,v)=>s+(v.value||0),0);
    const html=`
      <div><a href="https://txid.uk/#/tx/${txid}" style="color:var(--accent)">${txid.slice(0,20)}…</a>
        ${tx.status?.confirmed?`<span class="badge badge-green" style="margin-left:8px">✓ 확인됨 #${tx.status.block_height}</span>`:`<span class="badge badge-orange" style="margin-left:8px">미확인</span>`}
      </div>
      <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.72rem">
        <span><span style="color:var(--text3)">크기:</span> ${tx.size} B / ${tx.vsize} vB</span>
        <span><span style="color:var(--text3)">수수료:</span> <span style="color:var(--accent)">${(tx.fee||0).toLocaleString()} sat</span></span>
        <span><span style="color:var(--text3)">수수료율:</span> ${tx.vsize?(tx.fee/tx.vsize).toFixed(1):0} sat/vB</span>
        <span><span style="color:var(--text3)">총 출력:</span> ${(totalOut/1e8).toFixed(4)} BTC</span>
      </div>
      <div class="tx-section">
        <div class="tx-section-title">입력 ${tx.vin.length}개</div>
        ${tx.vin.slice(0,5).map(v=>`<div class="io-row"><span class="io-addr">${escHtml(v.prevout?.scriptpubkey_address||(v.coinbase?'Coinbase':'—'))}</span><span class="io-val">${((v.prevout?.value||0)/1e8).toFixed(4)} BTC</span></div>`).join('')}
        ${tx.vin.length>5?`<div style="color:var(--text3);font-size:.68rem">+${tx.vin.length-5}개 더</div>`:''}
      </div>
      <div class="tx-section">
        <div class="tx-section-title">출력 ${tx.vout.length}개</div>
        ${tx.vout.slice(0,5).map(v=>`<div class="io-row"><span class="io-addr">${escHtml(v.scriptpubkey_address||'—')}</span><span class="io-val">${(v.value/1e8).toFixed(4)} BTC</span></div>`).join('')}
        ${tx.vout.length>5?`<div style="color:var(--text3);font-size:.68rem">+${tx.vout.length-5}개 더</div>`:''}
      </div>`;
    showResult('lookup-result',html);
  }catch(e){showResult('lookup-result',`<span class="result-err">조회 실패: ${e.message}</span>`);}
}

async function loadFees(){
  try{
    const f=await fetch(`${API}/v1/fees/recommended`,{signal:AbortSignal.timeout(8000)}).then(r=>r.json());
    document.getElementById('fee-grid').innerHTML=`
      <div class="fee-card"><div class="fee-val">${f.fastestFee}</div><div class="fee-sub">sat/vB</div><div class="fee-time"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg> 즉시 (~10분)</div></div>
      <div class="fee-card"><div class="fee-val">${f.halfHourFee}</div><div class="fee-sub">sat/vB</div><div class="fee-time"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> ~30분</div></div>
      <div class="fee-card"><div class="fee-val">${f.hourFee}</div><div class="fee-sub">sat/vB</div><div class="fee-time"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ~1시간</div></div>
      <div class="fee-card"><div class="fee-val">${f.economyFee}</div><div class="fee-sub">sat/vB</div><div class="fee-time">경제 요금</div></div>
      <div class="fee-card"><div class="fee-val">${f.minimumFee}</div><div class="fee-sub">sat/vB</div><div class="fee-time">최소</div></div>
    `;
  }catch{document.getElementById('fee-grid').innerHTML='<div style="color:var(--text3);font-size:.8rem">수수료 데이터 로드 실패</div>';}
}

document.getElementById('txid-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')lookupTx();});
loadFees();

// URL 파라미터 자동 조회
(function(){
  const txid = new URLSearchParams(location.search).get('lookup');
  if (!txid || !/^[0-9a-fA-F]{64}$/.test(txid)) return;
  document.getElementById('txid-input').value = txid;
  // lookup 탭으로 전환 후 조회
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.tab')[2]?.classList.add('active');
  document.getElementById('lookup-panel').style.display = 'block';
  lookupTx();
  history.replaceState(null, '', location.pathname);
})();
