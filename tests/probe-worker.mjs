const endpoint='https://amigo-secreto-import.vitruidor.workers.dev/';
const url=process.argv[2]||'https://br.shein.com/goods-p-13140805.html';
for(const render of [false,true]){
 const u=new URL(endpoint);u.searchParams.set('url',url);if(render)u.searchParams.set('render','1');
 try{
 const r=await fetch(u,{headers:{Origin:'https://vickmaspc.github.io'},signal:AbortSignal.timeout(35000)});
 const body=await r.text();let j;try{j=JSON.parse(body)}catch{}
 const h=j?.html||'', title=h.match(/<title[^>]*>([\s\S]{0,250}?)<\/title>/i)?.[1]||'';
 console.log(JSON.stringify({render,status:r.status,cors:r.headers.get('access-control-allow-origin'),url:j?.url,htmlLength:h.length,title,jsonLd:/application\/ld\+json/i.test(h),ogImage:/og:image/i.test(h),brl:/R\$\s*\d|BRL/i.test(h),error:j?.error||(!j?body.slice(0,200):undefined)}));
 }catch(e){console.error(render?'browser':'http',e.message);}
}
