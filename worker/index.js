import { analyze, MODEL } from './screenshot.js';
// Optional, restricted to the four storefront families. No credentials forwarded.
const allowed = /^(?:[a-z0-9-]+\.)*(?:shopee\.com\.br|shopee\.com|shope\.ee|shp\.ee|shein\.com|shein\.com\.br|shein\.top|mercadolivre\.com\.br|mercadolibre\.com|mercadolivre\.com|meli\.la|tiktok\.com|tiktokshop\.com|tiktokshop\.com\.br)$/i;
const originAllowed = o => o === 'https://vickmaspc.github.io' || /^http:\/\/localhost:\d+$/.test(o||'');
function validate(raw){const u=new URL(raw);if(u.protocol!=='https:'||u.port||u.username||u.password||!allowed.test(u.hostname))throw Error('Loja ou URL não permitida');return u;}
async function boundedText(res){const reader=res.body?.getReader();if(!reader)return '';let size=0,parts=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>5000000)throw Error('HTML excede 5 MB');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}const all=new Uint8Array(size);let at=0;for(const p of parts){all.set(p,at);at+=p.length;}return new TextDecoder().decode(all);}
export default {async fetch(request,env){
  const o=request.headers.get('Origin'), headers={'Access-Control-Allow-Origin':originAllowed(o)?o:'null','Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
  const reply=(j,status=200)=>new Response(JSON.stringify(j),{status,headers});
  if(request.method==='GET'&&new URL(request.url).pathname==='/'&&!new URL(request.url).searchParams.has('url'))return reply({ok:true,service:'amigo-secreto-import',version:7,browser:!!env.BROWSER,screenshot:!!env.GEMINI_API_KEY,model:MODEL});
  if(!originAllowed(o))return reply({error:'Origem não autorizada'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(new URL(request.url).pathname==='/screenshot'){if(request.method!=='POST')return reply({error:'Use POST'},405);try{return await analyze(request,env,reply);}catch{return reply({error:'Falha no serviço de análise de prints.'},500);}}
  if(request.method!=='GET')return reply({error:'Método inválido'},405);
  try{
    const q=new URL(request.url).searchParams;let url=validate(q.get('url'));
    if(q.get('render')==='1'){
      if(!env.BROWSER)return reply({error:'Browser Run não configurado'},501);
      // Restrict browser requests to storefronts and their known public asset domains.
      const pattern='/^https:\\/\\/(?:[a-z0-9-]+\\.)*(?:shopee\\.com\\.br|shopee\\.com|shope\\.ee|shp\\.ee|susercontent\\.com|shopeemobile\\.com|shein\\.com|shein\\.com\\.br|shein\\.top|ltwebstatic\\.com|sheincorp\\.com|mercadolivre\\.com\\.br|mercadolibre\\.com|mercadolivre\\.com|meli\\.la|mlstatic\\.com|tiktok\\.com|tiktokshop\\.com|tiktokshop\\.com\\.br|tiktokcdn\\.com|tiktokcdn-us\\.com|byteoversea\\.com|ibytedtos\\.com)(?:\\/|$)/i';
      const res=await env.BROWSER.quickAction('content',{url:url.href,allowRequestPattern:[pattern],rejectResourceTypes:['image','media','font'],gotoOptions:{waitUntil:'networkidle2',timeout:15000}});
      if(!res.ok){const detail=(await res.text()).slice(0,350);return reply({error:'Browser Run HTTP '+res.status+' '+detail},502);}
      const raw=await boundedText(res);let j;try{j=JSON.parse(raw)}catch{}
      const html=typeof j?.result==='string'?j.result:typeof j?.result?.html==='string'?j.result.html:raw;
      if(!/<html\b|<!doctype html/i.test(html))return reply({error:'Browser Run não retornou HTML: '+raw.slice(0,200)},502);
      return reply({url:url.href,html,browserMs:res.headers.get('X-Browser-Ms-Used')});
    }
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
