import React from 'react';
import { Lightbulb, Zap, AlertTriangle, Search, Info, FlaskConical, Target } from 'lucide-react';

interface MarkdownMessageProps {
  content: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  
  // 1. Render Table Helper
  const renderTable = (tableString: string, key: number) => {
    const rows = tableString.trim().split('\n');
    if (rows.length < 2) return null;

    const headers = rows[0].split('|').filter(c => c.trim()).map(c => c.trim());
    const dataRows = rows.slice(2).map(row => 
        row.split('|').filter((c, i) => i > 0 && i < row.split('|').length - 1).map(c => c.trim())
    );

    return (
      <div key={key} className="my-6 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg bg-white dark:bg-slate-900 ring-1 ring-slate-900/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-6 py-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {dataRows.map((row, i) => (
                <tr key={i} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-6 py-4 text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        <span dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.*?)\*\*/g, '<span class="text-slate-900 dark:text-white font-bold">$1</span>') }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 2. Card Style Helper
  const getCardStyle = (title: string) => {
    const t = title.toLowerCase();
    
    // Core Concepts (Blue/Academic)
    if (t.includes('core concept') || t.includes('background') || t.includes('method')) {
      return {
        wrapper: 'bg-white dark:bg-slate-900 border-l-4 border-blue-500 shadow-md hover:shadow-xl transition-all duration-300',
        header: 'text-blue-600 dark:text-blue-400',
        icon: <FlaskConical size={20} className="text-blue-500" />
      };
    }
    // Fusion / Insights (Purple/Gradient)
    if (t.includes('fusion') || t.includes('integration') || t.includes('insight') || t.includes('result')) {
      return {
        wrapper: 'bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-slate-900 border-l-4 border-indigo-500 shadow-md hover:shadow-xl transition-all duration-300',
        header: 'text-indigo-600 dark:text-indigo-400',
        icon: <Zap size={20} className="text-indigo-500" />
      };
    }
    // Problems / Gaps / Shortcomings (Rose/Warning)
    if (t.includes('shortcoming') || t.includes('caution') || t.includes('gap') || t.includes('weakness')) {
      return {
        wrapper: 'bg-white dark:bg-slate-900 border-l-4 border-rose-500 shadow-md hover:shadow-xl transition-all duration-300',
        header: 'text-rose-600 dark:text-rose-400',
        icon: <AlertTriangle size={20} className="text-rose-500" />
      };
    }
    // Critical Thinking / Next Steps (Emerald/Action)
    if (t.includes('critical') || t.includes('research') || t.includes('plot')) {
      return {
        wrapper: 'bg-emerald-50/50 dark:bg-emerald-950/10 border-l-4 border-emerald-500 shadow-md hover:shadow-xl transition-all duration-300',
        header: 'text-emerald-600 dark:text-emerald-400',
        icon: <Target size={20} className="text-emerald-500" />
      };
    }
    
    // Default
    return {
      wrapper: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm',
      header: 'text-slate-700 dark:text-slate-300',
      icon: <Info size={20} className="text-slate-400" />
    };
  };

  // 3. Parse Content
  // Split by H2 headers (## Title)
  const sections = content.split(/^##\s+(.*$)/gm);
  
  const blocks = [];
  if (sections[0].trim()) blocks.push({ title: 'Overview', content: sections[0] });
  
  for (let i = 1; i < sections.length; i += 2) {
    blocks.push({ title: sections[i], content: sections[i+1] });
  }

  return (
    <div className="grid gap-6 font-sans">
      {blocks.map((block, index) => {
        const { wrapper, header, icon } = getCardStyle(block.title);
        
        // Split content by tables or code blocks
        // Using a safer splitting logic to avoid regex complexity issues
        const rawParts = block.content.split('```');
        const parts = [];
        
        for (let i = 0; i < rawParts.length; i++) {
            if (i % 2 === 1) {
                // This is code
                parts.push({ type: 'code', content: rawParts[i] });
            } else {
                // This is text/tables
                // Simple table detection: looks for lines starting with |
                const subParts = rawParts[i].split(/(\n\|.*\|\n)/g);
                subParts.forEach(sp => {
                    if (sp.trim().startsWith('|') && sp.includes('|')) {
                         parts.push({ type: 'table', content: sp });
                    } else {
                         parts.push({ type: 'text', content: sp });
                    }
                });
            }
        }

        return (
          <div key={index} className={`rounded-2xl p-6 ${wrapper}`}>
            {/* Header */}
            {block.title !== 'Overview' && (
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                 <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                    {icon}
                 </div>
                 <h2 className={`text-lg font-bold uppercase tracking-tight ${header}`}>
                   {block.title.replace(/^\d+\.\s*/, '')}
                 </h2>
              </div>
            )}
            
            {/* Body */}
            <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed text-[15px]">
              {parts.map((part, pIndex) => {
                 if (!part.content.trim()) return null;
                 
                 if (part.type === 'code') {
                   return (
                     <div key={pIndex} className="relative group">
                        <div className="absolute top-2 right-2 px-2 py-1 bg-slate-700 text-slate-300 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            Code Snippet
                        </div>
                        <pre className="bg-slate-900 text-blue-100 p-5 rounded-xl text-xs overflow-x-auto font-mono shadow-inner border border-slate-700">
                            {part.content.replace(/^\w*\n/, '')}
                        </pre>
                     </div>
                   );
                 }
                 
                 if (part.type === 'table') {
                     // Check if it's a valid table with at least header and separator
                     if (part.content.split('\n').filter(l => l.includes('|')).length > 2) {
                        return renderTable(part.content, pIndex);
                     }
                 }
                 
                 // Regular Text
                 // Use &bull; instead of literal bullet char to avoid encoding syntax errors
                 const html = part.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1 rounded mx-0.5">$1</strong>')
                    .replace(/^\s*-\s(.*$)/gim, '<div class="flex gap-3 ml-1 mb-2 items-start"><span class="text-slate-300 mt-1.5">&bull;</span><span>$1</span></div>')
                    .replace(/\n\n/g, '<br/><br/>');
                 
                 return <div key={pIndex} dangerouslySetInnerHTML={{ __html: html }} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};