import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import {
  DEFAULT_BUDGET,
  DEFAULT_DEADLINE_ISO,
  PARTICIPANTS,
} from '../constants/participants';
import type {
  AdminUserRecord,
  CartEntry,
  CurrentUser,
  EventSettings,
  ParticipantId,
  PublicUser,
  SubItem,
  UserCart,
  UserPreferences,
  WishItem,
} from '../types';
import { generateSecureToken, sha256Hex } from '../utils/format';
import { db } from './config';

const SESSION_STORAGE_KEY = 'amigo_secreto_session_v1';
const MAX_FIRESTORE_DOC_BYTES = 880_000;

export interface StoredSession {
  userId: ParticipantId;
  accessToken: string;
}

function requireDb(): Firestore {
  if (!db) {
    throw new Error('Firebase não está configurado. Verifique as variáveis VITE_FIREBASE_* no arquivo .env.');
  }
  return db;
}

// Firestore rules permit only these four document IDs. An unrestricted
// collection query is denied even when only family documents exist.
function familyUsersQuery(firestore: Firestore) {
  return query(
    collection(firestore, 'users'),
    where(documentId(), 'in', PARTICIPANTS.map((participant) => participant.id))
  );
}

export function loadStoredSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.userId || !parsed.accessToken) return null;
    const validId = PARTICIPANTS.some((p) => p.id === parsed.userId);
    if (!validId) return null;
    return { userId: parsed.userId, accessToken: parsed.accessToken };
  } catch {
    return null;
  }
}

export function saveStoredSession(userId: ParticipantId, accessToken: string): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId, accessToken }));
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function toEpochMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function normalizePreferences(raw: unknown): UserPreferences {
  const prefs = (raw && typeof raw === 'object' ? raw : {}) as Partial<UserPreferences>;
  return {
    shirtSize: typeof prefs.shirtSize === 'string' ? prefs.shirtSize : '',
    shoeSize: typeof prefs.shoeSize === 'string' ? prefs.shoeSize : '',
    favoriteColors: typeof prefs.favoriteColors === 'string' ? prefs.favoriteColors : '',
    notes: typeof prefs.notes === 'string' ? prefs.notes : '',
  };
}

function mapPublicUser(id: string, data: Record<string, unknown>): PublicUser {
  const seed = PARTICIPANTS.find((p) => p.id === id);
  return {
    id: id as ParticipantId,
    baseName: typeof data.baseName === 'string' ? data.baseName : seed?.baseName ?? id,
    displayName: typeof data.displayName === 'string' && data.displayName.trim()
      ? data.displayName
      : seed?.baseName ?? id,
    role: data.role === 'admin' ? 'admin' : 'member',
    avatar: typeof data.avatar === 'string' && data.avatar ? data.avatar : seed?.defaultAvatar ?? '🎁',
    accentColor: typeof data.accentColor === 'string' && data.accentColor
      ? data.accentColor
      : seed?.defaultColor ?? '#B83B35',
    preferences: normalizePreferences(data.preferences),
    onboardingCompleted: Boolean(data.onboardingCompleted),
    hasLoggedIn: Boolean(data.hasLoggedIn),
  };
}

function mapCurrentUser(id: string, data: Record<string, unknown>): CurrentUser {
  const pub = mapPublicUser(id, data);
  const drawn = typeof data.drawnUserId === 'string' && PARTICIPANTS.some((p) => p.id === data.drawnUserId)
    ? (data.drawnUserId as ParticipantId)
    : null;
  return {
    ...pub,
    accessToken: typeof data.accessToken === 'string' ? data.accessToken : '',
    drawnUserId: drawn,
  };
}

