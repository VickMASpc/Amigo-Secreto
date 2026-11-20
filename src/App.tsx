import { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { AdminView } from './components/AdminView';
import { BootstrapScreen } from './components/BootstrapScreen';
import { BottomNav } from './components/BottomNav';
import { CartView } from './components/CartView';
import { ConfirmModal } from './components/ConfirmModal';
import { FeedView } from './components/FeedView';
import { FirebaseMissingScreen } from './components/FirebaseMissingScreen';
import { Header } from './components/Header';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ItemFormView } from './components/ItemFormView';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingWizard } from './components/OnboardingWizard';
import { ProfileView } from './components/ProfileView';
import { isFirebaseConfigured } from './firebase/config';
import {
  addEntryToCart,
  clearStoredSession,
  deleteWishItem,
  loadStoredSession,
  loginWithToken,
  subscribeEventSettings,
  subscribeFamilyWorkspace,
  type StoredSession,
} from './firebase/service';
import { ToastProvider, useToast } from './hooks/useToast';
import type {
  ActiveTab,
  AdminUserRecord,
  CurrentUser,
  EventSettings,
  PublicUser,
  SubItem,
  UserCart,
  WishItem,
} from './types';
import { generateId, getCountdown } from './utils/format';

const EMPTY_CART: UserCart = {
  items: [],
  shippingEstimate: 0,
  updatedAt: 0,
};

