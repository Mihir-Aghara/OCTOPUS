import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import BackgroundCanvas from './components/BackgroundCanvas';
import SendPanel from './components/SendPanel';
import RetrievePanel from './components/RetrievePanel';
import ClipResultModal from './components/ClipResultModal';
import ClipViewer from './components/ClipViewer';
import ClipHistoryDrawer from './components/ClipHistoryDrawer';
import DevToolsModal from './components/DevToolsModal';
import Toast from './components/Toast';
import { saveClip, getClip } from './services/storageEngine';
import { audioEngine } from './services/audioEngine';
import { 
  Send, KeyRound, Sparkles, Lock, Zap, Mail
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('send');
  const [createdClipResult, setCreatedClipResult] = useState(null);
  const [retrievedClip, setRetrievedClip] = useState(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [initialCode, setInitialCode] = useState('');
  
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 4000);
  };

  useEffect(() => {
    const handleUrlHash = async () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && hash.length === 6) {
        setInitialCode(hash);
        setActiveTab('retrieve');
        audioEngine.play('success');
      }
    };
    handleUrlHash();
    window.addEventListener('hashchange', handleUrlHash);
    return () => window.removeEventListener('hashchange', handleUrlHash);
  }, []);

  const handleCreateClip = async (clipData) => {
    try {
      const result = await saveClip(clipData);
      setCreatedClipResult(result);
      audioEngine.play('success');
      showToast('Clip created successfully!', 'success');
      return result;
    } catch (err) {
      audioEngine.play('error');
      showToast(err.message || 'Failed to create clip', 'error');
      throw err;
    }
  };

  const handleRetrieveClip = async (code, passcode) => {
    try {
      const result = await getClip(code, passcode);
      if (result && result.requiresPasscode) {
        return result;
      }
      setRetrievedClip(result);
      audioEngine.play('success');
      showToast('Clip retrieved successfully!', 'success');
      return result;
    } catch (err) {
      audioEngine.play('error');
      showToast(err.message || 'Failed to retrieve clip', 'error');
      throw err;
    }
  };

  const handleViewClipNow = (clipData) => {
    setCreatedClipResult(null);
    setRetrievedClip(clipData);
  };

  const handleSelectFromVault = async (codeOrClip) => {
    setVaultOpen(false);
    const code = typeof codeOrClip === 'string' ? codeOrClip : codeOrClip?.code;
    if (code) {
      try {
        await handleRetrieveClip(code);
      } catch (err) {}
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-800 selection:bg-indigo-500 selection:text-white relative font-sans">
      
      <BackgroundCanvas />
      
      <Navbar 
        onOpenVault={() => setVaultOpen(true)}
        onOpenDevTools={() => setDevToolsOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-8 z-10">
        
        {/* HERO HEADER */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold shadow-xs animate-bounce">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Fast • Secure • No Registration Required</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Share Code &amp; Text <br className="hidden xs:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 bg-clip-text text-transparent">
              Instantly Across Devices
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-medium leading-relaxed">
            Generate a short 6-digit access code or QR code to sync text, links &amp; code snippets instantly between phone &amp; desktop.
          </p>
        </div>

        {/* MAIN PANEL SELECTION */}
        {retrievedClip ? (
          <ClipViewer 
            clip={retrievedClip} 
            onBack={() => setRetrievedClip(null)} 
            showToast={showToast}
          />
        ) : (
          <div className="w-full">
            {/* TOGGLE TABS */}
            <div className="flex justify-center mb-6">
              <div className="bg-slate-200/80 p-1 rounded-2xl flex gap-1 shadow-inner max-w-md w-full border border-slate-300/50 backdrop-blur-md">
                <button
                  onClick={() => {
                    audioEngine.play('tab');
                    setActiveTab('send');
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'send'
                      ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Send Clipboard</span>
                </button>
                <button
                  onClick={() => {
                    audioEngine.play('tab');
                    setActiveTab('retrieve');
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'retrieve'
                      ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Retrieve Code</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'send' ? (
              <SendPanel 
                onClipCreated={handleCreateClip}
                onSubmit={handleCreateClip} 
                showToast={showToast}
              />
            ) : (
              <RetrievePanel 
                onRetrieve={handleRetrieveClip}
                onSubmit={handleRetrieveClip} 
                initialCode={initialCode}
                showToast={showToast}
              />
            )}
          </div>
        )}

        {/* FEATURE HIGHLIGHTS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 glass-panel-hover space-y-2.5 bg-white/80">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-base font-black text-slate-900">Real-Time Sync</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Access snippets instantly with a unique 6-digit code or direct URL. No login or accounts.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 glass-panel-hover space-y-2.5 bg-white/80">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-base font-black text-slate-900">AES Encryption</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              End-to-end encrypted storage. Optional passcode protection for extra peace of mind.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 glass-panel-hover space-y-2.5 bg-white/80">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-base font-black text-slate-900">Dev Friendly</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Automatic syntax highlighting for code blocks. Built-in tools for JSON formatting and more.
            </p>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-md py-8 z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 font-medium">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐙</span>
              <span className="font-extrabold text-slate-900">OCTOPUS Clipboard</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>&copy; {new Date().getFullYear()} OCTOPUS Inc. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-slate-600">
            <button
              onClick={() => setDevToolsOpen(true)}
              className="hover:text-indigo-600 transition-colors font-bold"
            >
              Dev Tools
            </button>
            <button
              onClick={() => setVaultOpen(true)}
              className="hover:text-indigo-600 transition-colors font-bold"
            >
              My Vault
            </button>
            <span className="hidden sm:inline text-slate-300">|</span>
            <a
              href="mailto:support@octopus.com?subject=Inquiry"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 font-bold transition-all shadow-xs hover:shadow-sm"
              title="Contact Support & Partnerships"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-600" />
              <span>Contact: support@octopus.com</span>
            </a>
          </div>
        </div>
      </footer>

      {/* MODALS & DRAWERS */}
      {createdClipResult && (
        <ClipResultModal
          clipData={createdClipResult}
          onClose={() => setCreatedClipResult(null)}
          onViewClip={handleViewClipNow}
          showToast={showToast}
        />
      )}

      <ClipHistoryDrawer
        isOpen={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onSelectClip={handleSelectFromVault}
        showToast={showToast}
      />

      <DevToolsModal
        isOpen={devToolsOpen}
        onClose={() => setDevToolsOpen(false)}
        showToast={showToast}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />

    </div>
  );
}
