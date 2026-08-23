import React, { useState } from 'react';
import { 
  X, Code2, Braces, Binary, Key, Copy, Check, RefreshCw 
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

export default function DevToolsModal({ isOpen, onClose, showToast }) {
  const [activeTool, setActiveTool] = useState('json');
  const [inputVal, setInputVal] = useState('');
  const [outputVal, setOutputVal] = useState('');
  const [copied, setCopied] = useState(false);

  const [passLength, setPassLength] = useState(16);
  const [includeSymbols, setIncludeSymbols] = useState(true);

  if (!isOpen) return null;

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(inputVal);
      setOutputVal(JSON.stringify(parsed, null, 2));
      audioEngine.play('click');
      showToast('JSON formatted successfully!', 'success');
    } catch (e) {
      audioEngine.play('error');
      showToast('Invalid JSON syntax', 'error');
    }
  };

  const handleBase64Encode = () => {
    try {
      setOutputVal(btoa(inputVal));
      audioEngine.play('click');
    } catch (e) {
      showToast('Encoding error', 'error');
    }
  };
  const handleBase64Decode = () => {
    try {
      setOutputVal(atob(inputVal));
      audioEngine.play('click');
    } catch (e) {
      showToast('Invalid Base64 string', 'error');
    }
  };

  const handleGeneratePassword = () => {
    audioEngine.play('click');
    let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    if (includeSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    let res = '';
    for (let i = 0; i < passLength; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setOutputVal(res);
  };

  const handleCopyOutput = () => {
    if (!outputVal) return;
    audioEngine.play('copy');
    navigator.clipboard.writeText(outputVal);
    setCopied(true);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl relative bg-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">OCTOPUS Developer Tools</h3>
            <p className="text-xs text-slate-500">Quick built-in utilities for developers and power users</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-5 overflow-x-auto">
          <button
            onClick={() => { setActiveTool('json'); setInputVal(''); setOutputVal(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'json' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Braces className="w-3.5 h-3.5" /> JSON Formatter
          </button>
          <button
            onClick={() => { setActiveTool('base64'); setInputVal(''); setOutputVal(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'base64' ? 'bg-purple-600 text-white shadow-md shadow-purple-100' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Binary className="w-3.5 h-3.5" /> Base64 Encoder
          </button>
          <button
            onClick={() => { setActiveTool('password'); setInputVal(''); handleGeneratePassword(); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTool === 'password' ? 'bg-rose-500 text-white shadow-md shadow-rose-100' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Key className="w-3.5 h-3.5" /> Password Generator
          </button>
        </div>

        {/* TOOL 1: JSON Formatter */}
        {activeTool === 'json' && (
          <div className="space-y-4">
            <textarea
              rows={4}
              placeholder="Paste unformatted JSON here..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full p-3.5 rounded-2xl glass-input font-mono text-xs text-slate-900"
            />
            <button
              onClick={handleFormatJson}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 cursor-pointer"
            >
              Format JSON
            </button>
          </div>
        )}

        {/* TOOL 2: Base64 */}
        {activeTool === 'base64' && (
          <div className="space-y-4">
            <textarea
              rows={4}
              placeholder="Enter text or Base64 string..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full p-3.5 rounded-2xl glass-input font-mono text-xs text-slate-900"
            />
            <div className="flex gap-2">
              <button
                onClick={handleBase64Encode}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-md cursor-pointer"
              >
                Encode Base64
              </button>
              <button
                onClick={handleBase64Decode}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Decode Base64
              </button>
            </div>
          </div>
        )}

        {/* TOOL 3: Password Generator */}
        {activeTool === 'password' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-xs text-slate-700 font-medium">
              <label className="flex items-center gap-2">
                Length: <input type="number" min={8} max={64} value={passLength} onChange={(e) => setPassLength(Number(e.target.value))} className="w-16 p-1.5 rounded-xl glass-input text-center text-slate-900" />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeSymbols} onChange={(e) => setIncludeSymbols(e.target.checked)} className="rounded text-indigo-600" /> Include Special Symbols (!@#$)
              </label>
            </div>
            <button
              onClick={handleGeneratePassword}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-100"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Generate Secure Key
            </button>
          </div>
        )}

        {/* Output Box */}
        {outputVal && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Result Output:</span>
              <button
                onClick={handleCopyOutput}
                className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Result'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={4}
              value={outputVal}
              className="w-full p-3.5 rounded-2xl glass-input font-mono text-xs text-slate-900"
            />
          </div>
        )}

      </div>
    </div>
  );
}