function AppContent() {
  const { showToast } = useToast();

  const [session, setSession] = useState<StoredSession | null>(() => loadStoredSession());
  const [tokenCheckLoading, setTokenCheckLoading] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get('token'));
  });
  const [loginError, setLoginError] = useState('');

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [firebaseError, setFirebaseError] = useState('');

  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [publicUsers, setPublicUsers] = useState<PublicUser[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [items, setItems] = useState<WishItem[]>([]);
  const [cart, setCart] = useState<UserCart>(EMPTY_CART);

  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [editingItem, setEditingItem] = useState<WishItem | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [itemPendingDelete, setItemPendingDelete] = useState<WishItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  // Admin pode pular o onboarding temporariamente para gerar QR codes primeiro
  const [adminDeferredOnboarding, setAdminDeferredOnboarding] = useState(false);

  // 1. Escuta configurações do evento para saber se já houve bootstrap
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsub = subscribeEventSettings(
      (eventData) => {
        setSettings(eventData);
        setSettingsLoaded(true);
      },
      (err) => {
        setFirebaseError(err.message);
        setSettingsLoaded(true);
      }
    );
    return unsub;
  }, []);

  // 2. Processa ?token=... da URL ao abrir pelo QR Code e limpa a barra de endereço
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setTokenCheckLoading(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (!tokenFromUrl) {
      setTokenCheckLoading(false);
      return;
    }

    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanUrl);

    loginWithToken(tokenFromUrl)
      .then((newSession) => {
        setSession(newSession);
        setLoginError('');
        showToast('QR Code validado! Bem-vindo ao Amigo Secreto.', 'success');
      })
      .catch((err) => {
        clearStoredSession();
        setSession(null);
        setLoginError(
          err instanceof Error
            ? err.message
            : 'Este link ou QR Code não é mais válido.'
        );
      })
      .finally(() => {
        setTokenCheckLoading(false);
      });
  }, [showToast]);

  // 3. Inscreve nas coleções em tempo real quando há sessão ativa e sistema inicializado
  useEffect(() => {
    if (!isFirebaseConfigured || !session || !settings?.initialized) {
      setWorkspaceLoading(false);
      return;
    }

    setWorkspaceLoading(true);
    const unsub = subscribeFamilyWorkspace(session, {
      onUsers: (pub, curr, adminList) => {
        setPublicUsers(pub);
        setCurrentUser(curr);
        setAdminUsers(adminList);
        setWorkspaceLoading(false);
      },
      onItems: (list) => {
        setItems(list);
      },
      onCart: (userCart) => {
        setCart(userCart);
      },
      onTokenInvalidated: () => {
        clearStoredSession();
        setSession(null);
        setCurrentUser(null);
        setLoginError(
          'Seu acesso foi atualizado pelo Victor. Escaneie o novo QR Code ou cole o link atualizado.'
        );
      },
      onError: (err) => {
        setFirebaseError(err.message);
        setWorkspaceLoading(false);
      },
    });

    return unsub;
  }, [session, settings?.initialized]);

  const deadlineStatus = useMemo(() => {
    if (!settings) return { isExpired: false };
    return getCountdown(settings.deadline);
  }, [settings]);

  const canManageOwnItems = Boolean(
    settings &&
      (!deadlineStatus.isExpired ||
        settings.allowLateAdditions ||
        currentUser?.role === 'admin')
  );

  const detailItem = useMemo(
    () => (detailItemId ? items.find((i) => i.id === detailItemId) ?? null : null),
    [detailItemId, items]
  );

  const userMap = useMemo(
    () => new Map(publicUsers.map((u) => [u.id, u])),
    [publicUsers]
  );

  const handleSelectTab = (tab: ActiveTab) => {
    if (tab !== 'add') {
      setEditingItem(null);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddFullItemToCart = async (item: WishItem) => {
    if (!currentUser || item.ownerId === currentUser.id) return;
    try {
      const result = await addEntryToCart(currentUser.id, cart, {
        cartEntryId: generateId(),
        itemId: item.id,
        titleSnapshot: item.title,
        priceSnapshot: item.price,
        ownerId: item.ownerId,
        isBundle: item.kind === 'bundle',
        imageSnapshot: item.image || item.subItems[0]?.image || undefined,
        storeNameSnapshot: item.storeName || undefined,
        bought: false,
        personalNote: '',
      });
      if (result.added) {
        showToast(`"${item.title}" adicionado ao seu carrinho!`, 'success');
      } else {
        showToast('Este item já está no seu carrinho.', 'info');
      }
    } catch {
      showToast('Não foi possível adicionar ao carrinho.', 'error');
    }
  };

  const handleAddSubItemToCart = async (parentItem: WishItem, sub: SubItem) => {
    if (!currentUser || parentItem.ownerId === currentUser.id) return;
    try {
      const result = await addEntryToCart(currentUser.id, cart, {
        cartEntryId: generateId(),
        itemId: parentItem.id,
        subItemId: sub.id,
        titleSnapshot: sub.title,
        priceSnapshot: sub.price,
        ownerId: parentItem.ownerId,
        isBundle: false,
        imageSnapshot: sub.image || parentItem.image || undefined,
        storeNameSnapshot: sub.storeName || undefined,
        bought: false,
        personalNote: '',
      });
      if (result.added) {
        showToast(`"${sub.title}" adicionado ao seu carrinho!`, 'success');
      } else {
        showToast('Este item do combo já está no seu carrinho.', 'info');
      }
    } catch {
      showToast('Não foi possível adicionar ao carrinho.', 'error');
    }
  };

  const handleEditItem = (item: WishItem) => {
    setDetailItemId(null);
    setEditingItem(item);
    setActiveTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemPendingDelete) return;
    setDeletingItem(true);
    try {
      await deleteWishItem(itemPendingDelete.id);
      if (detailItemId === itemPendingDelete.id) {
        setDetailItemId(null);
      }
      showToast('Desejo excluído da lista.', 'info');
      setItemPendingDelete(null);
    } catch {
      showToast('Erro ao excluir desejo.', 'error');
    } finally {
      setDeletingItem(false);
    }
  };

  const handleLogout = () => {
    clearStoredSession();
    setSession(null);
    setCurrentUser(null);
    setAdminDeferredOnboarding(false);
    setActiveTab('feed');
    setConfirmLogoutOpen(false);
    showToast('Você saiu da conta.', 'info');
  };

  // --- Telas de Estado Inicial / Autenticação ---
  if (!isFirebaseConfigured) {
    return <FirebaseMissingScreen />;
  }

  if (tokenCheckLoading || !settingsLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F2] p-4">
        <Loader2 className="h-9 w-9 animate-spin text-[#B83B35]" />
        <p className="mt-3 text-sm font-semibold text-[#6B655D]">
          Conectando ao Amigo Secreto da Família...
        </p>
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2] p-4">
        <div className="w-full max-w-md rounded-3xl border border-[#B83B35]/25 bg-white p-6 text-center shadow-lg">
          <ShieldAlert className="mx-auto h-10 w-10 text-[#B83B35]" />
          <h2 className="font-display mt-3 text-xl font-bold text-[#1F1D1A]">
            Erro ao conectar no Firestore
          </h2>
          <p className="mt-2 text-sm text-[#6B655D]">{firebaseError}</p>
          <p className="mt-3 text-xs text-[#8B8275]">
            Verifique se o Cloud Firestore está ativo no Firebase Console e se as regras de
            segurança foram publicadas.
          </p>
        </div>
      </div>
    );
  }

  if (!settings || !settings.initialized) {
    return (
      <BootstrapScreen
        onSuccess={(newSession) => {
          setSession(newSession);
          setLoginError('');
        }}
      />
    );
  }

  if (!session) {
    return (
      <LoginScreen
        initialError={loginError}
        onSuccess={(newSession) => {
          setLoginError('');
          setSession(newSession);
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F2] p-4">
        <Loader2 className="h-9 w-9 animate-spin text-[#B83B35]" />
        <p className="mt-3 text-sm font-semibold text-[#6B655D]">Carregando sua conta...</p>
      </div>
    );
  }

  // Onboarding na primeira entrada
  if (!currentUser.onboardingCompleted && !adminDeferredOnboarding) {
    return (
      <OnboardingWizard
        currentUser={currentUser}
        publicUsers={publicUsers}
        onGoToAdmin={
          currentUser.role === 'admin'
            ? () => {
                setAdminDeferredOnboarding(true);
                setActiveTab('admin');
              }
            : undefined
        }
      />
    );
  }

  const ownItems = items.filter((i) => i.ownerId === currentUser.id);

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24 md:pb-10">
      <Header
        currentUser={currentUser}
        settings={settings}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        cartCount={cart.items.length}
        canCreateItems={canManageOwnItems}
      />

      {!currentUser.onboardingCompleted && adminDeferredOnboarding && (
        <div className="mx-auto mt-4 max-w-6xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#C8963E]/35 bg-[#FBF3E2] px-4 py-2.5 text-xs font-semibold text-[#7A581B]">
            <span>
              Lembrete: você ainda não finalizou seu perfil e a escolha de quem tirou no sorteio.
            </span>
            <button
              type="button"
              onClick={() => setAdminDeferredOnboarding(false)}
              className="rounded-xl bg-[#C8963E] px-3 py-1 font-bold text-white hover:bg-[#B28333]"
            >
              Concluir agora
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">
        {activeTab === 'feed' && (
          <FeedView
            currentUser={currentUser}
            publicUsers={publicUsers}
            items={items}
            loading={workspaceLoading}
            budget={settings.budget}
            cart={cart}
            canManageOwnItems={canManageOwnItems}
            isAdmin={currentUser.role === 'admin'}
            onOpenItemDetail={(item) => setDetailItemId(item.id)}
            onAddToCart={handleAddFullItemToCart}
            onEditItem={handleEditItem}
            onDeleteItem={(item) => setItemPendingDelete(item)}
            onGoToAdd={() => handleSelectTab('add')}
            onGoToProfile={() => handleSelectTab('profile')}
          />
        )}

        {activeTab === 'add' && (
          <ItemFormView
            key={editingItem?.id ?? 'new'}
            currentUser={currentUser}
            settings={settings}
            canManageItems={canManageOwnItems}
            editingItem={editingItem}
            onSaved={() => {
              setEditingItem(null);
              handleSelectTab('feed');
            }}
            onCancel={() => {
              setEditingItem(null);
              handleSelectTab('feed');
            }}
            onGoToAdmin={
              currentUser.role === 'admin' ? () => handleSelectTab('admin') : undefined
            }
          />
        )}

        {activeTab === 'cart' && (
          <CartView
            currentUserId={currentUser.id}
            cart={cart}
            budget={settings.budget}
            publicUsers={publicUsers}
            allItems={items}
            onOpenOriginalItem={(item) => setDetailItemId(item.id)}
            onGoToFeed={() => handleSelectTab('feed')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            publicUsers={publicUsers}
            ownItems={ownItems}
            onOpenItem={(item) => setDetailItemId(item.id)}
            onRequestLogout={() => setConfirmLogoutOpen(true)}
          />
        )}

        {activeTab === 'admin' && currentUser.role === 'admin' && (
          <AdminView
            currentUserId={currentUser.id}
            adminUsers={adminUsers}
            publicUsers={publicUsers}
            settings={settings}
            allItems={items}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        cartCount={cart.items.length}
        isAdmin={currentUser.role === 'admin'}
      />

      <ItemDetailModal
        key={detailItem?.id ?? 'closed'}
        item={detailItem}
        owner={detailItem ? userMap.get(detailItem.ownerId) : undefined}
        currentUserId={currentUser.id}
        isAdmin={currentUser.role === 'admin'}
        canEditOwn={canManageOwnItems}
        budget={settings.budget}
        cart={cart}
        onClose={() => setDetailItemId(null)}
        onAddFullItemToCart={handleAddFullItemToCart}
        onAddSubItemToCart={handleAddSubItemToCart}
        onGoToCart={() => {
          setDetailItemId(null);
          handleSelectTab('cart');
        }}
        onEdit={handleEditItem}
        onDelete={(item) => setItemPendingDelete(item)}
      />

      <ConfirmModal
        open={Boolean(itemPendingDelete)}
        title="Excluir desejo da lista?"
        description={`Tem certeza que deseja excluir "${itemPendingDelete?.title ?? ''}"?`}
        confirmLabel="Sim, excluir"
        loading={deletingItem}
        onConfirm={handleConfirmDeleteItem}
        onCancel={() => setItemPendingDelete(null)}
      />

      <ConfirmModal
        open={confirmLogoutOpen}
        title="Sair desta conta?"
        description="Para entrar novamente depois, basta abrir seu link mágico ou escanear seu QR Code enviado pelo Victor."
        confirmLabel="Sair da conta"
        tone="primary"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogoutOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
