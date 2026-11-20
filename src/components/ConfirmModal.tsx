import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F1D1A]/45 p-4 backdrop-blur-xs sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[#E7E0D5] bg-[#FAF7F2] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              tone === 'danger' ? 'bg-[#B83B35]/12 text-[#B83B35]' : 'bg-[#214E3E]/12 text-[#214E3E]'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Fechar"
            className="rounded-xl p-1.5 text-[#6B655D] transition hover:bg-black/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h3 className="mt-4 text-lg font-bold text-[#1F1D1A]">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[#6B655D]">{description}</p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-2xl border border-[#DFD7CA] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F1D1A] transition hover:bg-[#F4EFE6] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
              tone === 'danger'
                ? 'bg-[#B83B35] hover:bg-[#992D28]'
                : 'bg-[#214E3E] hover:bg-[#193C30]'
            }`}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
