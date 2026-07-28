"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(0);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = ++nextIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icon = (type: Toast["type"]) => {
    switch (type) {
      case "success": return <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />;
      case "error": return <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />;
      case "info": return <Info className="w-4 h-4 text-accent-teal flex-shrink-0" />;
    }
  };

  const borderColor = (type: Toast["type"]) => {
    switch (type) {
      case "success": return "border-success/30";
      case "error": return "border-error/30";
      case "info": return "border-accent-teal/30";
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 bg-surface-dark-elevated border ${borderColor(t.type)} rounded-lg shadow-lg animate-in slide-in-from-bottom-2`}
          >
            {icon(t.type)}
            <span className="text-sm text-on-dark flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-muted-soft hover:text-on-dark">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
