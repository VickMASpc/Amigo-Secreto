export interface ScreenshotProduct { title: string; price: number | null; storeName: string; variantInfo: string; description: string; warning: string; }
export async function analyzeScreenshot(file: File): Promise<ScreenshotProduct> {
  const module = await import(/* @vite-ignore */ new URL('./screenshot-import.js?v=1', document.baseURI).href);
  return module.analyzeScreenshot(file);
}
