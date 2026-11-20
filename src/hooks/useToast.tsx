import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-md transition-all ${
              toast.type === 'success'
                ? 'border-[#214E3E]/20 bg-[#FAF7F2]/95 text-[#214E3E]'
                : toast.type === 'error'
                  ? 'border-[#B83B35]/25 bg-[#FFF5F5]/95 text-[#992D28]'
                  : 'border-[#C8963E]/25 bg-[#FFFBF2]/95 text-[#7A581B]'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#214E3E]" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0 text-[#B83B35]" />}
            {toast.type === 'info' && <Info className="h-5 w-5 shrink-0 text-[#C8963E]" />}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Fechar aviso"
              className="rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de ToastProvider');
  }
  return ctx;
}
