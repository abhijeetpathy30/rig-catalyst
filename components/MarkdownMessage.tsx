import React from 'react';
import {
  FlaskConical, Zap, AlertTriangle, Target, Info, Lightbulb,
  BarChart2, CheckCircle, BookOpen, Code2
} from 'lucide-react';

interface MarkdownMessageProps {
  content: string;
}

// ── Inline formatting ─────────────────────────────────────────────────────────
const inlineFormat = (text: string): React.ReactNode => {
  // Split on **bold**, *italic*, `code`
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="font-mono text-[13px] bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded">{part.slice(1, -1)}</code>;
    return part;
  });
};

// ── Render a single table block ───────────────────────────────────────────────
const renderTable = (lines: string[], key: number) => {
  const tableLines = lines.filter(l => l.trim().startsWith('|'));
  if (tableLines.length < 2) return null;

  const parse = (row: string) =>
    row.split('|').slice(1, -1).map(c => c.trim());

  const headers = parse(tableLines[0]);
  const isAlignRow = (s: string) => /^[-: ]+$/.test(s);
  const dataStart = tableLines.length > 1 && isAlignRow(parse(tableLines[1]).join('')) ? 2 : 1;
  const dataRows = tableLines.slice(dataStart).map(parse);

  return (
    <div key={key} className="my-4 overflow-hidden rounded-xl border border-slate-700/60 shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800/80 text-slate-300 font-bold text-[11px] uppercase tracking-wider border-b border-slate-700">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-5 py-3 whitespace-nowrap">{inlineFormat(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {dataRows.map((row, i) => (
              <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/20'} hover:bg-slate-800/40`}>
                {row.map((cell, j) => (
                  <td key={j} className="px-5 py-3 text-slate-300 leading-relaxed align-top">
                    {inlineFormat(cell)}
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

// ── Line-by-line parser ───────────────────────────────────────────────────────
type Block =
  | { type: 'h3' | 'h4'; text: string }
  | { type: 'hr' }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; lines: string[] }
  | { type: 'code'; lang: string; lines: string[] }
  | { type: 'p'; lines: string[] };

const parseBlocks = (text: string): Block[] => {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // H3
    if (/^###\s/.test(trimmed)) {
      blocks.push({ type: 'h3', text: trimmed.replace(/^###\s+/, '') });
      i++; continue;
    }
    // H4
    if (/^####\s/.test(trimmed)) {
      blocks.push({ type: 'h4', text: trimmed.replace(/^####\s+/, '') });
      i++; continue;
    }
    // HR
    if (/^---+$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++; continue;
    }
    // Code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: 'code', lang, lines: codeLines });
      continue;
    }
    // Table — collect consecutive | lines
    if (trimmed.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('|') || lines[i].trim() === '')) {
        if (lines[i].trim().startsWith('|')) tableLines.push(lines[i]);
        else if (tableLines.length > 0) break; // blank line ends table
        i++;
      }
      if (tableLines.length >= 2) blocks.push({ type: 'table', lines: tableLines });
      continue;
    }
    // Unordered list
    if (/^[\*\-]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[\*\-]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[\*\-]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }
    // Paragraph — collect non-empty consecutive lines
    if (trimmed) {
      const pLines: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t || /^[#\|\-\*\d]/.test(t) || t.startsWith('```')) break;
        pLines.push(t);
        i++;
      }
      if (pLines.length) blocks.push({ type: 'p', lines: pLines });
      continue;
    }
    i++;
  }

  return blocks;
};

// ── Render a list of parsed blocks ───────────────────────────────────────────
const renderBlocks = (blocks: Block[]): React.ReactNode[] => {
  return blocks.map((block, i) => {
    switch (block.type) {
      case 'h3':
        return (
          <h3 key={i} className="text-base font-bold text-cyan-300 mt-5 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-cyan-500 rounded-full inline-block" />
            {inlineFormat(block.text)}
          </h3>
        );
      case 'h4':
        return (
          <h4 key={i} className="text-sm font-bold text-slate-200 mt-4 mb-1.5 uppercase tracking-wide">
            {inlineFormat(block.text)}
          </h4>
        );
      case 'hr':
        return <hr key={i} className="my-4 border-slate-700/50" />;
      case 'code':
        return (
          <div key={i} className="relative my-4 group">
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-700 text-slate-400 text-[10px] rounded font-mono opacity-60 group-hover:opacity-100 transition-opacity">
              {block.lang || 'code'}
            </div>
            <pre className="bg-[#0a0f1c] text-blue-200 p-4 pt-8 rounded-xl text-xs overflow-x-auto font-mono border border-slate-700/50 leading-relaxed">
              {block.lines.join('\n')}
            </pre>
          </div>
        );
      case 'table':
        return renderTable(block.lines, i);
      case 'ul':
        return (
          <ul key={i} className="my-3 space-y-1.5 pl-1">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2.5 items-start text-slate-300 text-sm leading-relaxed">
                <span className="text-cyan-500 mt-1.5 shrink-0">▪</span>
                <span>{inlineFormat(item)}</span>
              </li>
            ))}
          </ul>
        );
      case 'ol':
        return (
          <ol key={i} className="my-3 space-y-2 pl-1">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-3 items-start text-slate-300 text-sm leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{j + 1}</span>
                <span>{inlineFormat(item)}</span>
              </li>
            ))}
          </ol>
        );
      case 'p':
        return (
          <p key={i} className="text-slate-300 text-sm leading-relaxed my-2">
            {inlineFormat(block.lines.join(' '))}
          </p>
        );
      default:
        return null;
    }
  });
};

