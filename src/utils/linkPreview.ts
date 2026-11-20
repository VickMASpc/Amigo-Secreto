export interface LinkPreviewResult {
  status: 'success' | 'partial' | 'blocked';
  normalizedUrl: string;
  title: string;
  description: string;
  image: string;
  storeName: string;
  message?: string;
  price?: number;
  diagnostics?: string[];
}

const KNOWN_STORES: Array<[string, string]> = [
  ['amazon.', 'Amazon'],
  ['mercadolivre.', 'Mercado Livre'],
  ['mercadolibre.', 'Mercado Livre'],
  ['shopee.', 'Shopee'],
  ['shope.ee', 'Shopee'],
  ['shp.ee', 'Shopee'],
  ['shein.top', 'SHEIN'],
  ['meli.la', 'Mercado Livre'],
  ['tiktok.', 'TikTok Shop'],
  ['tiktokshop.', 'TikTok Shop'],
  ['magazineluiza.', 'Magalu'],
  ['magalu.', 'Magalu'],
  ['kabum.', 'KaBuM!'],
  ['shein.', 'SHEIN'],
  ['aliexpress.', 'AliExpress'],
  ['americanas.', 'Americanas'],
  ['casasbahia.', 'Casas Bahia'],
  ['submarino.', 'Submarino'],
  ['netshoes.', 'Netshoes'],
  ['centauro.', 'Centauro'],
  ['nike.', 'Nike'],
  ['adidas.', 'Adidas'],
  ['lojasrenner.', 'Renner'],
  ['renner.', 'Renner'],
  ['cea.', 'C&A'],
  ['riachuelo.', 'Riachuelo'],
  ['sephora.', 'Sephora'],
  ['boticario.', 'O Boticário'],
  ['natura.', 'Natura'],
  ['terabyteshop.', 'Terabyte'],
  ['pichau.', 'Pichau'],
  ['leroymerlin.', 'Leroy Merlin'],
  ['apple.', 'Apple'],
  ['steampowered.', 'Steam'],
  ['store.epicgames.', 'Epic Games'],
  ['nuuvem.', 'Nuuvem'],
  ['spotify.', 'Spotify'],
  ['saraiva.', 'Saraiva'],
  ['estantevirtual.', 'Estante Virtual'],
  ['kalunga.', 'Kalunga'],
  ['decathlon.', 'Decathlon'],
  ['zara.', 'Zara'],
  ['cobasi.', 'Cobasi'],
  ['petz.', 'Petz'],
  ['belezaweb.', 'Beleza na Web'],
  ['epocacosmeticos.', 'Época Cosméticos'],
];

const BLOCKED_TITLES = [
  'robot check',
  'robot or human',
  'just a moment',
  'attention required',
  'access denied',
  'pardon our interruption',
  'captcha',
  'cloudflare',
  'verificação de segurança',
  'algo deu errado',
  '403 forbidden',
  'page not found',
];

export function normalizeProductUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function extractStoreNameFromUrl(rawUrl: string): string {
  try {
    const normalized = normalizeProductUrl(rawUrl);
    if (!normalized) return '';
    const { hostname } = new URL(normalized);
    const lower = hostname.toLowerCase();

    for (const [pattern, label] of KNOWN_STORES) {
      if (lower.includes(pattern)) {
        return label;
      }
    }

    const cleaned = lower
      .replace(/^(www\.|m\.|br\.|loja\.|store\.|produto\.)+/, '')
      .split('.')[0];

    if (!cleaned) return '';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } catch {
    return '';
  }
}

export async function fetchLinkMetadata(rawUrl: string): Promise<LinkPreviewResult> {
  const href = new URL('./product-import.js', document.baseURI).href;
  const engine = await import(/* @vite-ignore */ href);
  const normalized = engine.normalize(rawUrl);
  const result = await engine.importProduct(rawUrl, extractStoreNameFromUrl(normalized));
  return engine.assistImport(result);
}
