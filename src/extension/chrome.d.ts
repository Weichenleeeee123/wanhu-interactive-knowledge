interface ExtensionSender { id?:string; url?:string; frameId?:number; tab?:{id?:number;url?:string}; }
declare const chrome: {
  runtime:{id:string;getURL:(path:string)=>string;sendMessage:(message:unknown)=>Promise<unknown>;onMessage:{addListener:(callback:(message:unknown,sender:ExtensionSender,reply:(response:unknown)=>void)=>boolean|void)=>void;removeListener:(callback:(message:unknown)=>void)=>void};onInstalled:{addListener:(callback:()=>void)=>void}};
  action:{onClicked:{addListener:(callback:(tab:{id?:number;url?:string})=>void)=>void}};
  tabs:{sendMessage:(id:number,message:unknown)=>Promise<unknown>;create:(options:{url:string})=>Promise<unknown>};
  storage:{local:{get:(key:string)=>Promise<Record<string,unknown>>;set:(items:Record<string,unknown>)=>Promise<void>}};
};
declare const __EXTENSION_CSS__:string;
declare const __BACKEND_URL__:string;

declare const __BRAND_ICON__:string;
