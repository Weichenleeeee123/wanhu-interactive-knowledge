import { NextResponse } from "next/server";
export const runtime="nodejs";
function authHeaders(){return {Authorization:`Bearer ${process.env.ZHIHU_ACCESS_SECRET||""}`,"X-Request-Timestamp":String(Math.floor(Date.now()/1000)),Accept:"application/json"};}
export async function GET(request:Request){
 if(!process.env.ZHIHU_ACCESS_SECRET)return NextResponse.json({error:"知乎知识库 API 尚未配置"},{status:503});
 const q=new URL(request.url).searchParams,id=q.get("baseId"),cursor=q.get("cursor"),limit=q.get("limit")||"20";
 const path=id?`/api/v1/knowledge/bases/${encodeURIComponent(id)}/items?${new URLSearchParams({...(cursor?{Cursor:cursor}:{}),Limit:limit})}`:`/api/v1/knowledge/bases?Scope=${encodeURIComponent(q.get("scope")||"all")}`;
 const r=await fetch(`https://developer.zhihu.com${path}`,{headers:authHeaders(),signal:AbortSignal.timeout(15000)});if(!r.ok)return NextResponse.json({error:"知乎知识库暂时不可用"},{status:502});return NextResponse.json(await r.json(),{headers:{"Cache-Control":"no-store"}});
}
