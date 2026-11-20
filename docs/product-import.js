// Shared by Vite source and the already-published GitHub Pages build.
const bad = /captcha|robot check|access denied|just a moment|attention required|verifica[cç][aã]o de seguran[cç]a|p[aá]gina n[aã]o encontrada|pardon our interruption|403 forbidden|sign in|log in|fa[cç]a login|security check|cloudflare|access restricted/i;
const stores = [
  [/^(?:.+\.)?(?:shopee\.com\.br|shopee\.com|shope\.ee|shp\.ee|s\.shopee\.com\.br)$/i,'Shopee'],
  [/^(?:.+\.)?(?:shein\.com|shein\.com\.br|shein\.top)$/i,'SHEIN'],
  [/^(?:.+\.)?(?:mercadolivre\.com\.br|mercadolibre\.com|mercadolivre\.com|meli\.la|ml\.com\.br)$/i,'Mercado Livre'],
  [/^(?:.+\.)?(?:tiktok\.com|tiktokshop\.com|tiktokshop\.com\.br)$/i,'TikTok Shop'],
];
const clean = v => typeof v === 'string' ? v.replace(/\s+/g,' ').trim() : '';
function safeUrl(v,base) {
  if(typeof v!=='string'||!v.trim())return '';
  try { const u=new URL(v.trim(),base); return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:''; } catch{return '';}
}
export function storeOf(url) {try {const host=new URL(url).hostname;return stores.find(([r])=>r.test(host))?.[1]||host.replace(/^(www|m|loja|store)\./,'').split('.')[0];}catch{return '';}}
function titleOf(v) {const s=clean(v);return s.length>=4&&!bad.test(s)&&!/^(shopee|shein|mercado livre|tiktok shop|tiktok|home|in[ií]cio|undefined|null)(?:\s*[-|–].*)?$/i.test(s)?s.slice(0,300):'';}
function imgOf(v,base) {if(Array.isArray(v))v=v[0];if(v&&typeof v==='object')v=v.url||v.contentUrl||v.src; const s=safeUrl(v,base);return s&&!/(?:favicon|sprite|\/logo[_.\/-]|placeholder|\.svg(?:\?|$))/i.test(s)?s:'';}
export function priceOf(v) {
  if(typeof v==='number')return Number.isFinite(v)&&v>0&&v<1000000?v:undefined;
  if(typeof v!=='string')return;
  let s=v.trim().replace(/^R\$\s*/i,'').replace(/\s/g,'');
  if(!/^\d+(?:[.,]\d+)*$/.test(s))return;
  if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
  else if(/^\d{1,3}(?:\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  return priceOf(Number(s));
}
function currencyPrice(v,currency) {return !currency||/^(BRL|R\$)$/i.test(currency)?priceOf(v):undefined;}
export function fromText(input,url='') {
  const lines=String(input||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(bad.test(lines.slice(0,3).join(' ')))return {};
  const titleLine=lines.find(l=>/^(?:title|t[ií]tulo|nome do produto|produto)\s*:/i.test(l));
  const heading=lines.find(l=>/^#{1,2}\s+/.test(l)&&titleOf(l.replace(/^#+\s*/,'')));
  const fallback=lines.find(l=>l.length>=8&&l.length<=220&&!/https?:\/\/|R\$|^\d|frete|cupom|comprar|Confira|aproveite|clique|markdown content|url source|data|avalia[cç]|vendidos|loja oficial|desconto|parcel|login/i.test(l));
  const title=titleOf(titleLine?.replace(/^[^:]+:\s*/,''))||titleOf(heading?.replace(/^#+\s*/,''))||titleOf(fallback);
  // Do not mistake a price from a coupon, shipping charge or instalment for the product.
  const good=lines.filter(l=>!/frete|cupom|cashback|economiz|desconto de|off\b|parcel|por m[eê]s|(?:\d+\s*x\b)|a partir|pre[cç]o original|de R\$|riscado/i.test(l));
  const preferred=good.filter(l=>/^(?:pre[cç]o(?: atual| final| [aà] vista)?\s*:|por\s+R\$|R\$)/i.test(l));
  const hits=(preferred.length?preferred:good).flatMap(l=>Array.from(l.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:[,.]\d{2})?)(?![\d.,])/gi),m=>priceOf(m[1]))).filter(Boolean);
  const unique=[...new Set(hits)];
  const rawImg=lines.find(l=>/^!\[[^\]]*\]\(https?:\/\//.test(l))?.match(/\((https?:\/\/[^)\s]+)\)/)?.[1];
  return {title,price:unique.length===1?unique[0]:undefined,image:imgOf(rawImg,url)};
}
export function normalize(raw) {
  const s=String(raw||'').trim(); const found=s.match(/https?:\/\/[^\s<>"']+/i);
  let url=found?found[0].replace(/[)\],;.!]+$/,''):s;
  if(!/^https?:\/\//i.test(url))url='https://'+url;
  const u=safeUrl(url); if(!u||!new URL(u).hostname.includes('.'))throw Error('Cole um link de produto válido.');
  return u;
}
function candidates(url) {
  const u=new URL(url), list=[url], h=u.hostname;
  if(/shopee/i.test(h)) {
    const m=u.pathname.match(/(?:-i\.|\/product\/)(\d+)[./](\d+)/);
    if(m)list.push('https://shopee.com.br/product/'+m[1]+'/'+m[2]);
  }
  if(/shein/i.test(h)) {
    const p=u.searchParams.get('goods_id')||u.pathname.match(/-p-(\d+)/)?.[1];
    if(p&&/^\d+$/.test(p))list.push('https://br.shein.com/product-p-'+p+'.html');
  }
  if(/mercadolivre|mercadolibre/i.test(h)) {
    const m=u.pathname.match(/\/p\/(MLB\d+)/i);
    const item=u.searchParams.get('item_id')||u.searchParams.get('wid')||u.hash.match(/wid=(MLB-?\d+)/i)?.[1];
    if(item&&/^MLB-?\d+$/i.test(item))list.push('https://produto.mercadolivre.com.br/'+item.replace(/^MLB-?/i,'MLB-')+'-_JM');
    else if(m)list.push('https://www.mercadolivre.com.br/p/'+m[1].toUpperCase());
  }
  // Keep original parameters: SHEIN and social links often encode routing in them.
  return [...new Set(list)];
}
function productId(url) {
  try { const u=new URL(url); const id=u.pathname.match(/(?:^|\/)(MLB-?\d+)(?:[-/]|$)/i)?.[1]; const item=u.searchParams.get('item_id')||u.searchParams.get('wid')||u.hash.match(/wid=(MLB-?\d+)/i)?.[1]; return /^MLB-?\d+$/i.test(item||'')?item.replace('-',''):id&&!u.pathname.includes('/p/')?id.replace('-',''):'';}catch{return '';}
}
function parseProducts(doc,url) {
  const result=[];const visit=(v,depth=0)=>{
    if(!v||typeof v!=='object'||depth>12)return;
    if(Array.isArray(v)){v.slice(0,100).forEach(x=>visit(x,depth+1));return;}
    const type=Array.isArray(v['@type'])?v['@type']:[v['@type']];
    if(type.includes('Product')||type.includes('ProductGroup')) {
      const offer=Array.isArray(v.offers)?v.offers.length===1?v.offers[0]:null:v.offers;
      const p=offer&&(!offer.lowPrice||String(offer.lowPrice)===String(offer.highPrice))?currencyPrice(offer.price??offer.lowPrice,offer.priceCurrency):undefined;
      result.push({title:titleOf(v.name),description:clean(v.description),image:imgOf(v.image,url),price:p,url:safeUrl(v.url,url),score:80});
    }
    for(const key of ['@graph','mainEntity','itemListElement','item','hasVariant'])if(v[key])visit(v[key],depth+1);
  };
  for(const node of doc.querySelectorAll('script[type="application/ld+json"]'))try{visit(JSON.parse(node.textContent));}catch{}
  return result;
}
// Match storefront state to the exact product identifier rather than recommendations.
function embeddedProduct(doc,url) {
  const u=new URL(url), store=storeOf(url), out=[];
  let id='', shop='';
  if(store==='Shopee'){const m=u.pathname.match(/(?:-i\.|\/product\/)(\d+)[./](\d+)/);if(m){shop=m[1];id=m[2];}}
  else if(store==='SHEIN')id=u.searchParams.get('goods_id')||u.pathname.match(/-p-(\d+)/)?.[1]||'';
  else if(store==='TikTok Shop')id=u.searchParams.get('product_id')||u.pathname.match(/\/(?:product|pdp)\/(?:[^/]+\/)?(\d{8,})(?:\/|$)/)?.[1]||'';
  if(!id)return;
  function inspect(root){
    const queue=[root];let count=0;
    while(queue.length&&count++<50000){
      const v=queue.pop();if(!v||typeof v!=='object')continue;
      if(!Array.isArray(v)){
        let p;
        if(store==='Shopee'&&String(v.itemid??v.itemId??'')===id&&String(v.shopid??v.shopId??'')===shop){
          const min=v.price_min??v.priceMin??v.price,max=v.price_max??v.priceMax??v.price;
          const price=typeof min==='number'&&min===max&&min>=100000&&/\.com\.br$/.test(u.hostname)?priceOf(min/100000):undefined;
          let image=v.image||v.images?.[0];if(typeof image==='string'&&/^[A-Za-z0-9_-]{15,}$/.test(image))image='https://down-br.img.susercontent.com/file/'+image;
          p={title:titleOf(v.name||v.title),image:imgOf(image,url),description:clean(v.description),price};
        }else if(store==='SHEIN'&&String(v.goods_id??v.goodsId??'')===id){
          const sale=v.salePrice??v.sale_price;const amount=sale?.amount??sale?.value??sale;
          const price=typeof amount==='string'&&/^R\$/i.test(amount.trim())?priceOf(amount):sale?.currency==='BRL'?priceOf(amount):undefined;
          p={title:titleOf(v.goods_name||v.goodsName),image:imgOf(v.goods_img||v.goodsImg||v.image,url),price};
        }else if(store==='TikTok Shop'&&String(v.product_id??v.productId??'')===id){
          const sale=v.sale_price??v.salePrice??v.price;
          const formatted=sale?.formatted_price??sale?.formattedPrice??sale?.price_str??sale;
          const price=typeof formatted==='string'&&/^R\$/i.test(formatted.trim())?priceOf(formatted):sale?.currency==='BRL'?priceOf(sale.amount??sale.value):undefined;
          p={title:titleOf(v.product_name||v.productName||v.title),image:imgOf(v.image||v.cover||v.images?.[0],url),description:clean(v.description),price};
        }
        if(p?.title)out.push({...p,score:93});
      }
      for(const child of Object.values(v))if(child&&typeof child==='object')queue.push(child);
    }
  }
  for(const script of doc.querySelectorAll('script[type="application/json"],script#__NEXT_DATA__,script#__UNIVERSAL_DATA_FOR_REHYDRATION__,script#SIGI_STATE')){
    const txt=script.textContent||'';if(txt.length>5000000)continue;
    try{inspect(JSON.parse(txt));}catch{}
  }
  if(!out.length)return;
  const best=out.find(x=>x.price&&x.image)||out.find(x=>x.image)||out[0];
  const prices=[...new Set(out.map(x=>x.price).filter(Boolean))];
  return {...best,price:prices.length===1?prices[0]:undefined};
}

export function fromHTML(markup,url) {
  if(typeof markup!=='string'||markup.length<30)return {};
  const doc=new DOMParser().parseFromString(markup,'text/html');
  const meta=(...keys)=>{for(const k of keys){const n=Array.from(doc.querySelectorAll('meta')).find(m=>[m.getAttribute('property'),m.getAttribute('name'),m.getAttribute('itemprop')].includes(k));if(n?.content)return n.content;}return '';};
  const pageTitle=meta('og:title','twitter:title')||doc.title;
  if(bad.test(pageTitle))return {};
  const items=parseProducts(doc,url), pageH1=titleOf(doc.querySelector('h1')?.textContent);
  const current=new URL(url);
  const matched=items.filter(p=>{try{return p.url&&new URL(p.url).pathname===current.pathname;}catch{return false;}});
  const selected=embeddedProduct(doc,url)||(matched.length===1?matched[0]:items.length===1?items[0]:undefined);
  const curr=meta('product:price:currency','og:price:currency','priceCurrency');
  const priceTag=currencyPrice(meta('product:price:amount','og:price:amount','price'),curr);
  const itempropPrice=doc.querySelector('[itemprop="price"]');
  const scopedPrice=currencyPrice(itempropPrice?.getAttribute('content')||itempropPrice?.textContent,curr);
  const title=selected?.title||pageH1||titleOf(pageTitle);
  if(!title)return {};
  return {title,description:selected?.description||clean(meta('og:description','description','twitter:description')),image:selected?.image||imgOf(meta('og:image','twitter:image','og:image:secure_url'),url),price:selected?.price??priceTag??scopedPrice,score:selected?.score|| (selected?90:60)};
}
const timeout=async (url,ms=12000,opts={})=>{
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),ms);
  try {const response=await fetch(url,{...opts,signal:controller.signal,credentials:'omit'});if(!response.ok)throw Error('HTTP '+response.status); const body=await response.text();if(body.length>6500000)throw Error('resposta muito grande');return {body,response};}
  finally{clearTimeout(timer);}
};
const fromJSON=(d,url)=>({title:titleOf(d.title||d.name),description:clean(d.description),image:imgOf(d.image?.url||d.image||d.images?.[0]||d.pictures?.[0]?.secure_url||d.thumbnail,url),price:currencyPrice(d.price?.amount??d.price,d.currency_id||d.currency||d.priceCurrency),url:safeUrl(d.url,url),score:45});
const DEFAULT_WORKER = 'https://amigo-secreto-import.vitruidor.workers.dev';
function getWorker() {try{return safeUrl(localStorage.getItem('amigo-product-worker'))||DEFAULT_WORKER;}catch{return DEFAULT_WORKER;}}
function cacheKey(url){return 'product-import-v5:'+url;}
function cacheGet(url){try{const v=JSON.parse(sessionStorage.getItem(cacheKey(url)));return v&&Date.now()-v.time<300000?v.value:null;}catch{return null;}}
function cachePut(url,value){try{sessionStorage.setItem(cacheKey(url),JSON.stringify({time:Date.now(),value}));}catch{}}
export async function importProduct(raw,knownStore='') {
  const normalizedUrl=normalize(raw), cached=cacheGet(normalizedUrl);if(cached)return cached;
  const options=candidates(normalizedUrl), diagnostics=[], entries=[];
  const add=async (source,fn)=>{try{const p=await fn();if(p&&(p.title||p.image||p.price)){entries.push({...p,source});diagnostics.push(source+': dados encontrados');}else diagnostics.push(source+': sem dados de produto');}catch(e){diagnostics.push(source+': '+(e.name==='AbortError'?'tempo limite':e.message||'falhou'));}};
  const shared=fromText(raw,normalizedUrl);if(raw.trim()!==normalizedUrl&&(shared.title||shared.price))entries.push({...shared,score:35,source:'Texto compartilhado'});
  const target=options[0], canonical=options[1]||target, worker=stores.some(([r])=>r.test(new URL(target).hostname))?getWorker():'';
  const tasks=[
    add('HTML direto',async()=>{const {body,response}=await timeout(canonical,8500);return {...fromHTML(body,response.url||canonical),url:response.url};}),
    add('Jina HTML',async()=>{const {body}=await timeout('https://r.jina.ai/'+target,18000,{headers:{'X-Respond-With':'html','Accept':'application/json'}});let j;try{j=JSON.parse(body)}catch{};return fromHTML(j?.data?.content||body,j?.data?.url||target);}),
    add('Jina Reader',async()=>{const {body}=await timeout('https://r.jina.ai/'+target,18000,{headers:{Accept:'application/json'}});let j;try{j=JSON.parse(body)}catch{};const d=j?.data;return {...fromText(d?.content||body,d?.url||target),title:titleOf(d?.title)||fromText(d?.content||body,target).title,score:30};}),
    add('Microlink',async()=>{const q=new URLSearchParams({url:target});const {body}=await timeout('https://api.microlink.io/?'+q,14000);const j=JSON.parse(body);if(j.status!=='success')throw Error(j.message||j.status);return fromJSON(j.data||{},target);}),
    add('JSONLink',async()=>{const {body}=await timeout('https://jsonlink.io/api/extract?url='+encodeURIComponent(target),11000);return fromJSON(JSON.parse(body),target);})
  ];
  if(worker)tasks.push(add('Worker HTML',async()=>{const u=new URL(worker);u.searchParams.set('url',target);const {body}=await timeout(u.href,20000);const j=JSON.parse(body);return {...fromHTML(j.html,j.url||target),url:j.url};}));
  const ml=productId(target);
  if(ml&&storeOf(target)==='Mercado Livre')tasks.push(add('API Mercado Livre',async()=>{const {body}=await timeout('https://api.mercadolibre.com/items/'+ml,9000);const j=JSON.parse(body);if(j.id!==ml)throw Error('identificador diferente');return {...fromJSON(j,target),score:100};}));
  await Promise.allSettled(tasks);
  // Try alternative canonical URL only when initial sources are incomplete.
  const usable=()=>entries.some(e=>e.title)&&entries.some(e=>e.price)&&entries.some(e=>e.image);
  if(!usable()&&canonical!==target)await add('Jina URL alternativa',async()=>{const {body}=await timeout('https://r.jina.ai/'+canonical,12000);return {...fromText(body,canonical),score:25};});
  if(!usable()&&worker)await add('Worker navegador',async()=>{const u=new URL(worker);u.searchParams.set('url',target);u.searchParams.set('render','1');const {body}=await timeout(u.href,25000);const j=JSON.parse(body);return {...fromHTML(j.html,j.url||target),url:j.url};});
  entries.sort((a,b)=>(b.score||0)-(a.score||0));
  const top=entries.find(e=>e.title), compatible=entries.filter(e=>!top||e===top||(e.title&&sameTitle(e.title,top.title)));
  const title=top?.title||'', description=compatible.find(e=>e.description)?.description||'', image=compatible.find(e=>e.image)?.image||'';
  const prices=compatible.filter(e=>e.price), reliable=prices.filter(e=>(e.score||0)>=60);
  const selected= reliable.length?reliable:prices;
  const price=selected.length&&selected.every(e=>Math.abs(e.price-selected[0].price)<0.011)?selected[0].price:undefined;
  const storeName=stores.find(([r])=>r.test(new URL(target).hostname))?.[1]||knownStore||storeOf(target), status=title&&image&&price?'success':title||image||price?'partial':'blocked';
  const sources=[...new Set(compatible.map(e=>e.source))];
  const message=(status==='success'?'Nome, preço e foto encontrados. Confira a variante e o preço.':status==='partial'?'Dados parciais encontrados. Confira os campos faltantes.':'A loja não retornou dados verificáveis. Use o texto ou print da página.')+(sources.length?' Fontes: '+sources.join(', ')+'.':'');
  const result={status,normalizedUrl,title,description,image,price,storeName,message,diagnostics};
  console.info('[Amigo Secreto] Importação',diagnostics);
  if(status==='success')cachePut(normalizedUrl,result);
  return result;
}
function sameTitle(a,b){const tokens=x=>new Set(x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{3,}/g)||[]);const x=tokens(a),y=tokens(b);let n=0;for(const t of x)if(y.has(t))n++;return n>=Math.min(2,x.size,y.size)&&n/Math.max(1,Math.min(x.size,y.size))>=0.5;}
let ocrLoading;
async function recognize(file,progress){
  if(!window.Tesseract){ocrLoading??=new Promise((ok,fail)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';script.onload=ok;script.onerror=()=>{ocrLoading=undefined;fail(Error('Não foi possível carregar OCR'));};document.head.append(script);});await ocrLoading;}
  const worker=await window.Tesseract.createWorker('por+eng',1,{logger:m=>progress(m.status+' '+Math.round((m.progress||0)*100)+'%')});
  try{return (await worker.recognize(file)).data.text;}finally{await worker.terminate();}
}
// User-controlled recovery: the shop is opened normally; pasted text/HTML and OCR run locally.
export function assistImport(result) {
  if(result.status==='success')return Promise.resolve(result);
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.style.cssText='max-width: min(94vw,540px); width:100%;max-height:90vh;overflow:auto;margin:auto;padding:20px;border:1px solid #dfd7ca;border-radius:18px;background:#fff;color:#1f1d1a;box-shadow:0 20px 70px #0005;font:14px system-ui';
    const node=(tag,text,parent=dialog)=>{const e=document.createElement(tag);if(text)e.textContent=text;parent.append(e);return e;};
    const button=(text,action,parent=dialog)=>{const b=node('button',text,parent);b.type='button';b.style.cssText='padding:10px 12px;margin:5px 5px 5px 0;border:1px solid #dfd7ca;border-radius:10px;background:#faf7f2;cursor:pointer';b.onclick=action;return b;};
    node('h2','Completar importação');node('p',result.message);
    const link=node('a','Abrir produto na loja ↗');link.href=result.normalizedUrl;link.target='_blank';link.rel='noopener noreferrer';link.style.cssText='display:block;color:#21684a;text-decoration:underline;margin:12px 0';
    node('p','Cole o texto compartilhado pelo app da loja, o nome e o preço copiados, ou um print. Os dados serão preenchidos para revisão.');
    const search=node('a','Pesquisar o link no Google ↗');search.href='https://www.google.com/search?q='+encodeURIComponent(result.normalizedUrl);search.target='_blank';search.rel='noopener noreferrer';search.style.cssText='display:block;color:#21684a;text-decoration:underline;margin:8px 0';
    const area=node('textarea','');area.rows=6;area.placeholder='Nome do produto\nPreço: R$ 99,90';area.style.cssText='width:100%;padding:10px;border:1px solid #dfd7ca;border-radius:10px;box-sizing:border-box';
    const status=node('p','');status.setAttribute('aria-live','polite');
    const file=node('input','');file.type='file';file.accept='image/*';file.style.cssText='display:block;max-width:100%;margin:8px 0';
    let busy=false;file.onchange=async()=>{if(!file.files?.[0]||busy)return;busy=true;apply.disabled=true;status.textContent='Carregando reconhecimento de texto local...';try{const text=await recognize(file.files[0],m=>status.textContent=m);area.value=text;status.textContent='Texto reconhecido. Confira antes de importar.';}catch(e){status.textContent='OCR indisponível: '+e.message;}finally{busy=false;apply.disabled=false;}};
    const apply=button('Preencher com dados copiados',()=>{let p;const s=area.value.trim();try{p=s.startsWith('<')?fromHTML(s,result.normalizedUrl):s.startsWith('{')?fromJSON(JSON.parse(s),result.normalizedUrl):fromText(s,result.normalizedUrl);}catch{p=fromText(s,result.normalizedUrl);}if(!p.title&&!p.price&&!p.image){status.textContent='Nenhum dado reconhecido. Tente escrever Nome do produto e Preço: R$ ...';return;}const merged={...result,title:result.title||p.title||'',price:result.price??p.price,image:result.image||p.image||'',description:result.description||p.description||'',message:'Dados preenchidos. Confira o preço, a variante e a foto.'};merged.status=merged.title&&merged.price&&merged.image?'success':'partial';finish(merged);});
    button('Continuar sem completar',()=>finish(result));
    const capture=node('details','');node('summary','Capturar diretamente no navegador (opcional)',capture);node('p','Crie um favorito com o código abaixo como endereço. Abra a página do produto no navegador, execute o favorito e cole os dados aqui. Não funciona dentro do aplicativo nativo da loja.',capture);const code=node('textarea','',capture);code.value="javascript:(()=>{const m=(...ks)=>{for(const k of ks){const x=[...document.querySelectorAll('meta')].find(n=>[n.name,n.getAttribute('property'),n.getAttribute('itemprop')].includes(k));if(x?.content)return x.content}return''};const objects=[];function walk(x){if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(walk);return}if([x['@type']].flat().includes('Product'))objects.push(x);if(x['@graph'])walk(x['@graph']);if(x.mainEntity)walk(x.mainEntity)}document.querySelectorAll('script[type=\"application/ld+json\"]').forEach(s=>{try{walk(JSON.parse(s.textContent))}catch{}});const p=objects.length===1?objects[0]:{},o=Array.isArray(p.offers)?p.offers.length===1?p.offers[0]:{}:p.offers||{};const v={title:p.name||document.querySelector('h1')?.innerText||m('og:title')||document.title,description:p.description||m('og:description'),image:p.image||m('og:image'),price:o.price||m('product:price:amount','og:price:amount'),currency_id:o.priceCurrency||m('product:price:currency','og:price:currency'),url:location.href};const s=JSON.stringify(v);navigator.clipboard?.writeText(s).then(()=>alert('Dados copiados. Volte ao Amigo Secreto e cole.'),()=>prompt('Copie e cole no Amigo Secreto',s))||prompt('Copie e cole no Amigo Secreto',s)})()";code.readOnly=true;code.rows=3;code.style.cssText='width:100%;font-size:11px';button('Copiar código do favorito',async()=>{try{await navigator.clipboard.writeText(code.value);status.textContent='Código copiado.';}catch{code.select();status.textContent='Selecione e copie o código.';}},capture);
    const details=node('details','');node('summary','Diagnóstico e servidor opcional',details);
    node('pre',(result.diagnostics||[]).join('\n'),details).style.cssText='white-space:pre-wrap;font-size:12px';
    node('p','O servidor da família já está configurado automaticamente. Altere o endereço somente se necessário.',details);
    const endpoint=node('input','',details);endpoint.type='url';endpoint.placeholder=DEFAULT_WORKER;endpoint.value=getWorker();endpoint.style.cssText='width:100%;border:1px solid #ddd;padding:8px;box-sizing:border-box';
    button('Salvar servidor',()=>{if(endpoint.value&&!safeUrl(endpoint.value)){status.textContent='Endereço inválido';return;}try{if(endpoint.value.trim())localStorage.setItem('amigo-product-worker',endpoint.value.trim());else localStorage.removeItem('amigo-product-worker');status.textContent='Servidor salvo. Feche e tente importar novamente.';}catch{status.textContent='Não foi possível salvar.';}},details);
    function finish(value){dialog.close();dialog.remove();resolve(value);}
    dialog.addEventListener('cancel',e=>{e.preventDefault();finish(result);});document.body.append(dialog);dialog.showModal();
  });
}
