import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { compressImageFile } from '../utils/imageCompress';
import { analyzeScreenshots, cropProductPreview, type ScreenshotProduct } from '../utils/screenshotImport';

type Store = 'shopee'|'shein'|'temu'|'mercado_livre'|'tiktok_shop'|'amazon';
type Guide={label:string;steps:string[];caution:string};
const GUIDES:Record<Store,Guide>={
  shopee:{label:'Shopee',steps:[
    '1. Abra a foto principal e tire print com imagem, preço laranja e nome.',
    '2. Se cor ou tamanho estiver mais abaixo, escolha a opção e tire outro print.',
    '3. Para o frete, tire um print adicional da entrega.'
  ],caution:'O preço riscado e as parcelas não são o preço principal.'},
  shein:{label:'SHEIN',steps:[
    '1. Tire um print com a foto GRANDE, preço atual e nome logo abaixo.',
    '2. Role até a cor e tamanho que estão selecionados (ex.: Preto, G(L)).',
    '3. Se precisar do frete, mostre a seção de envio em outro print.'
  ],caution:'Um print só da tela de tamanhos não tem foto de capa.'},
  temu:{label:'Temu',steps:[
    '1. Mostre a foto principal, o preço e o título, se possível no mesmo print.',
    '2. Tire outro print da cor/modelo/tamanho selecionado.',
    '3. Se necessário, tire outro print da entrega.'
  ],caution:'Não use apenas a tela de opções; inclua uma foto grande do produto.'},
  mercado_livre:{label:'Mercado Livre',steps:[
    '1. Tire um print da foto grande COM o título e preço principal (ex.: R$ 115,62).',
    '2. Role até o acabamento, frete, estoque e vendedor e faça o segundo print.',
    '3. Se a entrega estiver mais abaixo, faça mais um print dela.'
  ],caution:'O preço com cupom por seguir a loja não substitui o preço principal.'},
  tiktok_shop:{label:'TikTok Shop',steps:[
    '1. Tire um print com a foto inteira, preço colorido e título.',
    '2. Se houver variações, selecione a desejada e faça outro print.',
    '3. Mostre o frete grátis ou o valor da entrega se estiver em outra parte.'
  ],caution:'A foto principal será separada de barras de navegação, preços e botão de comprar.'},
  amazon:{label:'Amazon',steps:[
    '1. Tire um print da foto principal e nome do produto (evite produtos patrocinados).',
    '2. Role até o preço principal, caso ele não apareça no primeiro print.',
    '3. Tire mais um print da entrega e estoque, SEM expor o endereço.'
  ],caution:'Descontos Itaú, NuPay, cartões e ofertas multi-item não mudam o preço principal.'},
};

