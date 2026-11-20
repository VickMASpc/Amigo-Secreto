import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Info,
  Layers,
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
  PublicUser,
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
import type { ScreenshotProduct } from '../utils/screenshotImport';
import { ScreenshotImporter } from './ScreenshotImporter';

interface ItemFormViewProps {
  currentUser: CurrentUser;
  settings: EventSettings;
  canManageItems: boolean;
  editingItem: WishItem | null;
  availableItems: WishItem[];
  familyMembers: PublicUser[];
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
  familyMembers,
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
  const eligibleProducts = availableItems.filter((item) => item.kind !== 'bundle' && item.id !== editingItem?.id);
  const getOwnerName = (ownerId: string) => familyMembers.find((person) => person.id === ownerId)?.displayName || ownerId;
  const selectedProducts = selectedProductIds.map((id) => eligibleProducts.find((item) => item.id === id)).filter((item): item is WishItem => Boolean(item));
  const visibleProducts = eligibleProducts.filter((item) =>
    `${item.title} ${item.storeName} ${item.description} ${getOwnerName(item.ownerId)}`.toLocaleLowerCase('pt-BR').includes(bundleSearch.toLocaleLowerCase('pt-BR').trim())
  );
  const shippingEstimate = parsePriceInput(shippingText);
  const suggestedBundleShipping = selectedProducts.reduce((sum, item) => sum + item.shippingEstimate, 0);
  const [previewNotice, setPreviewNotice] = useState<{
    tone: 'success' | 'warning';
    text: string;
  } | null>(null);
  const [uploadingMainImg, setUploadingMainImg] = useState(false);
  const [importerBusy,setImporterBusy]=useState(false);
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

  const handleMainImageUpload = async (e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    setUploadingMainImg(true);setPreviewNotice(null);
    try{
      const {dataUrl,bytes}=await compressImageFile(file,{maxWidth:900,maxHeight:900,maxBytes:145*1024});
      setImage(dataUrl);showToast('Imagem salva: '+Math.round(bytes/1024)+' KB.','success');
    }catch(err){showToast(err instanceof Error?err.message:'Erro na imagem.','error');}
    finally{setUploadingMainImg(false);}
  };

  const applyScreenshotImport=(result:ScreenshotProduct,previewDataUrl:string|null,photoInfo:string)=>{
    if(result.title)setTitle(result.title);
    if(result.price!==null)setPriceText(priceToInputString(result.price));
    if(result.storeName)setStoreName(result.storeName);
    if(result.variantInfo)setVariantInfo(result.variantInfo);
    if(result.shippingPrice!==null&&!result.shippingIsConditional)setShippingText(priceToInputString(result.shippingPrice));
    if(previewDataUrl)setImage(previewDataUrl);
    const details=[
      result.description,
      result.originalPrice!==null?'Preço anterior: '+formatBRL(result.originalPrice):'',
      result.priceNote,
      result.seller?'Vendedor: '+result.seller:'',
      result.rating!==null?'Avaliação: '+result.rating:'',
      result.salesInfo?'Vendas: '+result.salesInfo:'',
      result.shippingText?'Entrega: '+result.shippingText:'',
    ].filter(Boolean);
    if(details.length)setDescription(prev=>[prev.trim(),...details.filter(line=>!prev.includes(line))].filter(Boolean).join('\n'));
    const warnings=[photoInfo,!result.title||result.price===null?'Confirme nome/preço que não foram encontrados.':'',
      result.shippingIsConditional?'Frete condicional; confira manualmente.':'',result.warning].filter(Boolean);
    setPreviewNotice({tone:warnings.length?'warning':'success',text:warnings.join(' ')||'Importação concluída; confira os campos.'});
  };

