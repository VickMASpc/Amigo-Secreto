import assert from 'node:assert/strict';
import { normalizeScreenshotResult, MODEL, MAX_IMAGES, analyze } from '../worker/screenshot.js';
import { safeCrop, cropProductPreview } from '../public/screenshot-import.js';

const base = {
 store:'mercado_livre',title:'Cuba Aço Inox 430',currentPrice:115.62,originalPrice:161.90,
 shippingPrice:0,shippingText:'Chegará grátis amanhã',shippingIsConditional:false,
 selectedVariant:'Prateado | Pré Polido Fosco',description:'Cuba em aço inox',
 seller:'Eletrocubas SP',rating:4.9,salesInfo:'1000+ vendidos',
 screenshotRoles:[
  {index:0,role:'hero',hasUsableProductImage:true},
  {index:1,role:'shipping',hasUsableProductImage:false}],
 previewSourceIndex:0,previewCrop:{x:0.01,y:0.04,width:0.98,height:0.40},
 priceNote:'R$ 110,62 é cupom opcional',warnings:[]
};
assert.equal(MODEL,'gemini-3.5-flash-lite');
assert.equal(MAX_IMAGES,4);
const one=normalizeScreenshotResult(base,2);
assert.equal(one.price,115.62);
assert.equal(one.originalPrice,161.9);
assert.equal(one.shippingPrice,0);
assert.equal(one.previewSourceIndex,0);
assert.equal(one.storeName,'Mercado Livre');
assert.equal(one.variantInfo,'Prateado | Pré Polido Fosco');
assert.equal(normalizeScreenshotResult({...base,currentPrice:'R$ 115,62'},2).price,null);
assert.equal(normalizeScreenshotResult({...base,currentPrice:-3},2).price,null);
assert.equal(normalizeScreenshotResult({...base,previewSourceIndex:1},2).previewCrop,null);
assert.equal(normalizeScreenshotResult({...base,previewCrop:{x:.5,y:.5,width:.9,height:.8}},2).previewCrop,null);
assert.equal(normalizeScreenshotResult({...base,previewSourceIndex:9},2).previewSourceIndex,null);
assert.equal(safeCrop({x:0,y:.08,width:1,height:.57}).height,.57);
assert.equal(safeCrop({x:.8,y:.5,width:.5,height:.4}),null);
assert.equal(safeCrop({x:.1,y:.1,width:.01,height:.02}),null);

const reply=(data,status=200)=>({data,status});
assert.equal((await analyze({}, {}, reply)).status,503);
let calls=0;
const env={GEMINI_API_KEY:'mock',SCREENSHOT_LIMIT:{limit:async()=>({success:true})},SCREENSHOT_GLOBAL_LIMIT:{limit:async()=>({success:true})}};
globalThis.fetch=async(url,opts)=>{
 calls++;
 assert.match(url,/gemini-3\.5-flash-lite:generateContent$/);
 const request=JSON.parse(opts.body);
 assert.equal(request.generationConfig.thinkingConfig.thinkingLevel,'MEDIUM');
 assert.equal('maxOutputTokens' in request.generationConfig,false);
 assert.equal(request.contents.length,1);
 const parts=request.contents[0].parts;
 assert.equal(parts.filter(p=>p.inlineData).length,2);
 assert.equal(parts.filter(p=>p.inlineData)[0].inlineData.mimeType,'image/png');
 assert.equal(parts.filter(p=>p.inlineData)[1].inlineData.mimeType,'image/jpeg');
 assert.match(parts[0].text,/Mercado Livre/);
 assert.match(parts[0].text,/Amazon/);
 return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(base)}]}}]})};
};
const png={mimeType:'image/png',data:'a'.repeat(40)};
const jpg={mimeType:'image/jpeg',data:'b'.repeat(40)};
const req=new Request('https://example.com/screenshot',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({images:[png,jpg]})});
const result=await analyze(req,env,reply);
assert.equal(result.status,200);
assert.equal(result.data.product.price,115.62);
assert.equal(result.data.imageCount,2);
assert.equal(calls,1,'two screenshots must use exactly one Gemini call');
const tooMany=new Request('https://example.com/screenshot',{method:'POST',body:JSON.stringify({images:Array(5).fill(png)})});
assert.equal((await analyze(tooMany,env,reply)).status,400);
assert.equal(calls,1,'invalid input must not consume quota');

// Local fallback crop only when there is an actual HERO screenshot, not a shipping-only page.
const files=[new File(['a'],'hero.jpg',{type:'image/jpeg'}),new File(['b'],'delivery.jpg',{type:'image/jpeg'})];
const empty=await cropProductPreview(files,{store:'amazon',screenshotRoles:[{index:1,role:'shipping',hasUsableProductImage:false}]});
assert.equal(empty.method,'missing');
const fallback=await cropProductPreview(files,{store:'other',screenshotRoles:[{index:0,role:'hero',hasUsableProductImage:true}]});
assert.equal(fallback.method,'missing');
// Mock only local canvas + bitmap; no image AI/network calls.
const prevDocument=globalThis.document;
const prevBitmap=globalThis.createImageBitmap;
globalThis.createImageBitmap=async()=>({width:720,height:1600,close(){}});
globalThis.document={createElement:()=>{
 let w=1,h=1;
 const ctx={fillRect(){},drawImage(){},getImageData(){return {data:new Uint8ClampedArray(w*h*4)}}};
 return {
  get width(){return w},set width(v){w=v},
  get height(){return h},set height(v){h=v},
  getContext(){return ctx},
  toBlob(callback){callback(new Blob(['cropped'],{type:'image/jpeg'}))}
 };
}};
try{
 const cropped=await cropProductPreview(files,{...one,previewSourceIndex:0});
 assert.equal(cropped.method,'gemini');
 assert.ok(cropped.file instanceof File);
 const guessed=await cropProductPreview(files,{store:'mercado_livre',screenshotRoles:[{index:0,role:'hero',hasUsableProductImage:true}],previewSourceIndex:null,previewCrop:null});
 assert.equal(guessed.method,'heurística');
}finally{globalThis.document=prevDocument;globalThis.createImageBitmap=prevBitmap;}
console.log('Multi-print Gemini MEDIUM, quota, price, crop and fallback tests passed');
