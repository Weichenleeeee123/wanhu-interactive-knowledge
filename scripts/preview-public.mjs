import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../dist/server/index.js";
// Ephemeral local SQLite exercises the same migrations. No credentials are loaded.
const sqlite = new DatabaseSync(":memory:");
for(const file of readdirSync("drizzle").filter(f=>f.endsWith(".sql"))) sqlite.exec(readFileSync(`drizzle/${file}`,"utf8"));
const DB = {prepare(sql) {let args=[]; const stmt={bind(...values){args=values;return stmt;},async first(){return sqlite.prepare(sql).get(...args)??null;},async run(){return sqlite.prepare(sql).run(...args);}};return stmt;}};
const port = Number(process.env.PORT ?? 3002);
createServer(async(req,res)=>{
  try {
    const chunks=[]; let bytes=0;
    for await(const chunk of req){bytes+=chunk.length;if(bytes>128*1024){res.writeHead(413);res.end();return;}chunks.push(chunk);}
    const method=req.method??"GET";
    const request=new Request(`http://localhost:${port}${req.url}`,{method,headers:req.headers,...(!["GET","HEAD"].includes(method)?{body:Buffer.concat(chunks)}:{})});
    const response=await worker.fetch(request,{DB});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  } catch {res.writeHead(500);res.end("Preview failure");}
}).listen(port,"127.0.0.1",()=>console.log(`Public Worker preview: http://localhost:${port}`));
