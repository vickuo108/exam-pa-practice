import {saveBrowserCard} from './local-cards.js';
const browserOnly=location.hostname.endsWith('.github.io');
const aiBase=browserOnly?(window.PA_API_BASE||''):'';
const aiUrl=path=>aiBase?aiBase+path:path.replace(/^\//,'');
let accessCode='';
try{accessCode=sessionStorage.getItem('pa-ai-access')||''}catch{}
import {compare,tokenize} from './diff.js';
const $=id=>document.getElementById(id),KEY='pa-practice-v1';let cards=[],index=0,filter='all',changes=[],submitted='',aiReady=false,aiToken="",aiRequest=null;
let editingId=null;
let state={index:0,drafts:{},done:{},marked:{},review:false};
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved&&typeof saved==='object')state={...state,...saved,drafts:saved.drafts||{},done:saved.done||{},marked:saved.marked||{},review:!!saved.review}}catch{}
function notice(t){$('notice').textContent=t}
function persist(){state.index=index;try{localStorage.setItem(KEY,JSON.stringify(state))}catch{notice('無法保存進度。請勿關閉此頁，先複製你的答案。')}}
function current(){return cards[index]}
function refreshCount(){$('word-count').textContent=`${tokenize($('answer').value).length} words`}
function safeOriginal(html){const doc=new DOMParser().parseFromString(html,'text/html');const allowed=new Set(['DIV','P','BR','B','STRONG','I','EM','U','SUB','SUP','UL','OL','LI','TABLE','TBODY','THEAD','TR','TD','TH','SPAN','IMG']);function clean(node){if(node.nodeType===3)return document.createTextNode(node.textContent);if(node.nodeType!==1)return document.createTextNode('');if(['SCRIPT','STYLE','IFRAME','OBJECT'].includes(node.tagName))return document.createTextNode('');const el=document.createElement(allowed.has(node.tagName)?node.tagName.toLowerCase():'span');if(node.tagName==='IMG'){const src=node.getAttribute('src')||'';if(!/^media-\d+\.(png|jpg|jpeg|webp|gif)$/i.test(src))return document.createTextNode('');el.src=src;el.alt='原卡附圖';el.loading='lazy'}for(const child of node.childNodes)el.append(clean(child));return el}const frag=document.createDocumentFragment();for(const n of doc.body.childNodes)frag.append(clean(n));return frag}
function showCard(){aiRequest?.abort();aiRequest=null;$('ai-check').disabled=!aiReady;$('ai-check').textContent='AI 檢查';const card=current();$('question').textContent=card.question;$('category').textContent=card.category;$('position').textContent=`${index+1} / ${cards.length}`;$('progress').style.width=`${(index+1)/cards.length*100}%`;$('answer').value=state.drafts[card.id]||'';$('results').hidden=true;$('ai-result').hidden=true;$('original').open=false;$('original-answer').replaceChildren(safeOriginal(card.answerHtml));$('previous').disabled=index===0;$('next').disabled=index===cards.length-1;$('done-count').textContent=`已練 ${cards.filter(c=>state.done[c.id]).length} 題`;refreshCount();refreshReview();persist();notice('')}
$('answer').addEventListener('input',()=>{state.drafts[current().id]=$('answer').value;persist();refreshCount();$('results').hidden=true;aiRequest?.abort()});
function doCompare(reveal=false){const answer=$('answer').value.trim();if(!answer&&!reveal){notice('先輸入答案，或按「直接看答案」。');$('answer').focus();return}submitted=answer;$('results').hidden=false;$('ai-result').hidden=true;$('diff').replaceChildren();changes=[];if(reveal){$('diff').hidden=true;$('diff-note').hidden=true;document.querySelector('.legend').hidden=true;$('step-detail').hidden=true;$('original').open=true;$('result-label').textContent='原卡全文'}else{let groups;try{groups=compare(current().answer,answer)}catch(e){notice(e.message);$('results').hidden=true;return}$('diff').hidden=false;$('diff-note').hidden=false;document.querySelector('.legend').hidden=false;for(const group of groups){if(group.type==='same'){$('diff').append(document.createTextNode(group.words.join(' ')+' '));continue}const mark=document.createElement('mark');mark.dataset.change=changes.length;mark.setAttribute('aria-label',`差異 ${changes.length+1}`);if(group.extra.length){const del=document.createElement('del');del.textContent=group.extra.join(' ');mark.append(del,' ')}if(group.missing.length){const ins=document.createElement('ins');ins.textContent=group.missing.join(' ');mark.append(ins,' ')}$('diff').append(mark);changes.push(group)}$('result-label').textContent=changes.length?`${changes.length} 處文字差異`:'用字一致';$('step-detail').hidden=!changes.length;if(!changes.length)$('diff-note').textContent='與原卡用字一致（忽略大小寫與一般標點）。';else $('diff-note').textContent='標記的是文字差異；不同寫法不一定是錯誤。';showDifferences();state.done[current().id]=true;persist();$('done-count').textContent=`已練 ${cards.filter(c=>state.done[c.id]).length} 題`}$('results').scrollIntoView({behavior:'instant',block:'start'})}
function showDifferences(){
 $('step-detail').replaceChildren();
 changes.forEach((c,n)=>{
  const row=document.createElement('div');row.className='difference-row';
  const title=document.createElement('strong');title.textContent=`差異 ${n+1}`;row.append(title);
  for(const [label,text] of [['你的用字',c.extra.join(' ')||'（未寫）'],['原卡用字',c.missing.join(' ')||'（原卡沒有這段）']]){
   const p=document.createElement('p');p.textContent=label+'：'+text;row.append(p);
  }
  $('step-detail').append(row);
 });
}
$('retry').onclick=()=>{delete state.drafts[current().id];delete state.done[current().id];showCard();$('answer').focus()};
$('answer-form').onsubmit=e=>{e.preventDefault();doCompare()};$('reveal').onclick=()=>doCompare(true);
function go(n){index=n;showCard();window.scrollTo({top:0,behavior:'instant'})}$('previous').onclick=()=>moveReview(-1);$('next').onclick=()=>moveReview(1);
function renderLibrary(){$('marked-filter').textContent='★ 待加強 '+markedIndices().length;$('start-review').hidden=filter!=='marked';$('start-review').disabled=!markedIndices().length;const query=$('search').value.toLowerCase();$('card-list').replaceChildren();cards.forEach((c,n)=>{if((filter==='marked'?!state.marked[c.id]:(filter!=='all'&&c.category!==filter))||!c.question.toLowerCase().includes(query))return;const button=document.createElement('button');button.classList.toggle('current',n===index);for(const [cls,text] of [['num',String(n+1).padStart(2,'0')],['title',c.question],['status',[state.marked[c.id]?'★ 待加強':'',state.done[c.id]?'已練':''].filter(Boolean).join(' · ')]]){const span=document.createElement('span');span.className=cls;span.textContent=text;button.append(span)}button.onclick=()=>{state.review=filter==='marked';$('library').close();go(n)};const row=document.createElement('div');row.className='library-row';const edit=document.createElement('button');edit.className='edit-row';edit.textContent='編輯';edit.setAttribute('aria-label','編輯 '+c.question);edit.onclick=()=>openEditor(c);row.append(button,edit);$('card-list').append(row)});if(!$('card-list').children.length)$('card-list').textContent=filter==='marked'?'還沒有符合的待加強卡片。可在題目旁按「☆ 待加強」標記。':'找不到符合的題目。'}
$('browse').onclick=()=>{renderLibrary();$('library').showModal()};$('close-library').onclick=()=>$('library').close();$('search').oninput=renderLibrary;document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderLibrary()});
function prompt(){return `請幫我檢查 SOA Exam PA 的英文練習答案。原卡答案是比對依據，請勿改寫原卡。接受同義句與不同語序，不要用文字相似度判定對錯。先判斷我的答案是否可以，再依我的句子順序逐項指出意思、遺漏或文法差異，區分可接受的不同寫法與錯誤，最後只在需要時給最小修改版本。保留專有名詞；不提供必要概念清單、不翻譯原卡、不假設官方分數。如果原卡本身可能有錯，另行標示，不要默默更改。\n\n題目：${current().question}\n\n原卡答案：\n${current().answer}\n\n我的答案：\n${$('answer').value}`}
$('copy').onclick=async()=>{if(!$('answer').value.trim()){notice('先寫下你的答案，再複製給 AI。');return}try{await navigator.clipboard.writeText(prompt());notice('已複製題目、原卡答案與你的答案，可以貼到 AI 對話檢查。')}catch{notice('無法存取剪貼簿，請允許此網站使用剪貼簿後重試。')}};
$('ai-check').onclick=async()=>{if(!$('answer').value.trim())return;if(browserOnly&&!accessCode){$('access-dialog').showModal();return}const cardId=current().id,answer=$('answer').value;aiRequest?.abort();const controller=new AbortController();aiRequest=controller;$('ai-check').disabled=true;$('ai-check').textContent='檢查中…';try{const res=await fetch(aiUrl('/api/check'),{method:'POST',headers:{'Content-Type':'application/json','X-PA-Token':browserOnly?accessCode:aiToken},body:JSON.stringify({cardId,answer,...(browserOnly?{card:{question:current().question,answer:current().answer,hasImages:current().answerHtml.includes('<img')}}:{})}),signal:controller.signal});const data=await res.json();if(res.status===401&&browserOnly){accessCode='';try{sessionStorage.removeItem('pa-ai-access')}catch{}$('access-dialog').showModal()}if(!res.ok)throw new Error(data.error||'暫時無法檢查，請稍後再試。');if(current().id!==cardId||$('answer').value!==answer)return;$('ai-result').textContent=data.feedback;$('ai-result').hidden=false}catch(e){if(e.name!=='AbortError')notice(e.message)}finally{if(aiRequest===controller){$('ai-check').disabled=!aiReady;$('ai-check').textContent='AI 檢查';aiRequest=null}}};
try{const res=await fetch('cards.json');if(!res.ok)throw Error('題庫載入失敗');cards=await res.json();let custom=[];try{custom=JSON.parse(localStorage.getItem('pa-custom-cards')||'[]');if(!Array.isArray(custom))custom=[]}catch{}try{if(browserOnly)throw new Error('browser storage');const response=await fetch('api/cards',{signal:AbortSignal.timeout(5000)});if(response.ok){custom=(await response.json()).cards;try{localStorage.setItem('pa-custom-cards',JSON.stringify(custom))}catch{}}}catch{}for(const c of custom){const n=cards.findIndex(x=>x.id===c.id);if(n<0)cards.push(c);else cards[n]=c;}index=Math.max(0,Math.min(Number(state.index)||0,cards.length-1));if(state.review&&!state.marked[cards[index].id])index=markedIndices()[0]??index;$('total').textContent=cards.length;showCard()}catch(e){$('question').textContent='題庫暫時無法載入';notice('請重新整理，或連上網路後再試。');$('check').disabled=true;$('reveal').disabled=true;$('browse').disabled=true;$('previous').disabled=true;$('next').disabled=true}
$('access-form').onsubmit=e=>{e.preventDefault();accessCode=$('access-code').value.trim();if(!accessCode)return;try{sessionStorage.setItem('pa-ai-access',accessCode)}catch{}$('access-code').value='';$('access-dialog').close();$('ai-check').click()};
$('close-access').onclick=()=>$('access-dialog').close();
if(browserOnly&&!aiBase)$('ai-status').textContent='AI 服務尚未設定，可先複製答案給 AI 檢查。';
else fetch(aiUrl('/api/status'),{signal:AbortSignal.timeout(10000)}).then(r=>r.ok?r.json():null).then(s=>{aiReady=!!s?.available;aiToken=s?.token||'';$('ai-check').disabled=!aiReady;if(aiReady)$('ai-status').textContent='OpenAI · '+s.model+'：逐項檢查內容與文法。'}).catch(()=>{$('ai-status').textContent='AI 服務暫時無法連線，請稍後重新整理。'});
if('serviceWorker'in navigator){let reloading=false;const hadController=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController&&!reloading){reloading=true;location.reload()}});navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{const activate=()=>reg.waiting?.postMessage({type:'SKIP_WAITING'});activate();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',activate));const update=()=>reg.update().then(activate).catch(()=>{});update();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')update()});window.addEventListener('pageshow',update)}).catch(()=>{});}
try{const old=localStorage.getItem('pa-version');if(old&&old!==APP_VERSION)notice('已更新：'+CHANGELOG.join(' '));localStorage.setItem('pa-version',APP_VERSION)}catch{}

