import React, { useState } from 'react';
import {
  Camera,
  Check,
  Eye,
  EyeOff,
  Gift,
  HeartHandshake,
  Lock,
  LogOut,
  Save,
  Trash2,
} from 'lucide-react';
import { ACCENT_COLORS, AVATAR_EMOJIS } from '../constants/participants';
import { updateOwnProfile } from '../firebase/service';
import { useToast } from '../hooks/useToast';
import type { CurrentUser, ParticipantId, PublicUser, WishItem } from '../types';
import { formatBRL, isValidImageSrc } from '../utils/format';
import { compressImageFile } from '../utils/imageCompress';
import { Avatar } from './Avatar';

interface ProfileViewProps {
  currentUser: CurrentUser;
  publicUsers: PublicUser[];
  ownItems: WishItem[];
  onOpenItem: (item: WishItem) => void;
  onRequestLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  publicUsers,
  ownItems,
  onOpenItem,
  onRequestLogout,
}) => {
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [accentColor, setAccentColor] = useState(currentUser.accentColor);
  const [shirtSize, setShirtSize] = useState(currentUser.preferences.shirtSize);
  const [shoeSize, setShoeSize] = useState(currentUser.preferences.shoeSize);
  const [favoriteColors, setFavoriteColors] = useState(currentUser.preferences.favoriteColors);
  const [notes, setNotes] = useState(currentUser.preferences.notes);

  const [revealSecretSection, setRevealSecretSection] = useState(false);
  const [drawnUserId, setDrawnUserId] = useState<ParticipantId | null>(currentUser.drawnUserId);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecret, setSavingSecret] = useState(false);

  const otherParticipants = publicUsers.filter((u) => u.id !== currentUser.id);
  const currentDrawnUser = otherParticipants.find((u) => u.id === currentUser.drawnUserId);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { dataUrl } = await compressImageFile(file, {
        maxWidth: 420,
        maxHeight: 420,
        maxBytes: 95 * 1024,
      });
      setAvatar(dataUrl);
      showToast('Foto ajustada! Clique em "Salvar perfil" para confirmar.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao processar foto.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showToast('Seu nome de exibição não pode ficar vazio.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      await updateOwnProfile(currentUser.id, {
        displayName: displayName.trim(),
        avatar,
        accentColor,
        preferences: {
          shirtSize: shirtSize.trim(),
          shoeSize: shoeSize.trim(),
          favoriteColors: favoriteColors.trim(),
          notes: notes.trim(),
        },
      });
      showToast('Perfil e dicas atualizados!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar perfil.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSecretDraw = async () => {
    if (!drawnUserId) {
      showToast('Escolha quem você tirou no sorteio.', 'error');
      return;
    }

    setSavingSecret(true);
    try {
      await updateOwnProfile(currentUser.id, {
        drawnUserId,
        onboardingCompleted: true,
      });
      setRevealSecretSection(false);
      showToast('Seu Amigo Secreto foi atualizado em sigilo!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar sorteio.', 'error');
    } finally {
      setSavingSecret(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Formulário de Perfil e Dicas */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-3xl border border-[#E7E0D5] bg-white p-5 shadow-xs sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              avatar={avatar}
              name={displayName || currentUser.baseName}
              accentColor={accentColor}
              size="lg"
            />
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1F1D1A]">
                Meu Perfil ({currentUser.baseName})
              </h1>
              <p className="text-xs text-[#6B655D]">
                Personalize seu nome, avatar e dicas de tamanho para a família.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRequestLogout}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold text-[#6B655D] transition hover:bg-[#FFF5F5] hover:text-[#B83B35]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair / Trocar conta
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#1F1D1A]">
              Nome / Apelido exibido no app
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
              className="mt-1.5 w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-4 py-3 text-sm font-medium text-[#1F1D1A] outline-none focus:border-[#B83B35] focus:bg-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[#1F1D1A]">Avatar</label>
              <div className="flex items-center gap-2">
                {isValidImageSrc(avatar) && (
                  <button
                    type="button"
                    onClick={() => setAvatar(AVATAR_EMOJIS[0])}
                    className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-[#B83B35] hover:bg-[#B83B35]/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover foto
                  </button>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFD7CA] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#1F1D1A] hover:bg-[#EFE8DB]">
                  <Camera className="h-3.5 w-3.5 text-[#214E3E]" />
                  {uploadingPhoto ? 'Comprimindo...' : 'Enviar foto'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition ${
                    avatar === emoji
                      ? 'bg-[#1F1D1A] ring-2 ring-[#B83B35] ring-offset-2'
                      : 'bg-[#FAF7F2] hover:bg-[#EFE8DB]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#6B655D]">Cor:</span>
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setAccentColor(color.hex)}
                  title={color.name}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                    accentColor === color.hex ? 'ring-2 ring-[#1F1D1A] ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: color.hex }}
                >
                  {accentColor === color.hex && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#ECE6DB] bg-[#FAF7F2] p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1F1D1A]">
              <HeartHandshake className="h-4 w-4 text-[#214E3E]" />
              Dicas para quem vai te presentear
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#6B655D]">
                  Tamanho de camiseta / roupa
                </label>
                <input
                  type="text"
                  value={shirtSize}
                  onChange={(e) => setShirtSize(e.target.value)}
                  placeholder="Ex: M, G, GG..."
                  className="mt-1 w-full rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B655D]">
                  Número de calçado
                </label>
                <input
                  type="text"
                  value={shoeSize}
                  onChange={(e) => setShoeSize(e.target.value)}
                  placeholder="Ex: 37, 41..."
                  className="mt-1 w-full rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35]"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-[#6B655D]">
                Cores ou estilos favoritos
              </label>
              <input
                type="text"
                value={favoriteColors}
                onChange={(e) => setFavoriteColors(e.target.value)}
                placeholder="Ex: Tons neutros, verde, livros..."
                className="mt-1 w-full rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35]"
              />
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-[#6B655D]">
                Recado geral
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Prefiro coisas úteis ou digitais!"
                className="mt-1 w-full rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1F1D1A] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#33302B] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {savingProfile ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </div>
      </form>

      {/* Seção protegida contra spoiler: Quem tirou no sorteio */}
      <section className="rounded-3xl border border-[#E7E0D5] bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#214E3E]/12 text-[#214E3E]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1F1D1A]">
                Quem você tirou no Amigo Secreto
              </h2>
              <p className="text-xs text-[#6B655D]">
                Fica oculto por padrão caso alguém esteja olhando sua tela.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDrawnUserId(currentUser.drawnUserId);
              setRevealSecretSection((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-4 py-2 text-xs font-bold text-[#1F1D1A] transition hover:bg-[#EFE8DB]"
          >
            {revealSecretSection ? (
              <>
                <EyeOff className="h-4 w-4" />
                Ocultar
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                {currentDrawnUser ? 'Ver / Alterar' : 'Definir agora'}
              </>
            )}
          </button>
        </div>

        {revealSecretSection && (
          <div className="mt-5 border-t border-[#F2ECE2] pt-5">
            <p className="text-xs font-semibold text-[#6B655D]">
              Selecione quem você tirou (100% secreto):
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {otherParticipants.map((person) => {
                const selected = drawnUserId === person.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setDrawnUserId(person.id)}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                      selected
                        ? 'border-[#B83B35] bg-[#B83B35]/8 ring-2 ring-[#B83B35]/25'
                        : 'border-[#E7E0D5] bg-[#FAF7F2] hover:bg-white'
                    }`}
                  >
                    <Avatar
                      avatar={person.avatar}
                      name={person.displayName}
                      accentColor={person.accentColor}
                      size="sm"
                    />
                    <span className="flex-1 truncate text-sm font-bold text-[#1F1D1A]">
                      {person.displayName}
                    </span>
                    {selected && <Check className="h-4 w-4 text-[#B83B35]" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSecretDraw}
                disabled={savingSecret || !drawnUserId}
                className="rounded-2xl bg-[#214E3E] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#193C30] disabled:opacity-50"
              >
                {savingSecret ? 'Salvando...' : 'Salvar escolha secreta'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Resumo dos próprios pedidos */}
      <section className="rounded-3xl border border-[#E7E0D5] bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-2 text-base font-bold text-[#1F1D1A]">
          <Gift className="h-5 w-5 text-[#B83B35]" />
          Meus pedidos enviados ({ownItems.length})
        </div>

        {ownItems.length === 0 ? (
          <p className="mt-2 text-sm text-[#6B655D]">
            Você ainda não adicionou nenhum desejo na sua lista.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-[#F2ECE2]">
            {ownItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenItem(item)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:opacity-80"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-[#1F1D1A]">{item.title}</div>
                  <div className="text-xs text-[#6B655D]">
                    {item.kind === 'bundle'
                      ? `Combo com ${item.subItems.length} itens`
                      : item.kind === 'digital'
                        ? 'Digital / Serviço'
                        : item.storeName || 'Loja'}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-extrabold text-[#1F1D1A]">
                  {formatBRL(item.price)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
