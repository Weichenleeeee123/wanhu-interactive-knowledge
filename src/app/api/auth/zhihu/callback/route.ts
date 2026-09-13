import { NextResponse } from "next/server";
import { oauthSessions,cookie,clearExpired } from "@/lib/server/oauth";
export const runtime="nodejs";
export async function GET(request:Request){
 clearExpired();
 const url=new URL(request.url),code=url.searchParams.get("authorization_code")||url.searchParams.get("code"),state=url.searchParams.get("state"),sid=request.headers.get("cookie")?.match(/(?:^|;\s*)wanhu_oauth=([^;]+)/)?.[1],sessionId=sid?decodeURIComponent(sid):undefined;
 const session=sessionId?oauthSessions.get(sessionId):undefined;
 if(!code||!state||!session||session.createdAt<Date.now()-10*60_000||state!==session.state||!sessionId)return NextResponse.json({error:"OAuth 回调无效或已过期"},{status:400});
 // Consume state before the upstream exchange: a replay must fail even if the first exchange is still in flight.
 oauthSessions.delete(sessionId);
 const appId=process.env.ZHIHU_OAUTH_APP_ID,appKey=process.env.ZHIHU_OAUTH_APP_KEY,redirect=process.env.ZHIHU_OAUTH_REDIRECT_URI;
 if(!appId||!appKey||!redirect)return NextResponse.json({error:"OAuth 服务端凭证未配置"},{status:503});
 const body=new URLSearchParams({app_id:appId,app_key:appKey,grant_type:"authorization_code",redirect_uri:redirect,code});
 const upstream=await fetch("https://openapi.zhihu.com/access_token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(15000)});
 const data=await upstream.json() as {access_token?:string;expires_in?:number};if(!upstream.ok||!data.access_token)return NextResponse.json({error:"知乎授权失败，请重试"},{status:502});
 const profileResponse=await fetch("https://openapi.zhihu.com/user",{headers:{Authorization:`Bearer ${data.access_token}`,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 const profile=await profileResponse.json() as {uid?:number|string;hash_id?:string;fullname?:string;avatar_path?:string;headline?:string;description?:string;url?:string};
 if(!profileResponse.ok||profile.uid===undefined)return NextResponse.json({error:"知乎用户信息读取失败，请重试"},{status:502});
 session.accessToken=data.access_token;session.expiresAt=Date.now()+(data.expires_in||7200)*1000;session.profile={uid:String(profile.uid),hashId:profile.hash_id,fullname:profile.fullname,avatarPath:profile.avatar_path,headline:profile.headline,description:profile.description,url:profile.url};oauthSessions.set(sessionId,session);
 const response=NextResponse.redirect(new URL("/create?oauth=success",request.url));response.headers.append("Set-Cookie",cookie("wanhu_oauth",sessionId,60*60*24*7,new URL(request.url).protocol==='https:'));return response;
}
