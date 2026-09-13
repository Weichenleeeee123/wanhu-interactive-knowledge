import { randomBytes } from "node:crypto";
export const oauthSessions = new Map<string,{state:string;createdAt:number;accessToken?:string;expiresAt?:number}>();
export function cookie(name:string,value:string,maxAge:number){return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`}
export function sessionId(){return randomBytes(24).toString("base64url")}
