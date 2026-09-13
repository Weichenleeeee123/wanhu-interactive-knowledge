import { NextResponse } from "next/server";
import { oauthSessions,cookie } from "@/lib/server/oauth";
export const runtime="nodejs";
export async function POST(request:Request){
 const sid=request.headers.get("cookie")?.match(/(?:^|;\s*)wanhu_oauth=([^;]+)/)?.[1];
 if(sid)oauthSessions.delete(decodeURIComponent(sid));
 const response=NextResponse.json({ok:true});
 response.headers.append("Set-Cookie",cookie("wanhu_oauth","",0,new URL(request.url).protocol==='https:'));
 return response;
}
