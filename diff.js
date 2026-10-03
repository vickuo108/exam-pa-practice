// Case/punctuation-insensitive word alignment; keep mathematical operators.
const tokenPattern=()=>/[\p{N}]+(?:\.[\p{N}]+)+|[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[+−=<>≤≥%×÷^]|-(?=\s|\d)/gu;
export function tokenize(text){return text.match(tokenPattern())||[]}
const key=t=>t.toLowerCase().replaceAll('’',"'");
export function compare(reference,answer){
 const a=tokenize(reference),b=tokenize(answer);
 if(a.length>2500||b.length>2500)throw new Error('答案太長，請控制在 2,500 個單字以內。');
 const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=key(a[i])===key(b[j])?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 const runs=[];let i=0,j=0;
 function push(type,word){if(runs.at(-1)?.type===type)runs.at(-1).words.push(word);else runs.push({type,words:[word]});}
 while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&key(a[i])===key(b[j])){push('same',a[i++]);j++}else if(j<b.length&&(i===a.length||dp[i][j+1]>dp[i+1][j]))push('extra',b[j++]);else push('missing',a[i++]);}
 const groups=[];for(const run of runs){if(run.type==='same')groups.push(run);else{let group=groups.at(-1);if(!group||group.type==='same'){group={type:'change',missing:[],extra:[]};groups.push(group)}group[run.type].push(...run.words)}}
 return groups;
}

// Alignment ignores ordinary punctuation; display slices always use original text.
export function compareWithText(reference,answer){
 const groups=compare(reference,answer);
 const a=[...reference.matchAll(tokenPattern())],b=[...answer.matchAll(tokenPattern())];
 let i=0,j=0;
 const slice=(text,tokens,start,count)=>count?text.slice(start===0?0:tokens[start].index,start+count<tokens.length?tokens[start+count].index:text.length):'';
 return groups.length?groups.map(group=>{
  const ac=group.type==='same'?group.words.length:group.missing.length;
  const bc=group.type==='same'?group.words.length:group.extra.length;
  const referenceText=slice(reference,a,i,ac),answerText=slice(answer,b,j,bc);
  i+=ac;j+=bc;
  return {...group,referenceText,answerText};
 }):[{type:'same',words:[],referenceText:reference,answerText:answer}];
}
