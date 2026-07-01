import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import {
  UserSettings, Attachment, FeedItem, ImpactMetric, JournalSuggestion,
  LLMConfig, LLMProvider
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL STATE
// ─────────────────────────────────────────────────────────────────────────────

let _cfg: LLMConfig | null = null;
let _geminiClient: GoogleGenAI | null = null;
let _geminiChat: Chat | null = null;
// For non-Gemini providers we keep a flat message history
let _oaiHistory: { role: string; content: string }[] = [];

// ── Config Management ─────────────────────────────────────────────────────────

export const setLLMConfig = (cfg: LLMConfig | null) => {
  _cfg = cfg;
  _geminiClient = null;
  _geminiChat = null;
  _oaiHistory = [];
};

export const getLLMConfig = (): LLMConfig | null => _cfg;

const provider = (): LLMProvider => _cfg?.provider || 'gemini';
const activeModel = (): string => _cfg?.model || 'gemini-2.5-flash';
const activeKey = (): string => _cfg?.apiKey || (process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY || '';
const isGemini = (): boolean => provider() === 'gemini';

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI CLIENT
// ─────────────────────────────────────────────────────────────────────────────

const getGemini = (): GoogleGenAI => {
  if (!_geminiClient) {
    const key = activeKey();
    if (!key) throw new Error("No Gemini API key configured. Please add one in Settings.");
    _geminiClient = new GoogleGenAI({ apiKey: key });
  }
  return _geminiClient;
};

// ─────────────────────────────────────────────────────────────────────────────
// OPENAI-COMPATIBLE FETCH (OpenAI + OpenRouter)
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URLS: Record<LLMProvider, string> = {
  gemini: '',
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

const callOAI = async (
  messages: { role: string; content: string }[],
  temperature = 0.7,
  jsonMode = false
): Promise<string> => {
  const key = activeKey();
  if (!key) throw new Error(`No API key configured. Please add your ${provider() === 'openai' ? 'OpenAI' : 'OpenRouter'} key in Settings.`);

  const baseUrl = BASE_URLS[provider()];
  const extraHeaders: Record<string, string> = provider() === 'openrouter'
    ? { 'HTTP-Referer': 'https://rig-catalyst.vercel.app', 'X-Title': 'RIG Catalyst' }
    : {};

  const body: any = {
    model: activeModel(),
    messages,
    temperature,
    max_tokens: 4096,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errMsg = `API Error ${res.status}`;
    try { const e = await res.json(); errMsg = e?.error?.message || errMsg; } catch {}
    if (res.status === 429) throw new Error('⚠️ Rate limit exceeded. Please wait a moment.');
    if (res.status === 401) throw new Error(`⚠️ Invalid API key. Please check your key in Settings.`);
    if (res.status === 402) throw new Error('⚠️ Insufficient credits. Please top up your account.');
    throw new Error(errMsg);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
};

// ─────────────────────────────────────────────────────────────────────────────
// RETRY UTILITY
// ─────────────────────────────────────────────────────────────────────────────

const withRetry = async <T>(op: () => Promise<T>, retries = 3, delay = 4000): Promise<T> => {
  try {
    return await op();
  } catch (error: any) {
    const code = error?.status || error?.code || error?.error?.code || error?.response?.status;
    const message = error?.message || error?.error?.message || JSON.stringify(error);
    const status = error?.status || error?.error?.status;

    const isRateLimit =
      code === 429 || code === 403 ||
      message.toLowerCase().includes('quota') ||
      message.includes('429') ||
      status === 'RESOURCE_EXHAUSTED' ||
      message.includes('RESOURCE_EXHAUSTED');

    const isServerOverload = code === 503 || code === 500;

    if ((isRateLimit || isServerOverload) && retries > 0) {
      const backoff = delay * 2 + Math.random() * 1000;
      console.warn(`API error (${code}). Retrying in ${Math.round(backoff)}ms...`);
      await new Promise(r => setTimeout(r, backoff));
      return withRetry(op, retries - 1, backoff);
    }
    if (isRateLimit) throw new Error("⚠️ AI Quota Exceeded. Please wait a moment and try again.");
    if (code === 500) throw new Error("⚠️ AI Service Temporarily Unavailable.");
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// JSON EXTRACTION UTILITY
// ─────────────────────────────────────────────────────────────────────────────

const extractJSON = (text: string): string | null => {
  if (!text) return null;
  const firstBracket = text.indexOf('['), lastBracket = text.lastIndexOf(']');
  const firstBrace = text.indexOf('{'), lastBrace = text.lastIndexOf('}');
  const hasArray = firstBracket !== -1 && lastBracket > firstBracket;
  const hasObject = firstBrace !== -1 && lastBrace > firstBrace;
  if (hasArray && hasObject) {
    if (firstBrace < firstBracket && lastBrace > lastBracket) return text.substring(firstBrace, lastBrace + 1);
    return text.substring(firstBracket, lastBracket + 1);
  }
  if (hasObject) return text.substring(firstBrace, lastBrace + 1);
  if (hasArray) return text.substring(firstBracket, lastBracket + 1);
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTION TEST (used by Settings)
// ─────────────────────────────────────────────────────────────────────────────

export const testConnection = async (cfg: LLMConfig): Promise<{ ok: boolean; model: string; error?: string }> => {
  try {
    if (cfg.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: cfg.apiKey });
      const res = await ai.models.generateContent({ model: cfg.model, contents: 'Reply with only: OK' });
      return { ok: true, model: cfg.model, error: undefined };
    } else {
      const baseUrl = BASE_URLS[cfg.provider];
      const extraHeaders: Record<string, string> = cfg.provider === 'openrouter'
        ? { 'HTTP-Referer': 'https://rig-catalyst.vercel.app', 'X-Title': 'RIG Catalyst' } : {};
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}`, ...extraHeaders },
        body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: 'Reply with only: OK' }], max_tokens: 10 })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, model: cfg.model, error: err?.error?.message || `HTTP ${res.status}` };
      }
      return { ok: true, model: cfg.model };
    }
  } catch (e: any) {
    return { ok: false, model: cfg.model, error: e.message };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────────────────────────────────────

export const initializeChat = (settings: UserSettings): void => {
  const systemPrompt = `${SYSTEM_PROMPT}
CURRENT USER: ${settings.name} (${settings.careerStage})
FIELD: ${settings.field}
TONE: Clear, jargon-free English. Explain as if to an intelligent colleague from a different field.`;

  if (isGemini()) {
    _geminiChat = getGemini().chats.create({
      model: activeModel(),
      config: { systemInstruction: systemPrompt, temperature: 0.7 + (settings.creativityMode * 0.3) },
    });
    _oaiHistory = [];
  } else {
    _geminiChat = null;
    _oaiHistory = [{ role: 'system', content: systemPrompt }];
  }
};

export const sendMessage = async (message: string): Promise<string> => {
  if (isGemini()) {
    if (!_geminiChat) throw new Error("Chat not initialized.");
    return withRetry(async () => {
      // @ts-ignore
      const result = await _geminiChat!.sendMessage({ message });
      return result.text || "No response generated.";
    });
  } else {
    _oaiHistory.push({ role: 'user', content: message });
    return withRetry(async () => {
      const reply = await callOAI(_oaiHistory, 0.7);
      _oaiHistory.push({ role: 'assistant', content: reply });
      return reply;
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FEED — PAPER FETCHING
// ─────────────────────────────────────────────────────────────────────────────

export const fetchPapersFromJournal = async (
  journal: string, topic: string, dateCutoff: string, count: number
): Promise<FeedItem[]> => {
  // Prompt used for both grounded (Gemini) and plain (OpenAI/OR) calls
  const buildPrompt = (withGrounding: boolean) => `
You are a research librarian with access to academic databases.
Find ${count} real, published academic papers about "${topic}" from "${journal}" published after ${dateCutoff}.

Rules:
- Only include papers that ACTUALLY exist. Do not fabricate.
- If grounding/search is available, use it to verify titles and links.
- Each paper must have a real DOI or URL when possible.
- Date format: YYYY-MM-DD

Return ONLY a JSON array starting with "[". No markdown, no preamble.
[
  {
    "title": "Exact published paper title",
    "authors": "Last, F. & Last, F.",
    "journal": "${journal}",
    "date": "YYYY-MM-DD",
    "link": "https://doi.org/... or journal URL",
    "summary": "2 plain-English sentences: what was studied and what was found."
  }
]
If fewer than ${count} papers are found, return what's available. If none, return [].`.trim();

  const parseResponse = (text: string): FeedItem[] => {
    const jsonString = extractJSON(text);
    if (!jsonString) {
      console.warn(`[Feed] No JSON found in response for ${journal}:`, text?.substring(0, 200));
      return [];
    }
    try {
      const items = JSON.parse(jsonString) as FeedItem[];
      return items.filter(i => i.title && i.summary && i.title.length > 5).slice(0, count);
    } catch (e) {
      console.warn(`[Feed] JSON parse failed for ${journal}:`, e);
      return [];
    }
  };

  if (isGemini()) {
    // Try with Google Search grounding first
    try {
      const response = await withRetry(async () => getGemini().models.generateContent({
        model: activeModel(),
        contents: buildPrompt(true),
        config: { tools: [{ googleSearch: {} }] }
      }), 2, 3000);
      const results = parseResponse(response.text || '');
      if (results.length > 0) return results;
      console.warn(`[Feed] Grounded search returned 0 papers for "${journal}" / "${topic}". Trying without grounding…`);
    } catch (e: any) {
      console.warn(`[Feed] Grounded search error for ${journal}:`, e?.message || e);
    }

    // Fallback: no grounding (model uses its training knowledge)
    try {
      const response = await withRetry(async () => getGemini().models.generateContent({
        model: activeModel(),
        contents: buildPrompt(false),
      }), 1, 2000);
      return parseResponse(response.text || '');
    } catch (e: any) {
      console.error(`[Feed] Both grounded and ungrounded fetch failed for ${journal}:`, e?.message || e);
      return [];
    }
  } else {
    try {
      const reply = await withRetry(
        () => callOAI([{ role: 'user', content: buildPrompt(false) }], 0.3),
        2, 3000
      );
      return parseResponse(reply);
    } catch (e: any) {
      console.error(`[Feed] OpenAI/OR fetch failed for ${journal}:`, e?.message || e);
      return [];
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// IMPACT ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export const calculatePaperImpact = async (
  title: string, summary: string, link: string
): Promise<{ metrics: ImpactMetric[]; reasoning: string }> => {
  const query = `ACT AS A STRICT GRANT REVIEWER.
Paper: "${title}"
Score this paper (0-100) on 5 metrics. BE HARSH. Average=50. Good=70. Exceptional=90.
Metrics: Novelty, Feasibility, Soc. Impact, Funding, Interdisciplinary
Write a Critical Assessment: Paragraph 1 verdict, Paragraph 2 biggest flaw.
TONE: Plain English, no jargon.
Output JSON ONLY:
{"impactReasoning":"...","impactMetrics":[{"category":"Novelty","score":50,"fullMark":100},...]}`;

  return withRetry(async () => {
    let raw: string;
    if (isGemini()) {
      const response = await getGemini().models.generateContent({
        model: activeModel(),
        contents: query,
        config: { responseMimeType: "application/json" }
      });
      raw = response.text || "{}";
    } else {
      raw = await callOAI([{ role: 'user', content: query }], 0.3, true);
    }
    const jsonString = extractJSON(raw);
    if (!jsonString) return { metrics: [], reasoning: "Analysis unavailable." };
    return JSON.parse(jsonString);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL DISCOVERY
// ─────────────────────────────────────────────────────────────────────────────

export const suggestJournals = async (userPrompt: string): Promise<JournalSuggestion[]> => {
  const query = `Act as a Senior Research Librarian.
Suggest 8 high-impact academic journals for: "${userPrompt}".
Include broad and specific journals. Brief 1-sentence rationale. Estimate Impact Factor.
Output STRICT JSON ONLY:
[{"name":"Journal Name","impactFactor":"15.5","rationale":"Best for..."}]`;

  return withRetry(async () => {
    let raw: string;
    if (isGemini()) {
      const response = await getGemini().models.generateContent({
        model: activeModel(),
        contents: query,
        config: { responseMimeType: "application/json" }
      });
      raw = response.text || "[]";
    } else {
      raw = await callOAI([{ role: 'user', content: query }], 0.3, true);
    }
    const jsonString = extractJSON(raw);
    if (!jsonString) return [];
    return JSON.parse(jsonString);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL ABSTRACT — Gemini-only
// ─────────────────────────────────────────────────────────────────────────────

export const generateVisualAbstract = async (title: string, summary: string): Promise<string | null> => {
  if (!isGemini()) return null; // Image generation only supported on Gemini
  try {
    const ai = getGemini();
    const prompt = `Scientific diagram for "${title}". Clean, minimal, professional. White background. No text.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-preview-image-generation',
      contents: { parts: [{ text: prompt }] }
    });
    return response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data || null;
  } catch (e) {
    console.warn("Image generation failed:", e);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PAPER SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export const generatePaperSummary = async (
  title: string, link: string | null, attachment: Attachment | null
): Promise<string> => {
  const summaryPrompt = `Analyze the paper "${title}".
Provide a detailed summary using EXACTLY these headers:

## 1. Main Message
## 2. Background Context
## 3. Research Gap
## 4. Methodology
## 5. Key Results
## 6. Interesting Findings
## 7. Plotting Instructions
(Provide Python Matplotlib/Seaborn code to reproduce the main figure using dummy data.)`;

  return withRetry(async () => {
    if (isGemini()) {
      const parts: any[] = [];
      if (attachment) parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
      const finalPrompt = link && !attachment ? `${summaryPrompt}\nCONTEXT URL: ${link} (Use Search)` : summaryPrompt;
      parts.push({ text: finalPrompt });
      const response = await getGemini().models.generateContent({
        model: activeModel(),
        contents: { parts },
        config: { tools: (link && !attachment) ? [{ googleSearch: {} }] : undefined }
      });
      return response.text || "Summary unavailable.";
    } else {
      // Non-Gemini: no attachment or grounding support — text-only
      const prompt = link ? `${summaryPrompt}\n\nPaper URL (for context): ${link}` : summaryPrompt;
      return callOAI([{ role: 'user', content: prompt }], 0.5);
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT ANALYSIS (used by Analysis Studio tabs + Fusion Lab)
// ─────────────────────────────────────────────────────────────────────────────

export const analyzeContent = async (
  promptPrefix: string,
  attachment: Attachment | null,
  link: string | null,
  mode: string = 'GENERAL',
  title: string = 'Paper'
): Promise<string> => {
  let finalPrompt = "";

  if (promptPrefix.includes("Idea Fusion") || mode === 'FUSION') {
    const inputMatch = promptPrefix.match(/Idea Fusion (.*?) with (.*)/);
    const sourcePaper = inputMatch ? inputMatch[1] : title;
    const fusionTarget = inputMatch ? inputMatch[2] : "Interdisciplinary Application";
    finalPrompt = `ROLE: You are an Interdisciplinary Research Architect performing Trans-Domain Synthesis.

INPUTS:
- Source Paper/Idea: ${sourcePaper}
- Fusion Target: ${fusionTarget}

FORMATTING: Plain text Markdown tables. No dollar signs. Be critical and honest. Engaging but scientifically accurate.

## 1. Core Concept of Source Paper
| Aspect | Detail |
| :--- | :--- |
| First Principle | ... |
| Mechanism | ... |

## 2. User Integration & Pain Points
| Aspect | Detail |
| :--- | :--- |
| User Problem | ... |
| Integration Logic | ... |

## 3. Fusion Scenarios
| Scenario | How it is Fused | Why it is Worth Taking |
| :--- | :--- | :--- |
| 1. [Name] | ... | ... |
| 2. [Name] | ... | ... |
| 3. [Name] | ... | ... |

## 4. Shortcomings & Cautions
| Pitfall | Why it is a Concern |
| :--- | :--- |

## 5. Critical Thinking & Research
Suggest specific aspects the user should investigate.`;
  } else if (mode === 'MINDMAP') {
    finalPrompt = `Create a Logic Flow flowchart for "${title}". Format: Mermaid.js graph or ASCII flowchart.
Structure: Problem → Hypothesis → Methodology → Experiments → Analysis → Conclusion.`;
  } else if (mode === 'GAPS') {
    finalPrompt = `Analyze "${title}" for research gaps. Output 3 "Opportunity Cards": Gap → Opportunity → Suggested Method.`;
  } else if (mode === 'EDITORIAL') {
    finalPrompt = `Act as a Senior Editor. Critique "${title}". Acceptance Logic vs Rejection Risk. Be specific and direct.`;
  } else if (mode === 'PROPOSAL') {
    finalPrompt = `ROLE: Senior grant-writing expert helping turn a paper into a fundable proposal.
Paper: "${title}"

## 1. Executive Summary
One paragraph pitch for a non-specialist program officer. Lead with societal need.

## 2. Research Objectives
| Objective | Measurable Outcome | Timeline |
| :--- | :--- | :--- |

## 3. Methodology Plan
How to extend or replicate this work?

## 4. Funding Agency Match
| Agency / Program | Fit Score (1-10) | Rationale |
| :--- | :--- | :--- |

## 5. Budget Considerations
Major cost drivers (personnel, equipment, data, compute).

## 6. Risks & Mitigation
Top 2-3 risks and how to address them.

TONE: Practical, action-oriented. Plain English.`;
  } else {
    finalPrompt = promptPrefix + "\n\nSTRUCTURE:\n- Use **Bold Headers**.\n- Use bullet points.\n- Plain English, no jargon.\n- Be critical about limitations.";
  }

  if (link && !attachment) finalPrompt += `\nCONTEXT URL: ${link}. Use search to get details.`;

  return withRetry(async () => {
    if (isGemini()) {
      const parts: any[] = [];
      if (attachment) parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
      parts.push({ text: finalPrompt });
      const response = await getGemini().models.generateContent({
        model: activeModel(),
        contents: { parts },
        config: { tools: (link || !attachment) ? [{ googleSearch: {} }] : undefined }
      });
      return response.text || "Analysis complete.";
    } else {
      return callOAI([{ role: 'user', content: finalPrompt }], 0.7);
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY EXPORTS (kept for backward compat)
// ─────────────────────────────────────────────────────────────────────────────

export const fetchResearchFeed = async (
  settings: UserSettings, page = 1, dateCutoff?: string, limit = 10
): Promise<FeedItem[]> => {
  const topics = settings.field.split(/[,;]+/).map(t => t.trim()).filter(Boolean).join(', ');
  const dateInstruction = dateCutoff ? `published AFTER ${dateCutoff}` : "published recently";
  const prompt = `Find ${limit} recent academic papers about "${topics}".
Priority Journals: ${settings.trackedJournals.join(', ')}.
Constraint: Papers must be ${dateInstruction}.
Output STRICT JSON ONLY starting with "[".
[{"title":"...","authors":"...","journal":"...","date":"YYYY-MM-DD","link":"...","summary":"..."}]`;

  if (isGemini()) {
    return withRetry(async () => {
      try {
        const response = await getGemini().models.generateContent({
          model: activeModel(),
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] }
        });
        const jsonString = extractJSON(response.text || "[]");
        if (!jsonString) return [];
        return (JSON.parse(jsonString) as FeedItem[]).slice(0, limit);
      } catch { return []; }
    });
  } else {
    return withRetry(async () => {
      try {
        const reply = await callOAI([{ role: 'user', content: prompt }], 0.3);
        const jsonString = extractJSON(reply);
        if (!jsonString) return [];
        return (JSON.parse(jsonString) as FeedItem[]).slice(0, limit);
      } catch { return []; }
    });
  }
};

export const findRelatedPapers = async (title: string): Promise<string> => {
  const query = `Find 5 papers related to "${title}". Output Markdown list with links. Verify links.`;
  if (isGemini()) {
    const response = await getGemini().models.generateContent({
      model: activeModel(), contents: query,
      config: { tools: [{ googleSearch: {} }] }
    });
    return response.text || "No related papers found.";
  }
  return callOAI([{ role: 'user', content: query }]);
};
