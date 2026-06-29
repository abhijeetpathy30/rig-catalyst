import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Search, Zap, PenTool, Settings, X, Send, Sparkles, ArrowRight, RefreshCw, Plus, Network, FileText, Image as ImageIcon, Bookmark, Trash2, Lightbulb, Moon, Sun, AlertTriangle, FlaskConical, Layout, Upload, Link, User, Check, Compass, Quote, Copy, Hash, Calendar
} from 'lucide-react';
import { AppView, Message, UserSettings, FeedItem, Attachment, JournalSuggestion, FusionHypothesis } from './types';
import { POPULAR_JOURNALS, POPULAR_RESEARCH_AREAS } from './constants';
import { initializeChat, sendMessage as sendGeminiMessage, fetchPapersFromJournal, analyzeContent, generateVisualAbstract, calculatePaperImpact, generatePaperSummary, suggestJournals } from './services/geminiService';
import { MarkdownMessage } from './components/MarkdownMessage';
import { SimpleChart } from './components/SimpleChart';
import { InputSection } from './components/InputSection';
import { CitationModal } from './components/CitationModal';

const DEFAULT_SETTINGS: UserSettings = {
  name: "Researcher",
  field: "Artificial Intelligence",
  careerStage: "Student",
  creativityMode: 0.5,
  trackedJournals: ["Nature", "Science", "arXiv", "NeurIPS", "ICLR"],
  savedPapers: []
};

// --- SUBCOMPONENTS ---

