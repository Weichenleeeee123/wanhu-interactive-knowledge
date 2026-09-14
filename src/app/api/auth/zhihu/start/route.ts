import { NextResponse } from "next/server";
import { oauthSessions,sessionId,cookie,clearExpired,oauthReturnTo } from "@/lib/server/oauth";
export const runtime="nodejs";
export async function GET(request:Request){
 clearExpired();
 const appId=process.env.ZHIHU_OAUTH_APP_ID, redirect=process.env.ZHIHU_OAUTH_REDIRECT_URI;
 if(!appId||!redirect)return NextResponse.json({error:"OAuth 尚未配置，请设置 ZHIHU_OAUTH_APP_ID 和 ZHIHU_OAUTH_REDIRECT_URI"},{status:503});
 const sid=sessionId(),state=sessionId();oauthSessions.set(sid,{state,createdAt:Date.now(),returnTo:oauthReturnTo(new URL(request.url).searchParams.get('returnTo'))});
 const url=new URL("https://openapi.zhihu.com/authorize");url.searchParams.set("redirect_uri",redirect);url.searchParams.set("app_id",appId);url.searchParams.set("response_type","code");url.searchParams.set("state",state);
 const response=NextResponse.redirect(url);response.headers.append("Set-Cookie",cookie("wanhu_oauth",sid,600,new URL(request.url).protocol==='https:'));return response;
}