// ── Section card style by title ───────────────────────────────────────────────
const getSectionStyle = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('core concept') || t.includes('background') || t.includes('method') || t.includes('main message'))
    return { border: 'border-l-blue-500', badge: 'bg-blue-500/20 text-blue-300', icon: <FlaskConical size={15} className="text-blue-400" /> };
  if (t.includes('fusion') || t.includes('integration') || t.includes('scenario'))
    return { border: 'border-l-amber-400', badge: 'bg-amber-500/20 text-amber-300', icon: <Zap size={15} className="text-amber-400" /> };
  if (t.includes('gap') || t.includes('shortcoming') || t.includes('caution') || t.includes('risk') || t.includes('weakness') || t.includes('pitfall'))
    return { border: 'border-l-rose-500', badge: 'bg-rose-500/20 text-rose-300', icon: <AlertTriangle size={15} className="text-rose-400" /> };
  if (t.includes('critical') || t.includes('next') || t.includes('research') || t.includes('recommend') || t.includes('revisi'))
    return { border: 'border-l-emerald-500', badge: 'bg-emerald-500/20 text-emerald-300', icon: <Target size={15} className="text-emerald-400" /> };
  if (t.includes('result') || t.includes('finding') || t.includes('insight') || t.includes('interesting'))
    return { border: 'border-l-purple-500', badge: 'bg-purple-500/20 text-purple-300', icon: <Lightbulb size={15} className="text-purple-400" /> };
  if (t.includes('plot') || t.includes('code') || t.includes('figure') || t.includes('diagram'))
    return { border: 'border-l-cyan-500', badge: 'bg-cyan-500/20 text-cyan-300', icon: <Code2 size={15} className="text-cyan-400" /> };
  if (t.includes('impact') || t.includes('funding') || t.includes('accept') || t.includes('journal'))
    return { border: 'border-l-teal-500', badge: 'bg-teal-500/20 text-teal-300', icon: <BarChart2 size={15} className="text-teal-400" /> };
  if (t.includes('strength') || t.includes('merit') || t.includes('advantage'))
    return { border: 'border-l-green-500', badge: 'bg-green-500/20 text-green-300', icon: <CheckCircle size={15} className="text-green-400" /> };
  if (t.includes('summary') || t.includes('overview') || t.includes('abstract'))
    return { border: 'border-l-slate-500', badge: 'bg-slate-700 text-slate-300', icon: <BookOpen size={15} className="text-slate-400" /> };
  return { border: 'border-l-slate-600', badge: 'bg-slate-700/60 text-slate-400', icon: <Info size={15} className="text-slate-400" /> };
};

// ── Main component ────────────────────────────────────────────────────────────
export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  if (!content) return null;

  // Split on H2 headers (## Title) to create section cards
  const rawSections = content.split(/^##\s+(.*$)/gm);

  const sections: { title: string; body: string }[] = [];
  // Everything before first ## is an "Overview" block
  if (rawSections[0].trim()) sections.push({ title: '', body: rawSections[0] });
  for (let i = 1; i < rawSections.length; i += 2) {
    sections.push({ title: rawSections[i] || '', body: rawSections[i + 1] || '' });
  }

  // If no H2 sections found (e.g. pure prose), render as single block
  if (sections.length === 1 && !sections[0].title) {
    return (
      <div className="text-slate-300 text-sm leading-relaxed space-y-3">
        {renderBlocks(parseBlocks(sections[0].body))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const style = getSectionStyle(section.title);
        const blocks = parseBlocks(section.body);

        if (!section.title) {
          // Intro paragraph — no card
          return (
            <div key={idx} className="text-slate-400 text-sm leading-relaxed">
              {renderBlocks(blocks)}
            </div>
          );
        }

        return (
          <div key={idx} className={`bg-slate-800/30 border border-slate-700/40 border-l-2 ${style.border} rounded-xl p-5 transition-all hover:bg-slate-800/40`}>
            <div className="flex items-center gap-2.5 mb-4">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${style.badge}`}>
                {style.icon}
                {section.title.replace(/^\d+\.\s*/, '')}
              </span>
            </div>
            <div className="space-y-0.5">
              {renderBlocks(blocks)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
