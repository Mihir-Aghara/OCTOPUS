import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  Check, Copy, Share2, X, Shield, Flame, Clock, Eye, ArrowRight 
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

export default function ClipResultModal({ clipData, onClose, onViewClip, showToast }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl = `${window.location.origin}${window.location.pathname}#${clipData.code}`;

  useEffect(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  }, []);

  const handleCopyCode = () => {
    audioEngine.play('copy');
    navigator.clipboard.writeText(clipData.code);
    setCopiedCode(true);
    showToast('PIN Code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    audioEngine.play('copy');
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    showToast('Direct Share Link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleViewContentNow = () => {
    audioEngine.play('retrieve');
    onViewClip(clipData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl relative text-center bg-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3 text-indigo-600 shadow-sm text-3xl">
          ⚡
        </div>

        <h3 className="text-xl font-black text-slate-900">Clip Created Successfully!</h3>
        <p className="text-xs text-slate-500 mt-1">
          Share this 6-digit PIN or QR code with any device to retrieve content.
        </p>

        {/* PIN Code Box */}
        <div className="my-5 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-indigo-200/80 shadow-sm relative group">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Retrieval PIN Code
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-4xl font-black tracking-widest text-indigo-600">
              {clipData.code.slice(0, 3)} {clipData.code.slice(3)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied PIN!' : 'Copy PIN'}</span>
            </button>
          </div>
        </div>

        {/* Direct View / Retrieve Content Action Button */}
        <button
          onClick={handleViewContentNow}
          className="w-full py-3.5 mb-5 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-95 shadow-md shadow-indigo-200 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>View &amp; Retrieve Content Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* QR Code & Share Link */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          
          {/* QR Code */}
          <div className="p-3 bg-white border border-slate-200 rounded-2xl inline-block shadow-sm">
            <QRCodeSVG value={shareUrl} size={120} level="H" includeMargin={true} />
          </div>
          <p className="text-xs text-slate-500">Scan QR Code to open instantly on mobile phone</p>

          {/* Direct Share Link Input */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full bg-transparent px-3 text-xs text-slate-700 font-mono border-none focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Share Link'}</span>
            </button>
          </div>

        </div>

        {/* Badges */}
        <div className="flex items-center justify-center gap-4 mt-5 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
          {clipData.isEncrypted && (
            <span className="flex items-center gap-1 text-indigo-600">
              <Shield className="w-3.5 h-3.5" /> Encrypted
            </span>
          )}
          {clipData.burnOnRead && (
            <span className="flex items-center gap-1 text-rose-500">
              <Flame className="w-3.5 h-3.5" /> Self Destructs
            </span>
          )}
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3.5 h-3.5" /> Sync Ready
          </span>
        </div>

      </div>
    </div>
  );
}
