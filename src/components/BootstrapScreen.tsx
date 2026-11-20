import React, { useState } from 'react';
import { Gift, Lock, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { PARTICIPANTS } from '../constants/participants';
import { bootstrapEventAndUsers, type StoredSession } from '../firebase/service';
import { useToast } from '../hooks/useToast';

interface BootstrapScreenProps {
  onSuccess: (session: StoredSession) => void;
}

export const BootstrapScreen: React.FC<BootstrapScreenProps> = ({ onSuccess }) => {
  const { showToast } = useToast();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.trim().length < 4) {
      setError('Escolha um PIN de pelo menos 4 caracteres para acesso do Admin.');
      return;
    }
    if (pin.trim() !== confirmPin.trim()) {
      setError('Os dois PINs digitados não conferem.');
      return;
    }

    setLoading(true);
    try {
      const session = await bootstrapEventAndUsers(pin);
      showToast('Amigo Secreto criado! Bem-vindo, Victor.', 'success');
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao inicializar o sistema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2] px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-[#E7E0D5] bg-white p-6 shadow-xl sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#B83B35]/10 px-3.5 py-1.5 text-xs font-semibold text-[#B83B35]">
          <Sparkles className="h-3.5 w-3.5" />
          Primeiro Acesso — Setup Inicial
        </div>

        <h1 className="font-display mt-4 text-2xl font-bold text-[#1F1D1A] sm:text-3xl">
          Amigo Secreto da Família
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6B655D]">
          O banco de dados ainda está vazio. Clique abaixo para criar automaticamente os 4 perfis da
          família, gerar os QR Codes individuais e definir o prazo para{' '}
          <strong className="text-[#1F1D1A]">25/11/2026</strong>.
        </p>

        <div className="mt-5 rounded-2xl border border-[#ECE6DB] bg-[#FAF7F2] p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6B655D]">
            <Users className="h-4 w-4 text-[#214E3E]" />
            Participantes que serão criados
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PARTICIPANTS.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2.5 rounded-xl border border-[#E7E0D5] bg-white px-3 py-2"
              >
                <span className="text-lg">{p.defaultAvatar}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#1F1D1A]">{p.baseName}</div>
                  <div className="text-[11px] text-[#6B655D]">
                    {p.role === 'admin' ? 'Admin' : 'Participante'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1F1D1A]">
              Crie um PIN secreto do Admin (Victor)
            </label>
            <p className="mt-0.5 text-xs text-[#6B655D]">
              Serve para você entrar no painel Admin em outro celular ou computador se precisar.
            </p>
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6B655D]" />
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] py-3 pr-4 pl-10 text-sm text-[#1F1D1A] outline-none transition focus:border-[#B83B35] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1F1D1A]">Confirmar PIN</label>
            <div className="relative mt-1.5">
              <ShieldCheck className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6B655D]" />
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Repita o PIN"
                className="w-full rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] py-3 pr-4 pl-10 text-sm text-[#1F1D1A] outline-none transition focus:border-[#B83B35] focus:bg-white"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-[#B83B35]/25 bg-[#FFF5F5] px-4 py-3 text-sm font-medium text-[#992D28]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B83B35] px-5 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#992D28] disabled:opacity-60"
          >
            <Gift className="h-4 w-4" />
            {loading ? 'Configurando tudo...' : 'Inicializar Amigo Secreto e Gerar QR Codes'}
          </button>
        </form>
      </div>
    </div>
  );
};
