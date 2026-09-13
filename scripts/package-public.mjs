import { mkdir, cp, lstat, readdir, readFile } from "node:fs/promises";
import { resolve, relative, join } from "node:path";
import { spawnSync } from "node:child_process";
// The bundled Sites packager removes staging. This equivalent retains all files per AGENTS.md.
const root=process.cwd(); const stamp=Date.now();
const stage=resolve(".artifacts",`package-${stamp}`); const archive=resolve(".artifacts",`wanhu-${stamp}.tgz`);
async function verify(dir) { for(const name of await readdir(dir)) {
  const file=join(dir,name); const info=await lstat(file);
  if(info.isSymbolicLink() || relative(root,file).startsWith("..")) throw new Error("Unsafe package path");
  if(info.isDirectory()) await verify(file); else if(!info.isFile()) throw new Error("Non-regular package entry");
} }
await verify(resolve("dist"));
const manifest=JSON.parse(await readFile("dist/.openai/hosting.json","utf8"));
if(!manifest.project_id || manifest.d1!=="DB") throw new Error("Invalid hosting manifest");
await lstat("dist/server/index.js");
await mkdir(join(stage,"dist","server"),{recursive:true});
await cp("dist/server/index.js",join(stage,"dist/server/index.js"));
await cp("dist/.openai",join(stage,"dist/.openai"),{recursive:true});
const result=spawnSync("tar",["-czf",archive,"-C",stage,"dist"],{stdio:"inherit",windowsHide:true});
if(result.status!==0) throw new Error("Archive creation failed");
const listing=spawnSync("tar",["-tzf",archive],{encoding:"utf8",windowsHide:true});
if(listing.status!==0 || !listing.stdout.includes("dist/server/index.js") || !listing.stdout.includes("dist/.openai/hosting.json")) throw new Error("Archive validation failed");
console.log(archive);console.log(listing.stdout);
