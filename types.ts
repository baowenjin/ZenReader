
export enum ThemeType {
  LIGHT = 'light',
  SEPIA = 'sepia',
  DARK = 'dark',
}

export enum FontFamily {
  SANS = 'sans',
  SERIF = 'serif',
  ELEGANT = 'elegant',
  MONO = 'mono',
  // Chinese Fonts
  SONGTI = 'songti', // 宋体
  HEITI = 'heiti',   // 黑体
  KAITI = 'kaiti',   // 楷体
}

export interface ReaderSettings {
  theme: ThemeType;
  fontSize: number;
  lineHeight: number;
  fontFamily: FontFamily;
  maxWidth: number;
  textAlign: 'left' | 'justify';
  autoHideControls: boolean;
  autoHideDuration: number; // seconds
  focusMode: boolean; 
  focusParagraphCount: number; // Number of paragraphs to highlight
  aiMode: boolean; // New AI Companion Mode
}

export interface Chapter {
  title: string;
  content: string;
}

export interface BookData {
  id: string; // Unique ID for database
  title: string;
  author?: string; // Extracted author name
  publisher?: string; // Extracted publisher name
  content: string; // The full text content
  chapters: Chapter[]; // Structured chapters (title + content)
  currentPageIndex: number; // In this context, "page" refers to "chapter index"
  createdAt: number;
  lastReadAt: number;
  coverImage?: string; // Base64 string for the cover
}

export interface AIEntityData {
  term: string;
  summary: string; // 一句话总结 (for Tooltip)
  concise: string; // 精要解释
  background: string; // 背景知识
  wiki: string; // Wiki content
  extended: string[]; // 延伸阅读
}
