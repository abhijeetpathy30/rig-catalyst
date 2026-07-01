import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Search, Zap, PenTool, Settings, X, Send, Sparkles, ArrowRight, ArrowLeft,
  RefreshCw, Plus, Network, FileText, Image as ImageIcon, Bookmark, Trash2, Lightbulb,
  Moon, Sun, AlertTriangle, FlaskConical, Layout, Upload, Link, User, Check, Compass,
  Quote, Copy, Shield, Bell, Clock
} from 'lucide-react';
import {
  AppView, Message, UserSettings, FeedItem, Attachment, JournalSuggestion,
  FusionHypothesis, ChallengeStressTest, PrimaryHurdle,
  LLMConfig, LLMProvider, PROVIDER_LABELS, PROVIDER_MODELS, PROVIDER_KEY_URLS, PROVIDER_DESCRIPTIONS
} from './types';
import { POPULAR_JOURNALS, POPULAR_RESEARCH_AREAS } from './constants';
import {
  initializeChat, sendMessage as sendGeminiMessage, fetchPapersFromJournal,
  analyzeContent, generateVisualAbstract, calculatePaperImpact,
  generatePaperSummary, suggestJournals, setLLMConfig, testConnection, getLLMConfig
} from './services/geminiService';
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
  savedPapers: [],
  technicalBio: '',
  enhancedAnalysisMode: true,
};

// ─── AUTOCOMPLETE INPUT ───────────────────────────────────────────────────────

