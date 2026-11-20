import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Gift,
  Lock,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  removeCartEntry,
  updateCartEntry,
  updateCartShipping,
} from '../firebase/service';
import { useToast } from '../hooks/useToast';
import type {
  CartEntry,
  ParticipantId,
  PublicUser,
  UserCart,
  WishItem,
} from '../types';
import {
  formatBRL,
  isValidImageSrc,
  parsePriceInput,
  priceToInputString,
} from '../utils/format';
import { Avatar } from './Avatar';

interface CartViewProps {
  currentUserId: ParticipantId;
  cart: UserCart;
  budget: number;
  publicUsers: PublicUser[];
  allItems: WishItem[];
  onOpenOriginalItem: (item: WishItem) => void;
  onGoToFeed: () => void;
}

interface CartNoteRowProps {
  entry: CartEntry;
  onSaveNote: (cartEntryId: string, note: string) => void;
}

const CartNoteInput: React.FC<CartNoteRowProps> = ({ entry, onSaveNote }) => {
  const [note, setNote] = useState(entry.personalNote);

  useEffect(() => {
    setNote(entry.personalNote);
  }, [entry.personalNote]);

  const handleBlur = () => {
    if (note.trim() !== entry.personalNote.trim()) {
      onSaveNote(entry.cartEntryId, note.trim());
    }
  };

  return (
    <input
      type="text"
      value={note}
      onChange={(e) => setNote(e.target.value)}
      onBlur={handleBlur}
      placeholder="Anotação secreta (ex: Chega dia 10/12, embalagem de presente...)"
      className="mt-2.5 w-full rounded-xl border border-[#DFD7CA] bg-[#FAF7F2] px-3 py-2 text-xs text-[#1F1D1A] outline-none transition focus:border-[#214E3E] focus:bg-white"
    />
  );
};

