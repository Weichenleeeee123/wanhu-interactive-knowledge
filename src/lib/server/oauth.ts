import { randomBytes } from "node:crypto";
export type ZhihuProfile={uid:string;hashId?:string;fullname?:string;avatarPath?:string;headline?:string;description?:string;url?:string};
export const oauthSessions = new Map<string,{state:string;createdAt:number;accessToken?:string;expiresAt?:number;profile?:ZhihuProfile}>();
export function cookie(name:string,value:string,maxAge:number,secure=false){return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`}
export function sessionId(){return randomBytes(24).toString("base64url")}
export function clearExpired(now=Date.now()){for(const [id,session] of oauthSessions){if(session.createdAt<now-10*60_000 && !session.accessToken)oauthSessions.delete(id);if(session.expiresAt&&session.expiresAt<now-60_000)oauthSessions.delete(id);}}
