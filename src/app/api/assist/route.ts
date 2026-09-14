import { AssistInputSchema, AssistResultSchema, assistPrompt } from '@/lib/assist';
import { createGenerationProvider } from '@/lib/server/generation-provider';
import { ServerError } from '@/lib/server/errors';
import { FixedWindowLimiter, requestIdentity } from '@/lib/server/rate-limit';
import { readJsonBody } from '@/lib/server/request';
import { errorResponse } from '@/lib/server/responses';

export const runtime='nodejs';
const limiter=new FixedWindowLimiter(15,10*60_000);
export async function POST(request:Request) {
  const deadline=Date.now()+45_000;
  try {
    if(!limiter.take(requestIdentity(request)))throw new ServerError('RATE_LIMITED','提问太频繁，请稍后再试');
    const input=AssistInputSchema.safeParse(await readJsonBody(request,160*1024,deadline));
    if(!input.success)throw new ServerError('BAD_REQUEST','请提供有效选段与问题，并确认发送材料');
    const provider=await createGenerationProvider(process.env,undefined,deadline);
    if(!provider)throw new ServerError('UNCONFIGURED','辅助服务尚未配置');
    const result=AssistResultSchema.safeParse({answer:await provider({prompt:assistPrompt(input.data),repair:false,deadline})});
    if(!result.success)throw new ServerError('UPSTREAM_FAILURE','回答格式异常，请重试');
    return Response.json(result.data,{headers:{'Cache-Control':'no-store'}});
  }catch(error){return errorResponse(error);}
}