  const bundleTotal = selectedProducts.reduce((sum, item) => sum + item.price, 0) +
    legacyBundleItems.reduce((sum, item) => sum + item.price, 0);
  const bundleWithShipping = bundleTotal + shippingEstimate;
  const bundleProgress = Math.min(100, Math.round((bundleWithShipping / Math.max(1, settings.budget)) * 100));
  const bundleDiff = bundleWithShipping - settings.budget;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingMainImg || importerBusy) { showToast('Aguarde a análise do print terminar.', 'info'); return; }

    if (!title.trim()) {
      showToast('Dê um nome para o seu pedido.', 'error');
      return;
    }

    let parsedSubItems: SubItem[] = [];
    let finalPrice = parsePriceInput(priceText);

    if (kind === 'bundle') {
      if (legacyBundleItems.length + selectedProducts.length < 2) {
        showToast('Selecione pelo menos dois desejos publicados pela família.', 'error');
        return;
      }
      parsedSubItems = [
        ...legacyBundleItems,
        ...selectedProducts.map((item): SubItem => ({
          id: item.id,
          sourceItemId: item.id,
          sourceOwnerId: item.ownerId,
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
          {(kind === 'store' || kind === 'digital') && (
            <ScreenshotImporter disabled={saving||uploadingMainImg} onBusyChange={setImporterBusy} onImported={applyScreenshotImport}/>
          )}
          {previewNotice && (
            <div role="status" className="rounded-xl bg-[#FBF3E2] px-3 py-2 text-xs text-[#7A581B]">{previewNotice.text}</div>
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
                    onChange={handleMainImageUpload}
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


          {/* Public shipping estimate, with independent private shipping in the buyer's cart. */}
          {kind !== 'digital' && (
            <div className="rounded-2xl border border-[#DFD7CA] bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1F1D1A]">
                <Truck className="h-4 w-4 text-[#214E3E]" /> Frete estimado (opcional)
              </div>
              <p className="mt-1 text-xs text-[#6B655D]">Informe o frete estimado. Quem comprar poderá ajustá-lo ao reunir entregas.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-[#6B655D]">R$</span>
                <input type="text" inputMode="decimal" value={shippingText} onChange={(e) => setShippingText(e.target.value)} placeholder="0,00"
                  className="w-28 rounded-xl border border-[#DFD7CA] bg-[#FAF7F2] px-3 py-2 text-sm font-semibold text-[#1F1D1A]" />
                {kind === 'bundle' && suggestedBundleShipping > 0 && (
                  <button type="button" onClick={() => setShippingText(priceToInputString(suggestedBundleShipping))}
                    className="rounded-xl border border-[#DFD7CA] bg-[#FAF7F2] px-3 py-2 text-xs font-semibold text-[#214E3E]">
                    Somar fretes individuais ({formatBRL(suggestedBundleShipping)})
                  </button>
                )}
                {kind !== 'bundle' && (parsePriceInput(priceText) > 0 || shippingEstimate > 0) && (
                  <span className="ml-auto text-xs font-bold text-[#214E3E]">Total previsto: {formatBRL(parsePriceInput(priceText) + shippingEstimate)}</span>
                )}
              </div>
            </div>
          )}

          {/* Choose existing products instead of duplicating them inside bundles. */}
          {kind === 'bundle' && (
            <div className="space-y-4">
              <div className="sticky top-[104px] z-10 rounded-2xl border border-[#E7E0D5] bg-[#FAF7F2]/95 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase text-[#6B655D]">Total do combo (com frete)</div>
                    <div className="text-xl font-extrabold text-[#1F1D1A]">{formatBRL(bundleWithShipping)} <span className="text-sm font-medium text-[#6B655D]">/ {formatBRL(settings.budget)}</span></div>
                    <div className="text-xs text-[#6B655D]">Produtos: {formatBRL(bundleTotal)} · Frete: {formatBRL(shippingEstimate)}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${bundleDiff > 0.01 ? 'bg-[#B83B35]/12 text-[#992D28]' : 'bg-[#E6F0EC] text-[#214E3E]'}`}>
                    {bundleDiff > 0.01 ? `Passou ${formatBRL(bundleDiff)}` : `Restam ${formatBRL(Math.max(0, -bundleDiff))}`}
                  </span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#E7E0D5]">
                  <div className={`h-full ${bundleDiff > 0.01 ? 'bg-[#B83B35]' : 'bg-[#214E3E]'}`} style={{width:`${bundleProgress}%`}} />
                </div>
              </div>

              <div className="rounded-2xl border border-[#E7E0D5] bg-[#FAF7F2] p-4">
                <h2 className="text-sm font-bold text-[#1F1D1A]">Monte com desejos de qualquer pessoa</h2>
                <p className="mt-1 text-xs text-[#6B655D]">Misture presentes de toda a família — até um combo só de desejos dos outros. Cada item continua ligado à sua lista original, com preço e foto atualizados.</p>
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 text-[#8B8275]" />
                  <input type="search" value={bundleSearch} onChange={(e) => setBundleSearch(e.target.value)}
                    placeholder="Buscar produto ou pessoa..." className="w-full rounded-xl border border-[#DFD7CA] bg-white py-2.5 pr-3 pl-9 text-sm" />
                </div>
                {eligibleProducts.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-white p-4 text-sm text-[#6B655D]">A família ainda não cadastrou desejos individuais. Adicione alguns produtos ou pedidos livres antes de montar um combo.</p>
                ) : visibleProducts.length === 0 ? (
                  <p className="mt-4 text-xs text-[#6B655D]">Nenhum desejo encontrado nesta busca.</p>
                ) : (
                  <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                    {visibleProducts.map((product) => {
                      const selected = selectedProductIds.includes(product.id);
                      return (
                        <button type="button" key={product.id}
                          onClick={() => setSelectedProductIds((prev) => prev.includes(product.id) ? prev.filter((id) => id !== product.id) : [...prev, product.id])}
                          className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left ${selected ? 'border-[#214E3E] bg-[#E6F0EC]' : 'border-[#E7E0D5] bg-white'}`}
                          aria-pressed={selected}>
                          {isValidImageSrc(product.image) ? <img src={product.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain" /> :
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F4EFE6]"><Store className="h-5 w-5 text-[#8B8275]" /></div>}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[#1F1D1A]">{product.title}</span>
                            <span className="block text-xs font-bold text-[#214E3E]">Da lista de {getOwnerName(product.ownerId)}{product.ownerId === currentUser.id ? ' (você)' : ''}</span>
                            <span className="block text-xs text-[#6B655D]">{product.price ? formatBRL(product.price) : 'Preço a combinar'}{product.shippingEstimate > 0 ? ` · frete ${formatBRL(product.shippingEstimate)}` : ''}</span>
                          </span>
                          {selected ? <Check className="h-5 w-5 shrink-0 text-[#214E3E]" /> : <Plus className="h-5 w-5 shrink-0 text-[#8B8275]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#E7E0D5] bg-white p-4">
                <h3 className="text-sm font-bold text-[#1F1D1A]">Itens selecionados ({selectedProducts.length + legacyBundleItems.length})</h3>
                <div className="mt-3 space-y-2">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-2 rounded-xl bg-[#FAF7F2] px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{product.title} <span className="text-xs text-[#6B655D]">· {getOwnerName(product.ownerId)}</span></span>
                      <strong className="shrink-0">{formatBRL(product.price)}</strong>
                      <button type="button" aria-label={`Retirar ${product.title}`} onClick={() => setSelectedProductIds((prev) => prev.filter((id) => id !== product.id))}
                        className="p-1 text-[#B83B35]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {legacyBundleItems.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 rounded-xl bg-[#FBF3E2] px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{sub.title} <small className="text-[#7A581B]">(item de combo antigo)</small></span>
                      <strong>{formatBRL(sub.price)}</strong>
                      <button type="button" aria-label={`Retirar ${sub.title}`} onClick={() => setLegacyBundleItems((prev) => prev.filter((i) => i.id !== sub.id))}
                        className="p-1 text-[#B83B35]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {selectedProducts.length + legacyBundleItems.length === 0 && <p className="text-xs text-[#6B655D]">Selecione os produtos acima.</p>}
                </div>
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
              disabled={saving || uploadingMainImg || importerBusy}
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
