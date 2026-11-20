export interface LinkPreviewResult {
  status: 'success' | 'partial' | 'blocked';
  normalizedUrl: string;
  title: string;
  description: string;
  image: string;
  storeName: string;
  message?: string;
}

const KNOWN_STORES: Array<[string, string]> = [
  ['amazon.', 'Amazon'],
  ['mercadolivre.', 'Mercado Livre'],
  ['mercadolibre.', 'Mercado Livre'],
  ['shopee.', 'Shopee'],
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

function isUsableTitle(title: unknown): title is string {
  if (typeof title !== 'string') return false;
  const clean = title.trim();
  if (clean.length < 3) return false;
  const lower = clean.toLowerCase();
  return !BLOCKED_TITLES.some((bad) => lower.includes(bad));
}

function resolveMaybeRelativeUrl(candidate: unknown, baseUrl: string): string {
  if (typeof candidate !== 'string' || !candidate.trim()) return '';
  try {
    const resolved = new URL(candidate.trim(), baseUrl);
    if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
      return resolved.toString();
    }
    return '';
  } catch {
    return '';
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function tryMicrolink(targetUrl: string): Promise<{
  title: string;
  description: string;
  image: string;
  publisher: string;
} | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`,
      6000
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== 'success' || !json?.data) return null;
    const d = json.data;
    const title = isUsableTitle(d.title) ? d.title.trim() : '';
    const description = typeof d.description === 'string' ? d.description.trim() : '';
    const image = resolveMaybeRelativeUrl(d.image?.url || d.logo?.url, targetUrl);
    const publisher = typeof d.publisher === 'string' ? d.publisher.trim() : '';
    if (!title && !image) return null;
    return { title, description, image, publisher };
  } catch {
    return null;
  }
}

async function tryJsonLink(targetUrl: string): Promise<{
  title: string;
  description: string;
  image: string;
  publisher: string;
} | null> {
  try {
    const res = await fetchWithTimeout(
      `https://jsonlink.io/api/extract?url=${encodeURIComponent(targetUrl)}`,
      6000
    );
    if (!res.ok) return null;
    const d = await res.json();
    const title = isUsableTitle(d.title) ? d.title.trim() : '';
    const description = typeof d.description === 'string' ? d.description.trim() : '';
    const firstImage = Array.isArray(d.images) ? d.images[0] : d.image;
    const image = resolveMaybeRelativeUrl(firstImage, targetUrl);
    const publisher = typeof d.domain === 'string' ? d.domain.trim() : '';
    if (!title && !image) return null;
    return { title, description, image, publisher };
  } catch {
    return null;
  }
}

/**
 * Tenta buscar metadados OpenGraph via APIs públicas gratuitas (sem backend),
 * com timeout de 6s e fallback suave caso a loja bloqueie automação.
 */
export async function fetchLinkMetadata(rawUrl: string): Promise<LinkPreviewResult> {
  const normalizedUrl = normalizeProductUrl(rawUrl);
  try {
    new URL(normalizedUrl);
  } catch {
    throw new Error('Cole um link válido começando com https:// ou www.');
  }

  const detectedStore = extractStoreNameFromUrl(normalizedUrl);

  const microlinkData = await tryMicrolink(normalizedUrl);
  const data = microlinkData ?? (await tryJsonLink(normalizedUrl));

  if (!data) {
    return {
      status: 'blocked',
      normalizedUrl,
      title: '',
      description: '',
      image: '',
      storeName: detectedStore,
      message:
        'Não conseguimos puxar tudo automaticamente desta loja — você pode preencher rapidinho abaixo.',
    };
  }

  const storeName = detectedStore || data.publisher || '';
  const hasFull = Boolean(data.title && data.image);

  return {
    status: hasFull ? 'success' : 'partial',
    normalizedUrl,
    title: data.title,
    description: data.description,
    image: data.image,
    storeName,
    message: hasFull
      ? 'Dados encontrados! Confira o preço e detalhes abaixo.'
      : 'Puxamos parte dos dados da loja — complete o restante abaixo.',
  };
}