function mapWishItem(id: string, data: Record<string, unknown>): WishItem {
  const rawSubs = Array.isArray(data.subItems) ? data.subItems : [];
  const subItems: SubItem[] = rawSubs.map((s: Record<string, unknown>, idx) => ({
    id: typeof s.id === 'string' ? s.id : `sub-${idx}`,
    title: typeof s.title === 'string' ? s.title : '',
    price: typeof s.price === 'number' && Number.isFinite(s.price) ? s.price : 0,
    kind: s.kind === 'digital' ? 'digital' : 'store',
    url: typeof s.url === 'string' ? s.url : '',
    storeName: typeof s.storeName === 'string' ? s.storeName : '',
    image: typeof s.image === 'string' ? s.image : '',
    notes: typeof s.notes === 'string' ? s.notes : '',
  }));

  const kind = data.kind === 'digital' || data.kind === 'bundle' ? data.kind : 'store';
  const rawPriority = data.priority;
  const priority = rawPriority === 1 || rawPriority === 3 ? rawPriority : 2;

  return {
    id,
    ownerId: (typeof data.ownerId === 'string' ? data.ownerId : 'victor') as ParticipantId,
    kind,
    title: typeof data.title === 'string' ? data.title : '',
    description: typeof data.description === 'string' ? data.description : '',
    price: typeof data.price === 'number' && Number.isFinite(data.price) ? data.price : 0,
    priority,
    storeName: typeof data.storeName === 'string' ? data.storeName : '',
    url: typeof data.url === 'string' ? data.url : '',
    image: typeof data.image === 'string' ? data.image : '',
    variantInfo: typeof data.variantInfo === 'string' ? data.variantInfo : '',
    howToBuy: typeof data.howToBuy === 'string' ? data.howToBuy : '',
    subItems,
    createdAt: toEpochMs(data.createdAt),
    updatedAt: toEpochMs(data.updatedAt),
  };
}

export function subscribeEventSettings(
  onData: (settings: EventSettings | null) => void,
  onError: (err: Error) => void
): () => void {
  const firestore = requireDb();
  const ref = doc(firestore, 'settings', 'event');
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const d = snap.data();
      onData({
        budget: typeof d.budget === 'number' && Number.isFinite(d.budget) ? d.budget : DEFAULT_BUDGET,
        deadline: typeof d.deadline === 'string' ? d.deadline : DEFAULT_DEADLINE_ISO,
        allowLateAdditions: Boolean(d.allowLateAdditions),
        initialized: Boolean(d.initialized),
        adminPinHash: typeof d.adminPinHash === 'string' ? d.adminPinHash : undefined,
      });
    },
    (err) => onError(err)
  );
}

/**
 * Primeiro boot do sistema: cria configurações iniciais e os 4 perfis fixos da família.
 */
export async function bootstrapEventAndUsers(adminPin: string): Promise<StoredSession> {
  const firestore = requireDb();
  const trimmedPin = adminPin.trim();
  if (trimmedPin.length < 4) {
    throw new Error('Escolha um PIN de Admin com pelo menos 4 caracteres.');
  }

  const eventRef = doc(firestore, 'settings', 'event');
  const existing = await getDoc(eventRef);
  if (existing.exists() && existing.data()?.initialized) {
    throw new Error('O Amigo Secreto já foi inicializado anteriormente! Entre com seu QR Code ou PIN de Admin.');
  }

  const adminPinHash = await sha256Hex(trimmedPin);
  const batch = writeBatch(firestore);

  batch.set(eventRef, {
    budget: DEFAULT_BUDGET,
    deadline: DEFAULT_DEADLINE_ISO,
    allowLateAdditions: false,
    initialized: true,
    adminPinHash,
  });

  let victorToken = '';

  for (const participant of PARTICIPANTS) {
    const token = generateSecureToken(24);
    if (participant.id === 'victor') {
      victorToken = token;
    }

    batch.set(doc(firestore, 'users', participant.id), {
      id: participant.id,
      baseName: participant.baseName,
      displayName: participant.baseName,
      role: participant.role,
      accessToken: token,
      avatar: participant.defaultAvatar,
      accentColor: participant.defaultColor,
      preferences: {
        shirtSize: '',
        shoeSize: '',
        favoriteColors: '',
        notes: '',
      },
      onboardingCompleted: false,
      hasLoggedIn: participant.id === 'victor',
      drawnUserId: null,
    });
  }

  await batch.commit();
  saveStoredSession('victor', victorToken);
  return { userId: 'victor', accessToken: victorToken };
}

