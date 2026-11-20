export interface ScreenshotRole {index:number;role:'hero'|'options'|'shipping'|'details'|'ignore';hasUsableProductImage:boolean}
export interface CropBox {x:number;y:number;width:number;height:number}
export interface ScreenshotProduct {
  store:'shopee'|'shein'|'mercado_livre'|'tiktok_shop'|'temu'|'amazon'|'other';
  storeName:string;title:string;price:number|null;originalPrice:number|null;
  shippingPrice:number|null;shippingText:string;shippingIsConditional:boolean;
  variantInfo:string;description:string;seller:string;rating:number|null;salesInfo:string;
  screenshotRoles:ScreenshotRole[];previewSourceIndex:number|null;previewCrop:CropBox|null;
  priceNote:string;warnings:string[];warning:string;
}
export interface PreviewCropResult {file:File|null;method:'gemini'|'heurística'|'missing';message:string;index?:number;crop?:CropBox}
type ScreenshotModule={
 analyzeScreenshots:(files:File[])=>Promise<ScreenshotProduct>;
 cropProductPreview:(files:File[],result:ScreenshotProduct)=>Promise<PreviewCropResult>;
};
async function importer():Promise<ScreenshotModule>{
  return import(/* @vite-ignore */ new URL('./screenshot-import.js?v=2',document.baseURI).href);
}
export async function analyzeScreenshots(files:File[]):Promise<ScreenshotProduct>{
  return (await importer()).analyzeScreenshots(files);
}
export async function cropProductPreview(files:File[],result:ScreenshotProduct):Promise<PreviewCropResult>{
  return (await importer()).cropProductPreview(files,result);
}
export async function analyzeScreenshot(file:File):Promise<ScreenshotProduct>{
  return analyzeScreenshots([file]);
}
