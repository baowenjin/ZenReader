
import { ThemeType, FontFamily, AIEntityData } from './types';

// Centralized Color Definitions for JS + Tailwind usage
export const THEME_COLORS = {
  [ThemeType.LIGHT]: {
    bg: '#ffffff',
    uiBg: '#f9fafb', // gray-50
  },
  [ThemeType.SEPIA]: {
    bg: '#FAF9F6', // Off-white / Cream (much less yellow)
    uiBg: '#F2F0E9', // Slightly darker warm grey for UI distinction
  },
  [ThemeType.DARK]: {
    bg: '#1a1a1a',
    uiBg: '#242424',
  }
};

export const DEFAULT_SETTINGS = {
  theme: ThemeType.LIGHT,
  fontSize: 19,
  lineHeight: 1.8,
  fontFamily: FontFamily.HEITI,
  maxWidth: 1100, // Updated to 1100 per request
  textAlign: 'justify' as const,
  autoHideControls: true,
  autoHideDuration: 5,
  focusMode: false,
  focusParagraphCount: 1, 
  aiMode: true,
};

export const CHARS_PER_PAGE_ESTIMATE = 2000;

export const THEMES = {
  [ThemeType.LIGHT]: {
    bg: 'bg-white',
    text: 'text-gray-900',
    uiBg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'text-gray-600',
    hover: 'hover:bg-gray-200',
    active: 'bg-gray-200',
    dimmed: 'text-gray-300',
    highlight: 'border-blue-400 text-blue-600',
  },
  [ThemeType.SEPIA]: {
    // Using arbitrary values to match THEME_COLORS exactly
    bg: 'bg-[#FAF9F6]', 
    text: 'text-[#2D2926]', // Sharp dark charcoal/brown for better contrast
    uiBg: 'bg-[#F2F0E9]', // Distinct from content
    border: 'border-[#E6E2D8]',
    icon: 'text-[#8C857B]',
    hover: 'hover:bg-[#E6E2D8]',
    active: 'bg-[#E6E2D8]',
    dimmed: 'text-[#B0A89E]',
    highlight: 'border-[#8C857B] text-[#5C554B]',
  },
  [ThemeType.DARK]: {
    bg: 'bg-[#1a1a1a]',
    text: 'text-[#cecece]',
    uiBg: 'bg-[#242424]',
    border: 'border-gray-700',
    icon: 'text-gray-400',
    hover: 'hover:bg-gray-700',
    active: 'bg-gray-700',
    dimmed: 'text-[#444]',
    highlight: 'border-blue-400 text-blue-300',
  },
};

export const FONT_LABELS = {
  [FontFamily.ELEGANT]: 'Elegant (Lora + 宋体)', 
  [FontFamily.HEITI]: 'Modern (Inter + 黑体)',
  [FontFamily.SONGTI]: 'Classic (Serif + 宋体)',
  [FontFamily.KAITI]: 'Relaxed (Hand + 楷体)',
  [FontFamily.MONO]: 'Code (Mono)',
  [FontFamily.SANS]: 'System Sans',
  [FontFamily.SERIF]: 'System Serif',
};

// CSS Font Families
export const FONT_FAMILIES = {
  [FontFamily.SANS]: 'Inter, ui-sans-serif, system-ui, sans-serif',
  [FontFamily.SERIF]: 'Merriweather, ui-serif, Georgia, serif',
  [FontFamily.ELEGANT]: 'Lora, "Songti SC", "SimSun", "STSong", "Noto Serif SC", serif',
  [FontFamily.MONO]: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  [FontFamily.HEITI]: 'Inter, "PingFang SC", "Microsoft YaHei", "SimHei", "Heiti SC", sans-serif',
  [FontFamily.SONGTI]: 'Merriweather, Georgia, "SimSun", "STSong", "Songti SC", serif',
  [FontFamily.KAITI]: 'Lora, "KaiTi", "STKaiti", "KaiTi_GB2312", serif',
};

export const MOCK_AI_KNOWLEDGE_BASE: Record<string, AIEntityData> = {
  "Dursley": {
    term: "Dursley",
    summary: "The non-magical relatives of Harry Potter.",
    concise: "The Dursley family are Harry Potter's only living relatives. They live at 4 Privet Drive and despise anything related to magic.",
    background: "Mr. Vernon Dursley and Mrs. Petunia Dursley pride themselves on being perfectly normal. They took Harry in after his parents died but treated him poorly.",
    wiki: "The Dursley family are fictional characters in the Harry Potter series...",
    extended: ["Vernon Dursley", "Petunia Dursley", "Dudley Dursley"]
  },
  "Privet Drive": {
    term: "Privet Drive",
    summary: "The street where the Dursleys live.",
    concise: "A suburban street in Little Whinging, Surrey, England, where Harry Potter lived with his aunt and uncle.",
    background: "It represents the mundane, conformist world of the Dursleys, contrasting sharply with the magical world.",
    wiki: "Privet Drive is a street in the fictional town of Little Whinging...",
    extended: ["Harry Potter Locations", "Little Whinging"]
  },
  "Grunnings": {
    term: "Grunnings",
    summary: "Drill manufacturing company.",
    concise: "The company where Vernon Dursley works as a director.",
    background: "Grunnings makes drills. It emphasizes Vernon's boring, normal, and successful middle-class life.",
    wiki: "Grunnings is a drill manufacturing company in the Harry Potter universe...",
    extended: ["Vernon Dursley", "Drills"]
  },
  "Muggle": {
    term: "Muggle",
    summary: "Non-magical person.",
    concise: "A person who lacks any sort of magical ability and was not born in a magical family.",
    background: "The term is used by wizards to describe ordinary humans.",
    wiki: "In the Harry Potter series, a Muggle is a person who lacks any sort of magical ability...",
    extended: ["Magic", "Wizarding World"]
  },
  "Potter": {
    term: "Potter",
    summary: "Refers to Harry Potter or his family.",
    concise: "The surname of the protagonist, Harry Potter, a wizard who survived Lord Voldemort's attack as a baby.",
    background: "The Potters were a pure-blood wizarding family, though Harry is a half-blood. They were killed by Voldemort.",
    wiki: "The Potter family is a fictional wizarding family...",
    extended: ["Harry Potter", "James Potter", "Lily Potter"]
  }
};
