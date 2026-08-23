import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-octopus-emerald shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-octopus-pink shrink-0" />,
    info: <Info className="w-5 h-5 text-octopus-cyan shrink-0" />
  };

  const borders = {
    success: 'border-octopus-emerald/40 bg-octopus-emerald/10 text-emerald-200',
    error: 'border-octopus-pink/40 bg-octopus-pink/10 text-pink-200',
    info: 'border-octopus-cyan/40 bg-octopus-cyan/10 text-cyan-200'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-md">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-cyber ${borders[type]}`}
      >
        {icons[type]}
        <span className="text-sm font-medium pr-2">{message}</span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors ml-auto"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
