# RIG Catalyst — Complete UI Design Brief
**For use with Stitch / UI design tools**

---

## 1. PRODUCT OVERVIEW

**App Name:** RIG Catalyst (Research Intelligence Generator)
**Tagline:** Your AI-powered research companion
**Target Users:** Academic researchers, PhD students, postdocs, R&D professionals
**Core Purpose:** Help researchers discover papers, analyze them deeply with AI, generate new ideas, and manage their research workflow — all in one place.
**Tech Stack:** React + TypeScript + Vite, Tailwind CSS, Google Gemini AI, Recharts

---

## 2. CURRENT COLOR PALETTE & DESIGN TOKENS

### Primary Colors
- **Academic Blue (Primary):** `#0284c7` (academic-600) — buttons, active states, accents
- **Academic Light:** `#0ea5e9` (academic-500) — highlights, icons
- **Academic Dark:** `#075985` (academic-800) — hover states
- **Academic Pale:** `#f0f9ff` (academic-50) — backgrounds, hover fills

### Neutral Palette
- **Background Light:** `#f8fafc` (slate-50)
- **Background Dark:** `#020617` (slate-950)
- **Card Light:** `#ffffff`
- **Card Dark:** `#1e293b` (slate-800)
- **Border Light:** `#f1f5f9` (slate-100)
- **Border Dark:** `#334155` (slate-700)
- **Text Primary Light:** `#0f172a` (slate-900)
- **Text Primary Dark:** `#f1f5f9` (slate-100)
- **Text Muted:** `#64748b` (slate-500)

### Accent Colors (used in cards/tags)
- **Amber:** `#f59e0b` — Idea Fusion feature
- **Emerald:** `#10b981` — Gap Analysis, positive signals
- **Rose:** `#f43f5e` — Warnings, critical gaps, errors
- **Indigo:** `#6366f1` — Insights, synthesis
- **Purple-to-Blue gradient:** Feed card placeholders

### Typography
- **Sans-serif:** Inter (body, UI labels, buttons)
- **Serif:** Merriweather (headings, paper titles, editorial feel)

---

## 3. LAYOUT STRUCTURE (Current)