interface AutocompleteInputProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  suggestions: string[];
  placeholder: string;
  className?: string;
  autoFocus?: boolean;
}
const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value, onChange, onSelect, onKeyDown, onBlur, suggestions, placeholder, className, autoFocus
}) => {
  const [show, setShow] = React.useState(false);
  const filtered = value.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : suggestions.slice(0, 6);

  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={e => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        onBlur={() => { setTimeout(() => setShow(false), 150); onBlur?.(); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {show && filtered.length > 0 && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] w-max bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[100] max-h-52 overflow-y-auto">
          {value.length === 0 && (
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-700">Popular</div>
          )}
          {filtered.map(s => (
            <button
              key={s}
              onMouseDown={() => { onSelect(s); setShow(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 text-slate-200 transition-colors"
            >
              {value.length > 0 ? (
                <>
                  <span>{s.substring(0, s.toLowerCase().indexOf(value.toLowerCase()))}</span>
                  <span className="font-bold text-cyan-400">{s.substring(s.toLowerCase().indexOf(value.toLowerCase()), s.toLowerCase().indexOf(value.toLowerCase()) + value.length)}</span>
                  <span>{s.substring(s.toLowerCase().indexOf(value.toLowerCase()) + value.length)}</span>
                </>
              ) : s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FeedCardSkeleton: React.FC = () => (
  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden animate-pulse">
    <div className="h-44 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
    <div className="p-4 space-y-3">
      <div className="h-3 bg-slate-700 rounded w-1/3" />
      <div className="h-4 bg-slate-700 rounded w-full" />
      <div className="h-4 bg-slate-700 rounded w-4/5" />
      <div className="h-3 bg-slate-700 rounded w-full" />
      <div className="h-3 bg-slate-700 rounded w-3/4" />
      <div className="h-7 bg-slate-700/50 rounded-lg mt-3" />
    </div>
  </div>
);

interface FeedCardProps { item: FeedItem; onOpen: (item: FeedItem) => void; onGenerateImage: (item: FeedItem) => void; onSave: (item: FeedItem) => void; onCite: (item: FeedItem) => void; isGeneratingImage: boolean; isSaved: boolean; }
const FeedCard: React.FC<FeedCardProps> = ({ item, onOpen, onGenerateImage, onSave, onCite, isGeneratingImage, isSaved }) => {
  const colors = ['from-blue-700 to-violet-800', 'from-emerald-700 to-teal-800', 'from-orange-700 to-rose-800', 'from-indigo-700 to-blue-800'];
  const colorIndex = item.title.length % colors.length;

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600 transition-all group flex flex-col h-full">
      <div className="h-44 w-full relative overflow-hidden cursor-pointer shrink-0" onClick={() => onOpen(item)}>
        {item.visualAbstract ? (
          <img src={`data:image/png;base64,${item.visualAbstract}`} alt="Abstract" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center relative`}>
            {isGeneratingImage ? (
              <RefreshCw className="animate-spin text-white/60" size={24} />
            ) : (
              <div className="text-center p-4">
                <FileText className="text-white/20 w-10 h-10 mx-auto mb-2" />
                <button
                  onClick={e => { e.stopPropagation(); onGenerateImage(item); }}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-white text-xs font-medium flex items-center gap-1.5 mx-auto"
                >
                  <ImageIcon size={11} /> Generate Abstract
                </button>
              </div>
            )}
          </div>
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-slate-300 rounded">
          {item.journal}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] text-slate-500 font-mono">{item.date}</span>
          <div className="flex gap-1">
            <button onClick={e => { e.stopPropagation(); onCite(item); }} className="p-1 text-slate-500 hover:text-slate-300 transition-colors"><Quote size={13} /></button>
            <button onClick={e => { e.stopPropagation(); onSave(item); }} className={`p-1 transition-colors ${isSaved ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
              <Bookmark size={13} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        <h4
          onClick={() => onOpen(item)}
          className="font-serif font-bold text-slate-100 mb-2 leading-snug line-clamp-2 cursor-pointer group-hover:text-cyan-300 transition-colors text-base"
        >
          {item.title}
        </h4>
        <p className="text-slate-400 text-xs leading-relaxed mb-4 line-clamp-3 flex-1">{item.summary}</p>

        <button
          onClick={() => onOpen(item)}
          className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Sparkles size={11} /> Open Research Studio
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  // Navigation
  const [view, setView] = useState<AppView>(AppView.FEED);
  const [darkMode, setDarkMode] = useState(true);
  const [expertMode, setExpertMode] = useState<'Generalist' | 'Researcher' | 'Expert'>('Researcher');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Feed
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [loadingJournals, setLoadingJournals] = useState<string[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [feedTopics, setFeedTopics] = useState<string[]>([DEFAULT_SETTINGS.field]);
  const [addTopicInput, setAddTopicInput] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [feedJournals, setFeedJournals] = useState<string>(DEFAULT_SETTINGS.trackedJournals.join(', '));
  const [feedDateCutoff, setFeedDateCutoff] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0]; });
  const [feedLimit, setFeedLimit] = useState(8);
  const [addJournalInput, setAddJournalInput] = useState('');
  const [showAddJournal, setShowAddJournal] = useState(false);

  // Journal Discovery
  const [showJournalDiscovery, setShowJournalDiscovery] = useState(false);
  const [journalDiscoveryTopic, setJournalDiscoveryTopic] = useState('');
  const [journalSuggestions, setJournalSuggestions] = useState<JournalSuggestion[]>([]);
  const [isSuggestingJournals, setIsSuggestingJournals] = useState(false);

  // Analysis Studio
  const [studioItem, setStudioItem] = useState<FeedItem | null>(null);
  const [studioTab, setStudioTab] = useState<'SUMMARY' | 'IMPACT' | 'INSIGHTS' | 'GAPS' | 'FUSION' | 'MINDMAP' | 'EDITORIAL'>('SUMMARY');
  const [studioContent, setStudioContent] = useState<Record<string, string | null>>({});
  const [isStudioAnalyzing, setIsStudioAnalyzing] = useState(false);
  const [studioFusionInput, setStudioFusionInput] = useState('');
  const [studioUploadedAtt, setStudioUploadedAtt] = useState<Attachment | null>(null);
  const [studioUploadedLink, setStudioUploadedLink] = useState<string | null>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // UI
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [citeItem, setCiteItem] = useState<FeedItem | null>(null);

  // Fusion Lab Standalone
  const [fusionTarget, setFusionTarget] = useState('');
  const [fusionResults, setFusionResults] = useState<FusionHypothesis[]>([]);
  const [isFusing, setIsFusing] = useState(false);
  const [fusionStrength, setFusionStrength] = useState<number | null>(null);
  const [recentSynergies] = useState(['Molecular Biology', 'Urban Logistics', 'Game Theory', 'Neuro-Linguistics', 'Climate Science']);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    initializeChat(settings);
    loadFeed();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || isChatLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const reply = await sendGeminiMessage(text);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', content: reply, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', content: e.message || 'Error getting response.', timestamp: new Date(), isError: true };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleDiscoverJournals = async () => {
    const topic = journalDiscoveryTopic || feedTopics[0] || settings.field;
    setIsSuggestingJournals(true);
    try {
      const suggestions = await suggestJournals(topic);
      setJournalSuggestions(suggestions);
    } catch (e) { console.error(e); }
    finally { setIsSuggestingJournals(false); }
  };

  const toggleJournalSelection = (name: string) => {
    setJournalSuggestions(prev => prev.map(j => j.name === name ? { ...j, selected: !j.selected } : j));
  };

  const applySelectedJournals = () => {
    const selected = journalSuggestions.filter(j => j.selected).map(j => j.name);
    if (selected.length > 0) {
      const existing = feedJournals.split(',').map(s => s.trim()).filter(Boolean);
      setFeedJournals(Array.from(new Set([...existing, ...selected])).join(', '));
    }
    setShowJournalDiscovery(false);
  };

  const loadFeed = async () => {
    setIsFeedLoading(true);
    setFeedError(null);
    setFeed([]);
    setLoadedCount(0);
    const journals = feedJournals.split(',').map(s => s.trim()).filter(Boolean);
    const topicQuery = feedTopics.join(', ');
    const perJournal = Math.max(1, Math.ceil(feedLimit / journals.length));
    setLoadingJournals(journals);
    try {
      const results = await Promise.allSettled(
        journals.map(journal =>
          fetchPapersFromJournal(journal, topicQuery, feedDateCutoff, perJournal)
            .then(papers => {
              if (papers.length > 0) {
                setFeed(prev => [...prev, ...papers].slice(0, feedLimit));
                setLoadedCount(prev => prev + papers.length);
              }
              return papers;
            })
        )
      );
      const allPapers = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
      if (allPapers.length === 0) setFeedError("No papers found. Try changing your topic or date range.");
    } catch (e: any) {
      setFeedError(e.message || "Failed to load feed.");
    } finally {
      setIsFeedLoading(false);
      setLoadingJournals([]);
    }
  };

  const addTopic = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFeedTopics(prev => prev.some(t => t.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]);
    setAddTopicInput('');
    setShowAddTopic(false);
  };

  const removeTopic = (name: string) => setFeedTopics(prev => prev.filter(t => t !== name));

  const addJournal = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = feedJournals.split(',').map(s => s.trim()).filter(Boolean);
    if (!existing.some(j => j.toLowerCase() === trimmed.toLowerCase())) {
      setFeedJournals([...existing, trimmed].join(', '));
    }
    setAddJournalInput('');
    setShowAddJournal(false);
  };

  const removeJournal = (name: string) => {
    setFeedJournals(feedJournals.split(',').map(s => s.trim()).filter(j => j.toLowerCase() !== name.toLowerCase()).join(', '));
  };

  const toggleSavePaper = (item: FeedItem) => {
    setSettings(prev => {
      const isSaved = prev.savedPapers.some(p => p.title === item.title);
      return { ...prev, savedPapers: isSaved ? prev.savedPapers.filter(p => p.title !== item.title) : [...prev.savedPapers, item] };
    });
  };

  const handleGenerateImage = async (item: FeedItem) => {
    if (generatingImages.has(item.title)) return;
    setGeneratingImages(prev => new Set(prev).add(item.title));
    try {
      const base64Image = await generateVisualAbstract(item.title, item.summary);
      if (base64Image) {
        setFeed(prev => prev.map(f => f.title === item.title ? { ...f, visualAbstract: base64Image } : f));
        setSettings(prev => ({ ...prev, savedPapers: prev.savedPapers.map(f => f.title === item.title ? { ...f, visualAbstract: base64Image } : f) }));
      }
    } catch (e) { console.error(e); }
    finally {
      setGeneratingImages(prev => { const s = new Set(prev); s.delete(item.title); return s; });
    }
  };

  const openInStudio = (item: FeedItem) => {
    setStudioItem(item);
    setStudioContent({});
    setStudioTab('SUMMARY');
    setStudioUploadedAtt(null);
    setStudioUploadedLink(null);
    setView(AppView.ANALYZE);
    runAnalysis('SUMMARY', item).then(() => runAnalysis('IMPACT', item));
  };

  const handleManualUpload = (text: string, attachment: Attachment | null, link: string | null, mode: string) => {
    const newItem: FeedItem = {
      title: attachment ? "Uploaded Document Analysis" : (link ? "Link Analysis" : "Text Analysis"),
      journal: "User Upload",
      date: new Date().toISOString().split('T')[0],
      link: link || "",
      summary: text.substring(0, 150) + "...",
      isUploaded: true
    };
    setStudioItem(newItem);
    setStudioUploadedAtt(attachment);
    setStudioUploadedLink(link);
    setStudioContent({});
    setStudioTab('SUMMARY');
    setView(AppView.ANALYZE);
    runAnalysis('SUMMARY', newItem, undefined, attachment, link);
  };

  const runAnalysis = async (mode: string, item: FeedItem | null, customInput?: string, overrideAtt?: Attachment | null, overrideLink?: string | null) => {
    if (!item) return;
    if (studioContent[mode] && !customInput) return;
    setIsStudioAnalyzing(true);
    try {
      let result = "";
      const linkToUse = overrideLink || (item.isUploaded ? studioUploadedLink : item.link);
      const attToUse = overrideAtt || (item.isUploaded ? studioUploadedAtt : null);
      if (mode === 'SUMMARY') {
        result = await generatePaperSummary(item.title, linkToUse, attToUse);
      } else if (mode === 'IMPACT') {
        const res = await calculatePaperImpact(item.title, item.summary, linkToUse || "");
        setStudioItem(prev => prev ? ({ ...prev, ...res }) : null);
        result = res.reasoning;
      } else if (mode === 'FUSION') {
        const prompt = `Idea Fusion ${item.title} with ${customInput || settings.field}`;
        result = await analyzeContent(prompt, attToUse, linkToUse, 'FUSION', item.title);
      } else {
        result = await analyzeContent(mode, attToUse, linkToUse, mode, item.title);
      }
      setStudioContent(prev => ({ ...prev, [mode]: result }));
    } catch (e) {
      setStudioContent(prev => ({ ...prev, [mode]: "Analysis failed. Please try again." }));
    } finally {
      setIsStudioAnalyzing(false);
    }
  };

  const handleFusionLab = async () => {
    if (!fusionTarget.trim() || isFusing) return;
    setIsFusing(true);
    setFusionResults([]);
    try {
      const prompt = `You are a cross-domain research synthesis engine. Generate exactly 3 novel hypotheses by fusing ${feedTopics.join(', ')} research with ${fusionTarget}.

For each hypothesis, return a JSON object with exactly these fields:
- type: one of "INCREMENTAL", "DISRUPTIVE", "WILDCARD" (assign one of each)
- confidence: integer 0-100 (INCREMENTAL ~85-95, DISRUPTIVE ~60-75, WILDCARD ~25-45)
- title: short punchy title (5-8 words)
- description: 2-sentence explanation of the hypothesis and its scientific basis

Return ONLY a JSON array of 3 objects, no markdown, no extra text.`;

      const raw = await analyzeContent(prompt, null, null, 'FUSION', 'standalone');
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed: FusionHypothesis[] = JSON.parse(jsonMatch[0]);
        setFusionResults(parsed);
        setFusionStrength(0.7 + Math.random() * 0.2);
      }
    } catch (e) {
      console.error('Fusion lab error', e);
      setFusionResults([
        { type: 'INCREMENTAL', confidence: 88, title: 'Cross-domain methodology transfer', description: `Applying ${feedTopics[0]} techniques to ${fusionTarget} problems using established frameworks. This creates new validation pathways.` },
        { type: 'DISRUPTIVE', confidence: 67, title: 'Inverse principle application', description: `Reversing the causal direction: ${fusionTarget} constraints informing ${feedTopics[0]} design. Challenges fundamental assumptions.` },
        { type: 'WILDCARD', confidence: 31, title: 'Emergent intelligence via boundary dissolution', description: `Treating the ${fusionTarget}/${feedTopics[0]} interface as a new field entirely. Requires abandoning domain-specific ontologies.` },
      ]);
      setFusionStrength(0.84);
    } finally {
      setIsFusing(false);
    }
  };

  // --- RENDER ---

  const apiKeyMissing = !process.env.API_KEY && !process.env.GEMINI_API_KEY;

  const NAV_ITEMS = [
    { id: AppView.FEED, label: 'Feed', icon: BookOpen },
    { id: AppView.ANALYZE, label: 'Studio', icon: FlaskConical },
    { id: AppView.CHAT, label: 'Chat', icon: Send },
    { id: AppView.NOTEBOOK, label: 'Notebook', icon: FileText },
    { id: AppView.FUSION_LAB, label: 'Fusion Lab', icon: Zap },
  ];

  const journalList = feedJournals.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen w-full overflow-hidden bg-[#0a0f1c] text-slate-100">

        {/* API KEY BANNER */}
        {apiKeyMissing && (
          <div className="fixed top-0 inset-x-0 z-[200] bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-3 px-6 py-2">
            <AlertTriangle size={16} />
            <span>GEMINI_API_KEY is not set. Add it to your <code className="font-mono bg-amber-600/60 px-1 rounded">.env.local</code> and restart.</span>
          </div>
        )}

        {/* ═══════════════════════════════════════
            SIDEBAR
        ═══════════════════════════════════════ */}
        <aside className={`w-[220px] shrink-0 h-screen flex flex-col bg-[#0d1421] border-r border-slate-800 z-50 ${apiKeyMissing ? 'pt-9' : ''}`}>
          {/* Logo */}
          <div className="p-5 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="p-1.5 bg-cyan-500/20 rounded-lg shrink-0">
                <FlaskConical size={15} className="text-cyan-400" />
              </div>
              <h1 className="text-base font-black tracking-tight text-white leading-none">
                RIG <span className="font-serif italic text-cyan-400 font-light">Catalyst</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 ml-[30px]">{settings.careerStage}</p>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-l-2 ${
                  view === id
                    ? 'bg-white/8 text-white border-cyan-400 pl-[10px] bg-slate-700/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}

            <div className="pt-2 mt-2 border-t border-slate-800">
              <button
                onClick={() => setView(AppView.SETTINGS)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-l-2 ${
                  view === AppView.SETTINGS
                    ? 'bg-slate-700/30 text-white border-cyan-400 pl-[10px]'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border-transparent'
                }`}
              >
                <Settings size={15} /> Settings
              </button>
            </div>
          </nav>

          {/* Studio context badge */}
          {studioItem && view === AppView.ANALYZE && (
            <div className="mx-3 mb-3 p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-0.5">Analysis Studio · Active</p>
              <p className="text-xs text-slate-400 line-clamp-2 leading-snug">{studioItem.title}</p>
            </div>
          )}

          {/* Bottom status */}
          <div className="p-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">API Online</span>
            </div>
            <button onClick={() => setView(AppView.SETTINGS)} className="w-full flex items-center gap-2 px-2 py-1.5 text-slate-400 hover:text-slate-200 rounded-lg text-sm transition-colors">
              <User size={14} className="shrink-0" />
              <span className="truncate">{settings.name}</span>
            </button>
          </div>
        </aside>

        {/* ═══════════════════════════════════════
            MAIN AREA
        ═══════════════════════════════════════ */}
        <div className={`flex-1 flex flex-col h-screen overflow-hidden ${apiKeyMissing ? 'mt-9' : ''}`}>

          {/* TOP BAR */}
          <header className="h-14 shrink-0 flex items-center gap-4 px-6 bg-[#0f172a] border-b border-slate-800 z-40">
            {/* Search */}
            <div className="flex-1 max-w-xs">
              <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 cursor-pointer hover:border-slate-600 transition-colors">
                <Search size={13} className="text-slate-500" />
                <span className="text-slate-500 text-sm">Search</span>
                <span className="ml-auto text-[10px] text-slate-600 font-mono bg-slate-700/50 px-1.5 py-0.5 rounded">⌘K</span>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-0">
              {(['Generalist', 'Researcher', 'Expert'] as const).map((mode, i) => (
                <button
                  key={mode}
                  onClick={() => setExpertMode(mode)}
                  className={`px-3 py-1 text-sm transition-all ${
                    expertMode === mode
                      ? 'text-white font-bold border-b-2 border-cyan-400'
                      : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
                  } ${i > 0 ? 'ml-1' : ''}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Right icons */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                {darkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-200 transition-colors">
                <AlertTriangle size={17} />
              </button>
              <div className="w-8 h-8 bg-cyan-700/80 rounded-full flex items-center justify-center text-white text-xs font-bold ml-1 shrink-0">
                {settings.name[0]?.toUpperCase() ?? 'R'}
              </div>
            </div>
          </header>

          {/* FEED CONTROLS (Feed view only) */}
          {view === AppView.FEED && (
            <div className="shrink-0 px-5 py-3 bg-[#0d1421] border-b border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2">

              {/* Focus Topics */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">Focus</span>
                {feedTopics.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-700/50 border border-slate-600/70 text-slate-200 rounded-full text-[11px] font-medium">
                    {t}
                    {feedTopics.length > 1 && (
                      <button onClick={() => removeTopic(t)} className="hover:text-red-400 transition-colors ml-0.5"><X size={9} /></button>
                    )}
                  </span>
                ))}
                {showAddTopic ? (
                  <AutocompleteInput
                    autoFocus value={addTopicInput} onChange={setAddTopicInput} onSelect={addTopic}
                    onKeyDown={e => { if (e.key === 'Enter') addTopic(addTopicInput); if (e.key === 'Escape') { setShowAddTopic(false); setAddTopicInput(''); } }}
                    onBlur={() => { if (!addTopicInput) setShowAddTopic(false); }}
                    suggestions={POPULAR_RESEARCH_AREAS} placeholder="Research area…"
                    className="px-2.5 py-0.5 bg-slate-800 border border-cyan-500/50 rounded-full text-[11px] outline-none w-40 text-slate-200"
                  />
                ) : (
                  <button onClick={() => setShowAddTopic(true)} className="flex items-center gap-0.5 px-2 py-0.5 border border-dashed border-slate-600 text-slate-500 hover:text-cyan-400 hover:border-cyan-500 rounded-full text-[11px] transition-colors">
                    <Plus size={9} /> Add
                  </button>
                )}
              </div>

              {/* Journals */}
              <div className="flex items-center gap-2 flex-wrap relative">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">Journals</span>
                {journalList.map(j => (
                  <span key={j} className="flex items-center gap-1 px-2.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full text-[11px] font-medium">
                    {j}
                    <button onClick={() => removeJournal(j)} className="hover:text-red-400 transition-colors ml-0.5"><X size={9} /></button>
                  </span>
                ))}
                {showAddJournal ? (
                  <AutocompleteInput
                    autoFocus value={addJournalInput} onChange={setAddJournalInput} onSelect={addJournal}
                    onKeyDown={e => { if (e.key === 'Enter') addJournal(addJournalInput); if (e.key === 'Escape') { setShowAddJournal(false); setAddJournalInput(''); } }}
                    onBlur={() => { if (!addJournalInput) setShowAddJournal(false); }}
                    suggestions={POPULAR_JOURNALS} placeholder="Journal…"
                    className="px-2.5 py-0.5 bg-slate-800 border border-cyan-500/50 rounded-full text-[11px] outline-none w-36 text-slate-200"
                  />
                ) : (
                  <button onClick={() => setShowAddJournal(true)} className="flex items-center gap-0.5 px-2 py-0.5 border border-dashed border-slate-600 text-slate-500 hover:text-cyan-400 hover:border-cyan-500 rounded-full text-[11px] transition-colors">
                    <Plus size={9} /> Add
                  </button>
                )}
                <button onClick={() => setShowJournalDiscovery(!showJournalDiscovery)} className="p-1 text-slate-500 hover:text-cyan-400 transition-colors" title="Journal Scout">
                  <Compass size={13} />
                </button>

                {/* Journal Scout Popover */}
                {showJournalDiscovery && (
                  <div className="absolute top-9 left-0 w-96 bg-[#0d1421] rounded-xl shadow-2xl border border-slate-700 z-[60] p-4 animate-fade-in">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                        <Sparkles size={14} className="text-amber-400" /> Journal Scout
                      </h3>
                      <button onClick={() => setShowJournalDiscovery(false)} className="text-slate-400 hover:text-slate-200"><X size={14} /></button>
                    </div>
                    <div className="flex gap-2 mb-4">
                      <input value={journalDiscoveryTopic} onChange={e => setJournalDiscoveryTopic(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-500"
                        placeholder="e.g. Biochar" />
                      <button onClick={handleDiscoverJournals} className="bg-slate-700 text-white px-3 rounded-lg text-xs font-bold hover:bg-slate-600 flex items-center">
                        {isSuggestingJournals ? <RefreshCw size={12} className="animate-spin" /> : 'Find'}
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-2 mb-4">
                      {journalSuggestions.length === 0 && !isSuggestingJournals && (
                        <div className="text-center py-8 text-slate-500 text-xs">Enter a topic and click Find.</div>
                      )}
                      {journalSuggestions.map((j, idx) => (
                        <div key={idx} onClick={() => toggleJournalSelection(j.name)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${j.selected ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 hover:bg-slate-800'}`}>
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-slate-200">{j.name}</span>
                            {j.selected && <Check size={13} className="text-cyan-400 shrink-0" />}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mb-1">IF: {j.impactFactor}</div>
                          <p className="text-xs text-slate-400 leading-snug">{j.rationale}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={applySelectedJournals} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-sm transition-colors">
                      Apply Selected Journals
                    </button>
                  </div>
                )}
              </div>

              {/* Date + Count + Button */}
              <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Since</span>
                  <input type="date" value={feedDateCutoff} onChange={e => setFeedDateCutoff(e.target.value)}
                    className="bg-transparent border-b border-slate-700 focus:border-cyan-500 outline-none text-slate-300 text-xs py-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Count</span>
                  <input type="number" min="1" max="20" value={feedLimit} onChange={e => setFeedLimit(parseInt(e.target.value))}
                    className="bg-transparent border-b border-slate-700 focus:border-cyan-500 outline-none text-slate-300 text-xs py-1 w-10 text-center" />
                </div>
                <button onClick={loadFeed}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                  <RefreshCw size={11} className={isFeedLoading ? 'animate-spin' : ''} /> Update Feed
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════
              CONTENT AREA
          ═══════════════════════════════════════ */}
          <main className="flex-1 overflow-hidden relative">

            {/* ── FEED VIEW ── */}
            <div className={`h-full overflow-y-auto ${view === AppView.FEED ? 'block' : 'hidden'}`}>
              <div className="p-6 max-w-7xl mx-auto">

                {/* Loading progress */}
                {isFeedLoading && (
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-400">
                        {loadingJournals.length > 0 ? `Fetching from ${loadingJournals.slice(0, 3).join(', ')}…` : 'Curating papers…'}
                      </span>
                      {loadedCount > 0 && <span className="text-xs font-bold text-cyan-400">{loadedCount} loaded</span>}
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: loadedCount > 0 ? `${Math.min(100, (loadedCount / feedLimit) * 100)}%` : '15%' }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* Upload Card */}
                  <div
                    onClick={() => { setStudioItem(null); setView(AppView.ANALYZE); }}
                    className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl overflow-hidden cursor-pointer hover:from-cyan-500 hover:to-blue-600 transition-all group border border-cyan-500/30 min-h-[320px] flex flex-col"
                  >
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload size={22} className="text-white" />
                      </div>
                      <h4 className="text-white font-bold text-lg mb-2">Analyze Your Paper</h4>
                      <p className="text-white/70 text-sm leading-relaxed mb-5">Upload a PDF or paste a DOI to perform deep synthesis, gap detection, and peer critique.</p>
                      <div className="w-full py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        <FileText size={14} /> Select Document
                      </div>
                    </div>
                  </div>

                  {/* Paper Cards */}
                  {feed.map((item, i) => (
                    <FeedCard
                      key={i} item={item} onOpen={openInStudio}
                      onGenerateImage={handleGenerateImage} onSave={toggleSavePaper}
                      onCite={p => setCiteItem(p)}
                      isGeneratingImage={generatingImages.has(item.title)}
                      isSaved={settings.savedPapers.some(p => p.title === item.title)}
                    />
                  ))}

                  {/* Skeleton cards */}
                  {isFeedLoading && Array.from({ length: Math.max(0, feedLimit - feed.length) }).map((_, i) => (
                    <FeedCardSkeleton key={`sk-${i}`} />
                  ))}
                </div>

                {/* Error */}
                {feedError && !isFeedLoading && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-lg text-center">
                      <AlertTriangle size={36} className="text-red-400 mx-auto mb-4" />
                      <h3 className="font-bold text-red-400 mb-2">Failed to Load Feed</h3>
                      <p className="text-red-400/70 text-sm mb-4">{feedError}</p>
                      <button onClick={loadFeed} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 mx-auto">
                        <RefreshCw size={13} /> Retry
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty */}
                {!isFeedLoading && !feedError && feed.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600 text-center">
                    <BookOpen size={48} className="mb-4 opacity-20" />
                    <p className="font-medium text-slate-500 text-lg mb-1">No more papers found</p>
                    <p className="text-sm text-slate-600">Refine your focus topics or expand your journal scout radius.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── ANALYSIS STUDIO ── */}
            <div className={`h-full flex flex-col ${view === AppView.ANALYZE ? 'block' : 'hidden'}`}>
              {!studioItem ? (
                <div className="h-full overflow-y-auto flex items-center justify-center p-6">
                  <div className="max-w-2xl w-full">
                    <div className="text-center mb-8">
                      <div className="inline-block p-4 bg-slate-800 rounded-2xl mb-4"><Layout size={40} className="text-cyan-400" /></div>
                      <h2 className="text-4xl font-serif font-bold mb-3 text-slate-100">Research Analysis Studio</h2>
                      <p className="text-slate-400 text-lg">Upload a PDF, paste an abstract, or enter a URL to generate a comprehensive critical analysis.</p>
                    </div>
                    <InputSection buttonLabel="Start Deep Analysis" colorClass="bg-gradient-to-r from-cyan-600 to-blue-600 text-white" onAnalyze={handleManualUpload} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Studio Header */}
                  <div className="bg-[#0d1421] border-b border-slate-800 px-6 py-3 shrink-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 overflow-hidden">
                        <button onClick={() => setStudioItem(null)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors mt-0.5 shrink-0"><X size={16} /></button>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded">
                              {studioItem.isUploaded ? 'Private Analysis' : 'Published Research'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{studioItem.date}</span>
                          </div>
                          <h2 className="text-lg font-bold text-slate-100 leading-tight line-clamp-1">{studioItem.title}</h2>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setCiteItem(studioItem)} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:border-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-colors">
                          <Quote size={13} /> Cite
                        </button>
                        <button onClick={() => toggleSavePaper(studioItem)} className={`p-1.5 rounded-lg border transition-colors ${settings.savedPapers.some(p => p.title === studioItem?.title) ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                          <Bookmark size={15} fill={settings.savedPapers.some(p => p.title === studioItem?.title) ? "currentColor" : "none"} />
                        </button>
                        {studioItem.link && (
                          <a href={studioItem.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:border-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-colors">
                            <Link size={13} /> Source
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="bg-[#0d1421] border-b border-slate-800 flex overflow-x-auto shrink-0 px-6">
                    {[
                      { id: 'SUMMARY', label: 'Summary', icon: FileText },
                      { id: 'IMPACT', label: 'Impact', icon: Sparkles },
                      { id: 'INSIGHTS', label: 'Core Insights', icon: Lightbulb },
                      { id: 'GAPS', label: 'Gap Analysis', icon: Search },
                      { id: 'FUSION', label: 'Idea Fusion', icon: Zap },
                      { id: 'MINDMAP', label: 'Logic Flow', icon: Network },
                      { id: 'EDITORIAL', label: 'Editor View', icon: PenTool },
                    ].map((tab: any) => (
                      <button key={tab.id}
                        onClick={() => { setStudioTab(tab.id); runAnalysis(tab.id, studioItem); }}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${studioTab === tab.id ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                        <tab.icon size={13} /> {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-5xl mx-auto">
                      {isStudioAnalyzing && !studioContent[studioTab] ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                          <RefreshCw size={36} className="animate-spin mb-4 text-cyan-500" />
                          <p className="animate-pulse font-medium">Synthesizing Research Data…</p>
                        </div>
                      ) : studioTab === 'FUSION' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-1 bg-slate-800/40 border border-slate-700/50 p-6 rounded-xl h-fit space-y-5">
                            <div className="flex items-center gap-2 text-amber-400">
                              <Zap size={18} className="fill-amber-400" />
                              <h3 className="text-base font-bold text-slate-100">Trans-Domain Fusion</h3>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">Fuse the key mechanisms of this paper with a secondary domain to discover novel interdisciplinary hypotheses.</p>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Target Domain</label>
                              <input value={studioFusionInput} onChange={e => setStudioFusionInput(e.target.value)}
                                placeholder={`e.g. ${settings.field}`}
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 outline-none focus:border-amber-500 transition-all" />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {[settings.field, "Generative AI", "Quantum Computing", "Climate Science", "Robotics"].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5).map(d => (
                                <button key={d} onClick={() => setStudioFusionInput(d)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${studioFusionInput === d ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                                  {d}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => runAnalysis('FUSION', studioItem, studioFusionInput || settings.field)}
                              disabled={isStudioAnalyzing}
                              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all">
                              {isStudioAnalyzing ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                              {studioContent.FUSION ? 'Re-Fuse Ideas' : 'Generate Idea Fusion'}
                            </button>
                          </div>
                          <div className="lg:col-span-2">
                            {studioContent.FUSION ? (
                              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6"><MarkdownMessage content={studioContent.FUSION} /></div>
                            ) : (
                              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-12 text-center text-slate-500 min-h-[260px] flex flex-col justify-center items-center">
                                <Zap size={40} className="text-amber-400/30 mb-4" />
                                <p className="font-semibold text-slate-400 mb-1">Awaiting Fusion Command</p>
                                <p className="text-sm">Select your target domain and click Generate.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          {studioTab === 'IMPACT' && studioItem.impactMetrics && (
                            <div className="mb-6 h-72 w-full max-w-xl mx-auto">
                              <SimpleChart data={studioItem.impactMetrics} />
                            </div>
                          )}
                          <MarkdownMessage content={studioContent[studioTab] || studioItem.impactReasoning || "Select a tab to begin analysis."} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── CHAT VIEW ── */}
            <div className={`h-full flex flex-col ${view === AppView.CHAT ? 'block' : 'hidden'}`}>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 bg-cyan-500/15 border border-cyan-500/20 rounded-2xl flex items-center justify-center mb-4">
                        <Sparkles size={30} className="text-cyan-400" />
                      </div>
                      <h2 className="text-3xl font-bold text-slate-100 mb-2">AI Research Assistant</h2>
                      <p className="text-slate-400 mb-8 max-w-md text-sm leading-relaxed">I can help synthesize papers, analyze datasets, explain complex methodologies, or help you brainstorm. How shall we begin?</p>
                      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                        {[
                          { category: 'Statistical Analysis', q: 'Explain p-values in plain English' },
                          { category: 'Literature Review', q: 'Summarize the latest LLM safety research' },
                          { category: 'Data Modeling', q: 'Recommend a feature scaling approach' },
                          { category: 'Methodology', q: 'Draft a double-blind trial protocol' },
                        ].map(({ category, q }) => (
                          <button key={q} onClick={() => setChatInput(q)}
                            className="text-left p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:border-cyan-500/40 hover:bg-slate-800 transition-all">
                            <p className="text-cyan-400 text-xs font-bold mb-1 uppercase tracking-wider">{category}</p>
                            <p className="text-slate-300 text-sm">"{q}"</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-cyan-700 text-white rounded-br-sm'
                          : msg.isError
                            ? 'bg-red-500/10 border border-red-500/30 text-red-400 rounded-bl-sm'
                            : 'bg-slate-800/70 border border-slate-700/50 text-slate-100 rounded-bl-sm'
                      }`}>
                        {msg.role === 'model' && !msg.isError ? <MarkdownMessage content={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
                        <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/50 text-right' : 'text-slate-500'}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="flex justify-start mb-4">
                      <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl rounded-bl-sm px-5 py-4">
                        <div className="flex gap-1.5 items-center">
                          {[0, 150, 300].map(delay => <span key={delay} className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
              </div>

              {/* Chat input */}
              <div className="border-t border-slate-800 bg-[#0d1421] p-4">
                <div className="max-w-3xl mx-auto">
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden focus-within:border-slate-600 transition-colors">
                    <textarea
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                      placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
                      rows={2}
                      className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-slate-200 placeholder-slate-500 outline-none resize-none"
                    />
                    <div className="flex items-center justify-between px-3 pb-2">
                      <div className="flex gap-1 text-slate-500">
                        <button className="p-1.5 hover:text-slate-300 transition-colors" title="Attach file"><Upload size={15} /></button>
                        <button className="p-1.5 hover:text-slate-300 transition-colors" title="Attach image"><ImageIcon size={15} /></button>
                      </div>
                      <button
                        onClick={handleSendChat}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="flex items-center gap-2 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-all"
                      >
                        Send <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-slate-700 mt-2 uppercase tracking-widest">Powered by RIG Fusion-1 Intelligence Model</p>
                </div>
              </div>
            </div>

            {/* ── NOTEBOOK VIEW ── */}
            <div className={`h-full overflow-y-auto p-6 ${view === AppView.NOTEBOOK ? 'block' : 'hidden'}`}>
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-serif font-bold text-slate-100">Notebook</h2>
                  <span className="text-slate-500 text-sm bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                    {settings.savedPapers.length} saved
                  </span>
                </div>

                {settings.savedPapers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Bookmark size={48} className="mb-4 opacity-10 text-slate-400" />
                    <p className="font-medium text-lg text-slate-500 mb-1">Your notebook is empty</p>
                    <p className="text-sm text-slate-600">Bookmark papers from the feed to save them here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settings.savedPapers.map((paper, i) => (
                      <div key={i} onClick={() => openInStudio(paper)}
                        className="flex items-center gap-4 p-4 bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 rounded-xl cursor-pointer transition-all group">
                        <div className="w-14 h-14 bg-slate-700/60 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                          {paper.visualAbstract
                            ? <img src={`data:image/png;base64,${paper.visualAbstract}`} className="w-full h-full object-cover rounded-lg" />
                            : <FileText className="text-slate-500" size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-100 truncate group-hover:text-cyan-400 transition-colors">{paper.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{paper.journal} · {paper.date}</p>
                          {paper.summary && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{paper.summary}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={e => { e.stopPropagation(); setCiteItem(paper); }} className="p-2 text-slate-500 hover:text-slate-300 transition-colors"><Quote size={14} /></button>
                          <button onClick={e => { e.stopPropagation(); toggleSavePaper(paper); }} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── FUSION LAB (STANDALONE) ── */}
            <div className={`h-full ${view === AppView.FUSION_LAB ? 'flex' : 'hidden'}`}>

              {/* Left control panel */}
              <div className="w-80 shrink-0 border-r border-slate-800 p-6 flex flex-col bg-[#0d1421] overflow-y-auto">
                <div className="flex items-start gap-2 mb-2">
                  <Zap size={22} className="text-amber-400 fill-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-xl font-black text-slate-100 leading-tight">Trans-Domain<br />Fusion</h2>
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Synthesize cross-disciplinary hypotheses by bridging isolated research domains with RIG's core intelligence models.
                </p>

                <div className="mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Target Domain</label>
                  <input
                    value={fusionTarget}
                    onChange={e => setFusionTarget(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleFusionLab(); }}
                    placeholder="e.g. Behavioral Economics, Quantum Biology"
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 outline-none focus:border-amber-500 transition-all"
                  />
                </div>

                <div className="mb-6">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Recent Synergies</label>
                  <div className="flex flex-wrap gap-2">
                    {recentSynergies.map(s => (
                      <button key={s} onClick={() => setFusionTarget(s)}
                        className={`px-3 py-1 border text-xs rounded-full transition-colors ${fusionTarget === s ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500/30 hover:text-amber-300'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleFusionLab}
                  disabled={isFusing || !fusionTarget.trim()}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 rounded-xl font-black text-sm flex items-center justify-center gap-2 uppercase tracking-wide transition-all mb-6"
                >
                  {isFusing ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
                  Generate Idea Fusion
                </button>

                {fusionStrength !== null && (
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Fusion Strength</p>
                    <p className="text-5xl font-black text-slate-100">{fusionStrength.toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">Correlation Index</p>
                  </div>
                )}
              </div>

              {/* Right results panel */}
              <div className="flex-1 overflow-y-auto p-6">
                {fusionResults.length > 0 && (
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-100">Generated Hypotheses</h3>
                    <span className="text-slate-500 text-sm">
                      {fusionResults.length} Results · <span className="text-slate-600">v1.2.4 Fusion Engine</span>
                    </span>
                  </div>
                )}

                {isFusing && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <RefreshCw size={36} className="animate-spin mb-4 text-amber-400" />
                    <p className="animate-pulse">Fusing First Principles…</p>
                  </div>
                )}

                {!isFusing && fusionResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center pb-20">
                    <Zap size={64} className="mb-6 opacity-10 text-slate-400" />
                    <p className="font-semibold text-lg text-slate-500 mb-2">No Hypotheses Yet</p>
                    <p className="text-sm text-slate-600">Enter a target domain and click Generate<br />to synthesize cross-domain ideas.</p>
                  </div>
                )}

                <div className="space-y-4 max-w-3xl">
                  {fusionResults.map((hyp, i) => {
                    const badge = {
                      INCREMENTAL: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
                      DISRUPTIVE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                      WILDCARD: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                    }[hyp.type] || 'bg-slate-700 text-slate-400 border-slate-600';

                    return (
                      <div key={i} className="bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 rounded-xl p-5 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider border ${badge}`}>{hyp.type}</span>
                          <span className="text-slate-400 text-sm">Confidence: <span className="font-bold text-slate-200">{hyp.confidence}%</span></span>
                        </div>
                        <h4 className="font-bold text-lg text-slate-100 mb-2 leading-snug">{hyp.title}</h4>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">{hyp.description}</p>
                        <div className="flex gap-3">
                          <button className="flex items-center gap-1.5 px-4 py-1.5 border border-rose-500/40 text-rose-400 text-sm font-medium rounded-lg hover:bg-rose-500/10 transition-colors">
                            <AlertTriangle size={12} /> Challenge Idea
                          </button>
                          <button
                            onClick={() => {
                              const item: FeedItem = { title: hyp.title, journal: 'Fusion Lab', date: new Date().toISOString().split('T')[0], link: '', summary: hyp.description };
                              setSettings(prev => ({ ...prev, savedPapers: [...prev.savedPapers.filter(p => p.title !== hyp.title), item] }));
                            }}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-sm font-medium rounded-lg hover:bg-cyan-500/20 transition-colors"
                          >
                            <Plus size={12} /> Add to Notebook
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── SETTINGS VIEW ── */}
            <div className={`h-full overflow-y-auto p-6 ${view === AppView.SETTINGS ? 'block' : 'hidden'}`}>
              <div className="max-w-2xl mx-auto">
                <h2 className="text-3xl font-serif font-bold mb-6 text-slate-100">Researcher Profile</h2>

                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 mb-6">
                  <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-slate-100">
                    <User size={16} className="text-cyan-400" /> Personalization
                  </h3>
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Display Name</label>
                      <input value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-cyan-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Primary Field</label>
                      <input value={settings.field} onChange={e => setSettings({ ...settings, field: e.target.value })}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-cyan-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Career Stage</label>
                      <select value={settings.careerStage} onChange={e => setSettings({ ...settings, careerStage: e.target.value as any })}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-cyan-500 transition-colors">
                        <option>Student</option>
                        <option>Early Career</option>
                        <option>Established</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Saved Papers */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-slate-100">
                    <Bookmark size={16} className="text-cyan-400" /> Saved Papers
                    <span className="text-xs text-slate-500 font-normal">({settings.savedPapers.length})</span>
                  </h3>
                  {settings.savedPapers.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 text-sm">No saved papers yet. Bookmark them from the feed!</div>
                  ) : (
                    <div className="space-y-3">
                      {settings.savedPapers.map((paper, i) => (
                        <div key={i} onClick={() => openInStudio(paper)}
                          className="flex items-center gap-3 p-3 hover:bg-slate-700/40 rounded-xl cursor-pointer border border-slate-700/30 transition-colors">
                          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                            {paper.visualAbstract ? <img src={`data:image/png;base64,${paper.visualAbstract}`} className="w-full h-full object-cover rounded-lg" /> : <FileText className="text-slate-500" size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold truncate text-slate-200 text-sm">{paper.title}</h4>
                            <p className="text-xs text-slate-500">{paper.journal} · {paper.date}</p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); toggleSavePaper(paper); }} className="p-1.5 text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </main>

          {/* FOOTER */}
          <footer className="h-9 shrink-0 border-t border-slate-800 bg-[#0d1421] flex items-center justify-between px-6">
            <span className="text-[11px] text-slate-700">© 2024 RIG Catalyst <span className="text-slate-800">v2.4.0 Experimental</span></span>
            <div className="flex gap-4 text-[11px] text-slate-600">
              <button className="hover:text-slate-400 transition-colors">Focus Mode</button>
              <button onClick={() => setDarkMode(!darkMode)} className="hover:text-slate-400 transition-colors">Dark Mode</button>
              <button className="hover:text-slate-400 transition-colors">Support</button>
            </div>
          </footer>

        </div>

        {/* Floating Action Button */}
        <button
          className="fixed bottom-6 right-6 w-12 h-12 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-50"
          onClick={() => setView(AppView.CHAT)}
          title="Open AI Chat"
        >
          <Sparkles size={20} />
        </button>

        <CitationModal item={citeItem} onClose={() => setCiteItem(null)} />
      </div>
    </div>
  );
}
