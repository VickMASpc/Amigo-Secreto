import React, { useMemo, useState } from 'react';
import {
  Eye,
  FileText,
  EyeOff,
  Gift,
  HeartHandshake,
  Layers,
  Plus,
  Search,
  Sparkles,
  Store,
  UserCheck,
} from 'lucide-react';
import type {
  CurrentUser,
  ItemKind,
  ParticipantId,
  PublicUser,
  SortOption,
  UserCart,
  WishItem,
} from '../types';
import { Avatar } from './Avatar';
import { WishCard } from './WishCard';

interface FeedViewProps {
  currentUser: CurrentUser;
  publicUsers: PublicUser[];
  items: WishItem[];
  loading: boolean;
  budget: number;
  cart: UserCart;
  canManageOwnItems: boolean;
  isAdmin: boolean;
  onOpenItemDetail: (item: WishItem) => void;
  onAddToCart: (item: WishItem) => void;
  onEditItem: (item: WishItem) => void;
  onDeleteItem: (item: WishItem) => void;
  onGoToAdd: () => void;
  onGoToProfile: () => void;
}

const PRIVACY_KEY = 'amigo_secreto_privacy_mode_v1';

export const FeedView: React.FC<FeedViewProps> = ({
  currentUser,
  publicUsers,
  items,
  loading,
  budget,
  cart,
  canManageOwnItems,
  isAdmin,
  onOpenItemDetail,
  onAddToCart,
  onEditItem,
  onDeleteItem,
  onGoToAdd,
  onGoToProfile,
}) => {
  const [personFilter, setPersonFilter] = useState<'all' | 'secret' | ParticipantId>('all');
  const [kindFilter, setKindFilter] = useState<'all' | ItemKind>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(PRIVACY_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const togglePrivacyMode = () => {
    setPrivacyMode((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(PRIVACY_KEY, String(next));
      } catch {
        // Ignora erro de storage
      }
      return next;
    });
  };

  const userMap = useMemo(
    () => new Map<ParticipantId, PublicUser>(publicUsers.map((u) => [u.id, u])),
    [publicUsers]
  );

  const drawnUser = currentUser.drawnUserId ? userMap.get(currentUser.drawnUserId) : undefined;

  const activeOwnerId: ParticipantId | null = useMemo(() => {
    if (personFilter === 'secret') {
      return currentUser.drawnUserId ?? null;
    }
    if (personFilter === 'all') return null;
    return personFilter;
  }, [personFilter, currentUser.drawnUserId]);

  const focusedUser = activeOwnerId ? userMap.get(activeOwnerId) : undefined;

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return items
      .filter((item) => {
        if (activeOwnerId && item.ownerId !== activeOwnerId) return false;
        if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
        if (query) {
          const haystack = `${item.title} ${item.storeName} ${item.description} ${item.variantInfo} ${item.subItems
            .map((s) => s.title)
            .join(' ')}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'priority') {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return b.createdAt - a.createdAt;
        }
        return b.createdAt - a.createdAt;
      });
  }, [items, activeOwnerId, kindFilter, searchTerm, sortBy]);

  const handleSelectSecretMatch = () => {
    if (!currentUser.drawnUserId) {
      onGoToProfile();
      return;
    }
    setPersonFilter((prev) => (prev === 'secret' ? 'all' : 'secret'));
  };

  const isSecretSelected = personFilter === 'secret';

  return (
    <div className="space-y-6">
      {/* Barra de Destaque: Meu Amigo Secreto + Busca */}
      <section className="rounded-3xl border border-[#E7E0D5] bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Botão de Destaque Secreto + Olho Privacidade */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectSecretMatch}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold shadow-xs transition ${
                isSecretSelected
                  ? 'bg-[#B83B35] text-white ring-2 ring-[#B83B35]/30'
                  : 'bg-gradient-to-r from-[#B83B35]/10 to-[#C8963E]/15 text-[#992D28] hover:from-[#B83B35]/18 hover:to-[#C8963E]/25'
              }`}
            >
              <Gift className="h-4 w-4 shrink-0" />
              <span>
                Meu Amigo Secreto (
                {!drawnUser
                  ? 'Definir'
                  : privacyMode
                    ? '••••••'
                    : drawnUser.displayName}
                )
              </span>
            </button>

            <button
              type="button"
              onClick={togglePrivacyMode}
              title={
                privacyMode
                  ? 'Mostrar nome no botão secreto'
                  : 'Modo Privacidade: oculta o nome de quem você tirou'
              }
              className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-3 text-xs font-semibold transition ${
                privacyMode
                  ? 'border-[#214E3E]/30 bg-[#E6F0EC] text-[#214E3E]'
                  : 'border-[#E7E0D5] bg-[#FAF7F2] text-[#6B655D] hover:bg-[#EFE8DB]'
              }`}
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {privacyMode ? 'Nome oculto' : 'Privacidade'}
              </span>
            </button>
          </div>

          {/* Botão rápido de adicionar (desktop/tablet) + busca */}
          <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8B8275]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar presente ou loja..."
                className="w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] py-2.5 pr-3 pl-9 text-sm text-[#1F1D1A] outline-none transition focus:border-[#B83B35] focus:bg-white"
              />
            </div>

            {canManageOwnItems && (
              <button
                type="button"
                onClick={onGoToAdd}
                className="hidden shrink-0 items-center gap-1.5 rounded-2xl bg-[#214E3E] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#193C30] sm:inline-flex"
              >
                <Plus className="h-4 w-4" />
                Pedir
              </button>
            )}
          </div>
        </div>

        {/* Chips de filtro por pessoa */}
        <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setPersonFilter('all')}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
              personFilter === 'all'
                ? 'bg-[#1F1D1A] text-white'
                : 'bg-[#FAF7F2] text-[#6B655D] ring-1 ring-[#E7E0D5] hover:bg-[#EFE8DB]'
            }`}
          >
            Todos ({items.length})
          </button>

          {publicUsers.map((person) => {
            const count = items.filter((i) => i.ownerId === person.id).length;
            const isSelected = personFilter === person.id;
            const isSelf = person.id === currentUser.id;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() =>
                  setPersonFilter((prev) => (prev === person.id ? 'all' : person.id))
                }
                className={`inline-flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-xs font-bold transition ${
                  isSelected
                    ? 'bg-[#1F1D1A] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#1F1D1A] ring-1 ring-[#E7E0D5] hover:bg-[#EFE8DB]'
                }`}
              >
                <Avatar
                  avatar={person.avatar}
                  name={person.displayName}
                  accentColor={person.accentColor}
                  size="xs"
                />
                <span>
                  {person.displayName}
                  {isSelf ? ' (Você)' : ''}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#6B655D]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtros secundários: Tipo e Ordenação */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F2ECE2] pt-3">
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'all', label: 'Todos os tipos', icon: null },
                { id: 'store', label: 'Loja', icon: Store },
                { id: 'digital', label: 'Digital / Serviço', icon: Sparkles },
                { id: 'bundle', label: 'Pacotes / Combos', icon: Layers },
                { id: 'misc', label: 'Pedido livre / Outros', icon: FileText },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setKindFilter(id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  kindFilter === id
                    ? 'bg-[#214E3E] text-white'
                    : 'bg-[#FAF7F2] text-[#6B655D] hover:bg-[#EFE8DB]'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Ordenar desejos"
            className="rounded-xl border border-[#DFD7CA] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#1F1D1A] outline-none focus:border-[#B83B35]"
          >
            <option value="recent">Mais recentes</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
            <option value="priority">Mais desejados ⭐</option>
          </select>
        </div>
      </section>

      {/* Card discreto de dicas de perfil quando alguém filtra por uma pessoa */}
      {focusedUser && (
        <section className="rounded-3xl border border-[#214E3E]/20 bg-[#E6F0EC]/55 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {!(isSecretSelected && privacyMode) ? (
                <Avatar
                  avatar={focusedUser.avatar}
                  name={focusedUser.displayName}
                  accentColor={focusedUser.accentColor}
                  size="md"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#214E3E] text-white">
                  <UserCheck className="h-5 w-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5 text-sm font-bold text-[#1F3A30]">
                  <HeartHandshake className="h-4 w-4 text-[#214E3E]" />
                  {isSecretSelected && privacyMode
                    ? 'Dicas do seu Amigo Secreto (nome oculto)'
                    : `Dicas de presente de ${focusedUser.displayName}${
                        focusedUser.id === currentUser.id ? ' (Você)' : ''
                      }`}
                </div>
                {focusedUser.preferences.notes ? (
                  <p className="mt-0.5 text-xs text-[#2E5244]">
                    “{focusedUser.preferences.notes}”
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-[#4C6D60]">
                    Sem recado adicional cadastrado no perfil.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {focusedUser.preferences.shirtSize && (
                <span className="rounded-xl bg-white px-3 py-1.5 font-medium text-[#1F1D1A] shadow-2xs">
                  Camiseta: <strong>{focusedUser.preferences.shirtSize}</strong>
                </span>
              )}
              {focusedUser.preferences.shoeSize && (
                <span className="rounded-xl bg-white px-3 py-1.5 font-medium text-[#1F1D1A] shadow-2xs">
                  Calçado: <strong>{focusedUser.preferences.shoeSize}</strong>
                </span>
              )}
              {focusedUser.preferences.favoriteColors && (
                <span className="rounded-xl bg-white px-3 py-1.5 font-medium text-[#1F1D1A] shadow-2xs">
                  Cores: <strong>{focusedUser.preferences.favoriteColors}</strong>
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Grid de Cards / Loading / Vazio */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-3xl border border-[#E7E0D5] bg-white p-4"
            >
              <div className="aspect-[4/3] animate-pulse rounded-2xl bg-[#EFE8DB]" />
              <div className="mt-4 h-5 w-3/4 animate-pulse rounded-lg bg-[#EFE8DB]" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded-lg bg-[#F4EFE6]" />
              <div className="mt-6 h-8 w-1/3 animate-pulse rounded-lg bg-[#EFE8DB]" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#D7CCBB] bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF7F2] text-[#B83B35]">
            <Gift className="h-7 w-7" />
          </div>
          <h3 className="font-display mt-4 text-xl font-bold text-[#1F1D1A]">
            {items.length === 0
              ? 'Ainda não há desejos cadastrados'
              : 'Nenhum desejo encontrado nesse filtro'}
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-[#6B655D]">
            {items.length === 0
              ? 'Seja o primeiro da família a cadastrar uma ideia de presente!'
              : 'Tente limpar os filtros acima ou buscar por outro nome.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {(personFilter !== 'all' || kindFilter !== 'all' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setPersonFilter('all');
                  setKindFilter('all');
                  setSearchTerm('');
                }}
                className="rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-5 py-2.5 text-sm font-semibold text-[#1F1D1A] hover:bg-[#EFE8DB]"
              >
                Limpar filtros
              </button>
            )}
            {canManageOwnItems && (
              <button
                type="button"
                onClick={onGoToAdd}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#B83B35] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#992D28]"
              >
                <Plus className="h-4 w-4" />
                Adicionar desejo
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const owner = userMap.get(item.ownerId);
            const inCart = cart.items.some((e) => e.itemId === item.id && !e.subItemId);
            const canEditOrDelete =
              (item.ownerId === currentUser.id && canManageOwnItems) || isAdmin;

            return (
              <WishCard
                key={item.id}
                item={item}
                owner={owner}
                currentUserId={currentUser.id}
                budget={budget}
                inCart={inCart}
                canEditOrDelete={canEditOrDelete}
                onOpenDetail={onOpenItemDetail}
                onAddToCart={onAddToCart}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
