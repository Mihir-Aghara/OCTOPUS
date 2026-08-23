import React, { useState, useEffect } from 'react';
import { 
  X, History, Copy, Trash2
} from 'lucide-react';
import { getVaultHistory, clearVaultHistory } from '../services/storageEngine';
import { audioEngine } from '../services/audioEngine';

export default function ClipHistoryDrawer({ isOpen, onClose, onSelectClip, showToast }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(getVaultHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearAll = () => {
    audioEngine.play('delete');
    clearVaultHistory();
    setHistory([]);
    showToast('Vault history cleared.', 'info');
  };

  const handleCopySnippet = (text, e) => {
    e.stopPropagation();
    audioEngine.play('copy');
    navigator.clipboard.writeText(text);
    showToast('Snippet copied from Vault!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md glass-panel border-l border-slate-200/80 p-6 flex flex-col justify-between shadow-2xl bg-white">
          
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">My Vault History</h3>
                  <p className="text-[10px] text-slate-500">Recently created and retrieved clips</p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="mt-4 space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <div className="text-3xl opacity-40">🐙</div>
                  <p className="text-xs font-bold text-slate-600">Your Vault is empty</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Any clip you create or retrieve on this device will be automatically saved here for quick access.
                  </p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.code}
                    onClick={() => {
                      audioEngine.play('click');
                      onSelectClip(item.code);
                      onClose();
                    }}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer group space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                        #{item.code}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={(e) => handleCopySnippet(item.preview, e)}
                          className="p-1 rounded-md hover:bg-white text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"
                          title="Quick Copy Snippet"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-slate-900 line-clamp-1">
                      {item.title}
                    </p>

                    <p className="text-[11px] font-mono text-slate-600 line-clamp-2 bg-white p-2.5 rounded-xl border border-slate-200">
                      {item.preview}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Clear All */}
          {history.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={handleClearAll}
                className="w-full py-3 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Vault History
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
