import React from 'react';
import {
  Clock,
  Gift,
  LayoutGrid,
  PlusCircle,
  Shield,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';
import type { ActiveTab, CurrentUser, EventSettings } from '../types';
import { formatBRL, formatDeadlineDisplay } from '../utils/format';
import { Avatar } from './Avatar';

interface HeaderProps {
  currentUser: CurrentUser;
  settings: EventSettings;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  cartCount: number;
  canCreateItems: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  settings,
  activeTab,
  onSelectTab,
  cartCount,
  canCreateItems,
}) => {
  const countdown = useCountdown(settings.deadline);
  const pad2 = (n: number) => String(n).padStart(2, '0');

  return (
    <header className="sticky top-0 z-30 border-b border-[#E7E0D5] bg-[#FAF7F2]/92 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Marca */}
          <button
            type="button"
            onClick={() => onSelectTab('feed')}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#B83B35] to-[#992D28] text-white shadow-sm">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-base font-bold leading-tight text-[#1F1D1A] sm:text-lg">
                Amigo Secreto
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B655D]">
                <span>Referência: {formatBRL(settings.budget)}</span>
              </div>
            </div>
          </button>

          {/* Navegação Desktop */}
          <nav className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              onClick={() => onSelectTab('feed')}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                activeTab === 'feed'
                  ? 'bg-[#1F1D1A] text-white'
                  : 'text-[#6B655D] hover:bg-[#EFE8DB] hover:text-[#1F1D1A]'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Desejos
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('add')}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                activeTab === 'add'
                  ? 'bg-[#B83B35] text-white'
                  : canCreateItems
                    ? 'text-[#B83B35] hover:bg-[#B83B35]/10'
                    : 'text-[#6B655D] hover:bg-[#EFE8DB]'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Pedir Presente
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('cart')}
              className={`relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                activeTab === 'cart'
                  ? 'bg-[#214E3E] text-white'
                  : 'text-[#6B655D] hover:bg-[#EFE8DB] hover:text-[#1F1D1A]'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              Meu Carrinho
              {cartCount > 0 && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    activeTab === 'cart'
                      ? 'bg-white text-[#214E3E]'
                      : 'bg-[#B83B35] text-white'
                  }`}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => onSelectTab('admin')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                  activeTab === 'admin'
                    ? 'bg-[#C8963E] text-white'
                    : 'text-[#8C6520] hover:bg-[#C8963E]/15'
                }`}
              >
                <Shield className="h-4 w-4" />
                Admin
              </button>
            )}
          </nav>

          {/* Ações direita */}
          <div className="flex items-center gap-2">
            {/* Atalho carrinho no mobile header também */}
            <button
              type="button"
              onClick={() => onSelectTab('cart')}
              aria-label="Abrir carrinho"
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E7E0D5] bg-white text-[#1F1D1A] transition hover:bg-[#F4EFE6] md:hidden"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B83B35] px-1 text-[10px] font-bold text-white shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('profile')}
              className={`flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 transition ${
                activeTab === 'profile'
                  ? 'border-[#1F1D1A] bg-[#1F1D1A] text-white'
                  : 'border-[#E7E0D5] bg-white text-[#1F1D1A] hover:bg-[#F4EFE6]'
              }`}
            >
              <Avatar
                avatar={currentUser.avatar}
                name={currentUser.displayName}
                accentColor={currentUser.accentColor}
                size="sm"
              />
              <span className="max-w-24 truncate text-xs font-bold sm:max-w-32 sm:text-sm">
                {currentUser.displayName}
              </span>
            </button>
          </div>
        </div>

        {/* Barra de Contagem Regressiva */}
        <div className="-mx-4 border-t border-[#ECE6DB] bg-[#F4EFE6]/80 px-4 py-2">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs">
            {!countdown.isExpired ? (
              <>
                <div className="flex items-center gap-1.5 font-medium text-[#6B655D]">
                  <Clock className="h-3.5 w-3.5 text-[#B83B35]" />
                  <span>
                    Pedidos até <strong className="text-[#1F1D1A]">{formatDeadlineDisplay(settings.deadline)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-[#1F1D1A]">
                  <span className="rounded-lg bg-white px-2 py-0.5 text-[#B83B35] shadow-2xs ring-1 ring-[#E7E0D5]">
                    {countdown.days}d
                  </span>
                  <span className="rounded-lg bg-white px-2 py-0.5 shadow-2xs ring-1 ring-[#E7E0D5]">
                    {pad2(countdown.hours)}h
                  </span>
                  <span className="rounded-lg bg-white px-2 py-0.5 shadow-2xs ring-1 ring-[#E7E0D5]">
                    {pad2(countdown.minutes)}m
                  </span>
                  <span className="rounded-lg bg-white px-2 py-0.5 text-[#6B655D] shadow-2xs ring-1 ring-[#E7E0D5]">
                    {pad2(countdown.seconds)}s
                  </span>
                </div>
              </>
            ) : settings.allowLateAdditions ? (
              <div className="flex w-full items-center justify-between gap-2 text-[#214E3E]">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  Prazo original encerrado, mas novas adições foram liberadas pelo Victor.
                </span>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between gap-2 text-[#992D28]">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Clock className="h-3.5 w-3.5" />
                  Prazo para novos pedidos encerrado ({formatDeadlineDisplay(settings.deadline)}) — listas abertas para consulta e carrinho!
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
