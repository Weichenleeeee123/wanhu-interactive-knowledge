import { spawnSync } from "node:child_process";
// Accept the short-lived repository credential via non-echoing stdin only.
if(process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");process.stdin.resume();
let input="";
console.log("Waiting for repository credential on private stdin.");
process.stdin.on("data",chunk=>{
  input+=chunk;
  if(!input.includes("\n")) return;
  process.stdin.pause();
  try {
    const {remote_url,branch,token}=JSON.parse(input.trim());
    const url=new URL(remote_url);
    if(url.protocol!=="https:" || url.hostname!=="git.chatgpt-team.site" || !/^[\w/-]+$/.test(branch) || !token) throw new Error("Invalid repository credential");
    const result=spawnSync("git",["push",remote_url,`HEAD:refs/heads/${branch}`],{cwd:process.cwd(),encoding:"utf8",windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:"0",GIT_CONFIG_COUNT:"1",GIT_CONFIG_KEY_0:"http.extraHeader",GIT_CONFIG_VALUE_0:`Authorization: Bearer ${token}`}});
    const output=(result.stdout??"")+(result.stderr??"");
    console.log(output.split(token).join("[redacted]"));
    process.exit(result.status??1);
  } catch {console.error("Source push failed.");process.exit(1);}
});