function closeAdd(){$('add-dialog').close();$('library').showModal();renderLibrary()}
function openEditor(card=null){
 editingId=card?.id||null;aiRequest?.abort();$('library').close();$('add-error').textContent='';
 $('editor-title').textContent=card?'編輯題目':'新增題目';$('save-card').textContent=card?'儲存修改':'新增並開始練習';
 $('new-question').value=card?.question||'';$('new-answer').value=card?.answer||'';
 $('editor-help').textContent=card?'修改後會用新答案比對；原有附圖會保留。':'儲存後加入自訂題庫，可逐字比對與 AI 檢查。';
 if(browserOnly)$('editor-help').textContent='儲存在目前裝置的瀏覽器，可逐字比對；不會跨裝置同步，清除網站資料會刪除。';
 $('add-dialog').showModal();$('new-question').focus();
}
$('new-card').onclick=()=>openEditor();$('edit-current').onclick=()=>openEditor(current());
$('close-add').onclick=closeAdd;$('cancel-add').onclick=closeAdd;
$('add-dialog').addEventListener('cancel',e=>{e.preventDefault();closeAdd()});
$('add-form').onsubmit=async e=>{
 e.preventDefault();const savedId=editingId;const question=$('new-question').value.trim(),answer=$('new-answer').value.trim();
 if(!question||!answer){$('add-error').textContent='請填寫題目和參考答案。';return}
 $('save-card').disabled=true;$('save-card').textContent='儲存中…';$('add-error').textContent='';
 try{
  let data;
  if(browserOnly){data={card:saveBrowserCard(localStorage,cards,{id:savedId,question,answer})};}
  else {
  const status=await fetch('api/status',{signal:AbortSignal.timeout(5000)});if(!status.ok)throw new Error('無法連上題庫，請確認本機服務已啟動。');aiToken=(await status.json()).token;
  const response=await fetch(savedId?'api/cards/edit':'api/cards',{method:'POST',headers:{'Content-Type':'application/json','X-PA-Token':aiToken},body:JSON.stringify({question,answer,cardId:savedId}),signal:AbortSignal.timeout(10000)});
  data=await response.json();if(!response.ok)throw new Error(data.error||'無法儲存，請稍後重試。');
  }
  const editedIndex=cards.findIndex(c=>c.id===data.card.id);if(editedIndex<0)cards.push(data.card);else cards[editedIndex]=data.card;let cached=true;try{localStorage.setItem('pa-custom-cards',JSON.stringify(cards.filter(c=>c.custom||c.edited)))}catch{cached=false}
  $('total').textContent=cards.length;$('add-form').reset();$('add-dialog').close();$('library').close();if(!savedId||!state.marked[data.card.id])state.review=false;go(editedIndex<0?cards.length-1:editedIndex);
  notice(browserOnly?'已儲存在此瀏覽器，可以開始練習。':cached?(savedId?'題目已更新。':'題目已新增，可以開始練習。'):'題目已儲存，但此瀏覽器無法離線保存新題庫。');
 }catch(error){$('add-error').textContent=error.name==='TypeError'||error.name==='TimeoutError'?'暫時無法連上題庫，輸入內容已保留，請確認連線後重試。':error.message}
 finally{$('save-card').disabled=false;$('save-card').textContent=editingId?'儲存修改':'新增並開始練習'}
};

