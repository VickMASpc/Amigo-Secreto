const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatBRL(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return brlFormatter.format(safe);
}

/**
 * Converte texto digitado pelo usuário (ex: "149,90", "149.90", "1.250,00") para número.
 */
export function parsePriceInput(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return 0;

  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    normalized = cleaned.replace(',', '.');
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

export function priceToInputString(price: number): string {
  if (!price) return '';
  return price.toFixed(2).replace('.', ',');
}

export interface CountdownInfo {
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function getCountdown(deadlineIso: string, nowMs = Date.now()): CountdownInfo {
  const targetMs = Date.parse(deadlineIso);
  if (Number.isNaN(targetMs)) {
    return { isExpired: false, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }

  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return { isExpired: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    isExpired: false,
    days,
    hours,
    minutes,
    seconds,
    totalMs: diff,
  };
}

export function formatDeadlineDisplay(deadlineIso: string): string {
  const date = new Date(deadlineIso);
  if (Number.isNaN(date.getTime())) return 'Data inválida';

  const datePart = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

  const timePart = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${datePart} às ${timePart} (Brasília)`;
}

/**
 * Extrai YYYY-MM-DD e HH:MM no horário de Brasília (UTC-3) para inputs HTML.
 */
export function getBrasiliaDateParts(deadlineIso: string): { date: string; time: string } {
  const dateObj = new Date(deadlineIso);
  if (Number.isNaN(dateObj.getTime())) {
    return { date: '2026-11-25', time: '23:59' };
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(dateObj);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}`,
  };
}

export function toBrasiliaIso(dateStr: string, timeStr: string): string {
  const safeDate = dateStr || '2026-11-25';
  const safeTime = timeStr || '23:59';
  return `${safeDate}T${safeTime}:59-03:00`;
}

export interface BudgetBadgeInfo {
  tone: 'perfect' | 'combo' | 'within' | 'over';
  label: string;
  diffText: string;
}

export function getBudgetBadge(price: number, budget: number): BudgetBadgeInfo {
  const diff = price - budget;
  if (diff > 0.01) {
    return {
      tone: 'over',
      label: `Passa ${formatBRL(diff)}`,
      diffText: `${formatBRL(diff)} acima da referência de ${formatBRL(budget)}`,
    };
  }
  if (Math.abs(diff) <= 15 && price > 0) {
    return {
      tone: 'perfect',
      label: 'Na medida!',
      diffText: diff === 0 ? 'Valor exato do combinado!' : `Dentro do limite de ${formatBRL(budget)}`,
    };
  }
  if (price > 0 && price <= budget * 0.65) {
    return {
      tone: 'combo',
      label: 'Ótimo p/ combinar',
      diffText: `Sobram ${formatBRL(budget - price)} para somar com outro mimo`,
    };
  }
  return {
    tone: 'within',
    label: `Dentro de ${formatBRL(budget)}`,
    diffText: `Faltam ${formatBRL(Math.max(0, budget - price))} para o teto`,
  };
}

export function generateSecureToken(length = 24): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  return result;
}

export function generateId(): string {
  if (typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return generateSecureToken(16);
}

/**
 * Hash SHA-256 compatível inclusive com contextos HTTP locais (ex: celular na rede Wi-Fi).
 */
export async function sha256Hex(input: string): Promise<string> {
  if (window.crypto?.subtle) {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(hashBuffer));
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return pureSha256(input);
}

function pureSha256(ascii: string): string {
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let msg = ascii + '\x80';
  while ((msg.length % 64) - 56) msg += '\x00';
  for (let i = 0; i < msg.length; i++) {
    const j = msg.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash.unshift((temp1 + temp2) | 0);
      hash.pop();
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function getMagicLink(token: string): string {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const url = new URL(baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

export function extractTokenFromInput(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('://') || trimmed.includes('token=')) {
      const normalized = trimmed.startsWith('http') ? trimmed : `https://dummy.local/?${trimmed.replace(/^\?/, '')}`;
      const url = new URL(normalized);
      const tokenParam = url.searchParams.get('token');
      if (tokenParam) return tokenParam.trim();
    }
  } catch {
    // Segue usando o valor direto
  }
  return trimmed;
}

export function isValidImageSrc(src?: string): boolean {
  if (!src) return false;
  return src.startsWith('data:image/') || src.startsWith('http://') || src.startsWith('https://');
}
