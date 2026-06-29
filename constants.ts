
export const SYSTEM_PROMPT = `
You are RIG Catalyst, an elite AI research companion for senior academics. 

## CORE DIRECTIVES
1. **BE CRITICAL & OBJECTIVE**: You are a harsh peer reviewer, not a hype man. Do not use flowery language ("groundbreaking", "revolutionary") unless there is irrefutable evidence.
2. **STRUCTURE IS KING**: Use clear headers, bullet points, and bold text. Avoid long, dense paragraphs.
3. **SIMPLE & DIRECT**: Use plain English. Explain complex concepts simply. Avoid unnecessary jargon.
4. **ENABLE CRITICAL THINKING**: Don't just summarize. Question the methodology. Point out limitations. Ask "So what?".

## 🛡️ CITATION PROTOCOL
- Explicitly state if you are analyzing the **FULL TEXT** or just the **ABSTRACT**.
- Do not hallucinate citations.

## TOOL SPECIFIC BEHAVIORS

### IMPACT PREDICTION (Critical Mode)
- **Score Conservatively**: An average paper is 50/100. A good paper is 70/100. Only Nobel-level work gets 90+.
- **Justify Ruthlessly**: If you give a low score, explain exactly why (e.g., "Incremental advance only", "Sample size too small").

### GAP DETECTOR
- Identify specific, actionable gaps.
- Use the format: **[Gap Type]**: [Description] -> [Opportunity].

### IDEA FUSION
- Propose novel, risky, but scientifically grounded combinations.
`;

export const POPULAR_JOURNALS = [
  "Nature", "Science", "Cell", "Nature Medicine", "Nature Biotechnology",
  "Nature Communications", "Nature Climate Change", "Nature Energy",
  "Nature Genetics", "Nature Neuroscience", "Nature Methods",
  "New England Journal of Medicine", "The Lancet", "JAMA", "BMJ",
  "PNAS", "PLOS ONE", "eLife", "Current Biology", "Developmental Cell",
  "Cancer Cell", "Immunity", "Neuron", "Cell Stem Cell", "Cell Reports",
  "arXiv", "NeurIPS", "ICLR", "ICML", "CVPR", "ECCV", "ICCV", "ACL", "EMNLP",
  "Physical Review Letters", "Physical Review X", "Advanced Materials",
  "ACS Nano", "Journal of the American Chemical Society", "Angewandte Chemie",
  "IEEE Transactions on Neural Networks", "ACM Computing Surveys",
  "Bioinformatics", "Genome Research", "Genome Biology", "Nucleic Acids Research",
  "Environmental Science & Technology", "Soil Biology and Biochemistry",
  "Energy & Environmental Science", "Joule", "Applied Energy",
  "Journal of Cleaner Production", "Science of the Total Environment",
  "Frontiers in Neuroscience", "Frontiers in Psychology", "Frontiers in Medicine",
];

export const POPULAR_RESEARCH_AREAS = [
  "Artificial Intelligence", "Machine Learning", "Deep Learning",
  "Natural Language Processing", "Large Language Models", "Computer Vision",
  "Reinforcement Learning", "Generative AI", "Graph Neural Networks",
  "Robotics", "Autonomous Systems", "Human-Computer Interaction",
  "Quantum Computing", "Quantum Physics", "Condensed Matter Physics",
  "Molecular Biology", "Cell Biology", "Structural Biology", "Biochemistry",
  "Neuroscience", "Cognitive Science", "Immunology", "Oncology",
  "Genomics", "Proteomics", "CRISPR", "Synthetic Biology", "Epigenetics",
  "Drug Discovery", "Pharmacology", "Clinical Trials", "Epidemiology", "Public Health",
  "Climate Science", "Environmental Science", "Ecology", "Biodiversity",
  "Materials Science", "Nanotechnology", "Photonics", "Semiconductors",
  "Biochar", "Soil Science", "Agriculture", "Food Science",
  "Renewable Energy", "Solar Energy", "Battery Technology", "Hydrogen Energy",
  "Bioinformatics", "Computational Biology", "Systems Biology",
  "Astrophysics", "Cosmology", "Organic Chemistry", "Polymer Science",
  "Microbiome", "Virology", "Infectious Disease", "Vaccine Development",
];

export const MOCK_IMPACT_DATA = [
  { category: 'Novelty', score: 65, fullMark: 100 },
  { category: 'Feasibility', score: 60, fullMark: 100 },
  { category: 'Soc. Impact', score: 75, fullMark: 100 },
  { category: 'Funding Potential', score: 55, fullMark: 100 },
  { category: 'Interdisciplinary', score: 70, fullMark: 100 },
];
