import { expect, it } from 'vitest';
import { readApiResponse } from '../src/lib/api-response';

it('turns Cloudflare HTML timeouts into an actionable error', async () => {
  await expect(readApiResponse(new Response('<!DOCTYPE html><h1>Gateway time-out</h1>', {status:504})))
    .rejects.toThrow(/超时.*保留/);
});
it('rejects HTML success pages without exposing parser errors or upstream HTML', async () => {
  await expect(readApiResponse(new Response('<!DOCTYPE html>private upstream details'))).rejects.toThrow('服务返回了非 JSON 数据，请稍后重试，材料已保留。');
});
it('preserves structured application errors and rejects malformed bodies', async () => {
  await expect(readApiResponse(Response.json({error:'请求过于频繁，请稍后再试'}, {status:429}))).rejects.toThrow('请求过于频繁');
  for(const data of [null,[],42,'text']) await expect(readApiResponse(Response.json(data))).rejects.toThrow(/格式/);
});
it('accepts valid generation and unsupported results', async () => {
  await expect(readApiResponse(Response.json({lesson:{title:'Elo'}}))).resolves.toEqual({lesson:{title:'Elo'}});
  await expect(readApiResponse(Response.json({unsupported:true,reason:'材料不足'}))).resolves.toEqual({unsupported:true,reason:'材料不足'});
});
it('handles oversized gateway responses without reading HTML or leaking internals', async () => {
  await expect(readApiResponse(new Response('x'.repeat(200000),{status:502}))).rejects.toThrow(/502/);
});
