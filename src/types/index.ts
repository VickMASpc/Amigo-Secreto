export type ParticipantId = 'victor' | 'wellington' | 'rosangela' | 'bianca';

export type UserRole = 'admin' | 'member';

export interface UserPreferences {
  shirtSize: string;
  shoeSize: string;
  favoriteColors: string;
  notes: string;
}

/**
 * Representação pública de um participante.
 * Por regra estrita anti-spoiler, nunca inclui `drawnUserId` nem `accessToken`.
 */
export interface PublicUser {
  id: ParticipantId;
  baseName: string;
  displayName: string;
  role: UserRole;
  avatar: string; // Emoji ou Data URL / URL de imagem
  accentColor: string;
  preferences: UserPreferences;
  onboardingCompleted: boolean;
  hasLoggedIn: boolean;
}

/**
 * Usuário autenticado atual (apenas para a sessão própria).
 */
export interface CurrentUser extends PublicUser {
  accessToken: string;
  drawnUserId: ParticipantId | null;
}

/**
 * Visão exclusiva do Painel Admin para gerenciar QR Codes e tokens.
 * Nunca expõe `drawnUserId`.
 */
export interface AdminUserRecord extends PublicUser {
  accessToken: string;
}

export interface EventSettings {
  budget: number;
  deadline: string; // ISO string com fuso de Brasília, ex: "2026-11-25T23:59:59-03:00"
  allowLateAdditions: boolean;
  initialized: boolean;
  adminPinHash?: string;
}

export type ItemKind = 'store' | 'digital' | 'bundle' | 'misc';
export type SubItemKind = 'store' | 'digital' | 'misc';
export type ItemPriority = 1 | 2 | 3;

export interface SubItem {
  id: string;
  /** References an existing wishlist product. Remaining fields are a snapshot. */
  sourceItemId?: string;
  /** Person whose public wish this entry references. */
  sourceOwnerId?: ParticipantId;
  title: string;
  price: number;
  kind: SubItemKind;
  url: string;
  storeName: string;
  image: string;
  notes: string;
}

export interface WishItem {
  id: string;
  ownerId: ParticipantId;
  kind: ItemKind;
  title: string;
  description: string;
  price: number;
  shippingEstimate: number;
  priority: ItemPriority;
  storeName: string;
  url: string;
  image: string;
  variantInfo: string;
  howToBuy: string;
  subItems: SubItem[];
  createdAt: number;
  updatedAt: number;
}

export interface CartEntry {
  cartEntryId: string;
  itemId: string;
  subItemId?: string;
  titleSnapshot: string;
  priceSnapshot: number;
  ownerId: ParticipantId;
  isBundle: boolean;
  imageSnapshot?: string;
  storeNameSnapshot?: string;
  bought: boolean;
  personalNote: string;
}

export interface UserCart {
  items: CartEntry[];
  shippingEstimate: number;
  updatedAt: number;
}

export type ActiveTab = 'feed' | 'add' | 'cart' | 'profile' | 'admin';

export type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'priority';
