import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

if (typeof window !== 'undefined') {
  window.Prism = Prism;
}

/**
 * Robust HTML Escaper to prevent Stored XSS injection
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Highlight code securely
 */
export function highlightCode(code, language = 'javascript') {
  if (!code || typeof code !== 'string') return '';
  
  const safeCode = code;
  const lang = Prism.languages[language] || Prism.languages.javascript || Prism.languages.clike;

  if (lang) {
    try {
      return Prism.highlight(safeCode, lang, language);
    } catch (e) {
      return escapeHtml(safeCode);
    }
  }
  return escapeHtml(safeCode);
}

export default Prism;
