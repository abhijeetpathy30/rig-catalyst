import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { UserSettings, Attachment, FeedItem, ImpactMetric, JournalSuggestion } from "../types";

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return genAI;
};

/**
 * Utility to retry operations with exponential backoff on rate limits
 */
const withRetry = async <T>(operation: () => Promise<T>, retries = 3, delay = 4000): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const code = error?.status || error?.code || error?.error?.code || error?.response?.status;
    const message = error?.message || error?.error?.message || JSON.stringify(error);
    const status = error?.status || error?.error?.status;

    const isRateLimit = 
      code === 429 || 
      code === 403 || 
      message.toLowerCase().includes('quota') || 
      message.includes('429') || 
      status === 'RESOURCE_EXHAUSTED' ||
      message.includes('RESOURCE_EXHAUSTED');
      
    const isServerOverload = code === 503 || code === 500;

    if ((isRateLimit || isServerOverload) && retries > 0) {
      const backoff = delay * 2 + Math.random() * 1000;
      console.warn(`API Rate Limit/Error (${code}). Retrying in ${Math.round(backoff)}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, backoff));
      return withRetry(operation, retries - 1, backoff);
    }
    
    if (isRateLimit) {
      throw new Error("⚠️ AI Quota Exceeded. Please wait a moment and try again.");
    }
    // For 500 errors that persist after retries, throw a user-friendly message
    if (code === 500) {
        console.error("Server Error 500", message);
        throw new Error("⚠️ AI Service Temporarily Unavailable. Please try a simpler request.");
    }
    throw error;
  }
};

/**
 * Helper to extract JSON from a potentially messy string response.
 * It looks for the first '[' or '{' and the last ']' or '}'.
 * Returns NULL if no valid JSON structure is found.
 */
const extractJSON = (text: string): string | null => {
  if (!text) return null;
  
  // Try to find array
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  
  // Try to find object
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  const hasArray = firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket;
  const hasObject = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace;

  // Determine which one comes first and is valid
  if (hasArray && hasObject) {
      // Check if brace is actually the outer container (e.g. { "items": [...] })
      // If brace starts before bracket and ends after bracket, it's the outer one.
      if (firstBrace < firstBracket && lastBrace > lastBracket) {
          return text.substring(firstBrace, lastBrace + 1);
      }
      return text.substring(firstBracket, lastBracket + 1);
  }
  
  if (hasObject) {
      return text.substring(firstBrace, lastBrace + 1);
  }

  if (hasArray) {
      return text.substring(firstBracket, lastBracket + 1);
  }

  // If no structure found, return null to indicate failure
  return null;
};

export const initializeChat = (settings: UserSettings): Chat => {
  const ai = getAI();
  const tailoredSystemPrompt = `
    ${SYSTEM_PROMPT}
    CURRENT USER: ${settings.name} (${settings.careerStage})
    FIELD: ${settings.field}
    
    TONE INSTRUCTION: Use simple, clear English. Explain complex concepts as if speaking to an intelligent colleague from a different field. Avoid unnecessary jargon.
  `;

  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: tailoredSystemPrompt,
      temperature: 0.7 + (settings.creativityMode * 0.3),
    },
  });

  return chatSession;
};

export const sendMessage = async (message: string): Promise<string> => {
  if (!chatSession) throw new Error("Chat session not initialized");
  return withRetry(async () => {
    // @ts-ignore
    const result = await chatSession!.sendMessage({ message });
    return result.text || "No response generated.";
  });
};

export const fetchResearchFeed = async (settings: UserSettings, page: number = 1, dateCutoff?: string, limit: number = 10): Promise<FeedItem[]> => {
  const ai = getAI();
  const offsetPhrase = page > 1 ? `SKIP the first ${limit * (page - 1)} results. Return the NEXT ${limit} unique papers.` : "";
  const dateInstruction = dateCutoff ? `published AFTER ${dateCutoff}` : "published recently";
  const topics = settings.field.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
  const topicDisplay = topics.length > 0 ? topics.join(', ') : "Science and Technology";
  
  const query = `
    Task: Find ${limit + 5} recent academic papers about: "${topicDisplay}".
    Priority Journals: ${settings.trackedJournals.join(', ')}.
    Constraint: Papers must be ${dateInstruction}.
    Output: STRICT JSON LIST ONLY. Start response with "[". Do not write "Here are..."
    ${offsetPhrase}
  `;

  // Schema for feed items
  const prompt = `
    ${query}
    
    Return a JSON array:
    [
      {
        "title": "Exact Title",
        "authors": "Last, F. & Last, F.",
        "journal": "Journal Name",
        "date": "YYYY-MM-DD",
        "link": "URL",
        "summary": "Simple 2-sentence summary. Avoid jargon. Explain 'So What?'."
      }
    ]
  `;

  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });

      let text = response.text || "[]";
      const jsonString = extractJSON(text);
      
      if (!jsonString) {
          console.warn("No JSON found in feed response", text.substring(0, 100) + "...");
          return [];
      }
      
      try {
          let items = JSON.parse(jsonString) as FeedItem[];
          
          // STRICT CLIENT-SIDE FILTERING
          if (items.length > 0) {
              const validJournals = settings.trackedJournals.map(j => j.toLowerCase());
              const filtered = items.filter(item => {
                 const itemJournal = item.journal.toLowerCase();
                 return validJournals.some(v => itemJournal.includes(v));
              });
              
              return filtered.length > 0 ? filtered.slice(0, limit) : items.slice(0, limit);
          }
          return items;
      } catch (e) {
          console.error("Feed Parse Error", e);
          return [];
      }
    } catch (error) {
      console.error("Feed Fetch Error", error);
      throw error;
    }
  });
};

export const calculatePaperImpact = async (title: string, summary: string, link: string): Promise<{metrics: ImpactMetric[], reasoning: string}> => {
  const ai = getAI();
  const query = `
    ACT AS A STRICT GRANT REVIEWER.
    Paper: "${title}"
    
    Task:
    1. Score this paper (0-100) on 5 metrics. 
    BE HARSH. Average = 50. Good = 70. Exceptional = 90.
    - Novelty (Is it actually new?)
    - Feasibility (Can it be done?)
    - Soc. Impact (Does it matter?)
    - Funding (Will agencies pay?)
    - Interdisciplinary (Does it cross fields?)

    2. Write a "Critical Assessment". 
    - Paragraph 1: The Verdict. Why this score?
    - Paragraph 2: The Weakness. What is the biggest flaw?
    
    TONE: Use simple, plain English. No complex academic jargon.

    Output JSON ONLY:
    {
      "impactReasoning": "Critical assessment text...",
      "impactMetrics": [ {"category": "Novelty", "score": 50, "fullMark": 100}, ... ]
    }
  `;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: { responseMimeType: "application/json" }
    });

    const jsonString = extractJSON(response.text || "{}");
    if (!jsonString) return { metrics: [], reasoning: "Analysis unavailable." };
    return JSON.parse(jsonString);
  });
};

export const suggestJournals = async (userPrompt: string): Promise<JournalSuggestion[]> => {
  const ai = getAI();
  const query = `
    Act as a Senior Research Librarian.
    
    Task: Suggest 8 high-impact, relevant academic journals for the research topic: "${userPrompt}".
    
    Constraints:
    - Include a mix of broad impact (e.g. Nature) and specific field journals.
    - Provide a brief 1-sentence rationale for why it fits this specific topic.
    - Estimate Impact Factor (IF).
    
    Output: STRICT JSON LIST ONLY.
    [{"name": "Journal Name", "impactFactor": "15.5", "rationale": "Best for..."}]
  `;
  
  return withRetry(async () => {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: query,
          config: { responseMimeType: "application/json" }
      });
      const jsonString = extractJSON(response.text || "[]");
      if (!jsonString) return [];
      return JSON.parse(jsonString);
  });
};

export const generateVisualAbstract = async (title: string, summary: string): Promise<string | null> => {
  const ai = getAI();
  const prompt = `Scientific diagram for "${title}". Clean, minimal, professional. White background. No text.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-preview-image-generation',
    contents: { parts: [{ text: prompt }] }
  });
  return response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data || null;
};

