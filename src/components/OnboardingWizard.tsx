import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Gift,
  HeartHandshake,
  Lock,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ACCENT_COLORS, AVATAR_EMOJIS } from '../constants/participants';
import { updateOwnProfile } from '../firebase/service';
import { useToast } from '../hooks/useToast';
import type { CurrentUser, ParticipantId, PublicUser } from '../types';
import { compressImageFile } from '../utils/imageCompress';
import { isValidImageSrc } from '../utils/format';
import { Avatar } from './Avatar';

interface OnboardingWizardProps {
  currentUser: CurrentUser;
  publicUsers: PublicUser[];
  onGoToAdmin?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  currentUser,
  publicUsers,
  onGoToAdmin,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);

  const [displayName, setDisplayName] = useState(currentUser.displayName || currentUser.baseName);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [accentColor, setAccentColor] = useState(currentUser.accentColor);
  const [shirtSize, setShirtSize] = useState(currentUser.preferences.shirtSize);
  const [shoeSize, setShoeSize] = useState(currentUser.preferences.shoeSize);
  const [favoriteColors, setFavoriteColors] = useState(currentUser.preferences.favoriteColors);
  const [notes, setNotes] = useState(currentUser.preferences.notes);

  const [drawnUserId, setDrawnUserId] = useState<ParticipantId | null>(currentUser.drawnUserId);
  const [confirmSecret, setConfirmSecret] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const otherParticipants = publicUsers.filter((u) => u.id !== currentUser.id);
  const selectedMatch = otherParticipants.find((u) => u.id === drawnUserId) ?? null;

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
      showToast('Foto de perfil ajustada com sucesso!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao processar foto.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleNextStep = () => {
    if (!displayName.trim()) {
      showToast('Informe como você quer que seu nome apareça.', 'error');
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    if (!drawnUserId) {
      showToast('Escolha quem você tirou no sorteio para continuar.', 'error');
      return;
    }
    if (!confirmSecret) {
      showToast('Marque a confirmação de que você conferiu quem tirou.', 'info');
      return;
    }

    setSaving(true);
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
        drawnUserId,
        onboardingCompleted: true,
      });
      showToast('Tudo pronto! Agora você já pode explorar e pedir seus presentes.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar perfil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        {/* Progress Pill */}
        <div className="mb-6 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#1F1D1A] shadow-xs ring-1 ring-[#E7E0D5]">
            <Sparkles className="h-3.5 w-3.5 text-[#C8963E]" />
            Passo {step} de 2
          </div>
          <div className="flex gap-1.5">
            <span
              className={`h-2 w-8 rounded-full transition-all ${
                step === 1 ? 'bg-[#B83B35]' : 'bg-[#214E3E]'
              }`}
            />
            <span
              className={`h-2 w-8 rounded-full transition-all ${
                step === 2 ? 'bg-[#B83B35]' : 'bg-[#DFD7CA]'
              }`}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-[#E7E0D5] bg-white p-6 shadow-xl sm:p-8">
          {step === 1 ? (
            <div>
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
                <Avatar
                  avatar={avatar}
                  name={displayName || currentUser.baseName}
                  accentColor={accentColor}
                  size="xl"
                />
                <div className="mt-4 sm:mt-0 sm:ml-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#B83B35]">
                    Boas-vindas, {currentUser.baseName}!
                  </span>
                  <h1 className="font-display mt-0.5 text-2xl font-bold text-[#1F1D1A]">
                    Deixe seu perfil com a sua cara
                  </h1>
                  <p className="mt-1 text-sm text-[#6B655D]">
                    Essas dicas ficam visíveis para ajudar quem vai comprar o seu presente.
                  </p>
                </div>
              </div>

              <div className="mt-7 space-y-6">
                {/* Nome de exibição */}
                <div>
                  <label className="block text-sm font-semibold text-[#1F1D1A]">
                    Como você quer aparecer para a família?
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={32}
                    placeholder={currentUser.baseName}
                    className="mt-1.5 w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] px-4 py-3 text-sm font-medium text-[#1F1D1A] outline-none transition focus:border-[#B83B35] focus:bg-white"
                  />
                </div>

                {/* Avatar & Cor */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-[#1F1D1A]">
                      Escolha um ícone ou envie uma foto
                    </label>
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
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#DFD7CA] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#1F1D1A] transition hover:bg-[#F0E9DD]">
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
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition ${
                          avatar === emoji
                            ? 'bg-[#1F1D1A] ring-2 ring-[#B83B35] ring-offset-2'
                            : 'bg-[#FAF7F2] hover:bg-[#EFE8DB]'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-semibold text-[#6B655D]">Cor do perfil:</span>
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

                {/* Dicas úteis opcionais */}
                <div className="rounded-2xl border border-[#ECE6DB] bg-[#FAF7F2] p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#1F1D1A]">
                    <HeartHandshake className="h-4 w-4 text-[#214E3E]" />
                    Dicas úteis para quem vai te presentear (opcional)
                  </div>
                  <p className="mt-0.5 text-xs text-[#6B655D]">
                    Ajuda muito quando alguém quer te fazer uma surpresa dentro da sua lista!
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#6B655D]">
                        Tamanho de camiseta / roupa
                      </label>
                      <input
                        type="text"
                        value={shirtSize}
                        onChange={(e) => setShirtSize(e.target.value)}
                        placeholder="Ex: M, G, 40..."
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
                        placeholder="Ex: 38, 42..."
                        className="mt-1 w-full rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35]"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-[#6B655D]">
                      Cores ou estilos que você gosta
                    </label>
                    <input
                      type="text"
                      value={favoriteColors}
                      onChange={(e) => setFavoriteColors(e.target.value)}
                      placeholder="Ex: Preto, verde escuro, minimalista..."
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
                      placeholder="Ex: Prefiro coisas úteis pro dia a dia, livros ou assinaturas digitais!"
                      className="mt-1 w-full resize-none rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {currentUser.role === 'admin' && onGoToAdmin ? (
                  <button
                    type="button"
                    onClick={onGoToAdmin}
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#6B655D] hover:text-[#B83B35]"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Ir para Painel Admin antes (gerar QR Codes)
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B83B35] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#992D28]"
                >
                  Continuar para o sorteio
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#214E3E]/10 px-3 py-1 text-xs font-bold text-[#214E3E]">
                <Lock className="h-3.5 w-3.5" />
                Informação 100% Secreta
              </div>

              <h1 className="font-display mt-3 text-2xl font-bold text-[#1F1D1A]">
                Quem você tirou no Amigo Secreto?
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-[#6B655D]">
                Como o sorteio já foi feito em família, marque abaixo quem saiu no seu papelzinho
                para ativarmos seu filtro secreto.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {otherParticipants.map((person) => {
                  const selected = drawnUserId === person.id;
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => {
                        setDrawnUserId(person.id);
                        setConfirmSecret(false);
                      }}
                      className={`flex flex-col items-center rounded-2xl border p-5 text-center transition ${
                        selected
                          ? 'border-[#B83B35] bg-[#B83B35]/6 ring-2 ring-[#B83B35]/30'
                          : 'border-[#E7E0D5] bg-[#FAF7F2] hover:border-[#C8963E] hover:bg-white'
                      }`}
                    >
                      <Avatar
                        avatar={person.avatar}
                        name={person.displayName}
                        accentColor={person.accentColor}
                        size="lg"
                      />
                      <span className="mt-3 text-base font-bold text-[#1F1D1A]">
                        {person.displayName}
                      </span>
                      {person.displayName !== person.baseName && (
                        <span className="text-xs text-[#6B655D]">({person.baseName})</span>
                      )}
                      <span
                        className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          selected
                            ? 'bg-[#B83B35] text-white'
                            : 'bg-white text-[#6B655D] ring-1 ring-[#E7E0D5]'
                        }`}
                      >
                        {selected ? (
                          <>
                            <Check className="h-3 w-3" /> Selecionado
                          </>
                        ) : (
                          'Selecionar'
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-[#214E3E]/20 bg-[#E6F0EC]/60 p-4">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#214E3E]" />
                  <div className="text-xs leading-relaxed text-[#1F3A30]">
                    <strong>Regra anti-spoiler garantida:</strong> Ninguém na família — nem mesmo o
                    Victor no painel Admin — consegue ver quem você tirou ou o que você coloca no
                    seu carrinho. E se clicar errado sem querer, dá para trocar depois em{' '}
                    <strong>Perfil</strong>.
                  </div>
                </div>
              </div>

              {selectedMatch && (
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E7E0D5] bg-[#FAF7F2] p-4 transition hover:bg-white">
                  <input
                    type="checkbox"
                    checked={confirmSecret}
                    onChange={(e) => setConfirmSecret(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-[#B83B35]"
                  />
                  <span className="text-sm font-medium text-[#1F1D1A]">
                    Confirmo que tirei{' '}
                    <strong className="text-[#B83B35]">{selectedMatch.displayName}</strong> no
                    sorteio da família.
                  </span>
                </label>
              )}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DFD7CA] bg-white px-5 py-3 text-sm font-semibold text-[#1F1D1A] hover:bg-[#FAF7F2]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={saving || !drawnUserId || !confirmSecret}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#214E3E] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#193C30] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Gift className="h-4 w-4" />
                  {saving ? 'Salvando...' : 'Confirmar e entrar no app'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
