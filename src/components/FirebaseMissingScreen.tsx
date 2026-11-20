import React from 'react';
import { Flame, KeyRound, Settings2 } from 'lucide-react';

export const FirebaseMissingScreen: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2] p-4">
      <div className="w-full max-w-xl rounded-3xl border border-[#E7E0D5] bg-white p-6 shadow-xl sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B83B35]/10 text-[#B83B35]">
          <Flame className="h-7 w-7" />
        </div>
        <h1 className="font-display mt-5 text-2xl font-bold text-[#1F1D1A]">
          Conecte seu Firebase Spark para começar
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6B655D]">
          As variáveis de ambiente do Firebase ainda não foram preenchidas neste projeto. Como o app
          roda 100% gratuito no plano Spark, basta criar um projeto no Firebase e colar as chaves.
        </p>

        <div className="mt-6 space-y-3 rounded-2xl border border-[#ECE6DB] bg-[#FAF7F2] p-4 text-sm text-[#1F1D1A]">
          <div className="flex items-start gap-3">
            <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-[#214E3E]" />
            <div>
              <strong>1. Crie o projeto no Firebase Console</strong> e habilite o{' '}
              <strong>Cloud Firestore</strong> (modo Spark gratuito).
            </div>
          </div>
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#C8963E]" />
            <div>
              <strong>2. Copie o arquivo</strong>{' '}
              <code className="rounded bg-[#EAE3D7] px-1.5 py-0.5 text-xs">.env.example</code> para{' '}
              <code className="rounded bg-[#EAE3D7] px-1.5 py-0.5 text-xs">.env</code> e preencha
              os valores de <code className="rounded bg-[#EAE3D7] px-1.5 py-0.5 text-xs">VITE_FIREBASE_*</code>.
            </div>
          </div>
        </div>

        <p className="mt-5 text-xs text-[#6B655D]">
          Depois de salvar o <code className="font-semibold">.env</code>, reinicie o servidor de
          desenvolvimento ou gere o build com <code className="font-semibold">npm run build</code>.
        </p>
      </div>
    </div>
  );
};