export const generatePaperSummary = async (title: string, link: string | null, attachment: Attachment | null): Promise<string> => {
  const ai = getAI();
  const parts: any[] = [];
  if (attachment) parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
  
  const prompt = `
  Analyze the paper "${title}".
  Provide a detailed summary using EXACTLY these headers:

  ## 1. Main Message
  What is the core takeaway?

  ## 2. Background Context
  What is the history?

  ## 3. Research Gap
  What specific gap is addressed?

  ## 4. Methodology
  How was it done?

  ## 5. Plots and Diagrams
  Describe the key figures used in the paper.

  ## 6. Interesting Results
  What were the most surprising findings?

  ## 7. Plotting Instructions
  Provide Python (Matplotlib/Seaborn) code to generate a similar style of plot to the main figure in this paper using dummy data.
  `;
  
  if (link && !attachment) parts.push({ text: `${prompt}\nCONTEXT URL: ${link} (Use Search)` });
  else parts.push({ text: prompt });

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: { tools: (link && !attachment) ? [{ googleSearch: {} }] : undefined }
    });
    return response.text || "Summary unavailable.";
  });
};

export const findRelatedPapers = async (title: string): Promise<string> => {
  const ai = getAI();
  const query = `Find 5 papers related to "${title}". Output Markdown list with links. Verify links.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: { tools: [{ googleSearch: {} }] }
  });
  return response.text || "No related papers found.";
};

export const analyzeContent = async (promptPrefix: string, attachment: Attachment | null, link: string | null, mode: string = 'GENERAL', title: string = 'Paper'): Promise<string> => {
  const ai = getAI();
  const parts: any[] = [];
  if (attachment) parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
  
  let finalPrompt = "";

  if (promptPrefix.includes("Idea Fusion") || mode === 'FUSION') {
      // MASTER BACKEND PROMPT FOR FUSION (Trans-Domain Synthesis)
      const inputMatch = promptPrefix.match(/Idea Fusion (.*?) with (.*)/);
      const sourcePaper = inputMatch ? inputMatch[1] : title;
      const fusionTarget = inputMatch ? inputMatch[2] : "Interdisciplinary Application";

      finalPrompt = `
      ROLE: You are an Interdisciplinary Research Architect. Your task is to perform "Trans-Domain Synthesis" by taking the "First Principles" of the source paper and applying them to the User's Research Focus or Fusion Target.

      INPUTS:
      - Source Paper/Idea: ${sourcePaper}
      - Fusion Target / User Focus: ${fusionTarget}
      
      OUTPUT FORMATTING RULES:
      1. Use PLAIN TEXT MARKDOWN TABLES for the structure below.
      2. DO NOT use dollar signs ($) for notation. Use words.
      3. Be critical and honest.
      4. TONE: Engaging, Colorful, but Scientifically Accurate. Avoid Jargon.

      STRUCTURE OF OUTPUT:

      ## 1. Core Concept of Source Paper
      Describe the fundamental problem and the "First Principle" solution. Ignore jargon; focus on the underlying logic.
      | Aspect | Detail |
      | :--- | :--- |
      | First Principle | ... |
      | Mechanism | ... |

      ## 2. User Integration & Pain Points
      Define how this logic maps to the user's challenges (${fusionTarget}).
      | Aspect | Detail |
      | :--- | :--- |
      | User Problem | ... |
      | Integration Logic | ... |

      ## 3. Fusion Scenarios
      Provide 3 distinct scenarios of how these ideas can be fused.
      | Scenario | How it is Fused | Why it is Worth Taking |
      | :--- | :--- | :--- |
      | 1. [Name] | ... | ... |
      | 2. [Name] | ... | ... |
      | 3. [Name] | ... | ... |

      ## 4. Shortcomings & Cautions
      Analyze the "Reality Gap."
      | Pitfall | Why it is a Concern |
      | :--- | :--- |
      | [Name] | ... |

      ## 5. Critical Thinking & Research
      Suggest specific aspects the user should investigate.
      `;
  } else if (mode === 'MINDMAP') {
      finalPrompt = `
      Create a "Logic Flow" Flowchart describing the ENTIRE paper "${title}".
      Format: Mermaid.js graph OR text-based ASCII flowchart.
      Structure: Problem -> Hypothesis -> Methodology -> Experiments -> Analysis -> Conclusion.
      `;
  } else if (mode === 'GAPS') {
      finalPrompt = `Analyze "${title}" for gaps. Output 3 "Opportunity Cards": Gap -> Opportunity.`;
  } else if (mode === 'EDITORIAL') {
      finalPrompt = `Act as a Senior Editor. Critique "${title}". Acceptance Logic vs Rejection Risk.`;
  } else if (mode === 'PROPOSAL') {
      finalPrompt = `
      ROLE: You are a senior grant-writing expert helping a researcher turn a paper into a fundable proposal.

      Paper: "${title}"

      OUTPUT STRUCTURE:

      ## 1. Executive Summary
      One paragraph pitch for a non-specialist program officer. Lead with the societal need.

      ## 2. Research Objectives
      List 3-4 specific, measurable objectives derived from this paper's direction.
      | Objective | Measurable Outcome | Timeline |
      | :--- | :--- | :--- |

      ## 3. Methodology Plan
      How would you extend or replicate this work? What experiments or analyses are needed?

      ## 4. Funding Agency Match
      Which agencies or programs (NSF, NIH, ERC, DARPA, etc.) are best aligned and why?
      | Agency / Program | Fit Score (1-10) | Rationale |
      | :--- | :--- | :--- |

      ## 5. Budget Considerations
      What are the major cost drivers for this type of research? (Personnel, equipment, data, compute)

      ## 6. Risks & Mitigation
      What are the top 2-3 risks a reviewer would flag, and how would you address them?

      TONE: Practical, action-oriented. Plain English.
      `;
  } else {
      // Standard Prompt
      finalPrompt = promptPrefix + "\n\nSTRUCTURE YOUR RESPONSE:\n- Use **Bold Headers** for sections.\n- Use **Bullet Points** for readability.\n- KEEP IT SIMPLE: Plain English, no jargon unless necessary.\n- BE CRITICAL: Point out limitations clearly.";
  }
  
  if (link && !attachment) finalPrompt += `\nCONTEXT URL: ${link}. Use Google Search to get details.`;
  
  parts.push({ text: finalPrompt });
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: { tools: (link || !attachment) ? [{ googleSearch: {} }] : undefined }
    });
    return response.text || "Analysis complete.";
  });
};