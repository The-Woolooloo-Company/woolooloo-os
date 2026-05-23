"use client";

import { useState, createContext, useContext, useEffect, useRef } from 'react';

interface ToastMsg {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastCtxValue {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const ToastCtx = createContext<ToastCtxValue>({ showToast: () => {} });

const STYLES = {
  success: { icon: 'check_circle', bg: 'bg-green-600', fg: 'text-white', border: 'border-green-500' },
  error:   { icon: 'error', bg: 'bg-red-600', fg: 'text-white', border: 'border-red-500' },
  info:    { icon: 'info', bg: 'bg-blue-600', fg: 'text-white', border: 'border-blue-500' },
  warning: { icon: 'warning_amber', bg: 'bg-amber-500', fg: 'text-white', border: 'border-amber-400' },
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const refs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => () => { refs.current.forEach(clearTimeout); refs.current.clear(); }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    setToasts(p => [...p, { id, message, type }]);
    const t = setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 4500);
    refs.current.set(id, t);
  };

  const dismiss = (id: string) => {
    if (refs.current.has(id)) { clearTimeout(refs.current.get(id)!); refs.current.delete(id); }
    setToasts(p => p.filter(x => x.id !== id));
  };

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 right-4 z-[999] flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map(t => {
          const s = STYLES[t.type];
          return (
            <div key={t.id} className={`pointer-events-auto flex items-center gap-3 ${s.bg} ${s.border} border rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm`}>
              <span className="material-symbols-rounded text-20 shrink-0">{s.icon}</span>
              <span className="text-sm font-medium flex-1">{t.message}</span>
              <button type="button" onClick={() => dismiss(t.id)} className="shrink-0 p-0.5 rounded-full hover:bg-white/20 transition-colors" aria-label="Dismiss">
                <span className="material-symbols-rounded text-14">close</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
