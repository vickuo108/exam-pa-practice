import test from 'node:test';import assert from 'node:assert/strict';import {compare,tokenize} from '../dist/diff.js';
const changes=(a,b)=>compare(a,b).filter(g=>g.type==='change');
test('ignores capitalization and punctuation only',()=>assert.deepEqual(changes('Some predictors include information.','some predictors include information!'),[]));
test('detects a missing negation',()=>assert.deepEqual(changes('information is not available','information is available'),[{type:'change',missing:['not'],extra:[]}]));
test('distinguishes opposing terminology',()=>assert.deepEqual(changes('increases variance','decreases variance'),[{type:'change',missing:['increases'],extra:['decreases']}]));
test('empty answer and extra text',()=>{assert.equal(changes('a b','')[0].missing.length,2);assert.equal(changes('','a b')[0].extra.length,2)});
test('mathematical operators retained',()=>{assert.ok(changes('alpha = 0','alpha > 0').length);assert.ok(changes('coefficient = -1','coefficient = 1').length)});
test('reconstructs both sides under insert/delete/reorder',()=>{for(const [a,b] of [['one two one three','one one two four'],['a b c','c b a'],['x ≤ 3','x ≥ 4']]){const gs=compare(a,b);assert.deepEqual(gs.flatMap(g=>g.type==='same'?g.words:g.missing),tokenize(a));assert.deepEqual(gs.flatMap(g=>g.type==='same'?g.words:g.extra),tokenize(b))}});
