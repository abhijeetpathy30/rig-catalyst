import React from 'react';
import {
  AlertTriangle, CheckCircle, XCircle, Lightbulb, Search, Target,
  TrendingUp, BookOpen, ArrowRight, Flame, Microscope, RefreshCw
} from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Insight {
  number: number;
  title: string;
  finding: string;
  significance: string;
  category: string;
}

interface Gap {
  number: number;
  title: string;
  gap: string;
  opportunity: string;
  method: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface Critique {
  severity: 'Fatal' | 'Major' | 'Minor';
  category: string;
  issue: string;
  fix: string;
}

interface CritiqueReport {
  verdict: string;
  score: number;
  summary: string;
  critiques: Critique[];
  strengths: string[];
  recommendation: string;
}

interface GapReport { gaps: Gap[] }
interface InsightReport { insights: Insight[] }

// ─────────────────────────────────────────────────────────────────────────────
// SAFE JSON PARSE
// ─────────────────────────────────────────────────────────────────────────────

const tryParseJSON = <T>(content: string): T | null => {
  // Strip markdown fences
  const stripped = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  // Find first { or [
  const firstBrace = stripped.indexOf('{');
  const firstBracket = stripped.indexOf('[');
  const start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
  if (start === -1) return null;
  const lastBrace = stripped.lastIndexOf('}');
  const lastBracket = stripped.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);
  if (end === -1) return null;
  try { return JSON.parse(stripped.substring(start, end + 1)) as T; }
  catch { return null; }
};

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHTS RENDERER
// ─────────────────────────────────────────────────────────────────────────────