interface Shot{file:File;url:string}
interface Props{
 kind:'store'|'digital';
 disabled:boolean;
 onBusyChange:(busy:boolean)=>void;
 onImported:(result:ScreenshotProduct,previewDataUrl:string|null,photoInfo:string)=>void;
}
export const ScreenshotImporter:React.FC<Props>=({kind,disabled,onBusyChange,onImported})=>{
 const [store,setStore]=useState<Store>('shopee');
 const [shots,setShots]=useState<Shot[]>([]);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState<{kind:'success'|'warning';text:string}|null>(null);
 const objectUrls=useRef<string[]>([]);
 useEffect(()=>()=>{for(const url of objectUrls.current)URL.revokeObjectURL(url);},[]);
 const add=(e:React.ChangeEvent<HTMLInputElement>)=>{
   const files=Array.from(e.target.files||[]);e.target.value='';
   if(!files.length)return;
   if(shots.length+files.length>4){setNotice({kind:'warning',text:'É possível analisar até 4 prints por produto. Remova um antes de adicionar mais.'});return;}
   if(files.some(file=>!file.type.startsWith('image/')||file.size>18*1024*1024)){
     setNotice({kind:'warning',text:'Escolha prints JPG, PNG, WebP ou HEIC de até 18 MB cada.'});return;
   }
   const added=files.map(file=>({file,url:URL.createObjectURL(file)}));
   objectUrls.current.push(...added.map(item=>item.url));
   setShots(prev=>[...prev,...added]);setNotice(null);
 };
 const remove=(index:number)=>{setShots(prev=>prev.filter((_,i)=>i!==index));setNotice(null);};
 const analyze=async()=>{
   if(!shots.length||busy)return;
   setBusy(true);onBusyChange(true);setNotice(null);
   try{
     const files=shots.map(shot=>shot.file);
     // Exactly one request for all 1-4 screenshots, and one Gemini call in the Worker.
     const product=await analyzeScreenshots(files);
     let previewDataUrl:string|null=null;
     let photoInfo='';
     try{
       const crop=await cropProductPreview(files,product);
       photoInfo=crop.message||'';
       if(crop.file){
         const image=await compressImageFile(crop.file,{maxWidth:900,maxHeight:900,maxBytes:145*1024});
         previewDataUrl=image.dataUrl;
         photoInfo='Foto do produto recortada automaticamente do print '+((crop.index??0)+1)+' ('+crop.method+'). '+Math.round(image.bytes/1024)+' KB.';
         if(crop.method==='heurística')photoInfo+=' Confira o enquadramento.';
       }
     }catch(error){
       photoInfo=error instanceof Error?'Não foi possível recortar: '+error.message:'Não foi possível recortar. Envie a foto manualmente.';
     }
     onImported(product,previewDataUrl,photoInfo);
     const warnings=[...(product.warnings||[]),photoInfo];
     if(!product.title||product.price===null)warnings.push('Confira os campos sem informações.');
     if(product.shippingIsConditional)warnings.push('Frete condicional: confirme antes de salvar.');
     setNotice({kind:warnings.length?'warning':'success',
       text: ['Todos os '+files.length+' prints foram lidos juntos em uma chamada Gemini.',...warnings].filter(Boolean).join(' ')});
   }catch(error){
     setNotice({kind:'warning',text:(error instanceof Error?error.message:'Falha de análise')+' Os prints foram mantidos; tente de novo ou preencha manualmente.'});
   }finally{setBusy(false);onBusyChange(false);}
 };
 const locked=busy||disabled;
 const isDigital=kind==='digital';
 return (
   <section className="space-y-3 rounded-2xl border border-[#D8E1D9] bg-[#FAF7F2] p-4">
     <h2 className="text-base font-bold text-[#1F1D1A]">{isDigital?'Print do serviço digital (opcional)':'Importar por prints (Gemini 3.5 Flash-Lite)'}</h2>
     <p className="text-xs leading-relaxed text-[#6B655D]">
       {isDigital
         ? 'Se tiver prints da assinatura, gift card ou serviço, envie até 4 capturas. A importação é opcional: você também pode preencher tudo manualmente.'
         : 'Adicione 1 a 4 capturas do MESMO produto. Uma única análise lê preço, título, variações e entrega, seleciona a melhor foto e recorta automaticamente sua capa. Não recorte os prints manualmente.'}
     </p>
     {!isDigital&&<div>
       <label htmlFor="screenshot-store" className="text-xs font-bold text-[#1F1D1A]">Instruções para cada loja</label>
       <select id="screenshot-store" value={store} onChange={e=>setStore(e.target.value as Store)}
         className="mt-1 w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-2.5 text-sm font-semibold text-[#1F1D1A]">
         {(Object.entries(GUIDES) as [Store,Guide][]).map(([id,guide])=><option key={id} value={id}>{guide.label}</option>)}
       </select>
       <ol className="mt-2 space-y-1.5 rounded-xl bg-white p-3 text-xs leading-relaxed text-[#4A453F]">
         {GUIDES[store].steps.map((line,i)=><li key={i}>{line}</li>)}
       </ol>
       <p className="mt-2 text-xs font-medium text-[#8C6520]">{GUIDES[store].caution}</p>
     </div>}
     <div className="rounded-xl bg-[#E6F0EC] px-3 py-2 text-xs text-[#214E3E]">
       {isDigital
         ? 'Se usar prints, mostre o nome, plano e preço do serviço. Não envie códigos de ativação/resgate, dados de conta ou informações pessoais.'
         : 'Pelo menos 1 print deve mostrar a FOTO GRANDE. Extras: nome/preço, cor/tamanho e frete. Evite popups, notificações, dados pessoais e endereços.'}
     </div>
     <label className={'flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#214E3E]/50 bg-white px-3 py-3 text-sm font-bold text-[#214E3E] '+(locked||shots.length>=4?'pointer-events-none opacity-50':'cursor-pointer')}>
       <ImagePlus className="h-4 w-4"/>Adicionar prints ({shots.length}/4)
       <input type="file" accept="image/*" multiple disabled={locked||shots.length>=4} onChange={add} className="hidden"/>
     </label>
     {shots.length>0&&<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
       {shots.map((shot,index)=><div key={shot.url} className="relative overflow-hidden rounded-xl border border-[#DFD7CA] bg-white p-1.5">
         <img src={shot.url} alt={'Print '+(index+1)} className="h-28 w-full rounded-lg bg-white object-contain"/>
         <span className="mt-1 block truncate text-[11px] font-medium text-[#6B655D]">{index+1}. {shot.file.name}</span>
         <button type="button" disabled={locked} onClick={()=>remove(index)} aria-label={'Remover print '+(index+1)}
           className="absolute right-1 top-1 rounded-lg bg-white/95 p-1.5 text-[#B83B35] shadow-sm">
           <Trash2 className="h-3.5 w-3.5"/>
         </button>
       </div>)}
     </div>}
     <button type="button" onClick={analyze} disabled={locked||shots.length===0}
       className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#214E3E] px-4 py-3 text-sm font-bold text-white disabled:opacity-55">
       {busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Sparkles className="h-4 w-4"/>}
       {busy?'Analisando prints e recortando...':'Analisar '+shots.length+' print(s) em 1 chamada Gemini'}
     </button>
     {notice&&<div role="status" className={'flex items-start gap-2 rounded-xl px-3 py-2 text-xs '+(notice.kind==='success'?'bg-[#E6F0EC] text-[#214E3E]':'bg-[#FBF3E2] text-[#7A581B]')}>
       {notice.kind==='success'?<CheckCircle2 className="h-4 w-4 shrink-0"/>:<AlertCircle className="h-4 w-4 shrink-0"/>}
       <span>{notice.text}</span>
     </div>}
   </section>
 );
};
