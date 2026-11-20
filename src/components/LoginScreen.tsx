import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Gift,
  KeyRound,
  QrCode,
  Shield,
  Sparkles,
} from 'lucide-react';
import { loginAdminWithPin, loginWithToken, type StoredSession } from '../firebase/service';
import { useToast } from '../hooks/useToast';
import { extractTokenFromInput } from '../utils/format';

interface LoginScreenProps {
  initialError?: string;
  onSuccess: (session: StoredSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ initialError = '', onSuccess }) => {
  const { showToast } = useToast();
  const [tokenInput, setTokenInput] = useState('');
  const [showManualToken, setShowManualToken] = useState(Boolean(initialError));
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const extracted = extractTokenFromInput(tokenInput);
    if (!extracted) {
      setError('Cole o código ou o link completo enviado pelo Victor.');
      return;
    }

    setLoading(true);
    try {
      const session = await loginWithToken(extracted);
      showToast('Acesso liberado! Bem-vindo ao Amigo Secreto.', 'success');
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível validar o código.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await loginAdminWithPin(adminPin);
      showToast('Bem-vindo de volta, Victor!', 'success');
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no acesso Admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F2] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#E7E0D5] bg-white p-6 shadow-xl sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#B83B35] to-[#992D28] text-white shadow-md">
            <Gift className="h-8 w-8" />
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#C8963E]/15 px-3 py-1 text-xs font-semibold text-[#8C6520]">
            <Sparkles className="h-3.5 w-3.5" />
            Edição 2026 • Família
          </div>

          <h1 className="font-display mt-3 text-2xl font-bold text-[#1F1D1A] sm:text-3xl">
            Amigo Secreto da Família
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6B655D]">
            Para entrar sem precisar de senha, aponte a câmera do seu celular para o{' '}
            <strong className="text-[#1F1D1A]">QR Code individual</strong> enviado pelo Victor.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-[#DFD7CA] bg-[#FAF7F2] p-5 text-center">
          <QrCode className="mx-auto h-10 w-10 text-[#214E3E]" />
          <p className="mt-2.5 text-sm font-semibold text-[#1F1D1A]">
            Escaneie seu QR Code ou abra seu link mágico
          </p>
          <p className="mt-1 text-xs text-[#6B655D]">
            Cada participante tem um acesso único e secreto.
          </p>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#B83B35]/25 bg-[#FFF5F5] px-4 py-3 text-sm text-[#992D28]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5">
          {!showManualToken ? (
            <button
              type="button"
              onClick={() => {
                setShowManualToken(true);
                setShowAdminModal(false);
                setError('');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#DFD7CA] bg-white px-4 py-3 text-sm font-semibold text-[#1F1D1A] transition hover:bg-[#FAF7F2]"
            >
              <KeyRound className="h-4 w-4 text-[#6B655D]" />
              Prefiro colar meu código ou link
            </button>
          ) : (
            <form onSubmit={handleTokenSubmit} className="space-y-3 rounded-2xl border border-[#ECE6DB] bg-[#FAF7F2] p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655D]">
                Link mágico ou código de acesso
              </label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Cole o link do WhatsApp ou o código..."
                className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35]"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#214E3E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193C30] disabled:opacity-60"
              >
                {loading ? 'Validando...' : 'Entrar com meu código'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 border-t border-[#ECE6DB] pt-4 text-center">
          {!showAdminModal ? (
            <button
              type="button"
              onClick={() => {
                setShowAdminModal(true);
                setShowManualToken(false);
                setError('');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B655D] transition hover:text-[#B83B35]"
            >
              <Shield className="h-3.5 w-3.5" />
              Sou o Victor (acesso Admin com PIN)
            </button>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-3 rounded-2xl border border-[#ECE6DB] bg-[#FAF7F2] p-4 text-left">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#B83B35]">
                  <Shield className="h-3.5 w-3.5" />
                  Acesso Admin (Victor)
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="text-xs font-medium text-[#6B655D] hover:underline"
                >
                  Fechar
                </button>
              </div>
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Digite o PIN do Admin"
                className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3.5 py-2.5 text-sm text-[#1F1D1A] outline-none focus:border-[#B83B35]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#B83B35] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#992D28] disabled:opacity-60"
              >
                {loading ? 'Entrando...' : 'Entrar como Victor'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
