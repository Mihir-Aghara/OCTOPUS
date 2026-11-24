import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-600 shrink-0" />
  };

  const borders = {
    success: 'border-emerald-200 bg-white/95 text-slate-800 shadow-emerald-500/10',
    error: 'border-rose-200 bg-white/95 text-slate-800 shadow-rose-500/10',
    info: 'border-indigo-200 bg-white/95 text-slate-800 shadow-indigo-500/10'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-md">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-xl ${borders[type] || borders.info}`}
      >
        {icons[type] || icons.info}
        <span className="text-xs sm:text-sm font-semibold pr-2">{message}</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors ml-auto cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
