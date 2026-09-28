import instructions from './instructions.js';
import {timingSafeEqual} from 'node:crypto';

async function boundedJSON(stream, maxBytes) {
  if (!stream) throw new Error('Empty body');
  const reader = stream.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('Too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'Vary':'Origin', 'X-Content-Type-Options':'nosniff'};
    if (origin === env.ALLOWED_ORIGIN) headers['Access-Control-Allow-Origin'] = origin;
    const json = (status, body) => new Response(JSON.stringify(body), {status, headers});
    if (origin && origin !== env.ALLOWED_ORIGIN) return json(403, {error:'不允許的存取來源。'});
    const path = new URL(request.url).pathname;
    if (!['/api/status', '/api/check'].includes(path)) return json(404, {error:'找不到此功能。'});
    if (request.method === 'OPTIONS') return new Response(null, {status:204, headers:{...headers, 'Access-Control-Allow-Methods':'GET, POST, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type, X-PA-Token', 'Access-Control-Max-Age':'600'}});
    if (path === '/api/status' && request.method === 'GET') return json(200, {available:!!(env.OPENAI_API_KEY && env.PA_ACCESS_CODE), model:env.OPENAI_MODEL, requiresAccessCode:true});
    if (path !== '/api/check' || request.method !== 'POST') return json(405, {error:'不支援的請求方式。'});
    if (!env.OPENAI_API_KEY || !env.PA_ACCESS_CODE) return json(503, {error:'AI 服務尚未設定完成。'});
    const token = new TextEncoder().encode(request.headers.get('X-PA-Token') || '');
    const expected = new TextEncoder().encode(env.PA_ACCESS_CODE);
    if (token.length !== expected.length || !timingSafeEqual(token, expected)) return json(401, {error:'AI 使用碼不正確，請重新輸入。'});
    let input;
    try {
      if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') throw new Error();
      const data = await boundedJSON(request.body, 100000);
      const card = data.card;
      const valid = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
      if (!valid(card?.question,1000) || !valid(card?.answer,12000) || !valid(data.answer,12000) || typeof card.hasImages !== 'boolean') throw new Error();
      input = {question:card.question, reference:card.answer, student_answer:data.answer, reference_has_images:card.hasImages};
    } catch { return json(400, {error:'請輸入有效題目與答案；題目最多 1,000 字，答案最多 12,000 字。'}); }
    try {
      if (!(await env.AI_LIMITER.limit({key:'pa-owner'})).success) return json(429, {error:'檢查次數較多，請稍候一分鐘再試。'});
      const upstream = await fetch('https://api.openai.com/v1/responses', {
        method:'POST', headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`, 'Content-Type':'application/json'},
        body:JSON.stringify({model:env.OPENAI_MODEL, store:false, instructions, input:JSON.stringify(input), max_output_tokens:1600}),
        signal:AbortSignal.timeout(50000)
      });
      if (!upstream.ok) {
        await upstream.body?.cancel();
        const errors = {401:'OpenAI 金鑰無效或已失效。',403:'這個金鑰無權使用所選模型。',404:'這個帳號無法使用所選模型。',429:'OpenAI 額度不足或請求過於頻繁，請檢查 API 帳戶額度。'};
        return json(502, {error:errors[upstream.status] || 'OpenAI 暫時無法處理，請稍後重試。'});
      }
      const data = await boundedJSON(upstream.body, 262144);
      const feedback = (data.output || []).filter(x=>x.type==='message').flatMap(x=>x.content || []).filter(x=>x.type==='output_text').map(x=>x.text).join('\n').trim();
      if (data.status !== 'completed' || !feedback) throw new Error();
      return json(200, {feedback, model:env.OPENAI_MODEL});
    } catch { return json(502, {error:'AI 回應逾時或不完整，答案仍保留，請稍後重試。'}); }
  }
};