interface AutocompleteInputProps {
  value: string; onChange: (v: string) => void; onSelect: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void; suggestions: string[]; placeholder: string;
  className?: string; autoFocus?: boolean;
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
      <input autoFocus={autoFocus} value={value}
        onChange={e => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        onBlur={() => { setTimeout(() => setShow(false), 150); onBlur?.(); }}
        onKeyDown={onKeyDown} placeholder={placeholder} className={className} />
      {show && filtered.length > 0 && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] w-max bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[100] max-h-52 overflow-y-auto">
          {value.length === 0 && <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-700">Popular</div>}
          {filtered.map(s => (
            <button key={s} onMouseDown={() => { onSelect(s); setShow(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 text-slate-200 transition-colors">
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

// ─── FEED CARD SKELETON ───────────────────────────────────────────────────────

const FeedCardSkeleton: React.FC = () => (
  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden animate-pulse">
    <div className="h-44 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
    <div className="p-4 space-y-3">
      <div className="h-3 bg-slate-700 rounded w-1/3" />
      <div className="h-4 bg-slate-700 rounded w-full" />
      <div className="h-4 bg-slate-700 rounded w-4/5" />
      <div className="h-3 bg-slate-700 rounded w-full" />
      <div className="h-7 bg-slate-700/50 rounded-lg mt-3" />
    </div>
  </div>
);

// ─── FEED CARD ────────────────────────────────────────────────────────────────

interface FeedCardProps {
  item: FeedItem; onOpen: (item: FeedItem) => void;
  onGenerateImage: (item: FeedItem) => void; onSave: (item: FeedItem) => void;
  onCite: (item: FeedItem) => void; isGeneratingImage: boolean; isSaved: boolean;
}
const FeedCard: React.FC<FeedCardProps> = ({ item, onOpen, onGenerateImage, onSave, onCite, isGeneratingImage, isSaved }) => {
  const colors = ['from-blue-700 to-violet-800', 'from-emerald-700 to-teal-800', 'from-orange-700 to-rose-800', 'from-indigo-700 to-blue-800'];
  const colorIndex = item.title.length % colors.length;
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600 transition-all group flex flex-col h-full">
      <div className="h-44 w-full relative overflow-hidden cursor-pointer shrink-0" onClick={() => onOpen(item)}>
        {item.visualAbstract ? (
          <img src={`data:image/png;base64,${item.visualAbstract}`} alt="Abstract" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center`}>
            {isGeneratingImage ? <RefreshCw className="animate-spin text-white/60" size={24} /> : (
              <div className="text-center p-4">
                <FileText className="text-white/20 w-10 h-10 mx-auto mb-2" />
                <button onClick={e => { e.stopPropagation(); onGenerateImage(item); }}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-white text-xs font-medium flex items-center gap-1.5 mx-auto">
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
        <h4 onClick={() => onOpen(item)} className="font-serif font-bold text-slate-100 mb-2 leading-snug line-clamp-2 cursor-pointer group-hover:text-cyan-300 transition-colors text-base">
          {item.title}
        </h4>
        <p className="text-slate-400 text-xs leading-relaxed mb-4 line-clamp-3 flex-1">{item.summary}</p>
        <button onClick={() => onOpen(item)} className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors">
          <Sparkles size={11} /> Open Research Studio
        </button>
      </div>
    </div>
  );
};

// ─── TOGGLE SWITCH ────────────────────────────────────────────────────────────

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)}
    className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${value ? 'bg-cyan-500' : 'bg-slate-700'}`}>
    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${value ? 'left-5' : 'left-0.5'}`} />
  </button>
);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  // ── Navigation
  const [view, setView] = useState<AppView>(AppView.FEED);
  const [darkMode, setDarkMode] = useState(true);
  const [expertMode, setExpertMode] = useState<'Generalist' | 'Researcher' | 'Expert'>('Researcher');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // ── Feed
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [loadingJournals, setLoadingJournals] = useState<string[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [feedTopics, setFeedTopics] = useState<string[]>([DEFAULT_SETTINGS.field]);
  const [addTopicInput, setAddTopicInput] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [feedJournals, setFeedJournals] = useState<string>(DEFAULT_SETTINGS.trackedJournals.join(', '));
  const [feedDateCutoff, setFeedDateCutoff] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0];
  });
  const [feedLimit, setFeedLimit] = useState(8);
  const [addJournalInput, setAddJournalInput] = useState('');
  const [showAddJournal, setShowAddJournal] = useState(false);

  // ── Journal Discovery
  const [showJournalDiscovery, setShowJournalDiscovery] = useState(false);
  const [journalDiscoveryTopic, setJournalDiscoveryTopic] = useState('');
  const [journalSuggestions, setJournalSuggestions] = useState<JournalSuggestion[]>([]);
  const [isSuggestingJournals, setIsSuggestingJournals] = useState(false);

  // ── Analysis Studio
  const [studioItem, setStudioItem] = useState<FeedItem | null>(null);
  const [studioTab, setStudioTab] = useState<'SUMMARY' | 'IMPACT' | 'INSIGHTS' | 'GAPS' | 'FUSION' | 'MINDMAP' | 'EDITORIAL'>('SUMMARY');
  const [studioContent, setStudioContent] = useState<Record<string, string | null>>({});
  const [isStudioAnalyzing, setIsStudioAnalyzing] = useState(false);
  const [studioFusionInput, setStudioFusionInput] = useState('');
  const [studioUploadedAtt, setStudioUploadedAtt] = useState<Attachment | null>(null);
  const [studioUploadedLink, setStudioUploadedLink] = useState<string | null>(null);

  // ── Chat
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── UI helpers
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [citeItem, setCiteItem] = useState<FeedItem | null>(null);

  // ── Fusion Lab standalone
  const [fusionTarget, setFusionTarget] = useState('');
  const [fusionResults, setFusionResults] = useState<FusionHypothesis[]>([]);
  const [isFusing, setIsFusing] = useState(false);
  const [fusionStrength, setFusionStrength] = useState<number | null>(null);
  const [recentSynergies] = useState(['Molecular Biology', 'Urban Logistics', 'Game Theory', 'Neuro-Linguistics', 'Climate Science']);

  // ── Challenge Idea (sub-view inside Fusion Lab)
  const [challengedHypothesis, setChallengedHypothesis] = useState<FusionHypothesis | null>(null);
  const [challengeStressTests, setChallengeStressTests] = useState<ChallengeStressTest[]>([]);
  const [skepticalCritiques, setSkepticalCritiques] = useState<{ id: string; content: string }[]>([]);
  const [primaryHurdles, setPrimaryHurdles] = useState<PrimaryHurdle[]>([]);
  const [isChallengingIdea, setIsChallengingIdea] = useState(false);

  // ── Settings pending edits
  const [pendingSettings, setPendingSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // ── LLM Provider Config (BYOK)
  const [llmConfig, setLlmConfigState] = useState<LLMConfig | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupProvider, setSetupProvider] = useState<LLMProvider>('gemini');
  const [setupApiKey, setSetupApiKey] = useState('');
  const [setupModel, setSetupModel] = useState('gemini-2.5-flash');
  const [setupShowKey, setSetupShowKey] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<'idle' | 'ok' | 'error'>('idle');
  const [connTestError, setConnTestError] = useState('');

  // ────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    // Load LLM config from localStorage
    try {
      const stored = localStorage.getItem('rig_llm_config');
      if (stored) {
        const cfg: LLMConfig = JSON.parse(stored);
        setLlmConfigState(cfg);
        setLLMConfig(cfg);
        setSetupProvider(cfg.provider);
        setSetupApiKey(cfg.apiKey);
        setSetupModel(cfg.model);
      } else {
        // No stored config — check if env var key is available (dev mode / Vercel deploy with key)
        const hasEnvKey = !!(process.env as any).API_KEY || !!(process.env as any).GEMINI_API_KEY;
        if (!hasEnvKey) setShowSetupModal(true);
      }
    } catch {}
    initializeChat(settings);
    loadFeed();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Sync pending settings whenever settings view opens
  useEffect(() => {
    if (view === AppView.SETTINGS) setPendingSettings({ ...settings });
  }, [view]);

  // ────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ────────────────────────────────────────────────────────────────────────────

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || isChatLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const reply = await sendGeminiMessage(text);
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', content: reply, timestamp: new Date() }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', content: e.message || 'Error.', timestamp: new Date(), isError: true }]);
    } finally { setIsChatLoading(false); }
  };

  const handleDiscoverJournals = async () => {
    const topic = journalDiscoveryTopic || feedTopics[0] || settings.field;
    setIsSuggestingJournals(true);
    try { setJournalSuggestions(await suggestJournals(topic)); }
    catch (e) { console.error(e); }
    finally { setIsSuggestingJournals(false); }
  };

  const toggleJournalSelection = (name: string) =>
    setJournalSuggestions(prev => prev.map(j => j.name === name ? { ...j, selected: !j.selected } : j));

  const applySelectedJournals = () => {
    const selected = journalSuggestions.filter(j => j.selected).map(j => j.name);
    if (selected.length > 0) {
      const existing = feedJournals.split(',').map(s => s.trim()).filter(Boolean);
      setFeedJournals(Array.from(new Set([...existing, ...selected])).join(', '));
    }
    setShowJournalDiscovery(false);
  };

  const loadFeed = async () => {
    setIsFeedLoading(true); setFeedError(null); setFeed([]); setLoadedCount(0);
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
      if (results.flatMap(r => r.status === 'fulfilled' ? r.value : []).length === 0)
        setFeedError("No papers found. Try changing your topic or date range.");
    } catch (e: any) {
      setFeedError(e.message || "Failed to load feed.");
    } finally { setIsFeedLoading(false); setLoadingJournals([]); }
  };

  const addTopic = (name: string) => {
    const t = name.trim(); if (!t) return;
    setFeedTopics(prev => prev.some(x => x.toLowerCase() === t.toLowerCase()) ? prev : [...prev, t]);
    setAddTopicInput(''); setShowAddTopic(false);
  };
  const removeTopic = (name: string) => setFeedTopics(prev => prev.filter(t => t !== name));

  const addJournal = (name: string) => {
    const t = name.trim(); if (!t) return;
    const existing = feedJournals.split(',').map(s => s.trim()).filter(Boolean);
    if (!existing.some(j => j.toLowerCase() === t.toLowerCase()))
      setFeedJournals([...existing, t].join(', '));
    setAddJournalInput(''); setShowAddJournal(false);
  };
  const removeJournal = (name: string) =>
    setFeedJournals(feedJournals.split(',').map(s => s.trim()).filter(j => j.toLowerCase() !== name.toLowerCase()).join(', '));

  const toggleSavePaper = (item: FeedItem) =>
    setSettings(prev => ({
      ...prev,
      savedPapers: prev.savedPapers.some(p => p.title === item.title)
        ? prev.savedPapers.filter(p => p.title !== item.title)
        : [...prev.savedPapers, item]
    }));

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
    finally { setGeneratingImages(prev => { const s = new Set(prev); s.delete(item.title); return s; }); }
  };

  const openInStudio = (item: FeedItem) => {
    setStudioItem(item); setStudioContent({}); setStudioTab('SUMMARY');
    setStudioUploadedAtt(null); setStudioUploadedLink(null); setView(AppView.ANALYZE);
    runAnalysis('SUMMARY', item).then(() => runAnalysis('IMPACT', item));
  };

  const handleManualUpload = (text: string, attachment: Attachment | null, link: string | null, mode: string) => {
    const newItem: FeedItem = {
      title: attachment ? "Uploaded Document Analysis" : (link ? "Link Analysis" : "Text Analysis"),
      journal: "User Upload", date: new Date().toISOString().split('T')[0],
      link: link || "", summary: text.substring(0, 150) + "...", isUploaded: true
    };
    setStudioItem(newItem); setStudioUploadedAtt(attachment); setStudioUploadedLink(link);
    setStudioContent({}); setStudioTab('SUMMARY'); setView(AppView.ANALYZE);
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
      if (mode === 'SUMMARY') result = await generatePaperSummary(item.title, linkToUse, attToUse);
      else if (mode === 'IMPACT') {
        const res = await calculatePaperImpact(item.title, item.summary, linkToUse || "");
        setStudioItem(prev => prev ? ({ ...prev, ...res }) : null);
        result = res.reasoning;
      } else if (mode === 'FUSION') {
        result = await analyzeContent(`Idea Fusion ${item.title} with ${customInput || settings.field}`, attToUse, linkToUse, 'FUSION', item.title);
      } else {
        result = await analyzeContent(mode, attToUse, linkToUse, mode, item.title);
      }
      setStudioContent(prev => ({ ...prev, [mode]: result }));
    } catch (e) {
      setStudioContent(prev => ({ ...prev, [mode]: "Analysis failed. Please try again." }));
    } finally { setIsStudioAnalyzing(false); }
  };

  const handleFusionLab = async () => {
    if (!fusionTarget.trim() || isFusing) return;
    setIsFusing(true); setFusionResults([]);
    try {
      const prompt = `You are a cross-domain research synthesis engine. Generate exactly 3 novel hypotheses by fusing [${feedTopics.join(', ')}] research with [${fusionTarget}].

Return ONLY a JSON array with 3 objects, no markdown, no extra text:
[
  { "type": "INCREMENTAL", "confidence": 90, "title": "5-8 word title", "description": "2-sentence scientific basis" },
  { "type": "DISRUPTIVE", "confidence": 68, "title": "...", "description": "..." },
  { "type": "WILDCARD", "confidence": 32, "title": "...", "description": "..." }
]`;
      const raw = await analyzeContent(prompt, null, null, 'FUSION', 'standalone');
      const jsonMatch = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').match(/\[[\s\S]*\]/);
      if (jsonMatch) setFusionResults(JSON.parse(jsonMatch[0]));
      setFusionStrength(+(0.7 + Math.random() * 0.2).toFixed(2));
    } catch (e) {
      setFusionResults([
        { type: 'INCREMENTAL', confidence: 88, title: 'Cross-domain methodology transfer', description: `Applying ${feedTopics[0]} techniques to ${fusionTarget} problems via established frameworks. Creates new validation pathways with minimal paradigm disruption.` },
        { type: 'DISRUPTIVE', confidence: 67, title: 'Inverse principle application', description: `Reversing causal direction: ${fusionTarget} constraints informing ${feedTopics[0]} system design. Challenges fundamental assumptions about domain boundaries.` },
        { type: 'WILDCARD', confidence: 31, title: 'Emergent intelligence via boundary dissolution', description: `Treating the ${fusionTarget}/${feedTopics[0]} interface as a new field entirely. Requires abandoning domain-specific ontologies for emergent frameworks.` },
      ]);
      setFusionStrength(0.84);
    } finally { setIsFusing(false); }
  };

  const handleChallengeIdea = async (hyp: FusionHypothesis) => {
    setChallengedHypothesis(hyp);
    setIsChallengingIdea(true);
    setChallengeStressTests([]);
    setSkepticalCritiques([]);
    setPrimaryHurdles([]);
    try {
      const prompt = `You are a rigorous scientific adversarial critic. Challenge this research hypothesis thoroughly.

Hypothesis Title: "${hyp.title}"
Description: "${hyp.description}"

Return ONLY valid JSON (no markdown):
{
  "stressTests": [
    { "title": "Stress Test 01: Hardware/Empirical Fidelity", "description": "Specific technical challenge question (2 sentences)", "color": "cyan" },
    { "title": "Stress Test 02: Scalability/Resource Ceiling", "description": "Specific resource or scalability challenge (2 sentences)", "color": "amber" },
    { "title": "Stress Test 03: Reproducibility/Fallback", "description": "Specific reproducibility or failure-mode challenge (2 sentences)", "color": "rose" }
  ],
  "critiques": [
    { "id": "C1", "content": "Italic-style critical quote challenging a core assumption (1-2 sentences, start with quote mark)" },
    { "id": "C2", "content": "Italic-style critical quote on methodological weakness (1-2 sentences, start with quote mark)" }
  ],
  "hurdles": [
    { "name": "Data Scarcity", "percent": 82, "color": "cyan" },
    { "name": "Methodological Leap", "percent": 45, "color": "amber" },
    { "name": "Regulatory Friction", "percent": 12, "color": "rose" }
  ]
}`;
      const raw = await analyzeContent(prompt, null, null, 'FUSION', 'challenge');
      const jsonMatch = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setChallengeStressTests(parsed.stressTests || []);
        setSkepticalCritiques(parsed.critiques || []);
        setPrimaryHurdles(parsed.hurdles || []);
      }
    } catch (e) {
      setChallengeStressTests([
        { title: 'Stress Test 01: Empirical Basis', description: `Can current measurement infrastructure validate the core claim at scale? What is the minimum viable dataset required to establish statistical confidence?`, color: 'cyan' },
        { title: 'Stress Test 02: Resource Ceiling', description: `Evaluate whether computational or physical resource requirements degrade non-linearly beyond controlled experimental bounds.`, color: 'amber' },
        { title: 'Stress Test 03: Reproducibility Protocol', description: `Can independent teams replicate the core mechanism without access to proprietary infrastructure or closed datasets?`, color: 'rose' }
      ]);
      setSkepticalCritiques([
        { id: 'C1', content: `"The premise assumes stable boundary conditions. You're ignoring emergent complexity effects that would systematically invalidate the core mechanism under real-world field conditions."` },
        { id: 'C2', content: `"Is this truly novel or incremental reframing? The cited methodology closely mirrors existing frameworks with cosmetic domain substitutions rather than fundamental innovation."` }
      ]);
      setPrimaryHurdles([
        { name: 'Data Scarcity', percent: 82, color: 'cyan' },
        { name: 'Methodological Leap', percent: 45, color: 'amber' },
        { name: 'Regulatory Friction', percent: 12, color: 'rose' }
      ]);
    } finally { setIsChallengingIdea(false); }
  };

  const saveSettings = () => setSettings({ ...pendingSettings });

  const handleSaveLLMConfig = (provider: LLMProvider, apiKey: string, model: string) => {
    const cfg: LLMConfig = { provider, apiKey, model };
    setLlmConfigState(cfg);
    setLLMConfig(cfg);
    localStorage.setItem('rig_llm_config', JSON.stringify(cfg));
    // Re-init chat with new provider
    initializeChat(settings);
    setConnTestResult('idle');
    setShowSetupModal(false);
  };

  const handleTestConnection = async () => {
    if (!setupApiKey.trim()) return;
    setIsTestingConn(true);
    setConnTestResult('idle');
    setConnTestError('');
    const result = await testConnection({ provider: setupProvider, apiKey: setupApiKey, model: setupModel });
    setIsTestingConn(false);
    if (result.ok) {
      setConnTestResult('ok');
    } else {
      setConnTestResult('error');
      setConnTestError(result.error || 'Connection failed');
    }
  };

  const handleProviderChange = (p: LLMProvider) => {
    setSetupProvider(p);
    setSetupModel(PROVIDER_MODELS[p][0].id);
    setConnTestResult('idle');
    setConnTestError('');
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  const apiKeyMissing = !llmConfig && !process.env.API_KEY && !process.env.GEMINI_API_KEY;
  const nonGeminiProvider = llmConfig && llmConfig.provider !== 'gemini';
  const journalList = feedJournals.split(',').map(s => s.trim()).filter(Boolean);

  const NAV_ITEMS = [
    { id: AppView.FEED, label: 'Feed', icon: BookOpen },
    { id: AppView.ANALYZE, label: 'Studio', icon: FlaskConical },
    { id: AppView.CHAT, label: 'Chat', icon: Send },
    { id: AppView.NOTEBOOK, label: 'Notebook', icon: FileText },
    { id: AppView.FUSION_LAB, label: 'Fusion Lab', icon: Zap },
  ];

  const stressBorderColor = { cyan: 'border-l-cyan-400', amber: 'border-l-amber-400', rose: 'border-l-rose-500' } as const;
  const stressTextColor = { cyan: 'text-cyan-400', amber: 'text-amber-400', rose: 'text-rose-400' } as const;
  const hurdleBarColor = { cyan: 'bg-cyan-500', amber: 'bg-amber-500', rose: 'bg-rose-500' } as const;

  return (
    <div className={`flex h-screen overflow-hidden font-sans ${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen w-full overflow-hidden bg-[#0a0f1c] text-slate-100">

        {/* ── API KEY BANNER ───────────────────────────────────────────────── */}
        {apiKeyMissing && (
          <div className="fixed top-0 inset-x-0 z-[200] bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-3 px-6 py-2">
            <AlertTriangle size={16} />
            <span>GEMINI_API_KEY is not set. Add it to <code className="font-mono bg-amber-600/60 px-1 rounded">.env.local</code> and restart.</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SIDEBAR
        ════════════════════════════════════════════════════════════════════ */}
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
            <p className="text-[10px] text-slate-600 mt-1 ml-[30px] uppercase tracking-widest">AI Research Workspace</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setView(id); if (id === AppView.FUSION_LAB) setChallengedHypothesis(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-l-2 ${
                  view === id
                    ? 'bg-slate-700/40 text-white border-cyan-400 pl-[10px]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
                }`}>
                <Icon size={15} />
                {label}
                {id === AppView.FUSION_LAB && fusionResults.length > 0 && (
                  <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">{fusionResults.length}</span>
                )}
              </button>
            ))}

            {/* New Research button */}
            <div className="pt-3">
              <button onClick={() => { setStudioItem(null); setView(AppView.ANALYZE); }}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all">
                <Plus size={14} /> New Research
              </button>
            </div>

            <div className="pt-2 mt-1 border-t border-slate-800 space-y-0.5">
              <button onClick={() => setView(AppView.SETTINGS)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-l-2 ${
                  view === AppView.SETTINGS
                    ? 'bg-slate-700/40 text-white border-cyan-400 pl-[10px]'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border-transparent'
                }`}>
                <Settings size={15} /> Settings
              </button>
              <a href="mailto:support@rigcatalyst.ai"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-all border-l-2 border-transparent">
                <AlertTriangle size={15} /> Support
              </a>
            </div>
          </nav>

          {/* Active studio context badge */}
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

        {/* ═══════════════════════════════════════════════════════════════════
            MAIN AREA
        ════════════════════════════════════════════════════════════════════ */}
        <div className={`flex-1 flex flex-col h-screen overflow-hidden ${apiKeyMissing ? 'mt-9' : ''}`}>

          {/* ── TOP BAR ──────────────────────────────────────────────────── */}
          <header className="h-14 shrink-0 flex items-center gap-4 px-6 bg-[#0f172a] border-b border-slate-800 z-40">
            <div className="flex-1 max-w-xs">
              <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 cursor-pointer hover:border-slate-600 transition-colors">
                <Search size={13} className="text-slate-500" />
                <span className="text-slate-500 text-sm">Search knowledge base…</span>
                <span className="ml-auto text-[10px] text-slate-600 font-mono bg-slate-700/50 px-1.5 py-0.5 rounded">⌘K</span>
              </div>
            </div>

            <div className="flex items-center gap-0">
              {(['Generalist', 'Researcher', 'Expert'] as const).map((mode, i) => (
                <button key={mode} onClick={() => setExpertMode(mode)}
                  className={`px-3 py-1 text-sm transition-all ${expertMode === mode ? 'text-white font-bold border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent'} ${i > 0 ? 'ml-1' : ''}`}>
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 ml-auto">
              {/* Active LLM badge */}
              <button onClick={() => setShowSetupModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700 hover:border-slate-600 text-xs text-slate-400 hover:text-slate-200 transition-all mr-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
                {llmConfig ? PROVIDER_LABELS[llmConfig.provider] : 'Gemini (default)'}
                <span className="text-slate-600">·</span>
                <span className="font-mono text-[10px] text-slate-500">{llmConfig?.model?.split('/').pop()?.replace('gemini-', 'g-') || 'g-2.5-flash'}</span>
              </button>
              <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors" title="History"><Clock size={16} /></button>
              <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors" title="Notifications"><Bell size={16} /></button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-400 hover:text-slate-200 transition-colors">
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <div className="w-8 h-8 bg-cyan-700/80 rounded-full flex items-center justify-center text-white text-xs font-bold ml-1 shrink-0">
                {settings.name[0]?.toUpperCase() ?? 'R'}
              </div>
            </div>
          </header>

          {/* ── NON-GEMINI FEED WARNING ──────────────────────────────────── */}
          {view === AppView.FEED && nonGeminiProvider && (
            <div className="shrink-0 flex items-center gap-3 px-6 py-2 bg-amber-500/10 border-b border-amber-500/20">
              <AlertTriangle size={13} className="text-amber-400 shrink-0" />
              <span className="text-amber-300 text-xs">
                Using <strong>{PROVIDER_LABELS[llmConfig!.provider]}</strong> — live paper search works best with Gemini (Google grounding). Papers shown may be AI-generated estimates.
              </span>
              <button onClick={() => setShowSetupModal(true)} className="ml-auto text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 shrink-0">Switch Provider</button>
            </div>
          )}

          {/* ── FEED CONTROLS (Feed only) ─────────────────────────────────── */}
          {view === AppView.FEED && (
            <div className="shrink-0 px-5 py-3 bg-[#0d1421] border-b border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2">

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">Focus</span>
                {feedTopics.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-700/50 border border-slate-600/70 text-slate-200 rounded-full text-[11px] font-medium">
                    {t}
                    {feedTopics.length > 1 && <button onClick={() => removeTopic(t)} className="hover:text-red-400 ml-0.5"><X size={9} /></button>}
                  </span>
                ))}
                {showAddTopic ? (
                  <AutocompleteInput autoFocus value={addTopicInput} onChange={setAddTopicInput} onSelect={addTopic}
                    onKeyDown={e => { if (e.key === 'Enter') addTopic(addTopicInput); if (e.key === 'Escape') { setShowAddTopic(false); setAddTopicInput(''); } }}
                    onBlur={() => { if (!addTopicInput) setShowAddTopic(false); }}
                    suggestions={POPULAR_RESEARCH_AREAS} placeholder="Research area…"
                    className="px-2.5 py-0.5 bg-slate-800 border border-cyan-500/50 rounded-full text-[11px] outline-none w-40 text-slate-200" />
                ) : (
                  <button onClick={() => setShowAddTopic(true)} className="flex items-center gap-0.5 px-2 py-0.5 border border-dashed border-slate-600 text-slate-500 hover:text-cyan-400 hover:border-cyan-500 rounded-full text-[11px] transition-colors">
                    <Plus size={9} /> Add
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap relative">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">Journals</span>
                {journalList.map(j => (
                  <span key={j} className="flex items-center gap-1 px-2.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full text-[11px] font-medium">
                    {j} <button onClick={() => removeJournal(j)} className="hover:text-red-400 ml-0.5"><X size={9} /></button>
                  </span>
                ))}
                {showAddJournal ? (
                  <AutocompleteInput autoFocus value={addJournalInput} onChange={setAddJournalInput} onSelect={addJournal}
                    onKeyDown={e => { if (e.key === 'Enter') addJournal(addJournalInput); if (e.key === 'Escape') { setShowAddJournal(false); setAddJournalInput(''); } }}
                    onBlur={() => { if (!addJournalInput) setShowAddJournal(false); }}
                    suggestions={POPULAR_JOURNALS} placeholder="Journal…"
                    className="px-2.5 py-0.5 bg-slate-800 border border-cyan-500/50 rounded-full text-[11px] outline-none w-36 text-slate-200" />
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
                  <div className="absolute top-9 left-0 w-96 bg-[#0d1421] rounded-xl shadow-2xl border border-slate-700 z-[60] p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm"><Sparkles size={14} className="text-amber-400" /> Journal Scout</h3>
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
                    <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                      {journalSuggestions.length === 0 && !isSuggestingJournals && (
                        <div className="text-center py-6 text-slate-500 text-xs">Enter a topic and click Find.</div>
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
                    <button onClick={applySelectedJournals} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-sm">Apply Selected Journals</button>
                  </div>
                )}
              </div>

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
                <button onClick={loadFeed} className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                  <RefreshCw size={11} className={isFeedLoading ? 'animate-spin' : ''} /> Update Feed
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              CONTENT AREA
          ══════════════════════════════════════════════════════════════════ */}
          <main className="flex-1 overflow-hidden relative">

            {/* ────────────────── FEED VIEW ────────────────── */}
            <div className={`h-full overflow-y-auto ${view === AppView.FEED ? 'block' : 'hidden'}`}>
              <div className="p-6 max-w-7xl mx-auto">
                {isFeedLoading && (
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-400">
                        {loadingJournals.length > 0 ? `Fetching from ${loadingJournals.slice(0, 3).join(', ')}…` : 'Curating papers…'}
                      </span>
                      {loadedCount > 0 && <span className="text-xs font-bold text-cyan-400">{loadedCount} loaded</span>}
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: loadedCount > 0 ? `${Math.min(100, (loadedCount / feedLimit) * 100)}%` : '15%' }} />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div onClick={() => { setStudioItem(null); setView(AppView.ANALYZE); }}
                    className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl overflow-hidden cursor-pointer hover:from-cyan-500 hover:to-blue-600 transition-all group border border-cyan-500/30 min-h-[320px] flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload size={22} className="text-white" />
                      </div>
                      <h4 className="text-white font-bold text-lg mb-2">Analyze Your Paper</h4>
                      <p className="text-white/70 text-sm leading-relaxed mb-5">Upload a PDF or paste a DOI to perform deep synthesis, gap detection, and peer critique.</p>
                      <div className="w-full py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                        <FileText size={14} /> Select Document
                      </div>
                    </div>
                  </div>
                  {feed.map((item, i) => (
                    <FeedCard key={i} item={item} onOpen={openInStudio} onGenerateImage={handleGenerateImage}
                      onSave={toggleSavePaper} onCite={p => setCiteItem(p)}
                      isGeneratingImage={generatingImages.has(item.title)}
                      isSaved={settings.savedPapers.some(p => p.title === item.title)} />
                  ))}
                  {isFeedLoading && Array.from({ length: Math.max(0, feedLimit - feed.length) }).map((_, i) => <FeedCardSkeleton key={`sk-${i}`} />)}
                </div>
                {feedError && !isFeedLoading && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16">
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 max-w-lg w-full text-center">
                      <AlertTriangle size={32} className="text-amber-400 mx-auto mb-4" />
                      <h3 className="font-bold text-slate-100 mb-2">No Papers Found</h3>
                      <p className="text-slate-400 text-sm mb-5">{feedError}</p>
                      <div className="text-left bg-slate-900/50 rounded-xl p-4 mb-5 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Quick Fixes</p>
                        <button onClick={() => { const d = new Date(); d.setFullYear(d.getFullYear() - 2); setFeedDateCutoff(d.toISOString().split('T')[0]); setTimeout(loadFeed, 100); }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2">
                          <ArrowRight size={12} className="text-cyan-500 shrink-0" /> Widen date range to 2 years
                        </button>
                        <button onClick={() => { setFeedTopics(['Artificial Intelligence']); setFeedJournals('Nature, Science, arXiv'); setTimeout(loadFeed, 100); }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2">
                          <ArrowRight size={12} className="text-cyan-500 shrink-0" /> Reset to AI / arXiv defaults
                        </button>
                        <button onClick={loadFeed}
                          className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2">
                          <RefreshCw size={12} className="text-cyan-500 shrink-0" /> Retry with same settings
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600">Tip: Niche topics work best with field-specific journals (e.g. "Geoderma" for soil science) rather than broad ones like Nature or Science.</p>
                    </div>
                  </div>
                )}
                {!isFeedLoading && !feedError && feed.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <BookOpen size={48} className="mb-4 opacity-10 text-slate-400" />
                    <p className="font-medium text-slate-500 text-lg mb-1">No papers found</p>
                    <p className="text-sm text-slate-600">Refine your focus topics or expand your journal scout radius.</p>
                  </div>
                )}
              </div>
            </div>

            {/* ────────────────── ANALYSIS STUDIO ────────────────── */}
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
                        <button onClick={() => setCiteItem(studioItem)} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:border-slate-600 text-slate-300 rounded-lg text-xs font-bold">
                          <Quote size={13} /> Cite
                        </button>
                        <button onClick={() => toggleSavePaper(studioItem)} className={`p-1.5 rounded-lg border transition-colors ${settings.savedPapers.some(p => p.title === studioItem?.title) ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                          <Bookmark size={15} fill={settings.savedPapers.some(p => p.title === studioItem?.title) ? "currentColor" : "none"} />
                        </button>
                        {studioItem.link && (
                          <a href={studioItem.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:border-slate-600 text-slate-300 rounded-lg text-xs font-bold">
                            <Link size={13} /> Source
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
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
                      <button key={tab.id} onClick={() => { setStudioTab(tab.id); runAnalysis(tab.id, studioItem); }}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${studioTab === tab.id ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                        <tab.icon size={13} /> {tab.label}
                      </button>
                    ))}
                  </div>
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
                              <input value={studioFusionInput} onChange={e => setStudioFusionInput(e.target.value)} placeholder={`e.g. ${settings.field}`}
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
                            <button onClick={() => runAnalysis('FUSION', studioItem, studioFusionInput || settings.field)} disabled={isStudioAnalyzing}
                              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all">
                              {isStudioAnalyzing ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                              {studioContent.FUSION ? 'Re-Fuse Ideas' : 'Generate Idea Fusion'}
                            </button>
                          </div>
                          <div className="lg:col-span-2">
                            {studioContent.FUSION ? (
                              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6"><MarkdownMessage content={studioContent.FUSION} /></div>
                            ) : (
                              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-12 text-center min-h-[260px] flex flex-col justify-center items-center">
                                <Zap size={40} className="text-amber-400/30 mb-4" />
                                <p className="font-semibold text-slate-400 mb-1">Awaiting Fusion Command</p>
                                <p className="text-sm text-slate-500">Select your target domain and click Generate.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          {studioTab === 'IMPACT' && studioItem.impactMetrics && (
                            <div className="mb-6 h-72 w-full max-w-xl mx-auto"><SimpleChart data={studioItem.impactMetrics} /></div>
                          )}
                          <MarkdownMessage content={studioContent[studioTab] || studioItem.impactReasoning || "Select a tab to begin analysis."} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ────────────────── CHAT VIEW ────────────────── */}
            <div className={`h-full flex flex-col ${view === AppView.CHAT ? 'block' : 'hidden'}`}>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 bg-cyan-500/15 border border-cyan-500/20 rounded-2xl flex items-center justify-center mb-4">
                        <Sparkles size={30} className="text-cyan-400" />
                      </div>
                      <h2 className="text-3xl font-bold text-slate-100 mb-2">AI Research Assistant</h2>
                      <p className="text-slate-400 mb-8 max-w-md text-sm leading-relaxed">
                        I can help synthesize papers, analyze datasets, explain complex methodologies, or help you brainstorm. How shall we begin?
                      </p>
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
                      <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm ${msg.role === 'user' ? 'bg-cyan-700 text-white rounded-br-sm' : msg.isError ? 'bg-red-500/10 border border-red-500/30 text-red-400 rounded-bl-sm' : 'bg-slate-800/70 border border-slate-700/50 text-slate-100 rounded-bl-sm'}`}>
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
                          {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
              </div>
              <div className="border-t border-slate-800 bg-[#0d1421] p-4">
                <div className="max-w-3xl mx-auto">
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden focus-within:border-slate-600 transition-colors">
                    <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                      placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
                      rows={2}
                      className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-slate-200 placeholder-slate-500 outline-none resize-none" />
                    <div className="flex items-center justify-between px-3 pb-2">
                      <div className="flex gap-1 text-slate-500">
                        <button className="p-1.5 hover:text-slate-300 transition-colors"><Upload size={15} /></button>
                        <button className="p-1.5 hover:text-slate-300 transition-colors"><ImageIcon size={15} /></button>
                      </div>
                      <button onClick={handleSendChat} disabled={!chatInput.trim() || isChatLoading}
                        className="flex items-center gap-2 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-all">
                        Send <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="text-center text-[10px] text-slate-700 mt-2 uppercase tracking-widest">Powered by RIG Fusion-1 Intelligence Model</p>
                </div>
              </div>
            </div>

            {/* ────────────────── NOTEBOOK VIEW ────────────────── */}
            <div className={`h-full overflow-y-auto p-6 ${view === AppView.NOTEBOOK ? 'block' : 'hidden'}`}>
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-serif font-bold text-slate-100">Notebook</h2>
                  <span className="text-slate-500 text-sm bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">{settings.savedPapers.length} saved</span>
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
                          {paper.visualAbstract ? <img src={`data:image/png;base64,${paper.visualAbstract}`} className="w-full h-full object-cover rounded-lg" /> : <FileText className="text-slate-500" size={18} />}
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

            {/* ────────────────── FUSION LAB ────────────────── */}
            <div className={`h-full flex flex-col ${view === AppView.FUSION_LAB ? 'flex' : 'hidden'}`}>
              {challengedHypothesis ? (
                /* ──── CHALLENGE IDEA SUB-VIEW ──── */
                <div className="h-full flex flex-col">

                  {/* Challenge header */}
                  <div className="bg-[#0d1421] border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setChallengedHypothesis(null)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                        <ArrowLeft size={16} />
                      </button>
                      <div className="w-px h-5 bg-slate-700" />
                      <h2 className="text-base font-bold text-slate-100">Challenge Idea</h2>
                    </div>
                    <div className="flex gap-3">
                      <button className="px-4 py-1.5 border border-slate-700 hover:border-slate-600 text-slate-300 rounded-lg text-xs font-bold transition-colors uppercase tracking-wide">
                        Export Report
                      </button>
                      <button
                        onClick={() => {
                          setFusionResults(prev => prev.filter(h => h.title !== challengedHypothesis.title));
                          setChallengedHypothesis(null);
                        }}
                        className="px-4 py-1.5 border border-rose-500/50 text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-500/10 flex items-center gap-2 transition-colors uppercase tracking-wide">
                        <Trash2 size={12} /> Dismiss Idea
                      </button>
                    </div>
                  </div>

                  {/* Challenge content */}
                  <div className="flex-1 overflow-hidden flex">

                    {/* Left — original hypothesis + stress tests */}
                    <div className="flex-1 overflow-y-auto p-6 border-r border-slate-800">
                      {/* Original Hypothesis card */}
                      <div className="p-5 bg-slate-800/40 border border-slate-700/50 rounded-xl mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded">CONTEXT</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ORIGINAL HYPOTHESIS V1.4</span>
                        </div>
                        <h3 className="text-cyan-400 font-bold text-lg mb-2 leading-snug">{challengedHypothesis.title}</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">{challengedHypothesis.description}</p>
                      </div>

                      {/* Stress Tests */}
                      {isChallengingIdea ? (
                        <div className="flex items-center justify-center py-16 text-slate-500">
                          <RefreshCw size={24} className="animate-spin mr-3 text-amber-400" />
                          <span className="animate-pulse text-sm">Simulating stress tests…</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* First stress test — full width */}
                          {challengeStressTests[0] && (
                            <div className={`p-4 border border-slate-700/50 border-l-2 ${stressBorderColor[challengeStressTests[0].color]} bg-slate-800/30 rounded-xl`}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <Zap size={13} className={stressTextColor[challengeStressTests[0].color]} />
                                <h4 className={`font-bold text-sm ${stressTextColor[challengeStressTests[0].color]}`}>{challengeStressTests[0].title}</h4>
                              </div>
                              <p className="text-slate-400 text-sm leading-relaxed">{challengeStressTests[0].description}</p>
                            </div>
                          )}
                          {/* Remaining tests — 2-column grid */}
                          {challengeStressTests.length > 1 && (
                            <div className="grid grid-cols-2 gap-3">
                              {challengeStressTests.slice(1).map((test, i) => (
                                <div key={i} className={`p-4 border border-slate-700/50 border-l-2 ${stressBorderColor[test.color]} bg-slate-800/30 rounded-xl`}>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Zap size={12} className={stressTextColor[test.color]} />
                                    <h4 className={`font-bold text-xs ${stressTextColor[test.color]}`}>{test.title}</h4>
                                  </div>
                                  <p className="text-slate-400 text-xs leading-relaxed">{test.description}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right — Skeptical Review + Hurdles + Simulation */}
                    <div className="w-72 shrink-0 overflow-y-auto p-4 space-y-4">

                      {/* Skeptical Review */}
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-slate-100 text-sm">Skeptical Review</h3>
                          <div className="p-1.5 bg-slate-700/60 rounded-lg"><Shield size={13} className="text-slate-400" /></div>
                        </div>
                        {isChallengingIdea ? (
                          <div className="space-y-2">
                            {[1, 2].map(i => <div key={i} className="h-12 bg-slate-700/40 rounded-lg animate-pulse" />)}
                          </div>
                        ) : (
                          <div className="space-y-3 mb-4">
                            {skepticalCritiques.map(c => (
                              <div key={c.id} className="flex gap-2.5">
                                <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-black text-slate-300 shrink-0 mt-0.5">{c.id}</span>
                                <p className="text-slate-400 text-xs italic leading-relaxed">{c.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <button className="w-full py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 rounded-lg text-sm font-medium transition-colors">
                          Refine Hypothesis
                        </button>
                      </div>

                      {/* Primary Hurdles */}
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Primary Hurdles</h3>
                        {isChallengingIdea ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-700/40 rounded animate-pulse" />)}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {primaryHurdles.map((h, i) => (
                              <div key={i}>
                                <div className="flex justify-between mb-1.5">
                                  <span className="text-sm font-medium text-slate-300">{h.name}</span>
                                  <span className="text-sm font-bold text-slate-400">{h.percent}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div className={`h-full ${hurdleBarColor[h.color] || 'bg-cyan-500'} rounded-full transition-all duration-700`} style={{ width: `${h.percent}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Simulation panel */}
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
                        <div className="h-28 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 relative">
                          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,_#06b6d4,_transparent_60%)]" />
                          <RefreshCw size={22} className="text-cyan-400 mb-2 animate-spin" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 text-center">Simulating Counter-Arguments…</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Classified footer */}
                  <div className="h-8 border-t border-slate-800 bg-[#0d1421] flex items-center justify-end px-6 shrink-0">
                    <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">L-SECURE CLASSIFIED</span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full ml-2 animate-pulse" />
                  </div>
                </div>
              ) : (
                /* ──── NORMAL FUSION LAB VIEW ──── */
                <div className="h-full flex">
                  {/* Left control panel */}
                  <div className="w-80 shrink-0 border-r border-slate-800 p-6 flex flex-col bg-[#0d1421] overflow-y-auto">
                    <div className="flex items-start gap-2 mb-2">
                      <Zap size={22} className="text-amber-400 fill-amber-400 mt-0.5 shrink-0" />
                      <h2 className="text-xl font-black text-slate-100 leading-tight">Trans-Domain<br />Fusion</h2>
                    </div>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                      Synthesize cross-disciplinary hypotheses by bridging isolated research domains with RIG's core intelligence models.
                    </p>
                    <div className="mb-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Target Domain</label>
                      <input value={fusionTarget} onChange={e => setFusionTarget(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleFusionLab(); }}
                        placeholder="e.g. Behavioral Economics, Quantum Biology"
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 outline-none focus:border-amber-500 transition-all" />
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
                    <button onClick={handleFusionLab} disabled={isFusing || !fusionTarget.trim()}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 rounded-xl font-black text-sm flex items-center justify-center gap-2 uppercase tracking-wide transition-all mb-6">
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
                        <span className="text-slate-500 text-sm">{fusionResults.length} Results · <span className="text-slate-600">v1.2.4 Fusion Engine</span></span>
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
                              <button
                                onClick={() => handleChallengeIdea(hyp)}
                                className="flex items-center gap-1.5 px-4 py-1.5 border border-rose-500/40 text-rose-400 text-sm font-medium rounded-lg hover:bg-rose-500/10 transition-colors">
                                <AlertTriangle size={12} /> Challenge Idea
                              </button>
                              <button
                                onClick={() => {
                                  const item: FeedItem = { title: hyp.title, journal: 'Fusion Lab', date: new Date().toISOString().split('T')[0], link: '', summary: hyp.description };
                                  setSettings(prev => ({ ...prev, savedPapers: [...prev.savedPapers.filter(p => p.title !== hyp.title), item] }));
                                }}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-sm font-medium rounded-lg hover:bg-cyan-500/20 transition-colors">
                                <Plus size={12} /> Add to Notebook
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ────────────────── SETTINGS VIEW ────────────────── */}
            <div className={`h-full overflow-y-auto p-6 ${view === AppView.SETTINGS ? 'block' : 'hidden'}`}>
              <div className="max-w-5xl mx-auto">

                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-100">Profile & Research Workspace</h2>
                  <p className="text-slate-400 text-sm mt-1">Configure your synthesis environment and manage your saved assets.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* ── Left column (2/3) */}
                  <div className="lg:col-span-2 space-y-5">

                    {/* LLM Provider Card */}
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-slate-100 flex items-center gap-2">
                          <Zap size={16} className="text-amber-400" /> AI Provider
                        </h3>
                        {llmConfig && (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            {PROVIDER_LABELS[llmConfig.provider]} · {llmConfig.model.split('/').pop()}
                          </span>
                        )}
                      </div>

                      {/* Provider selector */}
                      <div className="grid grid-cols-3 gap-2 mb-5">
                        {(['gemini', 'openai', 'openrouter'] as LLMProvider[]).map(p => (
                          <button key={p} onClick={() => handleProviderChange(p)}
                            className={`p-3 rounded-xl border text-left transition-all ${setupProvider === p ? 'border-amber-500/60 bg-amber-500/10' : 'border-slate-700/50 hover:border-slate-600 bg-slate-900/40'}`}>
                            <div className={`text-sm font-bold mb-0.5 ${setupProvider === p ? 'text-amber-300' : 'text-slate-300'}`}>{PROVIDER_LABELS[p]}</div>
                            <div className="text-[10px] text-slate-500 leading-snug">{PROVIDER_DESCRIPTIONS[p]}</div>
                          </button>
                        ))}
                      </div>

                      {/* Model selector */}
                      <div className="mb-4">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Model</label>
                        <select value={setupModel} onChange={e => { setSetupModel(e.target.value); setConnTestResult('idle'); }}
                          className="w-full p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-slate-200 text-sm outline-none focus:border-amber-500 transition-colors">
                          {PROVIDER_MODELS[setupProvider].map(m => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* API Key input */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">API Key</label>
                          <a href={PROVIDER_KEY_URLS[setupProvider]} target="_blank" rel="noreferrer"
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                            Get your key →
                          </a>
                        </div>
                        <div className="relative">
                          <input
                            type={setupShowKey ? 'text' : 'password'}
                            value={setupApiKey}
                            onChange={e => { setSetupApiKey(e.target.value); setConnTestResult('idle'); }}
                            placeholder={`Paste your ${PROVIDER_LABELS[setupProvider]} API key…`}
                            className="w-full p-3 pr-20 bg-slate-900/60 border border-slate-700/50 rounded-xl text-slate-200 text-sm outline-none focus:border-amber-500 transition-colors font-mono placeholder-slate-600"
                          />
                          <button onClick={() => setSetupShowKey(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                            {setupShowKey ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1.5">
                          🔒 Your key is stored only in your browser's localStorage and never sent to our servers.
                        </p>
                      </div>

                      {/* Test + Save buttons */}
                      <div className="flex items-center gap-3">
                        <button onClick={handleTestConnection} disabled={!setupApiKey.trim() || isTestingConn}
                          className="px-4 py-2 border border-slate-600 hover:border-slate-500 text-slate-300 rounded-xl text-sm font-medium disabled:opacity-40 flex items-center gap-2 transition-colors">
                          {isTestingConn ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                          Test Connection
                        </button>
                        {connTestResult === 'ok' && <span className="text-sm text-emerald-400 font-medium flex items-center gap-1.5"><Check size={13} /> Connected!</span>}
                        {connTestResult === 'error' && <span className="text-sm text-rose-400 flex items-center gap-1.5"><AlertTriangle size={13} /> {connTestError}</span>}
                        <button
                          onClick={() => handleSaveLLMConfig(setupProvider, setupApiKey, setupModel)}
                          disabled={!setupApiKey.trim()}
                          className="ml-auto px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 rounded-xl text-sm font-bold transition-colors">
                          Save Provider
                        </button>
                      </div>

                      {llmConfig && (
                        <button onClick={() => {
                          localStorage.removeItem('rig_llm_config');
                          setLlmConfigState(null);
                          setLLMConfig(null);
                          setSetupApiKey('');
                          setConnTestResult('idle');
                        }} className="mt-3 text-xs text-slate-600 hover:text-rose-400 transition-colors">
                          Clear saved key
                        </button>
                      )}
                    </div>

                  {/* Personalization */}
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                      <h3 className="font-bold text-slate-100 flex items-center gap-2 mb-5">
                        <User size={16} className="text-cyan-400" /> Personalization
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4 mb-5">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Display Name</label>
                          <input value={pendingSettings.name} onChange={e => setPendingSettings(p => ({ ...p, name: e.target.value }))}
                            className="w-full p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-slate-100 outline-none focus:border-cyan-500 transition-colors text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Primary Field</label>
                          <input value={pendingSettings.field} onChange={e => setPendingSettings(p => ({ ...p, field: e.target.value }))}
                            className="w-full p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-slate-100 outline-none focus:border-cyan-500 transition-colors text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Career Stage</label>
                        <div className="flex rounded-xl overflow-hidden border border-slate-700/50">
                          {(['Student', 'Early Career', 'Established'] as const).map(stage => (
                            <button key={stage} onClick={() => setPendingSettings(p => ({ ...p, careerStage: stage }))}
                              className={`flex-1 py-2.5 text-sm font-medium transition-all border-r border-slate-700/50 last:border-0 ${pendingSettings.careerStage === stage ? 'bg-cyan-600 text-white' : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}>
                              {stage}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Research Persona */}
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-slate-100 flex items-center gap-2">
                          <Sparkles size={16} className="text-cyan-400" /> Research Persona
                        </h3>
                        {/* Inline mode switcher */}
                        <div className="flex rounded-lg overflow-hidden border border-slate-700/50">
                          {(['Generalist', 'Researcher', 'Expert'] as const).map(m => (
                            <button key={m} onClick={() => setExpertMode(m)}
                              className={`px-3 py-1 text-xs font-medium transition-all border-r border-slate-700/50 last:border-0 ${expertMode === m ? 'bg-cyan-600 text-white' : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}>
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Technical Bio</label>
                          <span className="text-[10px] text-slate-600 italic">informs catalyst's interaction depth</span>
                        </div>
                        <textarea
                          value={pendingSettings.technicalBio || ''}
                          onChange={e => setPendingSettings(p => ({ ...p, technicalBio: e.target.value }))}
                          rows={5}
                          placeholder="Describe your research focus, methodological preferences, and current investigations. This helps RIG Catalyst calibrate its analytical depth and terminology to match your expertise level."
                          className="w-full p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-slate-200 text-sm outline-none focus:border-cyan-500 transition-colors resize-none placeholder-slate-600"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-700/30 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-cyan-400" />
                          <span className="text-sm text-slate-300">Enhanced Analysis Mode</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${pendingSettings.enhancedAnalysisMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-500'}`}>
                            {pendingSettings.enhancedAnalysisMode ? 'Active' : 'Off'}
                          </span>
                        </div>
                        <Toggle value={pendingSettings.enhancedAnalysisMode ?? true} onChange={v => setPendingSettings(p => ({ ...p, enhancedAnalysisMode: v }))} />
                      </div>
                    </div>
                  </div>

                  {/* ── Right column (1/3) */}
                  <div className="space-y-5">
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                          <FileText size={14} className="text-cyan-400" /> Saved Library
                        </h3>
                        <span className="text-sm text-slate-400 font-bold">{settings.savedPapers.length} <span className="text-slate-600 font-normal">Items</span></span>
                      </div>

                      {settings.savedPapers.length === 0 ? (
                        <div className="text-center py-8 text-slate-600 text-xs">No saved papers yet.<br />Bookmark from the feed to build your library.</div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {settings.savedPapers.slice(0, 3).map((paper, i) => (
                              <div key={i} onClick={() => openInStudio(paper)}
                                className="flex gap-3 cursor-pointer hover:bg-slate-700/30 rounded-xl p-2 -mx-2 transition-colors group">
                                <div className="w-12 h-12 bg-slate-700 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                                  {paper.visualAbstract
                                    ? <img src={`data:image/png;base64,${paper.visualAbstract}`} className="w-full h-full object-cover" />
                                    : <FileText size={14} className="text-slate-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-slate-200 line-clamp-2 leading-tight group-hover:text-cyan-400 transition-colors">{paper.title}</h4>
                                  <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{paper.journal} · {paper.date}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {settings.savedPapers.length > 3 && (
                            <>
                              <div className="h-px bg-slate-700/50 my-4" />
                              <button onClick={() => setView(AppView.NOTEBOOK)} className="w-full text-sm text-slate-400 hover:text-cyan-400 flex items-center justify-center gap-2 transition-colors py-1">
                                View Full Library <ArrowRight size={13} />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Action bar */}
                <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-800">
                  <div className="flex gap-3">
                    <button className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium hover:border-slate-600 transition-colors">
                      Export Workspace Config
                    </button>
                    <button className="px-4 py-2 border border-rose-500/40 text-rose-400 rounded-xl text-sm font-medium hover:bg-rose-500/10 transition-colors">
                      Delete Account
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setPendingSettings({ ...settings })} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                      Discard Changes
                    </button>
                    <button onClick={saveSettings} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-colors">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </main>

          {/* ── FOOTER ──────────────────────────────────────────────── */}
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
        <button onClick={() => setView(AppView.CHAT)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-50"
          title="Open AI Chat">
          <Sparkles size={20} />
        </button>

        {/* ══ SETUP MODAL ════════════════════════════════════════════════════ */}
        {showSetupModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <div className="bg-[#0d1421] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="px-7 pt-7 pb-5 border-b border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-amber-500/20 rounded-lg"><Zap size={14} className="text-amber-400" /></div>
                      <h2 className="text-xl font-bold text-slate-100">Configure Your AI Provider</h2>
                    </div>
                    <p className="text-slate-400 text-sm">Bring your own API key — it stays in your browser, never on our servers.</p>
                  </div>
                  <button onClick={() => setShowSetupModal(false)} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors mt-0.5">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="px-7 py-5 space-y-5">
                {/* Provider selector */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Choose Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['gemini', 'openai', 'openrouter'] as LLMProvider[]).map(p => (
                      <button key={p} onClick={() => handleProviderChange(p)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${setupProvider === p ? 'border-amber-500/60 bg-amber-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-900/60'}`}>
                        <div className={`text-sm font-bold mb-1 ${setupProvider === p ? 'text-amber-300' : 'text-slate-300'}`}>{PROVIDER_LABELS[p]}</div>
                        <div className="text-[10px] text-slate-500 leading-snug">{PROVIDER_DESCRIPTIONS[p]}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Model</label>
                  <select value={setupModel} onChange={e => setSetupModel(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm outline-none focus:border-amber-500 transition-colors">
                    {PROVIDER_MODELS[setupProvider].map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>

                {/* API Key */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">API Key</label>
                    <a href={PROVIDER_KEY_URLS[setupProvider]} target="_blank" rel="noreferrer"
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Get a free key →
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={setupShowKey ? 'text' : 'password'}
                      value={setupApiKey}
                      onChange={e => { setSetupApiKey(e.target.value); setConnTestResult('idle'); }}
                      placeholder={`Your ${PROVIDER_LABELS[setupProvider]} API key…`}
                      autoFocus
                      className="w-full p-3.5 pr-20 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm outline-none focus:border-amber-500 transition-colors font-mono placeholder-slate-600"
                    />
                    <button onClick={() => setSetupShowKey(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-1">
                      {setupShowKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5">🔒 Stored only in your browser's localStorage. Never transmitted to our servers.</p>
                </div>

                {/* Connection test result */}
                {connTestResult === 'ok' && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 text-sm font-medium">Connection successful! Your key is valid.</span>
                  </div>
                )}
                {connTestResult === 'error' && (
                  <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                    <span className="text-rose-300 text-sm">{connTestError}</span>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-7 pb-7 flex items-center gap-3">
                <button onClick={handleTestConnection} disabled={!setupApiKey.trim() || isTestingConn}
                  className="px-4 py-2.5 border border-slate-700 hover:border-slate-500 text-slate-300 rounded-xl text-sm font-medium disabled:opacity-40 flex items-center gap-2 transition-colors">
                  {isTestingConn ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  Test Connection
                </button>
                <button
                  onClick={() => handleSaveLLMConfig(setupProvider, setupApiKey, setupModel)}
                  disabled={!setupApiKey.trim() || connTestResult === 'error'}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 rounded-xl text-sm font-black transition-colors">
                  Save & Start Using RIG
                </button>
              </div>

              {/* Skip */}
              <div className="text-center pb-4">
                <button onClick={() => setShowSetupModal(false)} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  Skip for now (uses default key if available)
                </button>
              </div>
            </div>
          </div>
        )}

        <CitationModal item={citeItem} onClose={() => setCiteItem(null)} />
      </div>
    </div>
  );
}
