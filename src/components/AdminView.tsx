import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Lock,
  RefreshCw,
  Save,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  deleteWishItem,
  regenerateUserToken,
  updateEventSettings,
} from '../firebase/service';
import { useToast } from '../hooks/useToast';
import type {
  AdminUserRecord,
  EventSettings,
  ParticipantId,
  PublicUser,
  WishItem,
} from '../types';
import {
  formatBRL,
  formatDeadlineDisplay,
  getBrasiliaDateParts,
  getMagicLink,
  parsePriceInput,
  priceToInputString,
  toBrasiliaIso,
} from '../utils/format';
import { downloadQrCardPng } from '../utils/qrExport';
import { Avatar } from './Avatar';
import { ConfirmModal } from './ConfirmModal';

interface AdminViewProps {
  currentUserId: ParticipantId;
  adminUsers: AdminUserRecord[];
  publicUsers: PublicUser[];
  settings: EventSettings;
  allItems: WishItem[];
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUserId,
  adminUsers,
  publicUsers,
  settings,
  allItems,
}) => {
  const { showToast } = useToast();

  const initialParts = getBrasiliaDateParts(settings.deadline);
  const [deadlineDate, setDeadlineDate] = useState(initialParts.date);
  const [deadlineTime, setDeadlineTime] = useState(initialParts.time);
  const [budgetText, setBudgetText] = useState(() => priceToInputString(settings.budget));
  const [allowLateAdditions, setAllowLateAdditions] = useState(settings.allowLateAdditions);
  const [newAdminPin, setNewAdminPin] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const [tokenConfirmUser, setTokenConfirmUser] = useState<AdminUserRecord | null>(null);
  const [regeneratingToken, setRegeneratingToken] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<WishItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  useEffect(() => {
    const parts = getBrasiliaDateParts(settings.deadline);
    setDeadlineDate(parts.date);
    setDeadlineTime(parts.time);
    setBudgetText(priceToInputString(settings.budget));
    setAllowLateAdditions(settings.allowLateAdditions);
  }, [settings.deadline, settings.budget, settings.allowLateAdditions]);

  const userMap = new Map(publicUsers.map((u) => [u.id, u]));

  const handleCopyMagicLink = async (user: AdminUserRecord) => {
    const link = getMagicLink(user.accessToken);
    try {
      await navigator.clipboard.writeText(link);
      showToast(`Link mágico de ${user.displayName} copiado!`, 'success');
    } catch {
      window.prompt(`Copie o link mágico de ${user.displayName}:`, link);
    }
  };

  const handleDownloadQr = async (user: AdminUserRecord) => {
    try {
      await downloadQrCardPng({
        userId: user.id,
        displayName: user.displayName,
        accessToken: user.accessToken,
        accentColor: user.accentColor,
        budget: settings.budget,
      });
      showToast(`Cartão QR de ${user.displayName} baixado!`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao gerar PNG do QR Code.', 'error');
    }
  };

  const handleRegenerateToken = async () => {
    if (!tokenConfirmUser) return;
    setRegeneratingToken(true);
    try {
      await regenerateUserToken(tokenConfirmUser.id, tokenConfirmUser.id === currentUserId);
      showToast(
        `Novo QR Code gerado para ${tokenConfirmUser.displayName}! O anterior foi invalidado.`,
        'success'
      );
      setTokenConfirmUser(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao regenerar token.', 'error');
    } finally {
      setRegeneratingToken(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBudget = parsePriceInput(budgetText);
    if (parsedBudget <= 0) {
      showToast('Informe um orçamento de referência válido.', 'error');
      return;
    }
    if (newAdminPin.trim() && newAdminPin.trim().length < 4) {
      showToast('O novo PIN de Admin precisa ter pelo menos 4 caracteres.', 'error');
      return;
    }

    setSavingSettings(true);
    try {
      await updateEventSettings({
        budget: parsedBudget,
        deadline: toBrasiliaIso(deadlineDate, deadlineTime),
        allowLateAdditions,
        newAdminPin: newAdminPin.trim() || undefined,
      });
      setNewAdminPin('');
      showToast('Configurações do Amigo Secreto salvas!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar configurações.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setDeletingItem(true);
    try {
      await deleteWishItem(itemToDelete.id);
      showToast('Item removido da lista.', 'info');
      setItemToDelete(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir item.', 'error');
    } finally {
      setDeletingItem(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Cabeçalho do Painel Admin + Garantia Anti-Spoiler */}
      <div className="rounded-3xl border border-[#C8963E]/35 bg-gradient-to-r from-[#FBF3E2] to-[#FAF7F2] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C8963E] text-white shadow-xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1F1D1A]">
                Painel do Admin
              </h1>
              <p className="text-xs text-[#6B655D]">
                Gerencie os QR Codes da família, prazo e moderação da lista.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#214E3E] ring-1 ring-[#214E3E]/20">
            <Lock className="h-3.5 w-3.5" />
            Modo Anti-Spoiler Ativo
          </span>
        </div>
      </div>

      {/* Gerenciador de QR Codes */}
      <section className="rounded-3xl border border-[#E7E0D5] bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-lg font-bold text-[#1F1D1A]">QR Codes e Links de Acesso</h2>
        <p className="mt-1 text-xs text-[#6B655D]">
          Baixe o cartão PNG ou copie o link mágico individual para enviar no WhatsApp de cada
          familiar.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {adminUsers.map((user) => {
            const magicLink = getMagicLink(user.accessToken);
            return (
              <div
                key={user.id}
                className="flex flex-col justify-between rounded-3xl border border-[#E7E0D5] bg-[#FAF7F2] p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      avatar={user.avatar}
                      name={user.displayName}
                      accentColor={user.accentColor}
                      size="md"
                    />
                    <div>
                      <div className="text-base font-bold text-[#1F1D1A]">
                        {user.displayName}
                        {user.id === currentUserId && (
                          <span className="ml-1.5 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#6B655D] ring-1 ring-[#E7E0D5]">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#6B655D]">
                        {user.displayName !== user.baseName ? `${user.baseName} • ` : ''}
                        {user.role === 'admin' ? 'Admin' : 'Participante'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      user.hasLoggedIn
                        ? 'bg-[#214E3E]/12 text-[#214E3E]'
                        : 'bg-[#FBF3E2] text-[#8C6520]'
                    }`}
                  >
                    {user.hasLoggedIn ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Já acessou
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        Aguardando
                      </>
                    )}
                  </span>
                </div>

                {/* QR Code + Ações */}
                <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-[#E7E0D5] bg-white p-4 sm:flex-row">
                  <div className="shrink-0 rounded-xl border border-[#F0EAE0] bg-white p-2">
                    <QRCodeSVG value={magicLink} size={120} level="M" />
                  </div>

                  <div className="flex w-full flex-1 flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyMagicLink(user)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1F1D1A] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#33302B]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar Link Mágico
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadQr(user)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#DFD7CA] bg-[#FAF7F2] px-3 py-2 text-xs font-bold text-[#1F1D1A] transition hover:bg-[#EFE8DB]"
                    >
                      <Download className="h-3.5 w-3.5 text-[#214E3E]" />
                      Baixar QR Code (PNG)
                    </button>

                    <button
                      type="button"
                      onClick={() => setTokenConfirmUser(user)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#B83B35] transition hover:bg-[#FFF5F5]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerar Token
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Configurações do Evento */}
      <form
        onSubmit={handleSaveSettings}
        className="rounded-3xl border border-[#E7E0D5] bg-white p-5 shadow-xs sm:p-6"
      >
        <div className="flex items-center gap-2 text-lg font-bold text-[#1F1D1A]">
          <CalendarClock className="h-5 w-5 text-[#B83B35]" />
          Configurações do Evento
        </div>
        <p className="mt-1 text-xs text-[#6B655D]">
          Prazo atual: <strong>{formatDeadlineDisplay(settings.deadline)}</strong>
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655D]">
              Data limite (Brasília)
            </label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-3.5 py-2.5 text-sm font-medium text-[#1F1D1A] outline-none focus:border-[#B83B35] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655D]">
              Horário limite (UTC-3)
            </label>
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-3.5 py-2.5 text-sm font-medium text-[#1F1D1A] outline-none focus:border-[#B83B35] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655D]">
              Valor de referência (R$)
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-xs font-bold text-[#6B655D]">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={budgetText}
                onChange={(e) => setBudgetText(e.target.value)}
                className="w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] py-2.5 pr-3.5 pl-9 text-sm font-bold text-[#1F1D1A] outline-none focus:border-[#B83B35] focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-[#ECE6DB] bg-[#FAF7F2] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-[#1F1D1A]">
              Permitir adições/edições mesmo após o prazo
            </div>
            <div className="text-xs text-[#6B655D]">
              Ative se alguém da família pedir para incluir ou ajustar algo depois da data limite.
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={allowLateAdditions}
            onClick={() => setAllowLateAdditions((prev) => !prev)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              allowLateAdditions ? 'bg-[#214E3E]' : 'bg-[#D2C9BA]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                allowLateAdditions ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="sm:max-w-xs flex-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655D]">
              Alterar PIN do Admin (opcional)
            </label>
            <input
              type="password"
              value={newAdminPin}
              onChange={(e) => setNewAdminPin(e.target.value)}
              placeholder="Deixe vazio para manter o atual"
              className="mt-1.5 w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35] focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B83B35] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#992D28] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingSettings ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      </form>

      {/* Moderação de itens */}
      <section className="rounded-3xl border border-[#E7E0D5] bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-lg font-bold text-[#1F1D1A]">
          Moderação da Lista ({allItems.length} {allItems.length === 1 ? 'item' : 'itens'})
        </h2>
        <p className="mt-1 text-xs text-[#6B655D]">
          Remova pedidos duplicados ou quebrados caso alguém da família erre ao cadastrar.
        </p>

        {allItems.length === 0 ? (
          <p className="mt-4 text-sm text-[#6B655D]">Nenhum pedido cadastrado ainda.</p>
        ) : (
          <div className="mt-4 divide-y divide-[#F2ECE2]">
            {allItems.map((item) => {
              const owner = userMap.get(item.ownerId);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      avatar={owner?.avatar ?? '🎁'}
                      name={owner?.displayName ?? item.ownerId}
                      accentColor={owner?.accentColor}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[#1F1D1A]">{item.title}</div>
                      <div className="text-xs text-[#6B655D]">
                        {owner?.displayName ?? item.ownerId} • {formatBRL(item.price)} •{' '}
                        {item.kind === 'bundle'
                          ? 'Combo'
                          : item.kind === 'digital'
                            ? 'Digital'
                            : 'Loja'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setItemToDelete(item)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#B83B35]/20 bg-[#FFF5F5] px-3 py-1.5 text-xs font-bold text-[#B83B35] hover:bg-[#B83B35]/12"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmModal
        open={Boolean(tokenConfirmUser)}
        title={`Regenerar QR Code de ${tokenConfirmUser?.displayName ?? ''}?`}
        description="O QR Code e o link mágico antigos deixarão de funcionar imediatamente. Envie o novo código para essa pessoa."
        confirmLabel="Sim, gerar novo token"
        loading={regeneratingToken}
        onConfirm={handleRegenerateToken}
        onCancel={() => setTokenConfirmUser(null)}
      />

      <ConfirmModal
        open={Boolean(itemToDelete)}
        title="Excluir pedido da lista?"
        description={`Tem certeza que deseja remover "${itemToDelete?.title ?? ''}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, excluir"
        loading={deletingItem}
        onConfirm={handleConfirmDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};
