import{mkdir,rm,copyFile,readFile,writeFile}from'node:fs/promises';

const textFiles=['index.html','play.html','how-to-play.html','styles.css','app.js','game.js','manifest.webmanifest','sw.js'];
const contentTypes={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',webmanifest:'application/manifest+json; charset=utf-8'};

await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});

const bundled={};
for(const file of textFiles){
  await copyFile(file,`dist/${file}`);
  const extension=file.split('.').pop();
  bundled[`/${file}`]={body:await readFile(file,'utf8'),type:contentTypes[extension]};
}

await copyFile('public/og.png','dist/og.png');
bundled['/']=bundled['/index.html'];

const worker=`const FILES=${JSON.stringify(bundled)};
export default {async fetch(request){
  const url=new URL(request.url);
  const file=FILES[url.pathname];
  if(!file)return new Response('Not found',{status:404,headers:{'content-type':'text/plain; charset=utf-8'}});
  return new Response(file.body,{status:200,headers:{'content-type':file.type,'cache-control':url.pathname.endsWith('.html')||url.pathname==='/'?'no-cache':'public, max-age=3600'}});
}};`;

await writeFile('dist/server/index.js',worker);
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
