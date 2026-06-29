import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Search, Zap, PenTool, Settings, X, Send, Sparkles, ArrowRight, RefreshCw, Plus, Network, FileText, Image as ImageIcon, Bookmark, Share2, Trash2, Maximize2, Lightbulb, Calendar, Moon, Sun, AlertTriangle, Hash, FlaskConical, Layout, Upload, Link, User, ChevronDown, Check, Compass, Quote, Copy
} from 'lucide-react';
import { AppView, Message, UserSettings, FeedItem, Attachment, JournalSuggestion } from './types';
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

// --- AUTOCOMPLETE INPUT ---
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
    <div className="relative w-full">
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
        <div className="absolute top-full left-0 mt-1 min-w-[200px] w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[100] max-h-52 overflow-y-auto">
          {value.length === 0 && (
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">Popular</div>
          )}
          {filtered.map(s => (
            <button
              key={s}
              onMouseDown={() => { onSelect(s); setShow(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-academic-50 dark:hover:bg-academic-900/20 hover:text-academic-600 dark:hover:text-academic-300 transition-colors text-slate-700 dark:text-slate-200"
            >
              {value.length > 0 ? (
                <>
                  <span className="font-bold text-academic-600 dark:text-academic-400">
                    {s.substring(0, s.toLowerCase().indexOf(value.toLowerCase()))}
                  </span>
                  <span className="font-bold text-academic-600 dark:text-academic-400">
                    {s.substring(s.toLowerCase().indexOf(value.toLowerCase()), s.toLowerCase().indexOf(value.toLowerCase()) + value.length)}
                  </span>
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
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col animate-pulse">
    <div className="h-40 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
    <div className="p-5 space-y-3 flex-1">
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-full" />
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-4/5" />
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
      <div className="h-10 bg-slate-100 dark:bg-slate-700/50 rounded-lg mt-4" />
    </div>
  </div>
);

interface UploadCardProps { onUpload: () => void; }
const UploadCard: React.FC<UploadCardProps> = ({ onUpload }) => (
  <div onClick={onUpload} className="bg-gradient-to-br from-academic-600 to-academic-500 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer group border border-academic-400/30 min-h-[280px]">
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Upload size={28} className="text-white" />
      </div>
      <h4 className="text-white font-bold text-lg mb-2">Analyze Your Paper</h4>
      <p className="text-white/70 text-sm leading-relaxed">Upload a PDF or paste a link to run the full Research Studio analysis on your own work.</p>
    </div>
    <div className="px-5 pb-5">
      <div className="w-full py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
        <Upload size={15} /> Upload PDF / Paste Link
      </div>
    </div>
  </div>
);

interface FeedCardProps { item: FeedItem; onOpen: (item: FeedItem) => void; onGenerateImage: (item: FeedItem) => void; onSave: (item: FeedItem) => void; onCite: (item: FeedItem) => void; isGeneratingImage: boolean; isSaved: boolean; }
const FeedCard: React.FC<FeedCardProps> = ({ item, onOpen, onGenerateImage, onSave, onCite, isGeneratingImage, isSaved }) => {
  const colors = ['from-blue-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-orange-500 to-red-600'];
  const colorIndex = item.title.length % colors.length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden flex flex-col h-full relative">
      <div className="h-40 w-full bg-slate-50 dark:bg-slate-900 relative flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-700 cursor-pointer" onClick={() => onOpen(item)}>
         {item.visualAbstract ? (
           <img src={`data:image/png;base64,${item.visualAbstract}`} alt="Abstract" className="w-full h-full object-cover" />
         ) : (
           <div className={`w-full h-full bg-gradient-to-r ${colors[colorIndex]} flex items-center justify-center relative`}>
             {isGeneratingImage ? <RefreshCw className="animate-spin text-white" size={24} /> : (
               <div className="text-center p-4">
                 <FileText className="text-white/30 w-12 h-12 mx-auto mb-2" />
                 <button onClick={(e) => { e.stopPropagation(); onGenerateImage(item); }} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-white text-xs font-medium flex items-center mx-auto"><ImageIcon size={12} className="mr-1.5" /> Generate Abstract</button>
               </div>
             )}
           </div>
         )}
         <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/40 rounded text-[10px] text-white font-mono uppercase">{item.journal}</div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
           <span className="text-xs text-slate-400 font-medium">{item.date}</span>
           <div className="flex items-center gap-2">
              <button 
                 onClick={(e) => { e.stopPropagation(); onCite(item); }} 
                 className="text-slate-300 hover:text-academic-500 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                 title="Cite this paper"
              >
                 <Quote size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onSave(item); }} className={`${isSaved ? 'text-academic-500 fill-academic-500' : 'text-slate-300 hover:text-academic-500'} transition-colors`}>
                 <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
              </button>
           </div>
        </div>
        <h4 onClick={() => onOpen(item)} className="font-serif font-bold text-slate-900 dark:text-slate-100 mb-3 leading-tight group-hover:text-academic-600 transition-colors text-lg cursor-pointer line-clamp-2">
          {item.title}
        </h4>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-3 leading-relaxed flex-1">{item.summary}</p>
        
        <button onClick={() => onOpen(item)} className="w-full py-2 bg-slate-100 dark:bg-slate-700/50 hover:bg-academic-50 dark:hover:bg-academic-900/20 text-slate-600 dark:text-slate-300 hover:text-academic-600 rounded-lg text-sm font-bold flex items-center justify-center transition-colors">
            <Sparkles size={16} className="mr-2" /> Open Research Studio
        </button>
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---

export default function App() {
  // Navigation State
  const [view, setView] = useState<AppView>(AppView.FEED);
  const [darkMode, setDarkMode] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Feed State
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [loadingJournals, setLoadingJournals] = useState<string[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);

  // Feed Filters (Header)
  const [feedTopics, setFeedTopics] = useState<string[]>([DEFAULT_SETTINGS.field]);
  const [addTopicInput, setAddTopicInput] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [feedJournals, setFeedJournals] = useState<string>(DEFAULT_SETTINGS.trackedJournals.join(', '));
  const [feedDateCutoff, setFeedDateCutoff] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0]; });
  const [feedLimit, setFeedLimit] = useState(8);
  const [addJournalInput, setAddJournalInput] = useState('');
  const [showAddJournal, setShowAddJournal] = useState(false);

  // Journal Discovery State
  const [showJournalDiscovery, setShowJournalDiscovery] = useState(false);
  const [journalDiscoveryTopic, setJournalDiscoveryTopic] = useState('');
  const [journalSuggestions, setJournalSuggestions] = useState<JournalSuggestion[]>([]);
  const [isSuggestingJournals, setIsSuggestingJournals] = useState(false);

  // Analysis Studio State (PERSISTENT)
  const [studioItem, setStudioItem] = useState<FeedItem | null>(null);
  const [studioTab, setStudioTab] = useState<'SUMMARY' | 'IMPACT' | 'INSIGHTS' | 'GAPS' | 'FUSION' | 'MINDMAP' | 'EDITORIAL'>('SUMMARY');
  const [studioContent, setStudioContent] = useState<Record<string, string | null>>({});
  const [isStudioAnalyzing, setIsStudioAnalyzing] = useState(false);
  const [studioFusionInput, setStudioFusionInput] = useState('');
  const [studioUploadedAtt, setStudioUploadedAtt] = useState<Attachment | null>(null);
  const [studioUploadedLink, setStudioUploadedLink] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // UI Helper State
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  const [citeItem, setCiteItem] = useState<FeedItem | null>(null);

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

  // -- JOURNAL DISCOVERY LOGIC --
  
  const handleDiscoverJournals = async () => {
      const topic = journalDiscoveryTopic || feedTopics[0] || settings.field;
      setIsSuggestingJournals(true);
      try {
          const suggestions = await suggestJournals(topic);
          setJournalSuggestions(suggestions);
      } catch (e) {
          console.error("Journal Suggestion Error", e);
      } finally {
          setIsSuggestingJournals(false);
      }
  };

  const toggleJournalSelection = (name: string) => {
      setJournalSuggestions(prev => prev.map(j => j.name === name ? { ...j, selected: !j.selected } : j));
  };

  const applySelectedJournals = () => {
      const selected = journalSuggestions.filter(j => j.selected).map(j => j.name);
      if (selected.length > 0) {
          const existing = feedJournals.split(',').map(s => s.trim()).filter(Boolean);
          const merged = Array.from(new Set([...existing, ...selected]));
          setFeedJournals(merged.join(', '));
      }
      setShowJournalDiscovery(false);
  };

  // -- FEED LOGIC --

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
      // Fetch all journals in parallel — each gets its own dedicated request
      const results = await Promise.allSettled(
        journals.map(journal =>
          fetchPapersFromJournal(journal, topicQuery, feedDateCutoff, perJournal)
            .then(papers => {
              // Stream results in as each journal completes
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

  const removeTopic = (name: string) => {
    setFeedTopics(prev => prev.filter(t => t !== name));
  };

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
    const updated = feedJournals.split(',').map(s => s.trim()).filter(j => j.toLowerCase() !== name.toLowerCase());
    setFeedJournals(updated.join(', '));
  };

  const toggleSavePaper = (item: FeedItem) => {
    setSettings(prev => {
        const isSaved = prev.savedPapers.some(p => p.title === item.title);
        let newSaved;
        if (isSaved) {
            newSaved = prev.savedPapers.filter(p => p.title !== item.title);
        } else {
            newSaved = [...prev.savedPapers, item];
        }
        return { ...prev, savedPapers: newSaved };
    });
  };

  const handleGenerateImage = async (item: FeedItem) => {
    if (generatingImages.has(item.title)) return;
    setGeneratingImages(prev => new Set(prev).add(item.title));
    try {
      const base64Image = await generateVisualAbstract(item.title, item.summary);
      if (base64Image) {
        setFeed(prev => prev.map(f => f.title === item.title ? { ...f, visualAbstract: base64Image } : f));
        // Also update saved papers if it exists there
        setSettings(prev => ({
            ...prev,
            savedPapers: prev.savedPapers.map(f => f.title === item.title ? { ...f, visualAbstract: base64Image } : f)
        }));
      }
    } catch (e) {
      console.error("Image generation failed", e);
    } finally {
      setGeneratingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.title);
        return newSet;
      });
    }
  };

  // -- ANALYSIS LOGIC --

  const openInStudio = (item: FeedItem) => {
      setStudioItem(item);
      setStudioContent({}); // Clear previous analysis content
      setStudioTab('SUMMARY'); // Default to summary
      setStudioUploadedAtt(null);
      setStudioUploadedLink(null);
      setView(AppView.ANALYZE);
      
      // Auto-load critical tabs sequentially to avoid rate limits but ensure data is there
      // We start with Summary, then Impact
      runAnalysis('SUMMARY', item).then(() => {
          runAnalysis('IMPACT', item);
      });
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

    // Initial Trigger
    runAnalysis('SUMMARY', newItem, undefined, attachment, link);
  };

  const runAnalysis = async (mode: string, item: FeedItem | null, customInput?: string, overrideAtt?: Attachment | null, overrideLink?: string | null) => {
      if (!item) return;
      
      // Check cache first (unless specific input provided)
      if (studioContent[mode] && !customInput) return;

      setIsStudioAnalyzing(true);
      try {
          let result = "";
          const linkToUse = overrideLink || (item.isUploaded ? studioUploadedLink : item.link);
          const attToUse = overrideAtt || (item.isUploaded ? studioUploadedAtt : null);
          
          if (mode === 'SUMMARY') {
              result = await generatePaperSummary(item.title, linkToUse, attToUse);
          } else if (mode === 'IMPACT') {
              // Special case for Impact: fetch metrics JSON + reasoning text
              const res = await calculatePaperImpact(item.title, item.summary, linkToUse || "");
              
              // Update the item state with metrics so the Chart can render
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

  // --- RENDER ---

  const apiKeyMissing = !process.env.API_KEY && !process.env.GEMINI_API_KEY;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* API Key Warning Banner */}
      {apiKeyMissing && (
          <div className="fixed top-0 inset-x-0 z-[200] bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-3 px-6 py-2">
              <AlertTriangle size={16} />
              <span>GEMINI_API_KEY is not set. Add it to your <code className="font-mono bg-amber-600 px-1 rounded">.env.local</code> file and restart the dev server.</span>
          </div>
      )}

      {/* Top Navigation Bar */}
      <header className={`fixed inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-50 transition-all ${apiKeyMissing ? 'top-9' : 'top-0'}`}>
        {/* Main Nav */}
        <div className="h-16 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-academic-600 to-academic-500 text-white p-2 rounded-lg">
                    <FlaskConical size={20} />
                </div>
                <div>
                    <h1 className="text-lg font-black tracking-tight">RIG <span className="font-serif italic text-academic-600 font-normal">Catalyst</span></h1>
                </div>
            </div>

            <nav className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button onClick={() => setView(AppView.FEED)} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === AppView.FEED ? 'bg-white dark:bg-slate-700 shadow-sm text-academic-600 dark:text-academic-300' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                    Live Feed
                </button>
                <button onClick={() => setView(AppView.ANALYZE)} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === AppView.ANALYZE ? 'bg-white dark:bg-slate-700 shadow-sm text-academic-600 dark:text-academic-300' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                    Analysis Studio
                </button>
                <button onClick={() => setView(AppView.CHAT)} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === AppView.CHAT ? 'bg-white dark:bg-slate-700 shadow-sm text-academic-600 dark:text-academic-300' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                    AI Chat
                </button>
                <button onClick={() => setView(AppView.SETTINGS)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === AppView.SETTINGS ? 'bg-white dark:bg-slate-700 shadow-sm text-academic-600 dark:text-academic-300' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                    <User size={18} />
                </button>
            </nav>

            <div className="flex items-center gap-4">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        </div>

        {/* FEED CONTROLS BAR - Only visible in Feed View */}
        {view === AppView.FEED && (
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 text-sm animate-fade-in relative">
                
                {/* 1. FOCUS CHIPS (multi-topic) */}
                <div className="flex items-start gap-2 flex-1 min-w-[250px]">
                    <Search size={14} className="text-slate-400 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {feedTopics.map(t => (
                          <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-xs font-semibold">
                            {t}
                            {feedTopics.length > 1 && (
                              <button onClick={() => removeTopic(t)} className="hover:text-red-500 transition-colors ml-0.5"><X size={10} /></button>
                            )}
                          </span>
                        ))}
                        {showAddTopic ? (
                          <AutocompleteInput
                            autoFocus
                            value={addTopicInput}
                            onChange={setAddTopicInput}
                            onSelect={addTopic}
                            onKeyDown={e => { if (e.key === 'Enter') addTopic(addTopicInput); if (e.key === 'Escape') { setShowAddTopic(false); setAddTopicInput(''); } }}
                            onBlur={() => { if (!addTopicInput) setShowAddTopic(false); }}
                            suggestions={POPULAR_RESEARCH_AREAS}
                            placeholder="e.g. Quantum Computing"
                            className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-400 rounded-full text-xs outline-none w-44 text-slate-800 dark:text-slate-200"
                          />
                        ) : (
                          <button onClick={() => setShowAddTopic(true)} className="flex items-center gap-0.5 px-2 py-0.5 border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:text-slate-700 hover:border-slate-400 rounded-full text-xs transition-colors">
                            <Plus size={10} /> Add Topic
                          </button>
                        )}
                      </div>
                    </div>
                </div>
                
                {/* 2. JOURNAL CHIPS + ADD */}
                <div className="flex items-start gap-2 flex-1 min-w-[250px] relative">
                    <BookOpen size={14} className="text-slate-400 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {feedJournals.split(',').map(s => s.trim()).filter(Boolean).map(j => (
                          <span key={j} className="flex items-center gap-1 px-2 py-0.5 bg-academic-100 dark:bg-academic-900/30 text-academic-700 dark:text-academic-300 rounded-full text-xs font-semibold">
                            {j}
                            <button onClick={() => removeJournal(j)} className="hover:text-red-500 transition-colors ml-0.5"><X size={10} /></button>
                          </span>
                        ))}
                        {showAddJournal ? (
                          <AutocompleteInput
                            autoFocus
                            value={addJournalInput}
                            onChange={setAddJournalInput}
                            onSelect={addJournal}
                            onKeyDown={e => { if (e.key === 'Enter') addJournal(addJournalInput); if (e.key === 'Escape') { setShowAddJournal(false); setAddJournalInput(''); } }}
                            onBlur={() => { if (!addJournalInput) setShowAddJournal(false); }}
                            suggestions={POPULAR_JOURNALS}
                            placeholder="Journal name..."
                            className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-academic-400 rounded-full text-xs outline-none w-40 text-slate-800 dark:text-slate-200"
                          />
                        ) : (
                          <button onClick={() => setShowAddJournal(true)} className="flex items-center gap-0.5 px-2 py-0.5 border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:text-academic-500 hover:border-academic-400 rounded-full text-xs transition-colors">
                            <Plus size={10} /> Add
                          </button>
                        )}
                        <button
                            onClick={() => setShowJournalDiscovery(!showJournalDiscovery)}
                            className="text-academic-500 hover:text-academic-600 p-0.5 rounded"
                            title="Discover Top Journals for this Topic"
                        >
                            <Compass size={14} />
                        </button>
                      </div>
                    </div>

                    {/* JOURNAL SCOUT POPOVER */}
                    {showJournalDiscovery && (
                        <div className="absolute top-10 left-0 w-[400px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[60] p-4 animate-fade-in">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Sparkles size={16} className="text-amber-500" /> Journal Scout
                                </h3>
                                <button onClick={() => setShowJournalDiscovery(false)}><X size={16} /></button>
                            </div>
                            
                            <div className="mb-4">
                                <label className="text-xs text-slate-500 font-bold mb-1 block">Analyze Topic:</label>
                                <div className="flex gap-2">
                                    <input 
                                        value={journalDiscoveryTopic}
                                        onChange={e => setJournalDiscoveryTopic(e.target.value)}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-1.5 text-sm"
                                        placeholder="e.g. Biochar"
                                    />
                                    <button 
                                        onClick={handleDiscoverJournals}
                                        className="bg-slate-800 text-white px-3 rounded-lg text-xs font-bold hover:bg-black"
                                    >
                                        {isSuggestingJournals ? <RefreshCw size={14} className="animate-spin" /> : 'Find'}
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto space-y-2 mb-4">
                                {journalSuggestions.length === 0 && !isSuggestingJournals && (
                                    <div className="text-center py-8 text-slate-400 text-xs">
                                        Enter a topic and click find to discover relevant journals.
                                    </div>
                                )}
                                {journalSuggestions.map((j, idx) => (
                                    <div key={idx} onClick={() => toggleJournalSelection(j.name)} className={`p-3 rounded-lg border cursor-pointer transition-all ${j.selected ? 'border-academic-500 bg-academic-50 dark:bg-academic-900/20' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-sm">{j.name}</span>
                                            {j.selected && <Check size={14} className="text-academic-500" />}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono mb-1">Impact Factor: {j.impactFactor}</div>
                                        <p className="text-xs text-slate-500 leading-tight">{j.rationale}</p>
                                    </div>
                                ))}
                            </div>

                            <button onClick={applySelectedJournals} className="w-full py-2 bg-academic-600 hover:bg-academic-700 text-white rounded-lg font-bold text-sm">
                                Apply Selected Journals
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Since</span>
                    <input 
                        type="date"
                        value={feedDateCutoff}
                        onChange={(e) => setFeedDateCutoff(e.target.value)}
                        className="bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-academic-500 outline-none text-slate-800 dark:text-slate-200 font-medium py-1" 
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Hash size={14} className="text-slate-400" />
                    <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Count</span>
                    <input 
                        type="number"
                        min="1" max="20"
                        value={feedLimit}
                        onChange={(e) => setFeedLimit(parseInt(e.target.value))}
                        className="bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-academic-500 outline-none w-12 text-slate-800 dark:text-slate-200 font-medium py-1 text-center" 
                    />
                </div>

                <button onClick={loadFeed} className="ml-auto px-4 py-1.5 bg-academic-600 hover:bg-academic-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
                    <RefreshCw size={12} className={isFeedLoading ? 'animate-spin' : ''} /> Update Feed
                </button>
            </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-hidden relative ${view === AppView.FEED ? 'pt-28' : 'pt-16'}`} style={{ paddingTop: view === AppView.FEED ? '7rem' : '4rem' }}>
        
        {/* VIEW: LIVE FEED */}
        <div className={`h-full overflow-y-auto p-6 lg:p-10 scroll-smooth ${view === AppView.FEED ? 'block' : 'hidden'}`}>
            <div className="max-w-7xl mx-auto">

                {/* Loading progress bar */}
                {isFeedLoading && (
                    <div className="mb-6 animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                {loadingJournals.length > 0
                                    ? `Fetching from ${loadingJournals.join(', ')}…`
                                    : 'Curating papers…'}
                            </span>
                            {loadedCount > 0 && (
                                <span className="text-xs font-bold text-academic-600">{loadedCount} loaded so far</span>
                            )}
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-academic-500 rounded-full animate-[shimmer_1.5s_infinite_linear] bg-gradient-to-r from-academic-400 via-academic-600 to-academic-400 bg-[length:200%_100%]" style={{ width: loadedCount > 0 ? `${Math.min(100, (loadedCount / feedLimit) * 100)}%` : '30%', transition: 'width 0.5s ease' }} />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Always-visible Upload Card */}
                    <UploadCard onUpload={() => { setStudioItem(null); setView(AppView.ANALYZE); }} />

                    {/* Real paper cards */}
                    {feed.map((item, i) => (
                        <FeedCard
                            key={i}
                            item={item}
                            onOpen={openInStudio}
                            onGenerateImage={handleGenerateImage}
                            onSave={toggleSavePaper}
                            onCite={(paper) => setCiteItem(paper)}
                            isGeneratingImage={generatingImages.has(item.title)}
                            isSaved={settings.savedPapers.some(p => p.title === item.title)}
                        />
                    ))}

                    {/* Skeleton cards while loading */}
                    {isFeedLoading && Array.from({ length: Math.max(0, feedLimit - feed.length) }).map((_, i) => (
                        <FeedCardSkeleton key={`sk-${i}`} />
                    ))}
                </div>

                {feedError && !isFeedLoading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 max-w-lg text-center">
                            <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
                            <h3 className="font-bold text-red-700 dark:text-red-400 mb-2 text-lg">Failed to Load Feed</h3>
                            <p className="text-red-600 dark:text-red-400 text-sm mb-4">{feedError}</p>
                            <button onClick={loadFeed} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 mx-auto">
                                <RefreshCw size={14} /> Retry
                            </button>
                        </div>
                    </div>
                )}

                {!isFeedLoading && !feedError && feed.length === 0 && (
                    <div className="col-span-4 flex flex-col items-center justify-center py-20 text-slate-400">
                        <BookOpen size={48} className="mb-4 opacity-30" />
                        <p className="font-medium">No papers found. Try adjusting your topic or date range.</p>
                    </div>
                )}
            </div>
        </div>

        {/* VIEW: ANALYSIS STUDIO (PERSISTENT) */}
        <div className={`h-full relative flex flex-col ${view === AppView.ANALYZE ? 'block' : 'hidden'}`}>
            {!studioItem ? (
                // EMPTY STATE / UPLOAD
                <div className="h-full overflow-y-auto p-6 flex items-center justify-center">
                    <div className="max-w-2xl w-full animate-fade-in">
                        <div className="text-center mb-10">
                            <div className="inline-block p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
                                <Layout size={40} className="text-academic-500" />
                            </div>
                            <h2 className="text-4xl font-serif font-bold mb-4">Research Analysis Studio</h2>
                            <p className="text-slate-500 text-lg">Upload a PDF, paste an abstract, or enter a URL to generate a comprehensive critical analysis.</p>
                        </div>
                        <InputSection 
                            buttonLabel="Start Deep Analysis" 
                            colorClass="bg-gradient-to-r from-academic-600 to-academic-500 text-white" 
                            onAnalyze={handleManualUpload} 
                        />
                    </div>
                </div>
            ) : (
                // ACTIVE ANALYSIS
                <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in">
                     {/* Analysis Header */}
                    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 lg:px-8 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <button onClick={() => setStudioItem(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-academic-100 dark:bg-academic-900 text-academic-700 dark:text-academic-300 px-2 py-0.5 rounded">
                                        {studioItem.isUploaded ? 'Private Analysis' : 'Published Research'}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{studioItem.date}</span>
                                </div>
                                <h2 className="text-xl font-bold truncate max-w-2xl">{studioItem.title}</h2>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCiteItem(studioItem)} 
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
                                title="Cite this paper"
                            >
                                <Quote size={16} /> <span className="hidden sm:inline">Cite</span>
                            </button>
                            <button onClick={() => toggleSavePaper(studioItem)} className={`${settings.savedPapers.some(p => p.title === studioItem?.title) ? 'text-academic-500 bg-academic-50 dark:bg-academic-900/20' : 'text-slate-400 hover:text-academic-600'} p-2 rounded-lg transition-colors`}>
                                <Bookmark size={20} fill={settings.savedPapers.some(p => p.title === studioItem?.title) ? "currentColor" : "none"} />
                            </button>
                            {studioItem.link && (
                                <a href={studioItem.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    <Link size={16} /> <span className="hidden sm:inline">Original Source</span>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Analysis Tabs */}
                    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto px-8 shrink-0">
                        {[
                            { id: 'SUMMARY', label: 'Summary', icon: FileText },
                            { id: 'IMPACT', label: 'Impact Prediction', icon: Sparkles },
                            { id: 'INSIGHTS', label: 'Core Insights', icon: Lightbulb },
                            { id: 'GAPS', label: 'Gap Analysis', icon: Search },
                            { id: 'FUSION', label: 'Idea Fusion', icon: Zap },
                            { id: 'MINDMAP', label: 'Logic Flow', icon: Network },
                            { id: 'EDITORIAL', label: 'Editor View', icon: PenTool },
                        ].map((tab: any) => (
                            <button
                                key={tab.id}
                                onClick={() => { setStudioTab(tab.id); runAnalysis(tab.id, studioItem); }}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${studioTab === tab.id ? 'border-academic-500 text-academic-600 bg-slate-50 dark:bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Analysis Content */}
                    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 lg:p-10">
                        <div className="max-w-5xl mx-auto">
                            {isStudioAnalyzing && !studioContent[studioTab] ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                    <RefreshCw size={40} className="animate-spin mb-4 text-academic-500" />
                                    <p className="animate-pulse font-medium">Synthesizing Research Data...</p>
                                </div>
                            ) : (
                                <>
                                    {studioTab === 'FUSION' ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                                            {/* Fusion Panel Controls */}
                                            <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl h-fit shadow-sm space-y-6">
                                                <div className="flex items-center gap-2 text-amber-500">
                                                    <Zap size={22} className="fill-amber-500" />
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Trans-Domain Fusion</h3>
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                    Fuse the key mechanisms of this paper with a secondary research area or domain of your interest to discover novel interdisciplinary hypotheses.
                                                </p>
                                                
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                            My Research Area / Target Domain
                                                        </label>
                                                        <input 
                                                            type="text" 
                                                            value={studioFusionInput} 
                                                            onChange={e => setStudioFusionInput(e.target.value)} 
                                                            placeholder={`e.g. ${settings.field || 'Quantum Computing'}`} 
                                                            className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-medium text-slate-800 dark:text-slate-100" 
                                                        />
                                                    </div>
                                                    
                                                    {/* Quick Suggestions Chips */}
                                                    <div>
                                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                            Quick Suggestions
                                                        </span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {[settings.field, "Generative AI", "Quantum Computing", "CRISPR Gene Editing", "Climate Science", "Robotics", "Neuroscience", "Digital Humanities"].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5).map((domain) => (
                                                                <button 
                                                                    key={domain}
                                                                    onClick={() => setStudioFusionInput(domain)}
                                                                    className={`px-2.5 py-1 rounded-full text-[10px] transition-colors border ${studioFusionInput === domain ? 'bg-amber-500/10 border-amber-500 text-amber-600 font-semibold' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                                                                >
                                                                    {domain}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    
                                                    <button 
                                                        onClick={() => runAnalysis('FUSION', studioItem, studioFusionInput || settings.field)} 
                                                        disabled={isStudioAnalyzing}
                                                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                                                    >
                                                        {isStudioAnalyzing ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                                                        {studioContent.FUSION ? 'Re-Fuse Ideas' : 'Generate Idea Fusion'}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Fusion Results */}
                                            <div className="lg:col-span-2">
                                                {isStudioAnalyzing && !studioContent.FUSION ? (
                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 h-full flex flex-col justify-center items-center min-h-[300px]">
                                                        <RefreshCw size={40} className="animate-spin mb-4 text-amber-500" />
                                                        <p className="animate-pulse font-medium">Fusing First Principles...</p>
                                                    </div>
                                                ) : studioContent.FUSION ? (
                                                    <div className="animate-fade-in bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm text-left">
                                                        <MarkdownMessage content={studioContent.FUSION} />
                                                    </div>
                                                ) : (
                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 h-full flex flex-col justify-center items-center min-h-[300px]">
                                                        <Zap size={48} className="text-amber-400/50 mb-4" />
                                                        <p className="font-semibold text-lg text-slate-600 dark:text-slate-300 mb-2">Awaiting Fusion Command</p>
                                                        <p className="text-sm max-w-sm">Select or input your interested research area on the left to synthesize high-impact interdisciplinary ideas.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="animate-fade-in">
                                            {/* Special Render for Impact Tab to show Chart */}
                                            {studioTab === 'IMPACT' && studioItem.impactMetrics && (
                                                <div className="mb-8 h-80 w-full max-w-2xl mx-auto">
                                                    <SimpleChart data={studioItem.impactMetrics} />
                                                </div>
                                            )}
                                            <MarkdownMessage content={studioContent[studioTab] || studioItem.impactReasoning || "Select a tab to begin analysis."} />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* VIEW: AI CHAT */}
        {view === AppView.CHAT && (
            <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-4">
                    <div className="max-w-3xl mx-auto">
                        {chatMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
                                    <Sparkles size={40} className="text-academic-500" />
                                </div>
                                <h2 className="text-2xl font-serif font-bold text-slate-700 dark:text-slate-200 mb-2">AI Research Assistant</h2>
                                <p className="text-sm max-w-sm">Ask anything about your research — literature gaps, methodology, statistics, writing feedback, or brainstorming ideas.</p>
                                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                                    {[
                                        "What are the main limitations of transformer models?",
                                        "How do I choose between a RCT and observational study?",
                                        "Explain p-values in plain English.",
                                        "What questions should I ask before citing a paper?"
                                    ].map((q) => (
                                        <button key={q} onClick={() => { setChatInput(q); }} className="text-left p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-academic-400 hover:text-academic-600 transition-all shadow-sm">
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {chatMessages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                                    msg.role === 'user'
                                        ? 'bg-academic-600 text-white rounded-br-sm'
                                        : msg.isError
                                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-bl-sm'
                                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                                }`}>
                                    {msg.role === 'model' && !msg.isError ? (
                                        <MarkdownMessage content={msg.content} />
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                    <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/60 text-right' : 'text-slate-400'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
                                    <div className="flex gap-1.5 items-center">
                                        <span className="w-2 h-2 bg-academic-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-academic-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-academic-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatBottomRef} />
                    </div>
                </div>

                {/* Chat Input Bar */}
                <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="max-w-3xl mx-auto flex gap-3 items-end">
                        <textarea
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                            placeholder="Ask a research question… (Enter to send, Shift+Enter for new line)"
                            rows={2}
                            className="flex-1 resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-academic-400 focus:ring-1 focus:ring-academic-400 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
                        />
                        <button
                            onClick={handleSendChat}
                            disabled={!chatInput.trim() || isChatLoading}
                            className="p-3 bg-academic-600 hover:bg-academic-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 rounded-xl transition-all shadow-sm"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: PROFILE & SETTINGS */}
        {view === AppView.SETTINGS && (
            <div className="h-full overflow-y-auto p-6 lg:p-10">
                <div className="max-w-4xl mx-auto">
                     <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mb-8">Researcher Profile</h2>
                     
                     <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 mb-8">
                         <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><User size={20} className="text-academic-500" /> Personalization</h3>
                         <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">Display Name</label>
                                <input value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" />
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">Primary Field</label>
                                <input value={settings.field} onChange={e => setSettings({...settings, field: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" />
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">Career Stage</label>
                                <select value={settings.careerStage} onChange={e => setSettings({...settings, careerStage: e.target.value as any})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <option>Student</option>
                                    <option>Early Career</option>
                                    <option>Established</option>
                                </select>
                            </div>
                         </div>
                     </div>

                     <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                         <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Bookmark size={20} className="text-academic-500" /> Saved Papers ({settings.savedPapers.length})</h3>
                         {settings.savedPapers.length === 0 ? (
                             <div className="text-center py-10 text-slate-400">No saved papers yet. Bookmark them from the feed!</div>
                         ) : (
                             <div className="grid gap-4">
                                 {settings.savedPapers.map((paper, i) => (
                                     <div key={i} onClick={() => openInStudio(paper)} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer border border-slate-100 dark:border-slate-700 transition-colors">
                                         <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                                            {paper.visualAbstract ? <img src={`data:image/png;base64,${paper.visualAbstract}`} className="w-full h-full object-cover rounded-lg" /> : <FileText className="text-slate-400" />}
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <h4 className="font-bold truncate">{paper.title}</h4>
                                             <p className="text-xs text-slate-500">{paper.journal} • {paper.date}</p>
                                         </div>
                                         <button onClick={(e) => { e.stopPropagation(); toggleSavePaper(paper); }} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                </div>
            </div>
        )}

      </main>

      {/* Citation Export Modal */}
      <CitationModal item={citeItem} onClose={() => setCiteItem(null)} />
    </div>
  );
}