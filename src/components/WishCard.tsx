import React, { useState } from 'react';
import {
  Check,
  FileText,
  Edit3,
  Layers,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Trash2,
} from 'lucide-react';
import type { PublicUser, WishItem } from '../types';
import { formatBRL, getBudgetBadge, isValidImageSrc } from '../utils/format';
import { Avatar } from './Avatar';
import { totalWithShipping } from '../utils/wishBundles';

interface WishCardProps {
  item: WishItem;
  owner: PublicUser | undefined;
  currentUserId: string;
  budget: number;
  inCart: boolean;
  canEditOrDelete: boolean;
  onOpenDetail: (item: WishItem) => void;
  onAddToCart: (item: WishItem) => void;
  onEdit: (item: WishItem) => void;
  onDelete: (item: WishItem) => void;
}

export const WishCard: React.FC<WishCardProps> = ({
  item,
  owner,
  currentUserId,
  budget,
  inCart,
  canEditOrDelete,
  onOpenDetail,
  onAddToCart,
  onEdit,
  onDelete,
}) => {
  const [imgError, setImgError] = useState(false);
  const isOwn = item.ownerId === currentUserId;
  const budgetInfo = getBudgetBadge(totalWithShipping(item), budget);

  const subImages =
    item.kind === 'bundle'
      ? item.subItems
          .map((s) => s.image)
          .filter((src) => isValidImageSrc(src))
          .slice(0, 4)
      : [];

  const hasMainImage = isValidImageSrc(item.image) && !imgError;

  const badgeToneClasses = {
    perfect: 'bg-[#214E3E]/12 text-[#214E3E]',
    combo: 'bg-[#355C7D]/12 text-[#355C7D]',
    within: 'bg-[#EFE8DB] text-[#5B544A]',
    over: 'bg-[#B83B35]/12 text-[#992D28]',
  }[budgetInfo.tone];

  const priorityLabel =
    item.priority === 3 ? 'Quero muito' : item.priority === 2 ? 'Quero bastante' : 'Seria legal';

  return (
    <article
      onClick={() => onOpenDetail(item)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-[#E7E0D5] bg-white shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-[#D7CCBB] hover:shadow-lg"
    >
      {/* Área visual / foto */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4EFE6]">
        {hasMainImage ? (
          <img
            src={item.image}
            alt={item.title}
            onError={() => setImgError(true)}
            loading="lazy"
            className="h-full w-full bg-white object-contain p-2 transition duration-300 group-hover:scale-[1.03]"
          />
        ) : item.kind === 'bundle' && subImages.length > 0 ? (
          <div className="grid h-full w-full grid-cols-2 gap-0.5 bg-[#E7E0D5]">
            {subImages.map((src, i) => (
              <div key={i} className="overflow-hidden bg-[#FAF7F2]">
                <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        ) : item.kind === 'digital' ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#214E3E] via-[#2A5E4B] to-[#1A3B2F] p-4 text-white">
            <Sparkles className="h-10 w-10 text-[#E7C27D]" />
            <span className="mt-2 text-xs font-bold tracking-wider uppercase text-white/85">
              Digital / Assinatura
            </span>
          </div>
        ) : item.kind === 'misc' ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#F6EFE5] p-4 text-[#7A581B]">
            <FileText className="h-10 w-10" />
            <span className="mt-2 text-xs font-bold uppercase">Pedido livre</span>
          </div>
        ) : item.kind === 'bundle' ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#C8963E]/25 via-[#FBF3E2] to-[#B83B35]/15 p-4 text-[#7A581B]">
            <Layers className="h-10 w-10" />
            <span className="mt-2 text-xs font-bold tracking-wider uppercase">
              Combo com {item.subItems.length} itens
            </span>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#F4EFE6] to-[#EAE2D4] p-4 text-[#8B8275]">
            <Package className="h-10 w-10 opacity-75" />
            {item.storeName && (
              <span className="mt-2 text-xs font-semibold">{item.storeName}</span>
            )}
          </div>
        )}

        {/* Badges superiores */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-xs backdrop-blur-md ${
              item.kind === 'bundle'
                ? 'bg-[#C8963E] text-white'
                : item.kind === 'digital'
                  ? 'bg-[#214E3E] text-white'
                  : 'bg-white/92 text-[#1F1D1A]'
            }`}
          >
            {item.kind === 'bundle' ? (
              <>
                <Layers className="h-3 w-3" />
                Pacote ({item.subItems.length})
              </>
            ) : item.kind === 'misc' ? (
              <><FileText className="h-3 w-3" /> Pedido livre</>
            ) : item.kind === 'digital' ? (
              <>
                <Sparkles className="h-3 w-3" />
                Digital
              </>
            ) : (
              <>
                <Store className="h-3 w-3 text-[#B83B35]" />
                {item.storeName || 'Loja'}
              </>
            )}
          </span>

          <span
            title={priorityLabel}
            className="inline-flex items-center gap-0.5 rounded-full bg-white/92 px-2 py-1 text-[11px] font-bold text-[#9E701D] shadow-xs backdrop-blur-md"
          >
            {Array.from({ length: item.priority }).map((_, idx) => (
              <Star key={idx} className="h-3 w-3 fill-[#C8963E] text-[#C8963E]" />
            ))}
          </span>
        </div>
      </div>

      {/* Corpo do card */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-[#1F1D1A]">
          {item.title}
        </h3>

        {item.variantInfo && (
          <p className="mt-1 line-clamp-1 text-xs font-medium text-[#6B655D]">
            {item.variantInfo}
          </p>
        )}

        {item.kind === 'bundle' && item.subItems.length > 0 && (
          <ul className="mt-2.5 space-y-1 rounded-2xl bg-[#FAF7F2] p-2.5 text-xs text-[#5B544A]">
            {item.subItems.slice(0, 3).map((sub) => (
              <li key={sub.id} className="flex items-center justify-between gap-2">
                <span className="truncate">• {sub.title}</span>
                <span className="shrink-0 font-semibold text-[#1F1D1A]">
                  {formatBRL(sub.price)}
                </span>
              </li>
            ))}
            {item.subItems.length > 3 && (
              <li className="text-[11px] font-semibold text-[#8C6520]">
                + {item.subItems.length - 3} {item.subItems.length - 3 === 1 ? 'item' : 'itens'} no combo
              </li>
            )}
          </ul>
        )}

        {/* Preço destacado */}
        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-[#1F1D1A]">
              {item.kind === 'misc' && item.price <= 0 ? 'Preço a combinar' : formatBRL(item.price)}
            </span>
            {item.shippingEstimate > 0 && <span className="w-full text-xs font-semibold text-[#6B655D]">Frete {formatBRL(item.shippingEstimate)} · Total {formatBRL(totalWithShipping(item))}</span>}
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badgeToneClasses}`}>
              {item.kind === 'misc' && item.price <= 0 ? 'Valor não informado' : budgetInfo.label}
            </span>
          </div>

          {/* Rodapé com dono e ação */}
          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[#F0EAE0] pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar
                avatar={owner?.avatar ?? '🎁'}
                name={owner?.displayName ?? 'Familiar'}
                accentColor={owner?.accentColor}
                size="xs"
              />
              <span className="truncate text-xs font-semibold text-[#1F1D1A]">
                {owner?.displayName ?? item.ownerId}
                {isOwn && (
                  <span className="ml-1 rounded-md bg-[#EFE8DB] px-1.5 py-0.5 text-[10px] font-bold text-[#6B655D]">
                    Você
                  </span>
                )}
              </span>
            </div>

            {!isOwn ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(item);
                }}
                className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  inCart
                    ? 'bg-[#214E3E]/12 text-[#214E3E]'
                    : 'bg-[#1F1D1A] text-white hover:bg-[#B83B35]'
                }`}
              >
                {inCart ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    No carrinho
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-3.5 w-3.5" />
                    + Carrinho
                  </>
                )}
              </button>
            ) : canEditOrDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  title="Editar desejo"
                  className="rounded-xl p-1.5 text-[#6B655D] transition hover:bg-[#FAF7F2] hover:text-[#1F1D1A]"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                  }}
                  title="Excluir desejo"
                  className="rounded-xl p-1.5 text-[#6B655D] transition hover:bg-[#FFF5F5] hover:text-[#B83B35]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <span className="text-[11px] font-medium text-[#8B8275]">Seu pedido</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
