import test from 'node:test';
import assert from 'node:assert/strict';
import {saveBrowserCard} from '../local-cards.js';
const storage=()=>({setItem(k,v){this[k]=v}});
test('new question survives reload and escapes HTML',()=>{const s=storage();const c=saveBrowserCard(s,[],{question:'Q',answer:'<script>alert(1)</script>\nA'});assert.equal(JSON.parse(s['pa-custom-cards'])[0].id,c.id);assert.ok(c.answerHtml.includes('&lt;script&gt;'));assert.ok(c.answerHtml.includes('<br>'));});
test('edit preserves ID, category and pictures, replaces saved override',()=>{const s=storage();const c={id:'1',category:'定義',question:'Q',answer:'A',answerHtml:'<p>A</p><img src="media-9.png">'};const edit=saveBrowserCard(s,[c],{id:'1',question:'Q',answer:'B'});saveBrowserCard(s,[edit],{id:'1',question:'Q2',answer:'C'});const saved=JSON.parse(s['pa-custom-cards']);assert.equal(saved.length,1);assert.equal(saved[0].id,'1');assert.equal(saved[0].category,'定義');assert.ok(saved[0].answerHtml.includes('media-9.png'));});
test('storage failure and duplicates do not mutate live cards',()=>{const cards=[{id:'1',question:'Q',answer:'A'}];assert.throws(()=>saveBrowserCard(storage(),cards,{question:'Q',answer:'A'}));assert.throws(()=>saveBrowserCard({setItem(){throw Error()}},cards,{question:'new',answer:'A'}));assert.equal(cards.length,1);});