export const CartView: React.FC<CartViewProps> = ({
  currentUserId,
  cart,
  budget,
  publicUsers,
  allItems,
  onOpenOriginalItem,
  onGoToFeed,
}) => {
  const { showToast } = useToast();
  const [shippingText, setShippingText] = useState(() =>
    cart.shippingEstimate > 0 ? priceToInputString(cart.shippingEstimate) : ''
  );

  useEffect(() => {
    setShippingText(cart.shippingEstimate > 0 ? priceToInputString(cart.shippingEstimate) : '');
  }, [cart.shippingEstimate]);

  const userMap = useMemo(
    () => new Map(publicUsers.map((u) => [u.id, u])),
    [publicUsers]
  );

  const itemMap = useMemo(
    () => new Map(allItems.map((i) => [i.id, i])),
    [allItems]
  );

  const itemsSubtotal = useMemo(
    () => cart.items.reduce((sum, entry) => sum + entry.priceSnapshot, 0),
    [cart.items]
  );

  const suggestedShipping = useMemo(() => {
    const usedIds = new Set<string>();
    return cart.items.reduce((sum, entry) => {
      const parent = itemMap.get(entry.itemId);
      const sub = entry.subItemId ? parent?.subItems.find((s) => s.id === entry.subItemId) : undefined;
      const sourceId = sub?.sourceItemId;
      const source = sourceId ? itemMap.get(sourceId) : undefined;
      const id = sourceId || (entry.subItemId ? `${entry.itemId}/${entry.subItemId}` : entry.itemId);
      if (usedIds.has(id)) return sum;
      usedIds.add(id);
      return sum + (source?.shippingEstimate || (!entry.subItemId ? parent?.shippingEstimate || 0 : 0));
    }, 0);
  }, [cart.items, itemMap]);
  const shippingValue = parsePriceInput(shippingText);
  const grandTotal = itemsSubtotal + shippingValue;
  const diff = grandTotal - budget;
  const progressPct = Math.min(100, Math.round((grandTotal / Math.max(1, budget)) * 100));
  const boughtCount = cart.items.filter((i) => i.bought).length;

  const handleShippingBlur = async () => {
    const parsed = parsePriceInput(shippingText);
    if (Math.abs(parsed - cart.shippingEstimate) < 0.01) return;
    try {
      await updateCartShipping(currentUserId, cart, parsed);
    } catch {
      showToast('Não foi possível atualizar o frete.', 'error');
    }
  };

  const handleToggleBought = async (entry: CartEntry) => {
    try {
      await updateCartEntry(currentUserId, cart, entry.cartEntryId, {
        bought: !entry.bought,
      });
      showToast(
        !entry.bought ? 'Marcado como comprado! 🎉' : 'Marcado como pendente.',
        'success'
      );
    } catch {
      showToast('Erro ao atualizar item do carrinho.', 'error');
    }
  };

  const handleSaveNote = async (cartEntryId: string, personalNote: string) => {
    try {
      await updateCartEntry(currentUserId, cart, cartEntryId, { personalNote });
      showToast('Anotação salva no seu planejamento!', 'info');
    } catch {
      showToast('Erro ao salvar anotação.', 'error');
    }
  };

  const handleRemove = async (cartEntryId: string) => {
    try {
      await removeCartEntry(currentUserId, cart, cartEntryId);
      showToast('Item removido do carrinho.', 'info');
    } catch {
      showToast('Erro ao remover item.', 'error');
    }
  };

  let budgetFeedbackTitle = '';
  let budgetToneClass = '';
  let barColorClass = '';

  if (diff > 0.01) {
    budgetFeedbackTitle = `Passou ${formatBRL(diff)} do valor combinado`;
    budgetToneClass = 'bg-[#B83B35]/12 text-[#992D28] border-[#B83B35]/20';
    barColorClass = 'bg-[#B83B35]';
  } else if (grandTotal > 0 && Math.abs(diff) <= 15) {
    budgetFeedbackTitle = 'Dentro do orçamento!';
    budgetToneClass = 'bg-[#214E3E]/12 text-[#214E3E] border-[#214E3E]/25';
    barColorClass = 'bg-[#214E3E]';
  } else {
    budgetFeedbackTitle = `Faltam ${formatBRL(Math.max(0, budget - grandTotal))} para o limite`;
    budgetToneClass = 'bg-[#FBF3E2] text-[#7A581B] border-[#C8963E]/25';
    barColorClass = 'bg-[#214E3E]';
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Banner Privacidade */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#214E3E]/20 bg-[#E6F0EC]/70 px-5 py-3.5">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-[#1F3A30]">
          <Lock className="h-4 w-4 shrink-0 text-[#214E3E]" />
          <span>
            Seu Carrinho de Planejamento é <strong>100% privado</strong> — ninguém mais na
            família vê suas escolhas.
          </span>
        </div>
        {cart.items.length > 0 && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#214E3E]">
            {boughtCount} de {cart.items.length}{' '}
            {cart.items.length === 1 ? 'comprado' : 'comprados'}
          </span>
        )}
      </div>

      {/* Painel de Orçamento */}
      <section className="rounded-3xl border border-[#E7E0D5] bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B655D]">
              Planejamento de Orçamento (Ref. {formatBRL(budget)})
            </span>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className="text-3xl font-extrabold tracking-tight text-[#1F1D1A]">
                {formatBRL(grandTotal)}
              </span>
              <span className="text-sm font-medium text-[#6B655D]">
                de {formatBRL(budget)}
              </span>
            </div>
          </div>

          <div className={`rounded-2xl border px-3.5 py-2 text-xs font-bold ${budgetToneClass}`}>
            {budgetFeedbackTitle}
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#EFE8DB]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#F2ECE2] pt-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F2] px-4 py-3 text-sm">
            <span className="font-medium text-[#6B655D]">Subtotal dos itens</span>
            <span className="font-bold text-[#1F1D1A]">{formatBRL(itemsSubtotal)}</span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAF7F2] px-4 py-2 text-sm">
            <label
              htmlFor="cart-shipping"
              className="flex items-center gap-1.5 font-medium text-[#6B655D]"
            >
              <Truck className="h-4 w-4 text-[#8B8275]" />
              Frete estimado (R$)
            </label>
            <input
              id="cart-shipping"
              type="text"
              inputMode="decimal"
              value={shippingText}
              onChange={(e) => setShippingText(e.target.value)}
              onBlur={handleShippingBlur}
              placeholder="0,00"
              className="w-24 rounded-xl border border-[#DFD7CA] bg-white px-2.5 py-1.5 text-right text-sm font-bold text-[#1F1D1A] outline-none focus:border-[#214E3E]"
            />
          </div>
        </div>
        {suggestedShipping > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FBF3E2] p-3 text-xs text-[#7A581B]">
            <span>Frete informado nos pedidos: <strong>{formatBRL(suggestedShipping)}</strong>. Pode ser menor ao reunir compras no mesmo pedido.</span>
            <button type="button" onClick={async () => {
              setShippingText(priceToInputString(suggestedShipping));
              try { await updateCartShipping(currentUserId, cart, suggestedShipping); }
              catch { showToast('Não foi possível aplicar o frete sugerido.', 'error'); }
            }} className="rounded-xl bg-white px-3 py-2 font-bold text-[#7A581B]">Usar como estimativa</button>
          </div>
        )}
      </section>

      {/* Lista de itens no carrinho */}
      {cart.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#D7CCBB] bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF7F2] text-[#214E3E]">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h3 className="font-display mt-4 text-xl font-bold text-[#1F1D1A]">
            Seu carrinho está vazio
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-[#6B655D]">
            Explore os desejos do seu Amigo Secreto e adicione opções aqui para simular somas,
            incluir frete e marcar o que já comprou.
          </p>
          <button
            type="button"
            onClick={onGoToFeed}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#B83B35] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#992D28]"
          >
            <Gift className="h-4 w-4" />
            Explorar desejos
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cart.items.map((entry) => {
            const owner = userMap.get(entry.ownerId);
            const liveItem = itemMap.get(entry.itemId);
            const liveSubItem =
              entry.subItemId && liveItem
                ? liveItem.subItems.find((s) => s.id === entry.subItemId)
                : undefined;

            const currentUrl = liveSubItem ? liveSubItem.url : liveItem?.url;
            const currentLivePrice = liveSubItem
              ? liveSubItem.price
              : liveItem?.price;
            const itemMissing = !liveItem || (Boolean(entry.subItemId) && !liveSubItem);
            const priceChanged =
              typeof currentLivePrice === 'number' &&
              Math.abs(currentLivePrice - entry.priceSnapshot) > 0.01;

            return (
              <div
                key={entry.cartEntryId}
                className={`rounded-3xl border p-4 transition sm:p-5 ${
                  entry.bought
                    ? 'border-[#214E3E]/30 bg-[#E6F0EC]/35'
                    : 'border-[#E7E0D5] bg-white shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {isValidImageSrc(entry.imageSnapshot) ? (
                    <img
                      src={entry.imageSnapshot}
                      alt={entry.titleSnapshot}
                      className="h-16 w-16 shrink-0 rounded-2xl border border-[#E7E0D5] bg-white object-cover sm:h-20 sm:w-20"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#FAF7F2] text-[#8B8275] sm:h-20 sm:w-20">
                      <ShoppingBag className="h-7 w-7" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {owner && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF7F2] py-0.5 pr-2 pl-1 text-[11px] font-bold text-[#1F1D1A] ring-1 ring-[#E7E0D5]">
                              <Avatar
                                avatar={owner.avatar}
                                name={owner.displayName}
                                accentColor={owner.accentColor}
                                size="xs"
                              />
                              Para: {owner.displayName}
                            </span>
                          )}
                          {entry.isBundle && (
                            <span className="rounded-full bg-[#C8963E]/15 px-2 py-0.5 text-[10px] font-bold text-[#8C6520]">
                              Combo
                            </span>
                          )}
                          {entry.storeNameSnapshot && (
                            <span className="text-[11px] font-semibold text-[#6B655D]">
                              • {entry.storeNameSnapshot}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => liveItem && onOpenOriginalItem(liveItem)}
                          disabled={!liveItem}
                          className={`mt-1.5 text-left text-base font-bold leading-snug ${
                            entry.bought
                              ? 'text-[#214E3E] line-through decoration-[#214E3E]/40'
                              : 'text-[#1F1D1A] hover:text-[#B83B35]'
                          }`}
                        >
                          {entry.titleSnapshot}
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-extrabold text-[#1F1D1A]">
                          {formatBRL(entry.priceSnapshot)}
                        </div>
                        {priceChanged && typeof currentLivePrice === 'number' && (
                          <div className="text-[11px] font-semibold text-[#C8963E]">
                            Atual na lista: {formatBRL(currentLivePrice)}
                          </div>
                        )}
                      </div>
                    </div>

                    {itemMissing && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#FBF3E2] px-2.5 py-1 text-[11px] font-semibold text-[#7A581B]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Este pedido foi removido ou editado na lista original.
                      </div>
                    )}

                    <CartNoteInput entry={entry} onSaveNote={handleSaveNote} />

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleBought(entry)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                            entry.bought
                              ? 'bg-[#214E3E] text-white'
                              : 'border border-[#DFD7CA] bg-[#FAF7F2] text-[#1F1D1A] hover:bg-[#E6F0EC] hover:text-[#214E3E]'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {entry.bought ? 'Já comprei ✓' : 'Marcar como comprado'}
                        </button>

                        {currentUrl && (
                          <a
                            href={currentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-xs font-semibold text-[#1F1D1A] hover:bg-[#FAF7F2]"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-[#B83B35]" />
                            Ir para loja
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(entry.cartEntryId)}
                        title="Remover do carrinho"
                        className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#B83B35] hover:bg-[#FFF5F5]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