function markedIndices(){return cards.flatMap((c,n)=>state.marked[c.id]?[n]:[])}
function refreshReview(){
 const marked=!!state.marked[current().id],ids=markedIndices();
 if(!ids.length)state.review=false;
 $('mark-card').textContent=marked?'★ 待加強':'☆ 待加強';$('mark-card').setAttribute('aria-pressed',String(marked));
 $('review-banner').hidden=!state.review;
 const sequence=state.review?ids:cards.map((_,n)=>n),position=sequence.indexOf(index);
 $('position').textContent=`${position+1} / ${sequence.length}`;
 $('progress').style.width=`${(position+1)/sequence.length*100}%`;
 $('previous').disabled=position<=0;$('next').disabled=position===sequence.length-1;
}
function moveReview(direction){const sequence=state.review?markedIndices():cards.map((_,n)=>n);const n=sequence[sequence.indexOf(index)+direction];if(n!==undefined)go(n)}
$('mark-card').onclick=()=>{
 const wasReview=state.review;
 if(state.marked[current().id])delete state.marked[current().id];else state.marked[current().id]=true;
 if(wasReview&&!state.marked[current().id]){const ids=markedIndices();if(ids.length){go(ids.find(n=>n>index)??ids[0]);return}state.review=false}
 refreshReview();persist();if(wasReview&&!state.review)notice('待加強題目已全部取消標記，已回到全部題目。');
};
$('exit-review').onclick=()=>{state.review=false;refreshReview();persist()};
$('start-review').onclick=()=>{const ids=markedIndices();if(!ids.length)return;state.review=true;$('library').close();go(ids[0])};
