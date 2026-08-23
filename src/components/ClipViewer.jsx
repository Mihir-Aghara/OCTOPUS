import React, { useState, useEffect } from 'react';
import { highlightCode } from '../services/syntaxHighlighter';
import { 
  Check, Copy, Download, Flame, ArrowLeft, Clock, Shield 
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

export default function ClipViewer({ clip, onBack, showToast }) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('formatted');
  const [nowTime, setNowTime] = useState(Date.now());

  // Update timer every 10 seconds to keep remaining time badge live
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  if (!clip) return null;

  const isTextOrCode = clip.type === 'text' || clip.type === 'code';
  const isImage = clip.type === 'image';
  const isFile = clip.type === 'file';

  const charCount = typeof clip.content === 'string' ? clip.content.length : 0;
  const wordCount = typeof clip.content === 'string' ? clip.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const lineCount = typeof clip.content === 'string' ? clip.content.split('\n').length : 0;

  // Calculate remaining expiration time text dynamically
  const getExpirationText = () => {
    if (!clip.expireAt) return 'Never Expires';
    const remainingMs = clip.expireAt - nowTime;
    if (remainingMs <= 0) return 'Expired';
    
    const totalMinutes = Math.floor(remainingMs / (1000 * 60));
    if (totalMinutes < 60) return `Expires in ${totalMinutes} mins`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours < 24) return `Expires in ${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `Expires in ${days} days`;
  };

  const handleCopy = () => {
    if (!clip.content) return;
    audioEngine.play('copy');
    
    // Clipboard copy with fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(clip.content).catch(() => fallbackCopy(clip.content));
    } else {
      fallbackCopy(clip.content);
    }

    setCopied(true);
    showToast('Content copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(textarea);
  };

  const handleDownloadFile = () => {
    audioEngine.play('click');
    const a = document.createElement('a');
    a.href = clip.content;
    a.download = clip.metadata?.fileName || `octopus_file_${clip.code}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Download started!', 'success');
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-stripe border border-slate-200/80 space-y-6 max-w-4xl mx-auto bg-white/95">
      
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          onClick={() => {
            audioEngine.play('click');
            onBack();
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Retrieve
        </button>

        <div className="flex items-center gap-2">
          {clip.burnOnRead && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
              <Flame className="w-3.5 h-3.5" /> Self Destructed
            </span>
          )}

          {/* Expiration badge */}
          <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Clock className="w-3.5 h-3.5" /> {getExpirationText()}
          </span>

          {isTextOrCode && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('formatted')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'formatted'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pretty View
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'raw'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Raw View
              </button>
            </div>
          )}

          {/* Copy Button */}
          {isTextOrCode && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 shadow-md shadow-indigo-100 transition-all active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          )}

          {/* File/Image Download Button */}
          {(isImage || isFile) && (
            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 shadow-md shadow-indigo-100 transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          )}
        </div>
      </div>

      {/* Clip Meta Details */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            {clip.title || `Clip #${clip.code}`}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            PIN Code: <span className="font-mono font-bold text-indigo-600">{clip.code}</span> • Created {new Date(clip.createdAt).toLocaleTimeString()}
          </p>
        </div>
        
        {isTextOrCode && (
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <span>{charCount} chars</span>
            <span>•</span>
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{lineCount} lines</span>
          </div>
        )}
      </div>

      {/* CONTENT BODY */}
      <div className="relative">
        
        {/* VIEW 1: Plain Text or Code */}
        {isTextOrCode && (
          <div>
            {viewMode === 'formatted' ? (
              <pre
                className="p-5 sm:p-6 overflow-x-auto rounded-2xl border border-slate-900 bg-slate-950 text-xs sm:text-sm font-mono leading-relaxed text-slate-100 shadow-xl"
                dangerouslySetInnerHTML={{
                  __html: highlightCode(clip.content, clip.metadata?.language || 'javascript')
                }}
              />
            ) : (
              <textarea
                readOnly
                value={clip.content}
                rows={12}
                className="w-full p-5 rounded-2xl glass-input font-mono text-xs sm:text-sm text-slate-900 resize-none leading-relaxed"
              />
            )}
          </div>
        )}

        {/* VIEW 2: Image Preview */}
        {isImage && (
          <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <img
              src={clip.content}
              alt="Retrieved content"
              className="max-h-[500px] mx-auto rounded-xl shadow-md border border-slate-200 object-contain"
            />
          </div>
        )}

        {/* VIEW 3: Binary File Attachment */}
        {isFile && (
          <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
              <Download className="w-8 h-8" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">{clip.metadata?.fileName || 'Attached File'}</p>
              <p className="text-xs text-slate-500 mt-1">
                Size: {clip.metadata?.fileSize ? (clip.metadata.fileSize / 1024).toFixed(1) + ' KB' : 'Unknown'} • Type: {clip.metadata?.mimeType || 'Binary'}
              </p>
            </div>
            <button
              onClick={handleDownloadFile}
              className="px-6 py-3 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 shadow-md shadow-indigo-100 inline-flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download File Now
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
