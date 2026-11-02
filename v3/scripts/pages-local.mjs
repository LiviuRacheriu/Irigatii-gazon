import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, writeFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, join } from 'node:path';
const v3=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const repo=resolve(v3,'..');
const output=resolve(v3,'.staging/l2-publication');
const site=resolve(output,'site');
const prefix='/Irigatii-gazon';
const git=(...args)=>execFileSync('git',args,{cwd:repo});
const mode=process.argv[2];
if(mode==='prepare') {
  if(git('branch','--show-current').toString().trim()!=='develop/l2-polygons') throw new Error('Ramura L2 este obligatorie.');
  const base=git('rev-parse','gh-pages').toString().trim();
  const source=git('rev-parse','HEAD').toString().trim();
  // Refuse to overwrite an existing review package.
  await mkdir(output);
  await mkdir(site);
  const paths=git('ls-tree','-r','--name-only',base).toString().trim().split('\n');
  for(const path of paths) {
    if(path.startsWith('staging-l2/')) throw new Error('Baza conține deja staging-l2.');
    const target=resolve(site,path);
    if(relative(site,target).startsWith('..')) throw new Error('Cale invalidă.');
    await mkdir(dirname(target),{recursive:true});
    await writeFile(target,git('show',`${base}:${path}`));
  }
  await cp(resolve(v3,'dist-l2'),resolve(site,'staging-l2'),{recursive:true,errorOnExist:true,force:false});
  await writeFile(resolve(output,'manifest.json'),JSON.stringify({base,source,paths,createdAt:new Date().toISOString()},null,2));
  console.log(`Pachet local: ${site}\nBază gh-pages: ${base}\nSursă L2: ${source}`);
} else if(mode==='check'||mode==='serve') {
  const manifest=JSON.parse(await readFile(resolve(output,'manifest.json'),'utf8'));
  for(const path of manifest.paths) {
    if(!(await readFile(resolve(site,path))).equals(git('show',`${manifest.base}:${path}`))) throw new Error(`Fișier original modificat: ${path}`);
  }
  const files=new Map();
  async function walk(dir) {
    for(const entry of await readdir(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name);
      if(entry.isDirectory())await walk(path);
      else {
        const name=relative(site,path).replaceAll('\\','/');
        files.set(`${prefix}/${name}`,{data:await readFile(path),type:name.endsWith('.html')?'text/html':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'application/octet-stream'});
      }
    }
  }
  await walk(site);
  const server=createServer((req,res)=>{
    const path=new URL(req.url,'http://localhost').pathname;
    if([prefix,`${prefix}/staging`,`${prefix}/staging-l2`].includes(path)){res.writeHead(301,{Location:path+'/'});res.end();return;}
    const f=files.get(path.endsWith('/')?path+'index.html':path);
    if(!f){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':f.type,'Cache-Control':'no-store'});res.end(f.data);
  });
  await new Promise(resolve=>server.listen(mode==='serve'?4175:0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  if(mode==='serve')console.log(`Preview complet: ${origin}${prefix}/ (L1: staging/, L2: staging-l2/)`);
  else {
    try {
      for(const page of [`${prefix}/`,`${prefix}/staging/`,`${prefix}/staging-l2/`]) {
        const html=files.get(page+'index.html').data.toString();
        const assets=Array.from(html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),m=>new URL(m[1],origin+page).pathname);
        for(const path of [page,...assets]) {
          const res=await fetch(origin+path);const data=Buffer.from(await res.arrayBuffer());
          const expected=files.get(path.endsWith('/')?path+'index.html':path);
          if(!expected||res.status!==200||res.headers.get('content-type')!==expected.type||!data.equals(expected.data))throw new Error(`HTTP invalid: ${path}`);
          console.log(`200 ${expected.type} ${path} SHA256=${createHash('sha256').update(data).digest('hex')}`);
        }
      }
      console.log(`OK: ${manifest.paths.length} fișiere preexistente identice; toate cele 3 aplicații și asseturile JS/CSS verificate.`);
    } finally {server.close();}
  }
} else throw new Error('Folosește prepare, check sau serve.');