const INSIGHT_CATEGORY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Empirical:      { bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/40' },
  Methodological: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
  Conceptual:     { bg: 'bg-amber-500/20',  text: 'text-amber-300',  border: 'border-amber-500/40' },
  Statistical:    { bg: 'bg-cyan-500/20',   text: 'text-cyan-300',   border: 'border-cyan-500/40' },
  Applied:        { bg: 'bg-teal-500/20',   text: 'text-teal-300',   border: 'border-teal-500/40' },
};
const defaultCat = { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-600' };

export const InsightCards: React.FC<{ content: string }> = ({ content }) => {
  const data = tryParseJSON<InsightReport>(content);
  if (!data?.insights?.length) return <MarkdownMessage content={content} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-5">
        <Lightbulb size={18} className="text-amber-400" />
        <h2 className="font-bold text-slate-100 text-lg">Core Insights</h2>
        <span className="ml-auto text-[11px] text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">{data.insights.length} insights extracted</span>
      </div>
      {data.insights.map((ins, i) => {
        const cat = INSIGHT_CATEGORY_STYLE[ins.category] || defaultCat;
        return (
          <div key={i} className={`bg-slate-800/40 border ${cat.border} border-l-2 rounded-xl p-5 transition-all hover:bg-slate-800/60`}>
            <div className="flex items-start gap-4">
              {/* Number badge */}
              <div className="w-9 h-9 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-center shrink-0">
                <span className="text-base font-black text-slate-300">{ins.number ?? i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-bold text-slate-100 text-sm leading-snug">{ins.title}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>{ins.category}</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">{ins.finding}</p>
                <div className="flex items-start gap-2 bg-slate-900/40 rounded-lg p-3">
                  <TrendingUp size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-emerald-300/80 text-xs leading-relaxed">{ins.significance}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GAP ANALYSIS RENDERER
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_STYLE = {
  High:   { bg: 'bg-rose-500/20',   text: 'text-rose-300',   dot: 'bg-rose-400' },
  Medium: { bg: 'bg-amber-500/20',  text: 'text-amber-300',  dot: 'bg-amber-400' },
  Low:    { bg: 'bg-slate-700/50',  text: 'text-slate-300',  dot: 'bg-slate-500' },
};

export const GapCards: React.FC<{ content: string }> = ({ content }) => {
  const data = tryParseJSON<GapReport>(content);
  if (!data?.gaps?.length) return <MarkdownMessage content={content} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-5">
        <Search size={18} className="text-cyan-400" />
        <h2 className="font-bold text-slate-100 text-lg">Research Gap Analysis</h2>
        <span className="ml-auto text-[11px] text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">{data.gaps.length} gaps identified</span>
      </div>
      {data.gaps.map((gap, i) => {
        const p = PRIORITY_STYLE[gap.priority] || PRIORITY_STYLE.Low;
        return (
          <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-2xl overflow-hidden hover:border-slate-600 transition-all">
            {/* Card header */}
            <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-sm font-black text-slate-400 shrink-0">
                {gap.number ?? i + 1}
              </span>
              <h3 className="font-bold text-slate-100 flex-1">{gap.title}</h3>
              <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${p.bg} ${p.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                {gap.priority} Priority
              </span>
            </div>
            {/* Three-column body */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700/40">
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">The Gap</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{gap.gap}</p>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Target size={12} className="text-cyan-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Opportunity</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{gap.opportunity}</p>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Microscope size={12} className="text-emerald-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Suggested Method</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{gap.method}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CRITIQUE RENDERER
// ─────────────────────────────────────────────────────────────────────────────

const VERDICT_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  'Accept':          { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/50' },
  'Minor Revision':  { bg: 'bg-cyan-500/20',    text: 'text-cyan-300',    border: 'border-cyan-500/50' },
  'Major Revision':  { bg: 'bg-amber-500/20',   text: 'text-amber-300',   border: 'border-amber-500/50' },
  'Reject':          { bg: 'bg-rose-500/20',    text: 'text-rose-300',    border: 'border-rose-500/50' },
};

const SEVERITY_STYLE = {
  Fatal: { bg: 'bg-rose-500',    label: 'FATAL',  icon: <XCircle size={12} className="shrink-0" /> },
  Major: { bg: 'bg-amber-500',   label: 'MAJOR',  icon: <AlertTriangle size={12} className="shrink-0" /> },
  Minor: { bg: 'bg-slate-600',   label: 'MINOR',  icon: <RefreshCw size={12} className="shrink-0" /> },
};

export const CritiqueCards: React.FC<{ content: string }> = ({ content }) => {
  const data = tryParseJSON<CritiqueReport>(content);
  if (!data?.critiques) return <MarkdownMessage content={content} />;

  const verdictStyle = VERDICT_STYLE[data.verdict] || VERDICT_STYLE['Major Revision'];
  const score = Math.min(100, Math.max(0, data.score ?? 50));
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400';
  const scoreBarColor = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500';

  const fatal = data.critiques.filter(c => c.severity === 'Fatal');
  const major = data.critiques.filter(c => c.severity === 'Major');
  const minor = data.critiques.filter(c => c.severity === 'Minor');

  return (
    <div className="space-y-5">
      {/* Verdict banner */}
      <div className={`flex items-center gap-5 p-5 rounded-2xl border ${verdictStyle.border} ${verdictStyle.bg}`}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <Flame size={20} className={verdictStyle.text} />
            <span className={`text-xl font-black ${verdictStyle.text}`}>{data.verdict}</span>
          </div>
          <p className="text-slate-300 text-sm italic">"{data.summary}"</p>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-4xl font-black ${scoreColor}`}>{score}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest">/ 100</div>
          <div className="mt-2 w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full ${scoreBarColor} rounded-full transition-all`} style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>

      {/* Critique distribution */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Fatal Issues', count: fatal.length, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
          { label: 'Major Issues', count: major.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
          { label: 'Minor Issues', count: minor.length, color: 'text-slate-400', bg: 'bg-slate-700/30 border-slate-700' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`border rounded-xl p-3 text-center ${bg}`}>
            <div className={`text-2xl font-black ${color}`}>{count}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Issues */}
      {data.critiques.length > 0 && (
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Reviewer Issues</h3>
          <div className="space-y-3">
            {data.critiques.map((c, i) => {
              const sev = SEVERITY_STYLE[c.severity] || SEVERITY_STYLE.Minor;
              return (
                <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/40">
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black text-white ${sev.bg}`}>
                      {sev.icon} {sev.label}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{c.category}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-slate-300 text-sm leading-relaxed">{c.issue}</p>
                    <div className="flex items-start gap-2 bg-slate-900/50 rounded-lg p-3">
                      <ArrowRight size={12} className="text-cyan-400 shrink-0 mt-0.5" />
                      <p className="text-cyan-300/80 text-xs leading-relaxed">{c.fix}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strengths */}
      {data.strengths?.length > 0 && (
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Acknowledged Strengths</h3>
          <div className="space-y-2">
            {data.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Recommendation */}
      {data.recommendation && (
        <div className="p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Reviewer's Final Recommendation</h3>
          <p className="text-slate-300 text-sm leading-relaxed italic">{data.recommendation}</p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EDITORIAL / SUBMISSION STRATEGY RENDERER (prose → MarkdownMessage)
// ─────────────────────────────────────────────────────────────────────────────

export const EditorialCard: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6 p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl">
        <BookOpen size={18} className="text-teal-400 shrink-0" />
        <div>
          <p className="text-teal-300 text-sm font-bold">Submission Strategy</p>
          <p className="text-teal-400/60 text-xs">How the authors can make the strongest case for acceptance</p>
        </div>
      </div>
      <MarkdownMessage content={content} />
    </div>
  );
};
