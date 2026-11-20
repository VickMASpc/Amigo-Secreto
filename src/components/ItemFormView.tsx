import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Info,
  Layers,
  Link2,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  Star,
  Store,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { saveWishItem } from '../firebase/service';
import { useToast } from '../hooks/useToast';
import type {
  CurrentUser,
  EventSettings,
  ItemKind,
  ItemPriority,
  SubItem,
  WishItem,
} from '../types';
import {
  formatBRL,
  formatDeadlineDisplay,
  generateId,
  isValidImageSrc,
  parsePriceInput,
  priceToInputString,
} from '../utils/format';
import { compressImageFile } from '../utils/imageCompress';
import { extractStoreNameFromUrl, fetchLinkMetadata } from '../utils/linkPreview';

interface ItemFormViewProps {
  currentUser: CurrentUser;
  settings: EventSettings;
  canManageItems: boolean;
  editingItem: WishItem | null;
  onSaved: () => void;
  onCancel: () => void;
  onGoToAdmin?: () => void;
}

interface SubItemDraft {
  id: string;
  title: string;
  priceText: string;
  kind: 'store' | 'digital';
  url: string;
  storeName: string;
  image: string;
  notes: string;
  fetchingLink?: boolean;
  uploadingImg?: boolean;
}

function createEmptySubItem(): SubItemDraft {
  return {
    id: generateId(),
    title: '',
    priceText: '',
    kind: 'store',
    url: '',
    storeName: '',
    image: '',
    notes: '',
  };
}

