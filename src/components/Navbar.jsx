import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, History, Code2 } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { getVaultHistory } from '../services/storageEngine';

export default function Navbar({ onOpenVault, onOpenDevTools }) {
  const [soundOn, setSoundOn] = useState(true);
  const [vaultCount, setVaultCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const history = getVaultHistory();
      setVaultCount(history.length);
    };
    updateCount();
    const interval = setInterval(updateCount, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const newState = audioEngine.toggleSound();
    setSoundOn(newState);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 p-[1.5px] shadow-md transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-white rounded-[10.5px] flex items-center justify-center text-xl shadow-inner">
              🐙
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                OCTOPUS
              </span>
            </div>
            <p className="text-[10px] text-slate-500 tracking-wide font-medium hidden xs:block">
              Instant Cloud Clipboard &amp; Sharing Engine
            </p>
          </div>
        </a>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Dev Tools Launcher */}
          <button
            onClick={() => {
              audioEngine.play('click');
              onOpenDevTools();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all hover:text-indigo-600"
            title="Developer Quick Tools"
          >
            <Code2 className="w-4 h-4 text-indigo-600" />
            <span className="hidden md:inline">Dev Tools</span>
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl border transition-all ${
              soundOn
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'
                : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-700'
            }`}
            title={soundOn ? 'Mute Audio FX' : 'Enable Audio FX'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Vault Drawer Button */}
          <button
            onClick={() => {
              audioEngine.play('click');
              onOpenVault();
            }}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-95 shadow-md shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">My Vault</span>
            {vaultCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-indigo-600 shadow-sm">
                {vaultCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
}
