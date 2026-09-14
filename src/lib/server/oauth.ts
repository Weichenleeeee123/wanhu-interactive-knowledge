import { randomBytes } from "node:crypto";
export type ZhihuProfile={uid:string;hashId?:string;fullname?:string;avatarPath?:string;headline?:string;description?:string;url?:string};
export const oauthSessions = new Map<string,{state:string;createdAt:number;returnTo?:string;accessToken?:string;expiresAt?:number;profile?:ZhihuProfile}>();
export function oauthReturnTo(value:string|null):string {
  if(!value||value.length>16000||!value.startsWith('/')||value.startsWith('//')||/[\\\r\n]/.test(value))return '/create';
  const url=new URL(value,'https://wanhu.asia');
  if(url.origin!=='https://wanhu.asia'||!['/','/create','/view','/library','/showcase','/extension'].includes(url.pathname))return '/create';
  return url.pathname+url.search+url.hash;
}
export function cookie(name:string,value:string,maxAge:number,secure=false){return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`}
export function sessionId(){return randomBytes(24).toString("base64url")}
export function clearExpired(now=Date.now()){for(const [id,session] of oauthSessions){if(session.createdAt<now-10*60_000 && !session.accessToken)oauthSessions.delete(id);if(session.expiresAt&&session.expiresAt<now-60_000)oauthSessions.delete(id);}}