export const ItemFormView: React.FC<ItemFormViewProps> = ({
  currentUser,
  settings,
  canManageItems,
  editingItem,
  onSaved,
  onCancel,
  onGoToAdmin,
}) => {
  const { showToast } = useToast();

  const [kind, setKind] = useState<ItemKind>(editingItem?.kind ?? 'store');
  const [title, setTitle] = useState(editingItem?.title ?? '');
  const [priceText, setPriceText] = useState(
    editingItem ? priceToInputString(editingItem.price) : ''
  );
  const [url, setUrl] = useState(editingItem?.url ?? '');
  const [storeName, setStoreName] = useState(editingItem?.storeName ?? '');
  const [image, setImage] = useState(editingItem?.image ?? '');
  const [variantInfo, setVariantInfo] = useState(editingItem?.variantInfo ?? '');
  const [howToBuy, setHowToBuy] = useState(editingItem?.howToBuy ?? '');
  const [description, setDescription] = useState(editingItem?.description ?? '');
  const [priority, setPriority] = useState<ItemPriority>(editingItem?.priority ?? 2);

  const [subItems, setSubItems] = useState<SubItemDraft[]>(() => {
    if (editingItem?.kind === 'bundle' && editingItem.subItems.length > 0) {
      return editingItem.subItems.map((s) => ({
        id: s.id,
        title: s.title,
        priceText: priceToInputString(s.price),
        kind: s.kind,
        url: s.url,
        storeName: s.storeName,
        image: s.image,
        notes: s.notes,
      }));
    }
    return [createEmptySubItem(), createEmptySubItem()];
  });

  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [previewNotice, setPreviewNotice] = useState<{
    tone: 'success' | 'warning';
    text: string;
  } | null>(null);
  const [uploadingMainImg, setUploadingMainImg] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPreviewNotice(null);
  }, [kind]);

  if (!canManageItems) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[#E7E0D5] bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B83B35]/10 text-[#B83B35]">
          <Clock className="h-7 w-7" />
        </div>
        <h2 className="font-display mt-4 text-2xl font-bold text-[#1F1D1A]">
          Prazo para pedidos encerrado
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#6B655D]">
          O limite para adicionar ou editar desejos foi{' '}
          <strong className="text-[#1F1D1A]">{formatDeadlineDisplay(settings.deadline)}</strong>. Você
          continua podendo ver todos os pedidos, filtrar pelo seu amigo secreto e montar seu
          carrinho normalmente!
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl bg-[#1F1D1A] px-5 py-3 text-sm font-bold text-white hover:bg-[#33302B]"
          >
            Voltar para o Feed
          </button>
          {currentUser.role === 'admin' && onGoToAdmin && (
            <button
              type="button"
              onClick={onGoToAdmin}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-[#C8963E] bg-[#FBF3E2] px-5 py-3 text-sm font-bold text-[#8C6520]"
            >
              <Shield className="h-4 w-4" />
              Prorrogar prazo no Admin
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleFetchMainLink = async () => {
    if (!url.trim()) {
      showToast('Cole o link do produto antes de buscar.', 'info');
      return;
    }

    setFetchingPreview(true);
    setPreviewNotice(null);
    try {
      const result = await fetchLinkMetadata(url);
      setUrl(result.normalizedUrl);
      if (result.storeName && !storeName.trim()) setStoreName(result.storeName);
      if (result.title && !title.trim()) setTitle(result.title);
      if (result.price !== undefined && !priceText.trim()) setPriceText(priceToInputString(result.price));
      if (result.image && !image.trim()) setImage(result.image);
      if (result.description && !description.trim()) {
        setDescription(result.description.slice(0, 220));
      }

      setPreviewNotice({
        tone: result.status === 'blocked' ? 'warning' : 'success',
        text: result.message || 'Dados atualizados!',
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Link inválido.', 'error');
    } finally {
      setFetchingPreview(false);
    }
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingMainImg(true);
    try {
      const { dataUrl, bytes } = await compressImageFile(file, {
        maxWidth: 720,
        maxHeight: 720,
        maxBytes: 145 * 1024,
      });
      setImage(dataUrl);
      showToast(`Foto comprimida (${Math.round(bytes / 1024)} KB) pronta!`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao comprimir imagem.', 'error');
    } finally {
      setUploadingMainImg(false);
    }
  };

  const updateSubItem = (id: string, patch: Partial<SubItemDraft>) => {
    setSubItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleSubItemLinkFetch = async (sub: SubItemDraft) => {
    if (!sub.url.trim()) return;
    updateSubItem(sub.id, { fetchingLink: true });
    try {
      const result = await fetchLinkMetadata(sub.url);
      updateSubItem(sub.id, {
        fetchingLink: false,
        url: result.normalizedUrl,
        storeName: sub.storeName || result.storeName,
        title: sub.title || result.title,
        priceText: sub.priceText || (result.price !== undefined ? priceToInputString(result.price) : ''),
        image: sub.image || result.image,
      });
      if (result.status === 'blocked') {
        showToast('Não foi possível confirmar os dados da loja. Complete os campos que faltam.', 'info');
      } else {
        showToast('Dados do item do combo preenchidos!', 'success');
      }
    } catch (err) {
      updateSubItem(sub.id, { fetchingLink: false });
      showToast(err instanceof Error ? err.message : 'Link inválido.', 'error');
    }
  };

  const handleSubItemImageUpload = async (
    subId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    updateSubItem(subId, { uploadingImg: true });
    try {
      const { dataUrl } = await compressImageFile(file, {
        maxWidth: 560,
        maxHeight: 560,
        maxBytes: 75 * 1024,
      });
      updateSubItem(subId, { image: dataUrl, uploadingImg: false });
      showToast('Miniatura adicionada ao combo!', 'success');
    } catch (err) {
      updateSubItem(subId, { uploadingImg: false });
      showToast(err instanceof Error ? err.message : 'Erro na imagem.', 'error');
    }
  };

  const bundleTotal = subItems.reduce((sum, s) => sum + parsePriceInput(s.priceText), 0);
  const bundleProgress = Math.min(100, Math.round((bundleTotal / Math.max(1, settings.budget)) * 100));
  const bundleDiff = bundleTotal - settings.budget;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Dê um nome para o seu pedido.', 'error');
      return;
    }

    let parsedSubItems: SubItem[] = [];
    let finalPrice = parsePriceInput(priceText);

    if (kind === 'bundle') {
      const filledSubs = subItems.filter((s) => s.title.trim() || parsePriceInput(s.priceText) > 0);
      if (filledSubs.length < 2) {
        showToast('Um combo precisa de pelo menos 2 itens preenchidos.', 'error');
        return;
      }
      for (const s of filledSubs) {
        if (!s.title.trim()) {
          showToast('Todos os itens do combo precisam de um nome.', 'error');
          return;
        }
        if (parsePriceInput(s.priceText) <= 0) {
          showToast(`Informe o valor de "${s.title}".`, 'error');
          return;
        }
      }
      parsedSubItems = filledSubs.map((s) => ({
        id: s.id,
        title: s.title.trim(),
        price: parsePriceInput(s.priceText),
        kind: s.kind,
        url: s.url.trim(),
        storeName: s.storeName.trim() || (s.url ? extractStoreNameFromUrl(s.url) : ''),
        image: s.image.trim(),
        notes: s.notes.trim(),
      }));
      finalPrice = parsedSubItems.reduce((sum, s) => sum + s.price, 0);
    } else if (finalPrice <= 0) {
      showToast('Informe um preço estimado válido (maior que R$ 0,00).', 'error');
      return;
    }

    setSaving(true);
    try {
      await saveWishItem(
        {
          ownerId: editingItem ? editingItem.ownerId : currentUser.id,
          kind,
          title: title.trim(),
          description: description.trim(),
          price: finalPrice,
          priority,
          storeName:
            storeName.trim() || (url.trim() ? extractStoreNameFromUrl(url) : ''),
          url: url.trim(),
          image: image.trim(),
          variantInfo: variantInfo.trim(),
          howToBuy: kind === 'digital' ? howToBuy.trim() : '',
          subItems: parsedSubItems,
        },
        editingItem?.id
      );

      showToast(
        editingItem ? 'Desejo atualizado com sucesso!' : 'Desejo adicionado à lista da família!',
        'success'
      );
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar desejo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-[#6B655D] hover:bg-white hover:text-[#1F1D1A]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <span className="text-xs font-semibold text-[#6B655D]">
          Referência: <strong className="text-[#1F1D1A]">{formatBRL(settings.budget)}</strong>
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-[#E7E0D5] bg-white p-5 shadow-sm sm:p-8"
      >
        <h1 className="font-display text-2xl font-bold text-[#1F1D1A]">
          {editingItem ? 'Editar desejo' : 'O que você gostaria de ganhar?'}
        </h1>
        <p className="mt-1 text-sm text-[#6B655D]">
          Escolha o formato do pedido abaixo. Pode adicionar quantas opções quiser!
        </p>

        {/* Seletor dos 3 modos */}
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              {
                id: 'store',
                label: 'Produto de Loja',
                desc: 'Com link de loja online',
                icon: Store,
              },
              {
                id: 'digital',
                label: 'Digital / Serviço',
                desc: 'Assinatura, Gift Card, Pix...',
                icon: Sparkles,
              },
              {
                id: 'bundle',
                label: 'Monte um Combo',
                desc: 'Vários itens somados',
                icon: Layers,
              },
            ] as const
          ).map(({ id, label, desc, icon: Icon }) => {
            const active = kind === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setKind(id)}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                  active
                    ? 'border-[#B83B35] bg-[#B83B35]/6 ring-2 ring-[#B83B35]/20'
                    : 'border-[#E7E0D5] bg-[#FAF7F2] hover:bg-white'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    active ? 'bg-[#B83B35] text-white' : 'bg-white text-[#6B655D]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1F1D1A]">{label}</div>
                  <div className="text-[11px] text-[#6B655D]">{desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-5">
          {/* Bloco de Auto-preenchimento por Link (para Loja e opcional em Digital) */}
          {kind !== 'bundle' && (
            <div className="rounded-2xl border border-[#ECE6DB] bg-[#FAF7F2] p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655D]">
                {kind === 'store'
                  ? 'Link do produto (Amazon, Shopee, Mercado Livre...)'
                  : 'Link de referência (opcional)'}
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#8B8275]" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUrl(val);
                      if (!storeName.trim() && val.includes('.')) {
                        const detected = extractStoreNameFromUrl(val);
                        if (detected) setStoreName(detected);
                      }
                    }}
                    placeholder="https://www.amazon.com.br/..."
                    className="w-full rounded-xl border border-[#DFD7CA] bg-white py-2.5 pr-3 pl-10 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFetchMainLink}
                  disabled={fetchingPreview}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1F1D1A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#33302B] disabled:opacity-60"
                >
                  {fetchingPreview ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    'Buscar dados do link'
                  )}
                </button>
              </div>

              {previewNotice && (
                <div
                  className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
                    previewNotice.tone === 'success'
                      ? 'bg-[#E6F0EC] text-[#214E3E]'
                      : 'bg-[#FBF3E2] text-[#7A581B]'
                  }`}
                >
                  {previewNotice.tone === 'success' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{previewNotice.text}</span>
                </div>
              )}
            </div>
          )}

          {/* Campos principais */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={kind === 'bundle' ? 'sm:col-span-3' : 'sm:col-span-2'}>
              <label className="block text-sm font-semibold text-[#1F1D1A]">
                {kind === 'bundle'
                  ? 'Nome do pacote / combo *'
                  : kind === 'digital'
                    ? 'Nome do item digital / serviço *'
                    : 'Nome do produto *'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder={
                  kind === 'bundle'
                    ? 'Ex: Combo Setup + Livros'
                    : kind === 'digital'
                      ? 'Ex: 1 mês de Google AI Pro / Gift Card Steam'
                      : 'Ex: Fone Bluetooth JBL Tune 520BT'
                }
                className="mt-1.5 w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-4 py-3 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35] focus:bg-white"
              />
            </div>

            {kind !== 'bundle' && (
              <div>
                <label className="block text-sm font-semibold text-[#1F1D1A]">
                  Preço estimado (R$) *
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-bold text-[#6B655D]">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={priceText}
                    onChange={(e) => setPriceText(e.target.value)}
                    required
                    placeholder="149,90"
                    className="w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] py-3 pr-4 pl-10 text-sm font-bold text-[#1F1D1A] outline-none focus:border-[#B83B35] focus:bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Campo específico de Digital */}
          {kind === 'digital' && (
            <div className="rounded-2xl border border-[#214E3E]/20 bg-[#E6F0EC]/45 p-4">
              <label className="block text-sm font-bold text-[#1F3A30]">
                Como comprar / ativar / pagar
              </label>
              <p className="mt-0.5 text-xs text-[#3C5F52]">
                Explique de forma simples como quem te tirou pode adquirir esse presente.
              </p>
              <textarea
                rows={2}
                value={howToBuy}
                onChange={(e) => setHowToBuy(e.target.value)}
                placeholder="Ex: Pode comprar um Gift Card na nuuvem/supermercado ou mandar via Pix para eu assinar na minha conta."
                className="mt-2 w-full rounded-xl border border-[#C6D8D0] bg-white px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#214E3E]"
              />
            </div>
          )}

          {/* Loja e Variantes */}
          {kind !== 'bundle' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[#1F1D1A]">
                  {kind === 'digital' ? 'Plataforma / Serviço' : 'Nome da loja'}
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder={kind === 'digital' ? 'Ex: Steam, Spotify, Google' : 'Ex: Amazon, Shopee'}
                  className="mt-1.5 w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-4 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35] focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1F1D1A]">
                  Tamanho, cor, voltagem ou edição
                </label>
                <input
                  type="text"
                  value={variantInfo}
                  onChange={(e) => setVariantInfo(e.target.value)}
                  placeholder="Ex: Cor preta, Tamanho G, 110V"
                  className="mt-1.5 w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-4 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35] focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Foto do item (URL ou Upload comprimido) */}
          {kind !== 'bundle' && (
            <div className="rounded-2xl border border-[#ECE6DB] bg-[#FAF7F2] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-semibold text-[#1F1D1A]">
                  Imagem do desejo (opcional)
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFD7CA] bg-white px-3 py-1.5 text-xs font-bold text-[#1F1D1A] transition hover:bg-[#EFE8DB]">
                  <Upload className="h-3.5 w-3.5 text-[#B83B35]" />
                  {uploadingMainImg ? 'Comprimindo...' : 'Enviar foto do celular/PC'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageUpload}
                    disabled={uploadingMainImg}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="mt-2.5 flex items-center gap-3">
                <input
                  type="text"
                  value={image.startsWith('data:image/') ? 'Foto enviada e comprimida ✓' : image}
                  onChange={(e) => setImage(e.target.value)}
                  disabled={image.startsWith('data:image/')}
                  placeholder="Ou cole a URL direta de uma imagem (https://...)"
                  className="flex-1 rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35] disabled:text-[#214E3E] disabled:font-semibold"
                />
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    title="Remover imagem"
                    className="rounded-xl border border-[#DFD7CA] bg-white p-2.5 text-[#B83B35] hover:bg-[#FFF5F5]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isValidImageSrc(image) && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={image}
                    alt="Prévia"
                    className="h-20 w-20 rounded-xl border border-[#DFD7CA] bg-white object-cover"
                  />
                  <span className="text-xs text-[#6B655D]">Pré-visualização da capa</span>
                </div>
              )}
            </div>
          )}

          {/* Construtor de Pacote / Combo */}
          {kind === 'bundle' && (
            <div className="space-y-4">
              {/* Barra de soma em tempo real */}
              <div className="sticky top-[116px] z-10 rounded-2xl border border-[#E7E0D5] bg-[#FAF7F2]/95 p-4 shadow-sm backdrop-blur-sm sm:top-[104px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6B655D]">
                      Soma do Combo
                    </span>
                    <div className="text-xl font-extrabold text-[#1F1D1A]">
                      {formatBRL(bundleTotal)}{' '}
                      <span className="text-sm font-semibold text-[#6B655D]">
                        / {formatBRL(settings.budget)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      bundleDiff > 0.01
                        ? 'bg-[#B83B35]/12 text-[#992D28]'
                        : Math.abs(bundleDiff) <= 15 && bundleTotal > 0
                          ? 'bg-[#214E3E]/15 text-[#214E3E]'
                          : 'bg-white text-[#6B655D] ring-1 ring-[#DFD7CA]'
                    }`}
                  >
                    {bundleDiff > 0.01
                      ? `Passou ${formatBRL(bundleDiff)}`
                      : bundleDiff === 0 && bundleTotal > 0
                        ? 'Na medida!'
                        : `Faltam ${formatBRL(Math.max(0, settings.budget - bundleTotal))}`}
                  </span>
                </div>

                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-[#E7E0D5]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      bundleDiff > 0.01 ? 'bg-[#B83B35]' : 'bg-[#214E3E]'
                    }`}
                    style={{ width: `${bundleProgress}%` }}
                  />
                </div>
              </div>

              {/* Lista de Sub-itens */}
              <div className="space-y-3">
                {subItems.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="rounded-2xl border border-[#E7E0D5] bg-[#FAF7F2] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1F1D1A]">
                        Item #{idx + 1} do combo
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex rounded-xl bg-white p-0.5 ring-1 ring-[#E7E0D5]">
                          <button
                            type="button"
                            onClick={() => updateSubItem(sub.id, { kind: 'store' })}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                              sub.kind === 'store'
                                ? 'bg-[#1F1D1A] text-white'
                                : 'text-[#6B655D]'
                            }`}
                          >
                            Loja
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSubItem(sub.id, { kind: 'digital' })}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                              sub.kind === 'digital'
                                ? 'bg-[#214E3E] text-white'
                                : 'text-[#6B655D]'
                            }`}
                          >
                            Digital
                          </button>
                        </div>

                        {subItems.length > 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              setSubItems((prev) => prev.filter((item) => item.id !== sub.id))
                            }
                            aria-label="Remover item do combo"
                            className="rounded-lg p-1.5 text-[#B83B35] hover:bg-[#FFF5F5]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={sub.title}
                          onChange={(e) => updateSubItem(sub.id, { title: e.target.value })}
                          placeholder="Nome do item (ex: Livro Hábitos Atômicos)"
                          className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35]"
                        />
                      </div>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold text-[#6B655D]">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={sub.priceText}
                          onChange={(e) => updateSubItem(sub.id, { priceText: e.target.value })}
                          placeholder="50,00"
                          className="w-full rounded-xl border border-[#DFD7CA] bg-white py-2.5 pr-3 pl-9 text-sm font-bold text-[#1F1D1A] outline-none focus:border-[#B83B35]"
                        />
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="url"
                        value={sub.url}
                        onChange={(e) => updateSubItem(sub.id, { url: e.target.value })}
                        placeholder="Link opcional da loja"
                        className="flex-1 rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2 text-xs text-[#1F1D1A] outline-none focus:border-[#B83B35]"
                      />
                      {sub.url && (
                        <button
                          type="button"
                          onClick={() => handleSubItemLinkFetch(sub)}
                          disabled={sub.fetchingLink}
                          className="shrink-0 rounded-xl bg-[#1F1D1A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#33302B] disabled:opacity-60"
                        >
                          {sub.fetchingLink ? 'Buscando...' : 'Puxar link'}
                        </button>
                      )}
                      <label className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-xs font-semibold text-[#1F1D1A] hover:bg-[#EFE8DB]">
                        <Upload className="h-3.5 w-3.5 text-[#B83B35]" />
                        {sub.uploadingImg ? '...' : sub.image ? 'Trocar foto' : 'Foto'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSubItemImageUpload(sub.id, e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      {isValidImageSrc(sub.image) && (
                        <img
                          src={sub.image}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg border border-[#DFD7CA] object-cover"
                        />
                      )}
                      <input
                        type="text"
                        value={sub.notes}
                        onChange={(e) => updateSubItem(sub.id, { notes: e.target.value })}
                        placeholder="Observação rápida (ex: cor, loja ou como comprar)"
                        className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2 text-xs text-[#1F1D1A] outline-none focus:border-[#B83B35]"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setSubItems((prev) => [...prev, createEmptySubItem()])}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#C8963E] bg-[#FBF3E2]/60 py-3 text-sm font-bold text-[#8C6520] transition hover:bg-[#FBF3E2]"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar mais um item ao combo
                </button>
              </div>
            </div>
          )}

          {/* Nível de Desejo */}
          <div>
            <label className="block text-sm font-semibold text-[#1F1D1A]">
              Nível de desejo
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  { level: 1, label: 'Seria legal' },
                  { level: 2, label: 'Quero bastante' },
                  { level: 3, label: 'Quero muito!' },
                ] as const
              ).map(({ level, label }) => {
                const selected = priority === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPriority(level)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-center transition ${
                      selected
                        ? 'border-[#C8963E] bg-[#FBF3E2] text-[#7A581B] ring-2 ring-[#C8963E]/30'
                        : 'border-[#E7E0D5] bg-[#FAF7F2] text-[#6B655D] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: level }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-[#C8963E] text-[#C8963E]" />
                      ))}
                    </div>
                    <span className="text-xs font-bold">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Observações gerais */}
          <div>
            <label className="block text-sm font-semibold text-[#1F1D1A]">
              Observações extras (opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Alguma dica extra sobre esse presente?"
              className="mt-1.5 w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-4 py-3 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35] focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#ECE6DB] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[#6B655D]">
            <Info className="h-4 w-4 shrink-0 text-[#214E3E]" />
            <span>Você pode editar ou remover enquanto o prazo estiver aberto.</span>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-2xl border border-[#DFD7CA] bg-white px-5 py-3 text-sm font-semibold text-[#1F1D1A] hover:bg-[#FAF7F2]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-[#B83B35] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#992D28] disabled:opacity-60"
            >
              {saving
                ? 'Salvando...'
                : editingItem
                  ? 'Salvar alterações'
                  : 'Publicar desejo'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
