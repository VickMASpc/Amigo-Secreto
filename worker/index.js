// Optional, restricted to the four storefront families. No credentials forwarded.
const allowed = /^(?:[a-z0-9-]+\.)*(?:shopee\.com\.br|shopee\.com|shope\.ee|shp\.ee|shein\.com|shein\.com\.br|shein\.top|mercadolivre\.com\.br|mercadolibre\.com|mercadolivre\.com|meli\.la|tiktok\.com|tiktokshop\.com|tiktokshop\.com\.br)$/i;
const originAllowed = o => o === 'https://vickmaspc.github.io' || /^http:\/\/localhost:\d+$/.test(o||'');
function validate(raw){const u=new URL(raw);if(u.protocol!=='https:'||u.port||u.username||u.password||!allowed.test(u.hostname))throw Error('Loja ou URL não permitida');return u;}
async function boundedText(res){const reader=res.body?.getReader();if(!reader)return '';let size=0,parts=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>5000000)throw Error('HTML excede 5 MB');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}const all=new Uint8Array(size);let at=0;for(const p of parts){all.set(p,at);at+=p.length;}return new TextDecoder().decode(all);}
export default {async fetch(request,env){
  const o=request.headers.get('Origin'), headers={'Access-Control-Allow-Origin':originAllowed(o)?o:'null','Vary':'Origin','Access-Control-Allow-Methods':'GET, OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
  const reply=(j,status=200)=>new Response(JSON.stringify(j),{status,headers});
  if(!originAllowed(o))return reply({error:'Origem não autorizada'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='GET')return reply({error:'Método inválido'},405);
  try{
    const q=new URL(request.url).searchParams;let url=validate(q.get('url'));
    if(q.get('render')==='1')return reply({error:'Renderização desativada neste Worker; use Jina Reader ou o importador local.'},501);
    const cacheUrl=new URL('https://amigo-import.invalid/');cacheUrl.searchParams.set('url',url.href);
    const key=new Request(cacheUrl.href), cached=await caches.default.match(key);if(cached)return new Response(cached.body,{headers});
    for(let i=0;i<6;i++){
      const res=await fetch(url.href,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'text/html,application/xhtml+xml','Accept-Language':'pt-BR,pt;q=0.9,en;q=0.5'}});
      if([301,302,303,307,308].includes(res.status)){const loc=res.headers.get('location');if(!loc)throw Error('Redirecionamento sem destino');url=validate(new URL(loc,url).href);continue;}
      if(!res.ok)return reply({error:'Loja respondeu HTTP '+res.status},502);
      if(!/html|xhtml/i.test(res.headers.get('content-type')||''))return reply({error:'Resposta não HTML'},502);
      const html=await boundedText(res), body=JSON.stringify({url:url.href,html});
      await caches.default.put(key,new Response(body,{headers:{'Cache-Control':'public, max-age=120'}})).catch(()=>{});
      return new Response(body,{headers});
    }throw Error('Muitos redirecionamentos');
  }catch(e){return reply({error:e.message},400);}
}};
