export function saveBrowserCard(storage,cards,{id,question,answer}) {
 question=question.trim();answer=answer.trim();
 if(!question||!answer)throw new Error('請填寫題目和參考答案。');
 if(question.length>1000||answer.length>12000)throw new Error('題目最多 1,000 字，答案最多 12,000 字。');
 const original=id?cards.find(c=>c.id===id):null;
 if(id&&!original)throw new Error('找不到要編輯的題目。');
 if(cards.some(c=>c.id!==id&&c.question===question&&c.answer===answer))throw new Error('題庫已有相同題目與答案。');
 const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pictures=original?.answerHtml.match(/<img\b[^>]*>/gi)||[];
 const card={...original,id:id||'custom-'+globalThis.crypto.randomUUID(),category:original?.category||'自訂',question,answer,
 answerHtml:original?.answer===answer?original.answerHtml:'<p>'+escape(answer).replace(/\n/g,'<br>')+'</p>'+pictures.join(''),
 custom:original?!!original.custom:true,edited:!!original};
 // Keep only this browser's own additions and edits; published cards come from cards.json.
 let saved=[];try{saved=JSON.parse(storage.getItem?.('pa-custom-cards')||'[]')}catch{}
 if(!Array.isArray(saved))saved=[];
 saved=saved.filter(c=>c.id!==id);
 saved.push(card);
 try{storage.setItem('pa-custom-cards',JSON.stringify(saved));}catch{throw new Error('此瀏覽器無法儲存題目，請先複製內容備份，或釋放儲存空間後重試。');}
 return card;
}
