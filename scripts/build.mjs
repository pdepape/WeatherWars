import{mkdir,rm,copyFile,readFile,writeFile}from'node:fs/promises';

const textFiles=['index.html','play.html','how-to-play.html','styles.css','app.js','game.js','manifest.webmanifest','sw.js'];
const contentTypes={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',webmanifest:'application/manifest+json; charset=utf-8'};

await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await mkdir('dist/weather-presenters',{recursive:true});

const bundled={};
for(const file of textFiles){
  await copyFile(file,`dist/${file}`);
  const extension=file.split('.').pop();
  bundled[`/${file}`]={body:await readFile(file,'utf8'),type:contentTypes[extension]};
}

const socialCard=await readFile('public/og-pixel-broadcast.jpg');
await copyFile('public/og-pixel-broadcast.jpg','dist/og-pixel-broadcast.jpg');
bundled['/og-pixel-broadcast.jpg']={base64:socialCard.toString('base64'),type:'image/jpeg'};

for(let index=1;index<=10;index++){
  const name=`presenter-${String(index).padStart(2,'0')}.webp`;
  const source=`public/weather-presenters/${name}`;
  const portrait=await readFile(source);
  if(portrait.byteLength>25_000)throw new Error(`${name} is too large to bundle`);
  await copyFile(source,`dist/weather-presenters/${name}`);
  bundled[`/weather-presenters/${name}`]={base64:portrait.toString('base64'),type:'image/webp'};
}
bundled['/']=bundled['/index.html'];

const worker=`const FILES=${JSON.stringify(bundled)};
const decode=(value)=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));
export default {async fetch(request){
  const url=new URL(request.url);
  const assetPath=url.pathname==='/public/og-pixel-broadcast.jpg'?'/og-pixel-broadcast.jpg':url.pathname.startsWith('/public/weather-presenters/')?url.pathname.slice(7):url.pathname;
  const file=FILES[assetPath];
  if(!file)return new Response('Not found',{status:404,headers:{'content-type':'text/plain; charset=utf-8'}});
  return new Response(file.base64?decode(file.base64):file.body,{status:200,headers:{'content-type':file.type,'cache-control':url.pathname.endsWith('.html')||url.pathname==='/'||url.pathname.endsWith('/sw.js')?'no-cache':'public, max-age=3600'}});
}};`;

await writeFile('dist/server/index.js',worker);
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
