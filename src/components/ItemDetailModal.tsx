import React, { useState } from 'react';
import {
  Check,
  FileText,
  Edit3,
  ExternalLink,
  HeartHandshake,
  Layers,
  Package,
  Ruler,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import type { PublicUser, SubItem, UserCart, WishItem } from '../types';
import { formatBRL, getBudgetBadge, isValidImageSrc } from '../utils/format';
import { Avatar } from './Avatar';
import { totalWithShipping } from '../utils/wishBundles';

interface ItemDetailModalProps {
  item: WishItem | null;
  owner: PublicUser | undefined;
  familyMembers: PublicUser[];
  currentUserId: string;
  isAdmin: boolean;
  canEditOwn: boolean;
  budget: number;
  cart: UserCart;
  onClose: () => void;
  onAddFullItemToCart: (item: WishItem) => void;
  onAddSubItemToCart: (item: WishItem, subItem: SubItem) => void;
  onGoToCart: () => void;
  onEdit: (item: WishItem) => void;
  onDelete: (item: WishItem) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  owner,
  familyMembers,
  currentUserId,
  isAdmin,
  canEditOwn,
  budget,
  cart,
  onClose,
  onAddFullItemToCart,
  onAddSubItemToCart,
  onGoToCart,
  onEdit,
  onDelete,
}) => {
  const [mainImgError, setMainImgError] = useState(false);

  if (!item) return null;

  const isOwn = item.ownerId === currentUserId;
  const canEdit = (isOwn && canEditOwn) || isAdmin;
  const canDelete = (isOwn && canEditOwn) || isAdmin;
  const budgetInfo = getBudgetBadge(totalWithShipping(item), budget);

  const fullInCart = cart.items.some((e) => e.itemId === item.id && !e.subItemId);
  const hasMainImage = isValidImageSrc(item.image) && !mainImgError;

  const prefs = owner?.preferences;
  const hasAnyPref = Boolean(
    prefs && (prefs.shirtSize || prefs.shoeSize || prefs.favoriteColors || prefs.notes)
  );

  const priorityText =
    item.priority === 3
      ? 'Quero muito!'
      : item.priority === 2
        ? 'Quero bastante'
        : 'Seria bem legal';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F1D1A]/50 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[#E7E0D5] bg-[#FAF7F2] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top bar fixa */}
        <div className="flex items-center justify-between border-b border-[#E7E0D5] bg-white px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                item.kind === 'bundle'
                  ? 'bg-[#C8963E]/15 text-[#8C6520]'
                  : item.kind === 'digital'
                    ? 'bg-[#214E3E]/12 text-[#214E3E]'
                    : 'bg-[#B83B35]/10 text-[#B83B35]'
              }`}
            >
              {item.kind === 'bundle' ? (
                <>
                  <Layers className="h-3.5 w-3.5" />
                  Pacote com {item.subItems.length} itens
                </>
              ) : item.kind === 'misc' ? (
                <><FileText className="h-3.5 w-3.5" /> Pedido livre</>
              ) : item.kind === 'digital' ? (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Digital / Serviço
                </>
              ) : (
                <>
                  <Store className="h-3.5 w-3.5" />
                  {item.storeName || 'Produto de Loja'}
                </>
              )}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-[#FBF3E2] px-2.5 py-1 text-xs font-bold text-[#9E701D]">
              {Array.from({ length: item.priority }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-[#C8963E] text-[#C8963E]" />
              ))}
              <span className="ml-0.5 hidden sm:inline">{priorityText}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="rounded-xl p-2 text-[#6B655D] transition hover:bg-[#FAF7F2] hover:text-[#1F1D1A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* Imagem principal */}
          <div className="overflow-hidden rounded-2xl border border-[#E7E0D5] bg-white">
            {hasMainImage ? (
              <div className="flex max-h-80 items-center justify-center bg-white p-2">
                <img
                  src={item.image}
                  alt={item.title}
                  onError={() => setMainImgError(true)}
                  className="max-h-76 w-auto rounded-xl object-contain"
                />
              </div>
            ) : item.kind === 'misc' ? (
              <div className="flex h-44 flex-col items-center justify-center bg-[#F6EFE5] text-[#7A581B]">
                <FileText className="h-12 w-12" /><span className="mt-2 text-sm font-bold">Pedido livre</span>
              </div>
            ) : item.kind === 'digital' ? (
              <div className="flex h-44 flex-col items-center justify-center bg-gradient-to-br from-[#214E3E] to-[#193A2E] text-white">
                <Sparkles className="h-12 w-12 text-[#E7C27D]" />
                <span className="mt-2 text-sm font-bold tracking-wide uppercase">
                  Presente Digital / Assinatura
                </span>
              </div>
            ) : item.kind === 'bundle' ? (
              <div className="flex h-40 flex-col items-center justify-center bg-gradient-to-br from-[#FBF3E2] to-[#F3E5CA] text-[#8C6520]">
                <Layers className="h-12 w-12" />
                <span className="mt-2 text-sm font-bold">
                  Combo Personalizado • {item.subItems.length} itens
                </span>
              </div>
            ) : (
              <div className="flex h-44 flex-col items-center justify-center bg-[#F4EFE6] text-[#8B8275]">
                <Package className="h-12 w-12 opacity-70" />
                <span className="mt-2 text-xs font-semibold">Sem foto anexada</span>
              </div>
            )}
          </div>

          {/* Título e Preço */}
          <div className="mt-5">
            <h2 className="font-display text-2xl font-bold leading-snug text-[#1F1D1A]">
              {item.title}
            </h2>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7E0D5] bg-white p-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#6B655D]">
                  {item.kind === 'bundle' ? 'Total do combo' : 'Valor estimado'}
                </div>
                <div className="mt-0.5 text-3xl font-extrabold tracking-tight text-[#1F1D1A]">
                  {item.kind === 'misc' && item.price <= 0 ? 'Preço a combinar' : formatBRL(item.price)}
                </div>
                {item.shippingEstimate > 0 && <p className="mt-1 text-xs text-[#6B655D]">Frete estimado: {formatBRL(item.shippingEstimate)} · Total: {formatBRL(totalWithShipping(item))}</p>}
              </div>

              <div className="text-right">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                    budgetInfo.tone === 'over'
                      ? 'bg-[#B83B35]/12 text-[#992D28]'
                      : budgetInfo.tone === 'perfect'
                        ? 'bg-[#214E3E]/12 text-[#214E3E]'
                        : 'bg-[#F4EFE6] text-[#5B544A]'
                  }`}
                >
                  {item.kind === 'misc' && item.price <= 0 ? 'Preço a combinar' : budgetInfo.label}
                </span>
                <p className="mt-1 text-xs text-[#6B655D]">{item.kind === 'misc' && item.price <= 0 ? 'O comprador pode estimar o valor ao escolher o presente.' : budgetInfo.diffText}</p>
              </div>
            </div>
          </div>

          {/* Detalhes e variações */}
          {(item.variantInfo || item.description || item.howToBuy || item.storeName) && (
            <div className="mt-4 space-y-3 rounded-2xl border border-[#E7E0D5] bg-white p-4 text-sm">
              {item.storeName && (
                <div className="flex items-center justify-between gap-2 border-b border-[#F2ECE2] pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B655D]">
                    Loja / Plataforma
                  </span>
                  <span className="font-semibold text-[#1F1D1A]">{item.storeName}</span>
                </div>
              )}

              {item.variantInfo && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#6B655D]">
                    Modelo, tamanho ou variação
                  </div>
                  <p className="mt-1 font-medium text-[#1F1D1A]">{item.variantInfo}</p>
                </div>
              )}

              {item.howToBuy && (
                <div className="rounded-xl border border-[#214E3E]/20 bg-[#E6F0EC]/50 p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#214E3E]">
                    Como comprar / ativar / pagar
                  </div>
                  <p className="mt-1 leading-relaxed text-[#1F3A30]">{item.howToBuy}</p>
                </div>
              )}

              {item.description && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#6B655D]">
                    Observações
                  </div>
                  <p className="mt-1 whitespace-pre-line leading-relaxed text-[#4A453F]">
                    {item.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Lista expandida de sub-itens do Pacote/Combo */}
          {item.kind === 'bundle' && item.subItems.length > 0 && (
            <div className="mt-5">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#6B655D]">
                <Layers className="h-4 w-4 text-[#C8963E]" />
                Itens incluídos neste combo ({item.subItems.length})
              </h3>
              <div className="mt-2.5 space-y-3">
                {item.subItems.map((sub, idx) => {
                  const subInCart = cart.items.some(
                    (e) => e.itemId === item.id && e.subItemId === sub.id
                  );
                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-[#E7E0D5] bg-white p-3.5 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        {isValidImageSrc(sub.image) ? (
                          <img
                            src={sub.image}
                            alt={sub.title}
                            className="h-16 w-16 shrink-0 rounded-xl border border-[#ECE6DB] object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#FAF7F2] text-sm font-bold text-[#8B8275]">
                            #{idx + 1}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <span className="inline-block rounded-md bg-[#F4EFE6] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#6B655D]">
                                {sub.kind === 'digital' ? 'Digital' : sub.storeName || 'Loja'}
                              </span>
                              <h4 className="mt-1 text-sm font-bold text-[#1F1D1A]">
                                {sub.title}
                              </h4>
                              {sub.sourceOwnerId && <p className="mt-1 text-xs font-medium text-[#214E3E]">Da lista de {familyMembers.find((person) => person.id === sub.sourceOwnerId)?.displayName || 'outro familiar'}</p>}
                            </div>
                            <span className="text-base font-extrabold text-[#1F1D1A]">
                              {formatBRL(sub.price)}
                            </span>
                          </div>

                          {sub.notes && (
                            <p className="mt-1 text-xs text-[#6B655D]">{sub.notes}</p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {sub.url && (
                              <a
                                href={sub.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-xl border border-[#DFD7CA] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#1F1D1A] transition hover:bg-[#EFE8DB]"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Abrir na loja
                              </a>
                            )}

                            {!isOwn && (
                              <button
                                type="button"
                                onClick={() =>
                                  subInCart ? onGoToCart() : onAddSubItemToCart(item, sub)
                                }
                                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                  subInCart
                                    ? 'bg-[#214E3E]/12 text-[#214E3E]'
                                    : 'bg-[#1F1D1A] text-white hover:bg-[#B83B35]'
                                }`}
                              >
                                {subInCart ? (
                                  <>
                                    <Check className="h-3.5 w-3.5" />
                                    Item no carrinho
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="h-3.5 w-3.5" />
                                    + Só este item
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quem pediu + Dicas de tamanho */}
          <div className="mt-5 rounded-2xl border border-[#E7E0D5] bg-white p-4">
            <div className="flex items-center gap-3">
              <Avatar
                avatar={owner?.avatar ?? '🎁'}
                name={owner?.displayName ?? 'Familiar'}
                accentColor={owner?.accentColor}
                size="md"
              />
              <div>
                <div className="text-xs font-semibold text-[#6B655D]">Pedido por</div>
                <div className="text-sm font-bold text-[#1F1D1A]">
                  {owner?.displayName ?? item.ownerId}
                  {isOwn && (
                    <span className="ml-1.5 rounded-md bg-[#EFE8DB] px-2 py-0.5 text-[11px] font-bold text-[#6B655D]">
                      (Você)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {hasAnyPref && (
              <div className="mt-3 border-t border-[#F2ECE2] pt-3 text-xs text-[#4A453F]">
                <div className="mb-1.5 flex items-center gap-1.5 font-bold text-[#214E3E]">
                  <HeartHandshake className="h-3.5 w-3.5" />
                  Dicas de perfil de {owner?.displayName}
                </div>
                <div className="flex flex-wrap gap-2">
                  {prefs?.shirtSize && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#FAF7F2] px-2.5 py-1 ring-1 ring-[#E7E0D5]">
                      <Ruler className="h-3 w-3 text-[#6B655D]" />
                      Camiseta: <strong>{prefs.shirtSize}</strong>
                    </span>
                  )}
                  {prefs?.shoeSize && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#FAF7F2] px-2.5 py-1 ring-1 ring-[#E7E0D5]">
                      Calçado: <strong>{prefs.shoeSize}</strong>
                    </span>
                  )}
                  {prefs?.favoriteColors && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#FAF7F2] px-2.5 py-1 ring-1 ring-[#E7E0D5]">
                      Cores: <strong>{prefs.favoriteColors}</strong>
                    </span>
                  )}
                </div>
                {prefs?.notes && (
                  <p className="mt-2 italic text-[#6B655D]">“{prefs.notes}”</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Barra de ações inferior */}
        <div className="border-t border-[#E7E0D5] bg-white px-5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-4 py-2.5 text-sm font-bold text-[#1F1D1A] transition hover:bg-[#EFE8DB]"
                >
                  <ExternalLink className="h-4 w-4 text-[#B83B35]" />
                  Abrir na loja
                </a>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-[#DFD7CA] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#1F1D1A] transition hover:bg-[#FAF7F2]"
                >
                  <Edit3 className="h-4 w-4" />
                  Editar
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-[#B83B35]/25 bg-[#FFF5F5] px-3.5 py-2.5 text-sm font-semibold text-[#B83B35] transition hover:bg-[#B83B35]/10"
                >
                  <Trash2 className="h-4 w-4" />
                  {!isOwn && isAdmin ? 'Excluir (Admin)' : 'Excluir'}
                </button>
              )}
            </div>

            {!isOwn && (
              <button
                type="button"
                onClick={() => (fullInCart ? onGoToCart() : onAddFullItemToCart(item))}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm transition sm:flex-none ${
                  fullInCart
                    ? 'bg-[#214E3E] hover:bg-[#193C30]'
                    : 'bg-[#B83B35] hover:bg-[#992D28]'
                }`}
              >
                {fullInCart ? (
                  <>
                    <Check className="h-4 w-4" />
                    No carrinho • Abrir
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    {item.kind === 'bundle'
                      ? 'Adicionar pacote ao carrinho'
                      : 'Adicionar ao meu carrinho'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