export async function loginWithToken(rawToken: string): Promise<StoredSession> {
  const firestore = requireDb();
  const token = rawToken.trim();
  if (!token) {
    throw new Error('Informe um código ou link válido.');
  }

  const snap = await getDocs(familyUsersQuery(firestore));
  const userDoc = snap.docs.find((candidate) => candidate.data().accessToken === token);

  if (!userDoc) {
    throw new Error('Link ou QR Code inválido ou expirado. Peça um novo código ao Victor.');
  }
  const userId = userDoc.id as ParticipantId;

  if (!userDoc.data().hasLoggedIn) {
    await updateDoc(doc(firestore, 'users', userId), { hasLoggedIn: true });
  }

  saveStoredSession(userId, token);
  return { userId, accessToken: token };
}

export async function loginAdminWithPin(pin: string): Promise<StoredSession> {
  const firestore = requireDb();
  const trimmed = pin.trim();
  if (!trimmed) {
    throw new Error('Digite o PIN de Admin.');
  }

  const eventSnap = await getDoc(doc(firestore, 'settings', 'event'));
  if (!eventSnap.exists()) {
    throw new Error('Sistema ainda não inicializado.');
  }

  const storedHash = eventSnap.data().adminPinHash;
  if (!storedHash) {
    throw new Error('PIN de Admin não configurado. Use o link/token do Victor.');
  }

  const inputHash = await sha256Hex(trimmed);
  if (inputHash !== storedHash) {
    throw new Error('PIN incorreto. Tente novamente ou cole seu token de acesso.');
  }

  const victorSnap = await getDoc(doc(firestore, 'users', 'victor'));
  if (!victorSnap.exists()) {
    throw new Error('Perfil do Admin não encontrado.');
  }

  const accessToken = victorSnap.data().accessToken as string;
  if (!victorSnap.data().hasLoggedIn) {
    await updateDoc(doc(firestore, 'users', 'victor'), { hasLoggedIn: true });
  }

  saveStoredSession('victor', accessToken);
  return { userId: 'victor', accessToken };
}

