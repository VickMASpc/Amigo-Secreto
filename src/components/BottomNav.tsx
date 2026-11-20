import React from 'react';
import { LayoutGrid, PlusCircle, Shield, ShoppingBag, User } from 'lucide-react';
import type { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  cartCount: number;
  isAdmin: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  cartCount,
  isAdmin,
}) => {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-[#E7E0D5] bg-[#FAF7F2]/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        <button
          type="button"
          onClick={() => onSelectTab('feed')}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-semibold transition ${
            activeTab === 'feed' ? 'text-[#B83B35]' : 'text-[#6B655D]'
          }`}
        >
          <LayoutGrid className="h-5 w-5" />
          <span>Feed</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('add')}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-semibold transition ${
            activeTab === 'add' ? 'text-[#B83B35]' : 'text-[#6B655D]'
          }`}
        >
          <PlusCircle className="h-5 w-5" />
          <span>Pedir</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('cart')}
          className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-semibold transition ${
            activeTab === 'cart' ? 'text-[#214E3E]' : 'text-[#6B655D]'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B83B35] px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </div>
          <span>Carrinho</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-semibold transition ${
            activeTab === 'profile' ? 'text-[#1F1D1A]' : 'text-[#6B655D]'
          }`}
        >
          <User className="h-5 w-5" />
          <span>Perfil</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => onSelectTab('admin')}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-semibold transition ${
              activeTab === 'admin' ? 'text-[#C8963E]' : 'text-[#6B655D]'
            }`}
          >
            <Shield className="h-5 w-5" />
            <span>Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
};
