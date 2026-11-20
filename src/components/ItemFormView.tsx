import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Info,
  Layers,
  Loader2,
  Plus,
  FileText,
  Search,
  Truck,
  Check,
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
  isValidImageSrc,
  parsePriceInput,
  priceToInputString,
} from '../utils/format';
import { compressImageFile } from '../utils/imageCompress';
import { extractStoreNameFromUrl } from '../utils/linkPreview';
import { analyzeScreenshot } from '../utils/screenshotImport';

interface ItemFormViewProps {
  currentUser: CurrentUser;
  settings: EventSettings;
  canManageItems: boolean;
  editingItem: WishItem | null;
  availableItems: WishItem[];
  onSaved: () => void;
  onCancel: () => void;
  onGoToAdmin?: () => void;
}

export const ItemFormView: React.FC<ItemFormViewProps> = ({
  currentUser,
  settings,
  canManageItems,
  editingItem,
  availableItems,
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
  const [url] = useState(editingItem?.url ?? '');
  const [storeName, setStoreName] = useState(editingItem?.storeName ?? '');
  const [image, setImage] = useState(editingItem?.image ?? '');
  const [variantInfo, setVariantInfo] = useState(editingItem?.variantInfo ?? '');
  const [howToBuy, setHowToBuy] = useState(editingItem?.howToBuy ?? '');
  const [description, setDescription] = useState(editingItem?.description ?? '');
  const [priority, setPriority] = useState<ItemPriority>(editingItem?.priority ?? 2);

  const [shippingText, setShippingText] = useState(editingItem?.shippingEstimate ? priceToInputString(editingItem.shippingEstimate) : '');
  const [bundleSearch, setBundleSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() =>
    editingItem?.kind === 'bundle'
      ? editingItem.subItems.flatMap((sub) => sub.sourceItemId && availableItems.some((item) => item.id === sub.sourceItemId) ? [sub.sourceItemId] : [])
      : []
  );
  const [legacyBundleItems, setLegacyBundleItems] = useState<SubItem[]>(() =>
    editingItem?.kind === 'bundle'
      ? editingItem.subItems.filter((sub) => !sub.sourceItemId || !availableItems.some((item) => item.id === sub.sourceItemId))
      : []
  );
  const eligibleProducts = availableItems.filter((item) => item.ownerId === currentUser.id && item.kind !== 'bundle' && item.id !== editingItem?.id);
  const selectedProducts = selectedProductIds.map((id) => eligibleProducts.find((item) => item.id === id)).filter((item): item is WishItem => Boolean(item));
  const visibleProducts = eligibleProducts.filter((item) =>
    `${item.title} ${item.storeName} ${item.description}`.toLocaleLowerCase('pt-BR').includes(bundleSearch.toLocaleLowerCase('pt-BR').trim())
  );
  const shippingEstimate = parsePriceInput(shippingText);
  const suggestedBundleShipping = selectedProducts.reduce((sum, item) => sum + item.shippingEstimate, 0);
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

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, analyze = false) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingMainImg(true);
    setPreviewNotice(null);
    try {
      const { dataUrl, bytes } = await compressImageFile(file, {
        maxWidth: 1080,
        maxHeight: 1800,
        maxBytes: 145 * 1024,
      });
      setImage(dataUrl);
      if (!analyze) { showToast(`Foto comprimida (${Math.round(bytes / 1024)} KB) pronta!`, 'success'); return; }
      const result = await analyzeScreenshot(file);
      if (result.title) setTitle(result.title);
      if (result.price !== null) setPriceText(priceToInputString(result.price));
      if (result.storeName) setStoreName(result.storeName);
      if (result.variantInfo) setVariantInfo(result.variantInfo);
      if (result.description) setDescription(result.description);
      const missing = !result.title || result.price === null;
      setPreviewNotice({ tone: missing || result.warning ? 'warning' : 'success', text: [missing ? 'Print salvo. Complete os campos que faltam.' : 'Print analisado! Confira os dados antes de publicar.', result.warning].filter(Boolean).join(' ') });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao importar print.';
      setPreviewNotice({tone:'warning', text: message + ' Se a imagem foi salva, preencha os campos manualmente.'});
      showToast(message, 'error');
    } finally {
      setUploadingMainImg(false);
    }
  };

  const bundleTotal = selectedProducts.reduce((sum, item) => sum + item.price, 0) +
    legacyBundleItems.reduce((sum, item) => sum + item.price, 0);
  const bundleWithShipping = bundleTotal + shippingEstimate;
  const bundleProgress = Math.min(100, Math.round((bundleWithShipping / Math.max(1, settings.budget)) * 100));
  const bundleDiff = bundleWithShipping - settings.budget;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingMainImg) { showToast('Aguarde a análise do print terminar.', 'info'); return; }

    if (!title.trim()) {
      showToast('Dê um nome para o seu pedido.', 'error');
      return;
    }

    let parsedSubItems: SubItem[] = [];
    let finalPrice = parsePriceInput(priceText);

    if (kind === 'bundle') {
      if (legacyBundleItems.length + selectedProducts.length < 2) {
        showToast('Selecione pelo menos dois desejos que já estão na sua lista.', 'error');
        return;
      }
      parsedSubItems = [
        ...legacyBundleItems,
        ...selectedProducts.map((item): SubItem => ({
          id: item.id,
          sourceItemId: item.id,
          title: item.title,
          price: item.price,
          kind: item.kind === 'misc' ? 'misc' : item.kind === 'digital' ? 'digital' : 'store',
          url: item.url,
          storeName: item.storeName,
          image: '',
          notes: item.variantInfo || '',
        })),
      ];
      finalPrice = Math.round(parsedSubItems.reduce((sum, sub) => sum + sub.price, 0) * 100) / 100;
    } else if (kind !== 'misc' && finalPrice <= 0) {
      showToast('Informe um preço estimado válido (maior que R$ 0,00).', 'error');
      return;
    }
    if (shippingText.trim() && !/^(?:0+(?:[.,]0{1,2})?|[0-9.,]+)$/.test(shippingText.trim())) {
      showToast('Frete inválido. Use um valor como 12,90.', 'error');
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
          shippingEstimate: kind === 'digital' ? 0 : shippingEstimate,
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

        {/* Formatos de pedido */}
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                id: 'store',
                label: 'Produto de Loja',
                desc: 'Importe um print da loja',
                icon: Store,
              },
              {
                id: 'digital',
                label: 'Digital / Serviço',
                desc: 'Assinatura, Gift Card, Pix...',
                icon: Sparkles,
              },
              {
                id: 'misc',
                label: 'Pedido livre / Outros',
                desc: 'Só escrever o que quer',
                icon: FileText,
              },
              {
                id: 'bundle',
                label: 'Monte um Combo',
                desc: 'Junte desejos já adicionados',
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
          {/* Importação por print */}
          {(kind === 'store' || kind === 'digital') && (
            <div className="rounded-2xl border border-[#ECE6DB] bg-[#FAF7F2] p-4">
              <label className="block text-sm font-bold text-[#1F1D1A]">Importar print do produto</label>
              <p className="mt-1 text-xs text-[#6B655D]">Capture a página com nome e preço visíveis. O Gemini 3.5 Flash-Lite lê o print, que também será a foto do desejo.</p>
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#214E3E] px-4 py-3 text-sm font-bold text-white">
                {uploadingMainImg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingMainImg ? 'Analisando print...' : 'Selecionar print'}
                <input type="file" accept="image/*" onChange={(e) => handleMainImageUpload(e, true)} disabled={uploadingMainImg} className="hidden" />
              </label>
              {previewNotice && <div role="status" className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-medium ${previewNotice.tone === 'success' ? 'bg-[#E6F0EC] text-[#214E3E]' : 'bg-[#FBF3E2] text-[#7A581B]'}`}>{previewNotice.tone === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}<span>{previewNotice.text}</span></div>}
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
                    : kind === 'misc'
                      ? 'O que você gostaria de ganhar? *'
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
                      : kind === 'misc'
                        ? 'Ex: Meias quentinhas, um livro de receitas, uma bolsa...'
                        : 'Ex: Fone Bluetooth JBL Tune 520BT'
                }
                className="mt-1.5 w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-4 py-3 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35] focus:bg-white"
              />
            </div>

            {kind !== 'bundle' && (
              <div>
                <label className="block text-sm font-semibold text-[#1F1D1A]">
                  {kind === 'misc' ? 'Preço aproximado (R$) — opcional' : 'Preço estimado (R$) *'}
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
                    required={kind !== 'misc'}
                    placeholder={kind === 'misc' ? 'Deixe vazio se não souber' : '149,90'}
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
          {(kind === 'store' || kind === 'digital') && (
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
          {(kind === 'store' || kind === 'digital') && (
            <div className="rounded-2xl border border-[#ECE6DB] bg-[#FAF7F2] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-semibold text-[#1F1D1A]">
                  Imagem do desejo (opcional)
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFD7CA] bg-white px-3 py-1.5 text-xs font-bold text-[#1F1D1A] transition hover:bg-[#EFE8DB]">
                  <Upload className="h-3.5 w-3.5 text-[#B83B35]" />
                  {uploadingMainImg ? 'Comprimindo...' : 'Enviar foto sem análise'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleMainImageUpload(e, false)}
                    disabled={uploadingMainImg}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="mt-2.5 flex items-center gap-3">
                <span className="flex-1 text-xs text-[#6B655D]">{image ? 'Imagem selecionada' : 'Nenhuma imagem selecionada'}</span>
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
                    className="h-20 w-20 rounded-xl border border-[#DFD7CA] bg-white object-contain"
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
                      <label className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-xs font-semibold text-[#1F1D1A] hover:bg-[#EFE8DB]">
                        <Upload className="h-3.5 w-3.5 text-[#B83B35]" />
                        {sub.uploadingImg ? 'Analisando print...' : sub.image ? 'Importar outro print' : 'Importar print'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSubItemImageUpload(sub.id, e)}
                          disabled={sub.uploadingImg}
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
              {kind === 'misc' ? 'Detalhes do seu pedido livre (opcional)' : 'Observações extras (opcional)'}
            </label>
            <textarea
              rows={kind === 'misc' ? 4 : 2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={kind === 'misc' ? 'Pode escrever naturalmente: marca, tamanho, cor, alternativas que aceitaria...' : 'Alguma dica extra sobre esse presente?'}
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
              disabled={saving || uploadingMainImg}
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
