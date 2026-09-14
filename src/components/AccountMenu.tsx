"use client";
import { useEffect, useState } from "react";

export function AccountMenu() {
  const [profile,setProfile]=useState<{fullname?:string}|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    fetch('/api/me',{cache:'no-store'}).then(async r=>r.ok?r.json():null).then(data=>{if(active&&data?.authenticated)setProfile(data.profile||{});}).catch(()=>undefined);
    return()=>{active=false;};
  },[]);
  if(!profile)return <button className="account-login" onClick={()=>{
    const returnTo=location.pathname+location.search+location.hash;
    location.assign('/api/auth/zhihu/start?returnTo='+encodeURIComponent(returnTo));
  }}>知乎登录</button>;
  return <details className="account-menu"><summary>{profile.fullname||'知乎已连接'}</summary><div>
    <strong>已连接知乎</strong><p>作品仍保存在此浏览器，跨设备请使用分享链接或备份。</p>
    <button onClick={async()=>{try{const r=await fetch('/api/auth/zhihu/logout',{method:'POST'});if(!r.ok)throw Error();setProfile(null);}catch{setError('暂时无法退出，请重试。');}}}>退出登录</button>
    {error&&<p role="alert">{error}</p>}
  </div></details>;
}
