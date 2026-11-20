export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number;
  initialQuality?: number;
}

/**
 * Estima o tamanho em bytes de uma Data URL Base64.
 */
export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível ler esta imagem. Tente outro arquivo PNG, JPG ou WebP.'));
    };
    img.src = objectUrl;
  });
}

function encodeCanvas(canvas: HTMLCanvasElement, mime: string, quality: number): string {
  const result = canvas.toDataURL(mime, quality);
  // Navegadores sem suporte a WebP retornam image/png silenciosamente
  if (mime === 'image/webp' && !result.startsWith('data:image/webp')) {
    return canvas.toDataURL('image/jpeg', quality);
  }
  return result;
}

/**
 * Redimensiona e comprime imagens via HTML5 <canvas> no navegador,
 * garantindo peso compatível com armazenamento Base64 no Firestore Spark.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<{ dataUrl: string; bytes: number; width: number; height: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
  }

  if (file.size > 18 * 1024 * 1024) {
    throw new Error('A imagem original é muito grande (acima de 18 MB).');
  }

  const maxWidth = options.maxWidth ?? 720;
  const maxHeight = options.maxHeight ?? 720;
  const maxBytes = options.maxBytes ?? 145 * 1024;
  const initialQuality = options.initialQuality ?? 0.76;

  const img = await loadImageFromFile(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  if (!srcW || !srcH) {
    throw new Error('Dimensões inválidas na imagem selecionada.');
  }

  let scale = Math.min(1, maxWidth / srcW, maxHeight / srcH);
  let width = Math.max(1, Math.round(srcW * scale));
  let height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Seu navegador não suporta processamento de imagem.');
  }

  const qualities = [initialQuality, 0.65, 0.52, 0.4];
  let bestDataUrl = '';
  let bestBytes = Number.POSITIVE_INFINITY;

  for (let pass = 0; pass < 3; pass++) {
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    for (const q of qualities) {
      const encoded = encodeCanvas(canvas, 'image/webp', q);
      const bytes = estimateDataUrlBytes(encoded);
      if (bytes < bestBytes) {
        bestDataUrl = encoded;
        bestBytes = bytes;
      }
      if (bytes <= maxBytes) {
        return { dataUrl: encoded, bytes, width, height };
      }
    }

    // Se ainda passou do teto, reduz as dimensões em 25% e tenta novamente
    width = Math.max(160, Math.round(width * 0.75));
    height = Math.max(160, Math.round(height * 0.75));
  }

  if (bestDataUrl && bestBytes <= maxBytes * 1.2) {
    return { dataUrl: bestDataUrl, bytes: bestBytes, width, height };
  }

  throw new Error('Não foi possível comprimir a imagem abaixo de 150 KB. Tente uma foto menor.');
}