export function subscribeFamilyWorkspace(
  session: StoredSession,
  callbacks: {
    onUsers: (
      publicUsers: PublicUser[],
      currentUser: CurrentUser | null,
      adminUsers: AdminUserRecord[]
    ) => void;
    onItems: (items: WishItem[]) => void;
    onCart: (cart: UserCart) => void;
    onTokenInvalidated: () => void;
    onError: (err: Error) => void;
  }
): () => void {
  const firestore = requireDb();

  const unsubUsers = onSnapshot(
    familyUsersQuery(firestore),
    (snap) => {
      const orderMap = new Map(PARTICIPANTS.map((p, idx) => [p.id, idx]));
      const publicUsers: PublicUser[] = [];
      const adminUsers: AdminUserRecord[] = [];
      let currentUser: CurrentUser | null = null;
      let isCurrentAdmin = false;

      const sortedDocs = [...snap.docs].sort(
        (a, b) => (orderMap.get(a.id as ParticipantId) ?? 99) - (orderMap.get(b.id as ParticipantId) ?? 99)
      );

      for (const d of sortedDocs) {
        const data = d.data() as Record<string, unknown>;
        const pub = mapPublicUser(d.id, data);
        publicUsers.push(pub);

        if (d.id === session.userId) {
          const docToken = typeof data.accessToken === 'string' ? data.accessToken : '';
          const latestSession = loadStoredSession();
          const expectedToken =
            latestSession?.userId === session.userId
              ? latestSession.accessToken
              : session.accessToken;
          if (!docToken || docToken !== expectedToken) {
            callbacks.onTokenInvalidated();
            return;
          }
          currentUser = mapCurrentUser(d.id, data);
          isCurrentAdmin = currentUser.role === 'admin';
        }
      }

      if (isCurrentAdmin) {
        for (const d of sortedDocs) {
          const data = d.data() as Record<string, unknown>;
          const pub = mapPublicUser(d.id, data);
          adminUsers.push({
            ...pub,
            accessToken: typeof data.accessToken === 'string' ? data.accessToken : '',
          });
        }
      }

      callbacks.onUsers(publicUsers, currentUser, adminUsers);
    },
    (err) => callbacks.onError(err)
  );

  const unsubItems = onSnapshot(
    collection(firestore, 'items'),
    (snap) => {
      const items = snap.docs
        .map((d) => mapWishItem(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt - a.createdAt);
      callbacks.onItems(items);
    },
    (err) => callbacks.onError(err)
  );

  const unsubCart = onSnapshot(
    doc(firestore, 'carts', session.userId),
    (snap) => {
      if (!snap.exists()) {
        callbacks.onCart({ items: [], shippingEstimate: 0, updatedAt: 0 });
        return;
      }
      const d = snap.data();
      const rawItems = Array.isArray(d.items) ? d.items : [];
      const items: CartEntry[] = rawItems.map((entry: Record<string, unknown>) => ({
        cartEntryId: typeof entry.cartEntryId === 'string' ? entry.cartEntryId : '',
        itemId: typeof entry.itemId === 'string' ? entry.itemId : '',
        subItemId: typeof entry.subItemId === 'string' ? entry.subItemId : undefined,
        titleSnapshot: typeof entry.titleSnapshot === 'string' ? entry.titleSnapshot : '',
        priceSnapshot: typeof entry.priceSnapshot === 'number' ? entry.priceSnapshot : 0,
        ownerId: (typeof entry.ownerId === 'string' ? entry.ownerId : 'victor') as ParticipantId,
        isBundle: Boolean(entry.isBundle),
        imageSnapshot: typeof entry.imageSnapshot === 'string' ? entry.imageSnapshot : undefined,
        storeNameSnapshot:
          typeof entry.storeNameSnapshot === 'string' ? entry.storeNameSnapshot : undefined,
        bought: Boolean(entry.bought),
        personalNote: typeof entry.personalNote === 'string' ? entry.personalNote : '',
      }));

      callbacks.onCart({
        items,
        shippingEstimate:
          typeof d.shippingEstimate === 'number' && Number.isFinite(d.shippingEstimate)
            ? d.shippingEstimate
            : 0,
        updatedAt: toEpochMs(d.updatedAt),
      });
    },
    (err) => callbacks.onError(err)
  );

  return () => {
    unsubUsers();
    unsubItems();
    unsubCart();
  };
}

export async function updateOwnProfile(
  userId: ParticipantId,
  patch: Partial<{
    displayName: string;
    avatar: string;
    accentColor: string;
    preferences: UserPreferences;
    onboardingCompleted: boolean;
    drawnUserId: ParticipantId | null;
  }>
): Promise<void> {
  const firestore = requireDb();
  const payload: Record<string, unknown> = { ...patch };

  // Validação de tamanho para avatar Base64
  const serializedSize = new TextEncoder().encode(JSON.stringify(payload)).length;
  if (serializedSize > MAX_FIRESTORE_DOC_BYTES) {
    throw new Error('A foto de perfil ficou grande demais. Tente uma imagem menor.');
  }

  await updateDoc(doc(firestore, 'users', userId), payload);
}

export type WishItemInput = Omit<WishItem, 'id' | 'createdAt' | 'updatedAt'>;

export async function saveWishItem(
  input: WishItemInput,
  existingItemId?: string
): Promise<string> {
  const firestore = requireDb();
  const now = Date.now();

  const computedPrice =
    input.kind === 'bundle'
      ? Math.round(input.subItems.reduce((sum, sub) => sum + (sub.price || 0), 0) * 100) / 100
      : Math.round((input.price || 0) * 100) / 100;

  const cleanPayload: Record<string, unknown> = {
    ownerId: input.ownerId,
    kind: input.kind,
    title: input.title.trim(),
    description: input.description.trim(),
    price: computedPrice,
    priority: input.priority,
    storeName: input.storeName.trim(),
    url: input.url.trim(),
    image: input.image.trim(),
    variantInfo: input.variantInfo.trim(),
    howToBuy: input.howToBuy.trim(),
    subItems: input.kind === 'bundle' ? input.subItems : [],
    updatedAt: now,
  };

  const docBytes = new TextEncoder().encode(JSON.stringify(cleanPayload)).length;
  if (docBytes > MAX_FIRESTORE_DOC_BYTES) {
    throw new Error(
      'As imagens deste item ou combo excederam o limite de armazenamento. Remova ou troque uma das fotos.'
    );
  }

  if (existingItemId) {
    await updateDoc(doc(firestore, 'items', existingItemId), cleanPayload);
    return existingItemId;
  }

  cleanPayload.createdAt = now;
  const created = await addDoc(collection(firestore, 'items'), cleanPayload);
  return created.id;
}

export async function deleteWishItem(itemId: string): Promise<void> {
  const firestore = requireDb();
  await deleteDoc(doc(firestore, 'items', itemId));
}

async function persistCart(userId: ParticipantId, cart: UserCart): Promise<void> {
  const firestore = requireDb();
  // Remove propriedades undefined antes de gravar no Firestore
  const cleanItems = cart.items.map((item) => {
    const clean: Record<string, unknown> = {
      cartEntryId: item.cartEntryId,
      itemId: item.itemId,
      titleSnapshot: item.titleSnapshot,
      priceSnapshot: item.priceSnapshot,
      ownerId: item.ownerId,
      isBundle: item.isBundle,
      bought: item.bought,
      personalNote: item.personalNote,
    };
    if (item.subItemId) clean.subItemId = item.subItemId;
    if (item.imageSnapshot) clean.imageSnapshot = item.imageSnapshot;
    if (item.storeNameSnapshot) clean.storeNameSnapshot = item.storeNameSnapshot;
    return clean;
  });

  await setDoc(doc(firestore, 'carts', userId), {
    items: cleanItems,
    shippingEstimate: Math.round((cart.shippingEstimate || 0) * 100) / 100,
    updatedAt: Date.now(),
  });
}

export async function addEntryToCart(
  userId: ParticipantId,
  currentCart: UserCart,
  entry: CartEntry
): Promise<{ added: boolean }> {
  const duplicate = currentCart.items.some(
    (e) => e.itemId === entry.itemId && (e.subItemId ?? '') === (entry.subItemId ?? '')
  );
  if (duplicate) {
    return { added: false };
  }

  await persistCart(userId, {
    ...currentCart,
    items: [...currentCart.items, entry],
  });
  return { added: true };
}

export async function updateCartEntry(
  userId: ParticipantId,
  currentCart: UserCart,
  cartEntryId: string,
  patch: Partial<Pick<CartEntry, 'bought' | 'personalNote'>>
): Promise<void> {
  const nextItems = currentCart.items.map((entry) =>
    entry.cartEntryId === cartEntryId ? { ...entry, ...patch } : entry
  );
  await persistCart(userId, { ...currentCart, items: nextItems });
}

export async function removeCartEntry(
  userId: ParticipantId,
  currentCart: UserCart,
  cartEntryId: string
): Promise<void> {
  const nextItems = currentCart.items.filter((entry) => entry.cartEntryId !== cartEntryId);
  await persistCart(userId, { ...currentCart, items: nextItems });
}

export async function updateCartShipping(
  userId: ParticipantId,
  currentCart: UserCart,
  shippingEstimate: number
): Promise<void> {
  await persistCart(userId, {
    ...currentCart,
    shippingEstimate: Math.max(0, shippingEstimate),
  });
}

export async function regenerateUserToken(
  targetUserId: ParticipantId,
  isSelf: boolean
): Promise<string> {
  const firestore = requireDb();
  const newToken = generateSecureToken(24);
  if (isSelf) {
    saveStoredSession(targetUserId, newToken);
  }
  await updateDoc(doc(firestore, 'users', targetUserId), {
    accessToken: newToken,
  });
  return newToken;
}

export async function updateEventSettings(patch: {
  budget?: number;
  deadline?: string;
  allowLateAdditions?: boolean;
  newAdminPin?: string;
}): Promise<void> {
  const firestore = requireDb();
  const payload: Record<string, unknown> = {};

  if (typeof patch.budget === 'number' && Number.isFinite(patch.budget) && patch.budget > 0) {
    payload.budget = Math.round(patch.budget * 100) / 100;
  }
  if (typeof patch.deadline === 'string' && patch.deadline) {
    payload.deadline = patch.deadline;
  }
  if (typeof patch.allowLateAdditions === 'boolean') {
    payload.allowLateAdditions = patch.allowLateAdditions;
  }
  if (patch.newAdminPin && patch.newAdminPin.trim().length >= 4) {
    payload.adminPinHash = await sha256Hex(patch.newAdminPin.trim());
  }

  await updateDoc(doc(firestore, 'settings', 'event'), payload);
}
