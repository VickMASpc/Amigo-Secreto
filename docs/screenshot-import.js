// Product screenshots, 1-4 images. Exactly one request for the entire set.
// Do not expose Gemini credentials to the client. Crop and compress images locally.
const WORKER='https://amigo-secreto-import.vitruidor.workers.dev/screenshot';
const MAX_FILES=4;
const MAX_FILE_SIZE=18*1024*1024;
const MAX_INLINE_BYTES=4*1024*1024;
const MAX_SUM_INLINE_BYTES=16*1024*1024;
const VALID=/^image\/(?:png|jpeg|webp|heic|heif)$/i;
const NATIVE=/^image\/(?:png|jpeg|webp)$/i;
function mimeOf(file){
 const raw=(file?.type||'').toLowerCase();
 if(VALID.test(raw))return raw;
 const extension=String(file?.name||'').toLowerCase().split('.').pop();
 return ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',heic:'image/heic',heif:'image/heif'})[extension]||'';
}
async function imageBitmap(file){
 if(typeof createImageBitmap==='function')try{
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  return {image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()};
 }catch{}
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{URL.revokeObjectURL(url);resolve({image:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>{}})};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Este aparelho não conseguiu abrir o print. Salve-o como JPG ou PNG.'));};
  img.src=url;
 });
}
const canvasBlob=(canvas,type,quality)=>new Promise((resolve,reject)=>{
 canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Falha ao preparar a imagem no aparelho.')),type,quality);
});
const readBase64=blob=>new Promise((resolve,reject)=>{
 const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Não foi possível ler o print.'));r.readAsDataURL(blob);
});
async function prepareInline(file){
 if(!file||!VALID.test(mimeOf(file)))throw Error('Use prints JPG, PNG, WebP ou HEIC.');
 if(file.size>MAX_FILE_SIZE)throw Error('Um dos prints ultrapassa 18 MB.');
 const mime=mimeOf(file);
 if(NATIVE.test(mime)&&file.size<=MAX_INLINE_BYTES)return {mimeType:mime,data:await readBase64(file)};
 const bitmap=await imageBitmap(file);
 try{
  let scale=Math.min(1,2048/bitmap.width,3600/bitmap.height);
  let canvas=document.createElement('canvas');
  for(let pass=0;pass<5;pass++){
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));
   canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Processamento de imagens indisponível neste navegador.');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(bitmap.image,0,0,canvas.width,canvas.height);
   const blob=await canvasBlob(canvas,'image/jpeg',Math.max(.6,.9-pass*.065));
   if(blob.size<=MAX_INLINE_BYTES)return {mimeType:'image/jpeg',data:await readBase64(blob)};
   scale*=.77;
  }
  throw Error('Não foi possível reduzir este print para análise.');
 }finally{bitmap.close();}
}
export async function analyzeScreenshots(files){
 const input=Array.from(files||[]);
 if(input.length<1||input.length>MAX_FILES)throw Error('Adicione entre 1 e 4 prints do mesmo produto.');
 const images=await Promise.all(input.map(prepareInline));
 const total=images.reduce((sum,im)=>sum+im.data.length,0);
 if(total>Math.ceil(MAX_SUM_INLINE_BYTES*4/3))throw Error('Os prints juntos são grandes demais. Tente imagens mais leves.');
 let res;try{
  res=await fetch(WORKER,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({images}),signal:AbortSignal.timeout(85000)});
 }catch(e){throw Error(e?.name==='TimeoutError'?'Análise demorou demais. Tente novamente.':'Sem conexão com o servidor de análise de prints.');}
 const raw=await res.text();let j;try{j=JSON.parse(raw)}catch{throw Error('Servidor devolveu resposta inválida (HTTP '+res.status+').');}
 if(!res.ok||!j.ok)throw Error(j.error||'Falha ao analisar prints (HTTP '+res.status+').');
 return j.product;
}
// Backward-compatible single-file API for integrations that still use it.
export const analyzeScreenshot=file=>analyzeScreenshots([file]);

