export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export enum AppView {
  FEED = 'FEED',
  ANALYZE = 'ANALYZE',
  CHAT = 'CHAT',
  SETTINGS = 'SETTINGS',
  NOTEBOOK = 'NOTEBOOK',
  FUSION_LAB = 'FUSION_LAB',
}

export interface FusionHypothesis {
  type: 'INCREMENTAL' | 'DISRUPTIVE' | 'WILDCARD';
  confidence: number;
  title: string;
  description: string;
}

export interface UserSettings {
  name: string;
  field: string;
  careerStage: 'Student' | 'Early Career' | 'Established';
  creativityMode: number; // 0.0 to 1.0
  trackedJournals: string[];
  savedPapers: FeedItem[];
  technicalBio?: string;
  enhancedAnalysisMode?: boolean;
}

export interface ChallengeStressTest {
  title: string;
  description: string;
  color: 'cyan' | 'amber' | 'rose';
}

export interface PrimaryHurdle {
  name: string;
  percent: number;
  color: 'cyan' | 'amber' | 'rose';
}

export interface ImpactMetric {
  category: string;
  score: number;
  fullMark: number;
}

export interface FeedItem {
  title: string;
  authors?: string;
  journal: string;
  date: string;
  link: string;
  summary: string;
  visualAbstract?: string; // Base64 image data
  impactMetrics?: ImpactMetric[];
  impactReasoning?: string;
  // For uploaded/analyzed items
  isUploaded?: boolean;
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64
}

export interface JournalSuggestion {
  name: string;
  impactFactor: string;
  rationale: string;
  selected?: boolean;
}

// ── LLM Provider Config ───────────────────────────────────────────────────────

export type LLMProvider = 'gemini' | 'openai' | 'openrouter';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
}

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
};

export const PROVIDER_MODELS: Record<LLMProvider, { id: string; label: string }[]> = {
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o (Recommended)' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { id: 'o4-mini', label: 'o4-mini (Reasoning)' },
  ],
  openrouter: [
    { id: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Recommended)' },
    { id: 'anthropic/claude-haiku-4-5', label: 'Claude Haiku 4.5 (Fast)' },
    { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5' },
    { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
    { id: 'mistralai/mistral-large', label: 'Mistral Large' },
    { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (Reasoning)' },
  ],
};

export const PROVIDER_KEY_URLS: Record<LLMProvider, string> = {
  gemini: 'https://aistudio.google.com/apikey',
  openai: 'https://platform.openai.com/api-keys',
  openrouter: 'https://openrouter.ai/keys',
};

export const PROVIDER_DESCRIPTIONS: Record<LLMProvider, string> = {
  gemini: 'Best for live paper search (Google grounding) + image generation.',
  openai: 'GPT-4o is excellent for deep analysis and reasoning tasks.',
  openrouter: 'Access 100+ models including Claude, Llama, Mistral with one key.',
};