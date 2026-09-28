// Case/punctuation-insensitive word alignment; keep mathematical operators.
export function tokenize(text){return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[+−=<>≤≥%×÷^]|-(?=\d)/gu)||[]}
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
