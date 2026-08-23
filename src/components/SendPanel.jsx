import React, { useState } from 'react';
import { 
  FileText, Code, Image as ImageIcon, Paperclip, Lock, Flame, Clock, 
  ClipboardPaste, UploadCloud, Send, ShieldAlert
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { detectLanguage } from '../services/cryptoUtils';

export default function SendPanel({ onClipCreated, showToast }) {
  const [activeTab, setActiveTab] = useState('text'); // 'text', 'image', 'file'
  const [textContent, setTextContent] = useState('');
  const [title, setTitle] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [burnOnRead, setBurnOnRead] = useState(false);
  const [expiration, setExpiration] = useState('24h');
  
  const [attachedFile, setAttachedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const detectedLang = detectLanguage(textContent);

  const handleSystemPaste = async () => {
    audioEngine.play('click');
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTextContent(text);
        showToast('Pasted content from clipboard!', 'success');
      }
    } catch (err) {
      showToast('Please grant clipboard access to paste directly.', 'info');
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Max 50MB file validation
    if (file.size > 50 * 1024 * 1024) {
      audioEngine.play('error');
      showToast('File size exceeds 50MB limit. Please attach a smaller file.', 'error');
      return;
    }

    setAttachedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);

    if (file.type.startsWith('image/')) {
      setActiveTab('image');
    } else {
      setActiveTab('file');
    }
    showToast(`Attached file: ${file.name}`, 'success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeTab === 'text' && !textContent.trim()) {
      audioEngine.play('error');
      showToast('Please enter text or code to share!', 'error');
      return;
    }
    if ((activeTab === 'image' || activeTab === 'file') && !attachedFile) {
      audioEngine.play('error');
      showToast('Please upload a file or image first!', 'error');
      return;
    }

    setLoading(true);
    audioEngine.play('send');

    try {
      let finalContent = textContent;
      let metadata = {};

      if (activeTab === 'image' || activeTab === 'file') {
        finalContent = filePreview;
        metadata = {
          fileName: attachedFile.name,
          fileSize: attachedFile.size,
          mimeType: attachedFile.type
        };
      } else {
        metadata = {
          language: detectedLang,
          charCount: textContent.length,
          wordCount: textContent.trim().split(/\s+/).filter(Boolean).length
        };
      }

      await onClipCreated({
        type: activeTab === 'text' ? (detectedLang !== 'plaintext' ? 'code' : 'text') : activeTab,
        content: finalContent,
        title: title.trim(),
        passcode: passcode.trim(),
        burnOnRead,
        expiration,
        metadata
      });

      setTextContent('');
      setTitle('');
      setPasscode('');
      setAttachedFile(null);
      setFilePreview(null);
    } catch (err) {
      showToast('Failed to create clip. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-stripe border border-slate-200/80 relative overflow-hidden bg-white/90">
      
      {/* Soft Ambient Mesh Glow */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5 mb-6">
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => { audioEngine.play('click'); setActiveTab('text'); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'bg-white text-indigo-600 shadow-md shadow-indigo-100 border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Text / Code</span>
          </button>

          <button
            type="button"
            onClick={() => { audioEngine.play('click'); setActiveTab('image'); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'image'
                ? 'bg-white text-emerald-600 shadow-md shadow-emerald-100 border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <span>Image</span>
          </button>

          <button
            type="button"
            onClick={() => { audioEngine.play('click'); setActiveTab('file'); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'file'
                ? 'bg-white text-purple-600 shadow-md shadow-purple-100 border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Paperclip className="w-4 h-4 text-purple-600" />
            <span>File Attachment</span>
          </button>
        </div>

        {/* Quick Paste Button */}
        {activeTab === 'text' && (
          <button
            type="button"
            onClick={handleSystemPaste}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste Clipboard</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Title Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Clip Title <span className="text-slate-400 font-medium">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Stripe Webhook Handler Snippet or Database Credentials"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl glass-input text-xs text-slate-900 placeholder-slate-400"
          />
        </div>

        {/* TAB 1: Text Editor */}
        {activeTab === 'text' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Text or Code Content
              </label>
              {detectedLang !== 'plaintext' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase">
                  <Code className="w-3 h-3" /> Auto Detected: {detectedLang}
                </span>
              )}
            </div>
            <textarea
              rows={8}
              placeholder="Paste your code snippet, plain text, JSON configuration, or notes here..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl glass-input font-mono text-xs sm:text-sm text-slate-900 placeholder-slate-400 leading-relaxed resize-y"
              spellCheck={false}
            />
          </div>
        )}

        {/* TAB 2 & 3: File / Image Upload Zone */}
        {(activeTab === 'image' || activeTab === 'file') && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl p-10 text-center bg-indigo-50/30 transition-colors cursor-pointer relative"
          >
            <input
              type="file"
              accept={activeTab === 'image' ? 'image/*' : '*'}
              onChange={handleFileDrop}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {attachedFile ? (
              <div className="space-y-3">
                {activeTab === 'image' && filePreview ? (
                  <img
                    src={filePreview}
                    alt="Uploaded preview"
                    className="max-h-48 mx-auto rounded-xl border border-slate-200 shadow-md object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
                    <Paperclip className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-slate-900">{attachedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(attachedFile.size / 1024).toFixed(1)} KB • {attachedFile.type || 'Binary File'}
                  </p>
                </div>
                <p className="text-xs font-semibold text-indigo-600 hover:underline">Click or drag to replace file</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Drag and drop your {activeTab === 'image' ? 'image' : 'file'} here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports PNG, JPG, WEBP, PDF, Zip, TXT up to 50MB
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Security Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* AES Encryption Passcode */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Lock className="w-3.5 h-3.5 text-indigo-600" /> AES Passcode
              </span>
              <input
                type="checkbox"
                checked={showPasscode}
                onChange={(e) => setShowPasscode(e.target.checked)}
                className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
              />
            </div>
            {showPasscode && (
              <input
                type="password"
                placeholder="Enter secret key..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs text-slate-900"
              />
            )}
          </div>

          {/* Self Destruct / Burn after 1 view */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Flame className="w-3.5 h-3.5 text-rose-500" /> Burn After Read
              </span>
              <p className="text-[10px] text-slate-500">Self-destruct after 1 view</p>
            </div>
            <input
              type="checkbox"
              checked={burnOnRead}
              onChange={(e) => setBurnOnRead(e.target.checked)}
              className="w-4 h-4 rounded bg-white border-slate-300 text-rose-500 focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Expiration Selector */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Clock className="w-3.5 h-3.5 text-emerald-600" /> Expiration
            </span>
            <select
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-slate-900 bg-white cursor-pointer font-medium"
            >
              <option value="10m">10 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="24h">24 Hours (Default)</option>
              <option value="7d">7 Days</option>
              <option value="never">Permanent (Never)</option>
            </select>
          </div>

        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-95 shadow-lg shadow-indigo-200 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Generate 6-Digit PIN Code</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