```
┌─────────────────────────────────────────────────────┐
│  TOP NAV BAR (fixed, 64px height)                   │
│  Logo | [Live Feed] [Analysis Studio] [AI Chat] [👤]│
│                              [🌙] dark toggle        │
├─────────────────────────────────────────────────────┤
│  FEED CONTROLS BAR (only on Feed view, 56px)        │
│  Focus chips | Journals chips | Since date | Count  │
│                                        [Update Feed] │
├─────────────────────────────────────────────────────┤
│                                                     │
│              MAIN CONTENT AREA                      │
│         (switches between 4 views)                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Desired layout (for redesign):** Left sidebar navigation (220px wide) + top search bar + main content. See Section 8 for detailed redesign suggestions.

---

## 4. ALL VIEWS & SCREENS

---

### VIEW 1: LIVE FEED

**Purpose:** Discover recent academic papers filtered by research focus and journals.

**Layout:** 4-column responsive card grid (1 col mobile → 2 col tablet → 4 col desktop)

**Feed Controls Bar (sub-header):**
- **Focus Topics (multi-chip):** Shows removable topic chips (e.g., "Artificial Intelligence ×", "Biochar ×"). "+ Add Topic" button opens an autocomplete input with 50+ research area suggestions that filter as you type.
- **Journals (multi-chip):** Removable journal chips (e.g., "Nature ×", "arXiv ×"). "+ Add" button opens autocomplete with 50+ journal suggestions. Compass icon opens "Journal Scout" popover.
- **Since (date input):** Date picker for cutoff date
- **Count (number input):** 1–20 papers to load
- **Update Feed button:** Triggers parallel fetch

**Loading State:**
- Progress bar at top showing "Fetching from Nature, arXiv…" with paper count
- Shimmer skeleton cards fill the grid immediately (maintain layout while loading)
- Papers stream in one journal at a time as each parallel request completes

**Feed Card anatomy:**
```
┌────────────────────────────┐
│   IMAGE AREA (160px tall)  │
│   [Generate Abstract btn]  │  ← AI generates a visual diagram
│   [JOURNAL TAG]            │  ← bottom-right badge
├────────────────────────────┤
│  DATE            ["] [🔖]  │  ← cite & bookmark icons
│                            │
│  Paper Title (serif, bold) │
│  (line-clamp 2 lines)      │
│                            │
│  Summary text              │
│  (line-clamp 3 lines)      │
│                            │
│  [✦ Open Research Studio]  │  ← primary CTA
└────────────────────────────┘
```

**Special first card — Upload Card:**
- Gradient blue card always shown as first item
- "Analyze Your Paper" — Upload PDF / Paste Link
- Opens Analysis Studio with file upload ready

**Journal Scout Popover:**
- Appears below journal input
- Input for topic + "Find" button
- AI returns 8 relevant journals with impact factor + rationale
- Checkbox-style selection
- "Apply Selected Journals" button merges choices into journal chips

**Empty/Error States:**
- Error: Red card with "Failed to Load Feed" + Retry button
- Empty: BookOpen icon + "No papers found. Try adjusting your topic or date range."

---

### VIEW 2: ANALYSIS STUDIO

**Purpose:** Deep AI analysis of any research paper — from feed, uploaded PDF, pasted abstract, or URL.

**Two sub-states:**

#### 2A. EMPTY STATE (no paper selected)
- Centered layout, max-width 672px
- Layout icon + "Research Analysis Studio" heading (serif)
- Subtitle text
- `InputSection` component with 3 tabs:
  - **Text / Abstract** — textarea for pasting text
  - **Web Link** — URL input (AI fetches content in real-time)
  - **Upload PDF** — drag-and-drop zone + file browser (accepts .pdf and images)
- Analysis mode selector dropdown: General Summary / Gap Detector / Idea Fusion Lab / Proposal Builder
- "Start Deep Analysis" CTA button

#### 2B. ACTIVE ANALYSIS (paper open)
**Header bar:**
- Back (×) button
- Badge: "Private Analysis" (uploaded) or "Published Research" (from feed)
- Date badge
- Paper title (truncated, serif)
- Right actions: [Cite] [🔖 Bookmark] [🔗 Original Source]

**Analysis Tabs (7 tabs, horizontal scrollable):**

| Tab | Icon | What it does |
|-----|------|-------------|
| Summary | FileText | Structured 7-section AI summary |
| Impact Prediction | Sparkles | Radar chart + critical grant-reviewer scoring |
| Core Insights | Lightbulb | Key insights extracted |
| Gap Analysis | Search | 3 opportunity cards (Gap → Opportunity) |
| Idea Fusion | Zap | Trans-domain synthesis with user's field |
| Logic Flow | Network | Mermaid flowchart of paper's reasoning |
| Editor View | PenTool | Acceptance vs. rejection analysis |

**Content area:**
- Results render inside styled cards via `MarkdownMessage` component
- Supports: bold, bullets, code blocks with syntax highlighting, markdown tables
- Tables render with styled headers (uppercase, tracking), striped rows, hover highlights
- Each `##` section becomes a color-coded card:
  - Blue border-left: Core Concepts, Background, Methods
  - Indigo gradient: Fusion, Insights, Results
  - Rose border-left: Shortcomings, Gaps, Weaknesses
  - Emerald border-left: Critical Thinking, Next Steps, Code

**Impact Tab specifics:**
- Recharts Radar chart (RadarChart) at top, 320px tall
- 5 metrics: Novelty, Feasibility, Soc. Impact, Funding, Interdisciplinary
- Each scored 0–100
- Text reasoning below the chart

**Idea Fusion Tab specifics (unique 2-column layout):**
- Left column (1/3): Control panel
  - "Trans-Domain Fusion" heading with ⚡ icon
  - Text input: "My Research Area / Target Domain"
  - Quick suggestion chips (your field + 4 preset domains)
  - "Generate Idea Fusion" / "Re-Fuse Ideas" amber button
- Right column (2/3): Fusion results (MarkdownMessage with tables)

**Loading state within tabs:**
- Spinner with "Synthesizing Research Data…" text
- Cached: switching back to a completed tab shows result instantly

---

### VIEW 3: AI CHAT

**Purpose:** Free-form conversational AI assistant for research questions.

**Layout:** Full-height chat interface

**Empty state:**
- Sparkles icon
- "AI Research Assistant" heading
- Subtitle
- 4 starter question chips (clickable, populate input)
  - "What are the main limitations of transformer models?"
  - "How do I choose between a RCT and observational study?"
  - "Explain p-values in plain English."
  - "What questions should I ask before citing a paper?"

**Message bubbles:**
- User: Right-aligned, `academic-600` blue background, white text, rounded-br-sm
- AI: Left-aligned, white/slate-800 card, border, rounded-bl-sm, renders full Markdown
- Error: Left-aligned, rose background, error text
- Each message shows timestamp (HH:MM)

**Typing indicator:**
- 3 bouncing blue dots with staggered animation delays

**Input bar (bottom, sticky):**
- Multi-line textarea (2 rows)
- Enter = send, Shift+Enter = new line
- Send button (disabled when empty or loading)

---

### VIEW 4: PROFILE & SETTINGS

**Purpose:** Personalize the AI assistant and manage saved papers.

**Section 1 — Personalization:**
- Display Name (text input)
- Primary Field (text input)
- Career Stage (select: Student / Early Career / Established)

**Section 2 — Saved Papers:**
- Counter badge: "Saved Papers (N)"
- Empty state: "No saved papers yet. Bookmark them from the feed!"
- Paper list items:
  - Thumbnail (visual abstract if generated, else FileText icon)
  - Title (truncated)
  - Journal • Date
  - 🗑️ Remove button
  - Clicking opens paper in Analysis Studio

---

### VIEW 5: CITATION MODAL (overlay)

**Trigger:** Quote icon on feed cards, Studio header, or saved papers list

**Content:**
- Modal overlay (backdrop blur)
- Header: Quote icon + "Export Citation"
- Paper title + journal + date summary bar
- 5 citation formats, each in a card:
  - APA, MLA, Chicago, Harvard, BibTeX
  - Each has a "Copy" button that shows "✓ Copied!" with green flash
- "Done" button closes modal

---

## 5. COMPONENT INVENTORY

| Component | Location | Description |
|-----------|----------|-------------|
| `AutocompleteInput` | App.tsx | Reusable input with live-filter dropdown |
| `FeedCard` | App.tsx | Paper card with image, metadata, actions |
| `FeedCardSkeleton` | App.tsx | Shimmer placeholder matching FeedCard dimensions |
| `UploadCard` | App.tsx | Blue gradient CTA card for PDF upload |
| `MarkdownMessage` | components/ | Renders AI output as styled section cards |
| `SimpleChart` | components/ | Recharts radar chart for impact metrics |
| `InputSection` | components/ | 3-tab input (text/link/file) + mode selector |
| `CitationModal` | components/ | Multi-format citation export overlay |

---

## 6. KEY USER FLOWS

### Flow A: Discover → Analyze
1. User sets topic chips + journal chips in Feed Controls
2. Clicks "Update Feed" → skeleton cards appear immediately
3. Papers stream in from each journal
4. Clicks "Open Research Studio" on a card
5. Summary + Impact auto-load
6. Switches tabs to explore Gap Analysis, Idea Fusion, etc.

### Flow B: Upload Own Paper
1. Clicks blue "Analyze Your Paper" card in feed
2. Analysis Studio empty state appears
3. Drags PDF onto upload zone or pastes abstract
4. Selects analysis mode
5. Clicks "Start Deep Analysis"
6. Full analysis loads, all 7 tabs available

### Flow C: Save → Return
1. Bookmarks paper from feed card or Studio
2. Navigates to Profile (👤 icon)
3. Sees saved paper in list with thumbnail
4. Clicks to reopen in Studio

### Flow D: Cite a Paper
1. Clicks quote icon (") on any feed card or in Studio header
2. Citation modal opens
3. Copies desired format to clipboard
4. Closes modal

### Flow E: Journal Discovery
1. Clicks compass icon (⊕) next to journals
2. Journal Scout popover opens
3. Types topic or uses current focus
4. Clicks "Find"
5. AI returns 8 journals with IF + rationale
6. Selects desired journals
7. Clicks "Apply Selected Journals" — chips update

---

## 7. AI FEATURES SUMMARY

| Feature | AI Model | Input | Output |
|---------|----------|-------|--------|
| Live Feed fetch | Gemini 2.5 Flash + Google Search | Topic + Journal + Date | JSON array of papers |
| Paper Summary | Gemini 2.5 Flash + Google Search | Title + URL or PDF | 7-section structured text |
| Impact Prediction | Gemini 2.5 Flash | Title + Summary | Radar chart data + critique |
| Visual Abstract | Gemini 2.0 Flash Image | Title + Summary | Base64 PNG image |
| Idea Fusion | Gemini 2.5 Flash | Paper + target domain | Markdown tables |
| Gap Analysis | Gemini 2.5 Flash | Paper title/content | 3 opportunity cards |
| Logic Flow | Gemini 2.5 Flash | Paper | Mermaid flowchart |
| Editor View | Gemini 2.5 Flash | Paper | Accept/reject analysis |
| Proposal Builder | Gemini 2.5 Flash | Paper | Grant proposal structure |
| Journal Scout | Gemini 2.5 Flash | Topic | 8 journals with IF |
| AI Chat | Gemini 2.5 Flash (Chat) | Free-form question | Conversational response |

---

## 8. REDESIGN SUGGESTIONS FOR STITCH

### Navigation: Top bar → Left Sidebar
```
┌──────────┬──────────────────────────────────┐
│          │  TOP BAR: Search + Mode + Avatar │
│  SIDEBAR │──────────────────────────────────┤
│  220px   │                                  │
│          │                                  │
│ 🔬 RIG   │         MAIN CONTENT             │
│ Catalyst │                                  │
│          │                                  │
│ 📡 Feed  │                                  │
│ 🔬 Studio│                                  │
│ 💬 Chat  │                                  │
│ 📓 Notes │                                  │
│ ⚡ Fusion│                                  │
│          │                                  │
│ ─────────│                                  │
│ 👤 Name  │                                  │
│ ● Online │                                  │
└──────────┴──────────────────────────────────┘
```

### New Sections to Add

**Notebook** — Saved papers with personal annotations
- List view with paper cards
- Inline note editor per paper
- Tag system (#methodology #review #cite)
- Export notes as Markdown

**Fusion Lab** — Standalone hypothesis generator
- Source paper input
- Target domain input
- Generates: Incremental hypothesis + Disruptive hypothesis
- "Challenge Idea" button to push back on each hypothesis
- "Add to Notebook" saves the fusion result

**Concept Map** — Visual knowledge graph
- Auto-generated from uploaded paper
- Nodes: key concepts, methods, findings
- Edges: relationships between concepts
- Expandable / zoomable

**Citation Graph** — Paper relationship network
- Shows how papers in your saved list relate
- 24-node graph (as in your mockup)
- Relevance % + citation count per node

### Mode Switcher (top bar)
Three modes that change AI response style:
- **Generalist** — Plain English, minimal jargon, analogies
- **Researcher** — Technical depth, methods-focused
- **Expert** — Full academic rigor, statistical critique, peer-review mode

### Additional UI Enhancements
- **Focus Mode** — Hides all UI chrome, shows just paper + analysis
- **System status dot** — Green "● API Online" indicator
- **Global Search** — Cmd+K opens search across feed + saved papers
- **Reading progress** — Shows "Page 12 of 48" when reading uploaded PDF
- **Dark/Light/System** — Three-way theme toggle instead of binary

---

## 9. CURRENT DESIGN PAIN POINTS

1. **Top nav is cramped** — 4 tabs + controls bar creates double-header feeling
2. **Feed controls bar wraps badly on smaller screens** — chips can overflow
3. **Analysis Studio tabs overflow horizontally** — 7 tabs need better handling on mobile
4. **No visual hierarchy in feed** — all cards look identical, no featured/trending paper
5. **Chat has no conversation history** — refreshing loses all messages
6. **Settings page is sparse** — only name/field/career stage, needs API key input UI
7. **No onboarding** — first-time users see a blank feed with no guidance

---

## 10. BRAND PERSONALITY

- **Intelligent but approachable** — not cold and clinical
- **Trusted like a senior colleague** — direct, critical, honest
- **Premium academic tool** — like Notion meets Google Scholar meets ChatGPT
- **Dark mode first** — most researchers work at night
- Iconography: Lucide React icons throughout
- Motion: Subtle fade-ins, shimmer skeletons, bounce dots for typing
