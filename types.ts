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