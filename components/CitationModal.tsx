import React, { useState } from 'react';
import { X, Copy, Check, Quote } from 'lucide-react';
import { FeedItem } from '../types';

interface CitationModalProps {
  item: FeedItem | null;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const title = item.title;
  const journal = item.journal || "Unknown Journal";
  const dateStr = item.date || "";
  const year = dateStr ? dateStr.substring(0, 4) : new Date().getFullYear().toString();
  const link = item.link || "";
  const author = item.authors || "Author(s) Unknown";

  const citations = {
    APA: `${author} (${year}). ${title}. ${journal}. ${link ? `Retrieved from ${link}` : ''}`,
    MLA: `${author}. "${title}." ${journal}, ${year}, ${link || 'N.P.'}.`,
    Chicago: `${author}. "${title}." ${journal} (${year}). ${link || ''}`,
    Harvard: `${author}, ${year}. ${title}. ${journal}. Available at: <${link || 'N.P.'}>.`,
    BibTeX: `@article{scholar${year}${journal.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toLowerCase()},
  author = {Scholar, A. and Gemini, AI},
  title = {${title}},
  journal = {${journal}},
  year = {${year}},
  url = {${link || ''}}
}`
  };

  const copyToClipboard = (text: string, format: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in animate-duration-200" id="citation-modal">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-academic-50 dark:bg-academic-900/30 text-academic-600 dark:text-academic-400 rounded-lg">
              <Quote size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Export Citation</h3>
              <p className="text-xs text-slate-400 font-medium">Generate references in standard academic styles</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Paper Info Summary */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/60">
          <h4 className="font-serif font-bold text-slate-800 dark:text-slate-200 text-sm leading-snug mb-1">{title}</h4>
          <p className="text-xs font-mono text-slate-400 uppercase">{journal} • {dateStr}</p>
        </div>

        {/* Citations List */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 scroll-smooth">
          {Object.entries(citations).map(([format, text]) => (
            <div key={format} className="group relative bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 transition-all hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold font-mono tracking-wider text-academic-600 dark:text-academic-400 uppercase bg-academic-50 dark:bg-academic-900/20 px-2 py-0.5 rounded">
                  {format}
                </span>
                <button
                  onClick={() => copyToClipboard(text, format)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    copiedFormat === format
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'
                      : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:shadow-sm border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  {copiedFormat === format ? (
                    <>
                      <Check size={12} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans select-all whitespace-pre-wrap break-all pr-4">
                {text}
              </pre>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-black text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold text-sm shadow-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
