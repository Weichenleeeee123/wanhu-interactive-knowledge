import { handleApi, type Environment } from "./api";
declare const __APP_JS__: string;
declare const __APP_CSS__: string;
declare const __ICON__: string;
declare const __ASSET_ID__: string;
const baseHeaders = { "X-Content-Type-Options":"nosniff", "Referrer-Policy":"strict-origin-when-cross-origin" };
const shell = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>知玩 · 可交互知识工坊</title><meta name="description" content="把知乎的好问题，变成可以预测、操作、验证的互动知识作品。"><meta name="theme-color" content="#273e34"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/app-${__ASSET_ID__}.css"><script type="module" src="/assets/app-${__ASSET_ID__}.js"></script></head><body><div id="root"><p style="padding:48px;font-family:system-ui">知玩 · 正在打开知识工坊…</p></div><noscript>请启用 JavaScript，体验可以操作的知识实验。</noscript></body></html>`;
export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/")) return handleApi(request,env);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", {status:405, headers:{...baseHeaders,Allow:"GET, HEAD"}});
    const respond = (text: string, type: string, immutable = false) => new Response(request.method === "HEAD" ? null : text, {headers:{...baseHeaders,"Content-Type":type,"Cache-Control":immutable ? "public, max-age=31536000, immutable" : "no-cache"}});
    if (path === `/assets/app-${__ASSET_ID__}.js`) return respond(__APP_JS__,"application/javascript; charset=utf-8",true);
    if (path === `/assets/app-${__ASSET_ID__}.css`) return respond(__APP_CSS__,"text/css; charset=utf-8",true);
    if (path === "/icon.svg" || path === "/favicon.ico") return respond(__ICON__,"image/svg+xml");
    if (["/","/create","/view","/library"].includes(path)) {
      const response = respond(shell,"text/html; charset=utf-8");
      response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
      return response;
    }
    return new Response(request.method === "HEAD" ? null : "页面不存在",{status:404,headers:baseHeaders});
  },
};