function isCrop(v){
 if(!v)return false;
 const {x,y,width,height}=v;
 return [x,y,width,height].every(n=>typeof n==='number'&&Number.isFinite(n))&&x>=0&&y>=0&&width>0&&height>0&&x+width<=1.005&&y+height<=1.005&&width*height>=.065&&width*height<=.94&&width/height>=.32&&width/height<=3.3;
}
export function safeCrop(v){
 if(!isCrop(v))return null;
 return {x:Math.max(0,v.x),y:Math.max(0,v.y),width:Math.min(v.width,1-v.x),height:Math.min(v.height,1-v.y)};
}
// Only use heuristics when the model has explicitly identified a usable HERO image;
// never fabricate an image crop from a shipping-only/variant-only screenshot.
const FALLBACK={
 shopee:{x:0,y:.095,width:1,height:.60},
 shein:{x:0,y:.10,width:1,height:.59},
 temu:{x:0,y:.095,width:1,height:.60},
 mercado_livre:{x:0,y:.035,width:1,height:.42},
 tiktok_shop:{x:0,y:.095,width:1,height:.56},
 amazon:{x:.02,y:.18,width:.96,height:.48}
};
function selectCrop(result,length){
 const index=result?.previewSourceIndex;
 if(Number.isInteger(index)&&index>=0&&index<length){
  const crop=safeCrop(result.previewCrop);
  if(crop)return {index,crop,method:'gemini'};
 }
 const hero=(result?.screenshotRoles||[]).find(r=>r.role==='hero'&&r.hasUsableProductImage===true&&Number.isInteger(r.index)&&r.index>=0&&r.index<length);
 const crop=safeCrop(FALLBACK[result?.store]);
 if(hero&&crop)return {index:hero.index,crop,method:'heurística'};
 return null;
}
// Trim only uniform color backgrounds at edges; stop before photographed object.
export function trimUniformBorders(canvas,opts={}){
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx||canvas.width<96||canvas.height<96)return canvas;
 const width=canvas.width,height=canvas.height;
 const data=ctx.getImageData(0,0,width,height).data;
 const sample=(x,y)=>{const i=(y*width+x)*4;return [data[i],data[i+1],data[i+2]];};
 const corners=[[.01,.01],[.99,.01],[.01,.99],[.99,.99]].map(([x,y])=>sample(Math.floor(x*(width-1)),Math.floor(y*(height-1))));
 const bg=[0,1,2].map(channel=>Math.round(corners.reduce((sum,c)=>sum+c[channel],0)/4));
 const dist=c=>Math.max(Math.abs(bg[0]-c[0]),Math.abs(bg[1]-c[1]),Math.abs(bg[2]-c[2]));
 // Nonuniform border = actual photo, do not apply a color-based edge trim.
 if(corners.some(c=>dist(c)>25))return canvas;
 const threshold=opts.threshold??14;
 const ratio=opts.maxInsetRatio??.12;
 const isEmptyRow=y=>{
  let off=0,samples=0;
  const step=Math.max(1,Math.floor(width/85));
  for(let x=0;x<width;x+=step){samples++;if(dist(sample(x,y))>threshold)off++;}
  return off<=Math.max(1,Math.floor(samples*.035));
 };
 const isEmptyCol=x=>{
  let off=0,samples=0;
  const step=Math.max(1,Math.floor(height/85));
  for(let y=0;y<height;y+=step){samples++;if(dist(sample(x,y))>threshold)off++;}
  return off<=Math.max(1,Math.floor(samples*.035));
 };
 let top=0,bottom=0,left=0,right=0;
 while(top<Math.floor(height*ratio)&&isEmptyRow(top))top++;
 while(bottom<Math.floor(height*ratio)&&isEmptyRow(height-1-bottom))bottom++;
 while(left<Math.floor(width*ratio)&&isEmptyCol(left))left++;
 while(right<Math.floor(width*ratio)&&isEmptyCol(width-1-right))right++;
 if(!top&&!bottom&&!left&&!right)return canvas;
 const w=width-left-right,h=height-top-bottom;
 if(w<width*.70||h<height*.70)return canvas;
 const out=document.createElement('canvas');out.width=w;out.height=h;
 out.getContext('2d').drawImage(canvas,left,top,w,h,0,0,w,h);
 return out;
}
export async function cropProductPreview(files,result){
 const input=Array.from(files||[]);
 const selection=selectCrop(result,input.length);
 if(!selection)return {file:null,method:'missing',message:'Nenhuma foto principal confiável foi encontrada. Adicione um print da imagem do produto.'};
 const bitmap=await imageBitmap(input[selection.index]);
 try{
  const {crop}=selection;
  let sx=Math.max(0,Math.round(crop.x*bitmap.width));
  let sy=Math.max(0,Math.round(crop.y*bitmap.height));
  let sw=Math.max(1,Math.min(bitmap.width-sx,Math.round(crop.width*bitmap.width)));
  let sh=Math.max(1,Math.min(bitmap.height-sy,Math.round(crop.height*bitmap.height)));
  // Avoid huge canvas allocations on mobile without altering the relative crop.
  const scale=Math.min(1,1300/sw,1300/sh);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível recortar o print.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(bitmap.image,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
  const trimmed=trimUniformBorders(canvas);
  const blob=await canvasBlob(trimmed,'image/jpeg',.9);
  return {file:new File([blob],'produto-recortado.jpg',{type:'image/jpeg'}),method:selection.method,index:selection.index,crop,message:selection.method==='heurística'?'Recorte aproximado aplicado; confira a imagem antes de publicar.':''};
 }finally{bitmap.close();}
}
