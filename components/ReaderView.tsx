
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Settings, ArrowLeft, List, Target, Sparkles, X, ExternalLink, BookOpen, GraduationCap } from 'lucide-react';
import { BookData, ReaderSettings, AIEntityData } from '../types';
import { THEMES, MOCK_AI_KNOWLEDGE_BASE } from '../constants';
import { calculateProgress } from '../utils';
import { TOC } from './TOC';

// --- Sub-components ---

interface ParagraphProps {
  text: string;
  index: number;
  isActive: boolean;
  settings: ReaderSettings;
  themeStyles: any;
  onEntityClick: (data: AIEntityData) => void;
  onEntityHover: (e: React.MouseEvent, data: AIEntityData) => void;
  onEntityLeave: () => void;
  selectedEntityTerm?: string;
}

const Paragraph = React.memo(({ 
  text, 
  index, 
  isActive, 
  settings, 
  themeStyles,
  onEntityClick,
  onEntityHover,
  onEntityLeave,
  selectedEntityTerm
}: ParagraphProps) => {
  
  // Parse text for AI entities
  const content = useMemo(() => {
    if (!settings.aiMode) return text;

    const terms = Object.keys(MOCK_AI_KNOWLEDGE_BASE);
    if (terms.length === 0) return text;

    // Create a regex to match all terms
    const regex = new RegExp(`(${terms.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const normalizedKey = Object.keys(MOCK_AI_KNOWLEDGE_BASE).find(k => k.toLowerCase() === part.toLowerCase());

      if (normalizedKey) {
        const data = MOCK_AI_KNOWLEDGE_BASE[normalizedKey];
        const isSelected = selectedEntityTerm === data.term;

        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onEntityClick(data);
            }}
            onMouseEnter={(e) => onEntityHover(e, data)}
            onMouseLeave={onEntityLeave}
            className={`
              cursor-pointer transition-all duration-200
              border-b-[1.5px] border-dashed
              ${isSelected 
                ? 'bg-amber-100/50 text-amber-800 border-amber-600 font-medium' 
                : `${themeStyles.highlight} hover:bg-black/5`
              }
            `}
            style={{
               textDecorationColor: isSelected ? undefined : 'rgba(0,0,0,0.2)' 
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }, [text, settings.aiMode, themeStyles, selectedEntityTerm, onEntityClick, onEntityHover, onEntityLeave]);

  // Focus Mode Styles
  let containerClass = "relative transition-all duration-500 ease-in-out px-4 md:px-0 mb-6";
  let textClass = "leading-relaxed text-lg transition-all duration-500";
  
  if (settings.focusMode) {
    if (isActive) {
      containerClass += " opacity-100 scale-[1.01] my-10"; // Highlight
      textClass += " font-medium";
    } else {
      containerClass += " opacity-10 blur-[1.5px] grayscale my-10"; // Dim others
    }
  }

  return (
    <p 
      data-index={index}
      className={containerClass}
      style={{
        textAlign: settings.textAlign,
        // Responsive scroll scaling could be applied here conceptually, 
        // but currently handled via native scroll hijacking in parent
      }}
    >
      <span className={textClass}>
        {content}
      </span>
    </p>
  );
});

Paragraph.displayName = 'Paragraph';

// --- Main Component ---

interface ReaderViewProps {
  book: BookData;
  settings: ReaderSettings;
  onPageChange: (pageIndex: number) => void;
  onOpenSettings: () => void;
  onCloseBook: () => void;
  onToggleFocusMode: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  settings,
  onPageChange,
  onOpenSettings,
  onCloseBook,
  onToggleFocusMode,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const lastKeyTime = useRef<number>(0);

  const [isTOCOpen, setIsTOCOpen] = useState(false);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);

  // Sidebar Visibility State
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const sidebarTimerRef = useRef<number | null>(null);

  // AI Mode State
  const [selectedEntity, setSelectedEntity] = useState<AIEntityData | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<{data: AIEntityData, x: number, y: number} | null>(null);

  const themeStyles = THEMES[settings.theme];
  const totalChapters = book.chapters.length;
  const currentChapter = book.chapters[book.currentPageIndex];
  const progress = calculateProgress(book.currentPageIndex, totalChapters);

  // Scroll to top when chapter changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (settings.focusMode) {
      setTimeout(() => scrollToParagraph(0), 100);
    } else {
      setActiveParagraphIndex(null);
    }
    setSelectedEntity(null);
  }, [book.currentPageIndex, settings.focusMode]);

  // Sidebar Auto-Hide Logic
  const showSidebar = useCallback(() => {
    setSidebarVisible(true);
    if (sidebarTimerRef.current) {
      clearTimeout(sidebarTimerRef.current);
      sidebarTimerRef.current = null;
    }
  }, []);

  const startSidebarHideTimer = useCallback(() => {
    if (!settings.autoHideControls) return;
    
    if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
    
    sidebarTimerRef.current = window.setTimeout(() => {
      setSidebarVisible(false);
    }, (settings.autoHideDuration || 5) * 1000);
  }, [settings.autoHideControls, settings.autoHideDuration]);

  // Initial Sidebar Timer on mount/settings change
  useEffect(() => {
    if (settings.autoHideControls) {
      startSidebarHideTimer();
    } else {
      setSidebarVisible(true);
    }
    return () => {
      if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
    };
  }, [settings.autoHideControls, startSidebarHideTimer]);


  // --- FOCUS MODE LOGIC ---

  const scrollToParagraph = useCallback((index: number) => {
    const p = document.querySelector(`[data-index="${index}"]`) as HTMLElement;
    if (!p) return;

    isAutoScrolling.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    const rect = p.getBoundingClientRect();
    const absoluteTop = window.scrollY + rect.top;
    const viewportHeight = window.innerHeight;
    const elementHeight = rect.height;

    let targetScrollY = absoluteTop - (viewportHeight / 2) + (elementHeight / 2);

    if (elementHeight > viewportHeight * 0.8) {
      targetScrollY = absoluteTop - (viewportHeight * 0.2);
    }

    setActiveParagraphIndex(index);

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });

    scrollTimeoutRef.current = window.setTimeout(() => {
      isAutoScrolling.current = false;
    }, 600);
  }, []);

  // Scroll Locking
  useEffect(() => {
    if (!settings.focusMode) return;
    const preventDefault = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };
    window.addEventListener('wheel', preventDefault, { passive: false });
    window.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      window.removeEventListener('wheel', preventDefault);
      window.removeEventListener('touchmove', preventDefault);
    };
  }, [settings.focusMode]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (settings.focusMode) {
        const totalParagraphs = contentRef.current?.querySelectorAll('p').length || 0;
        const currentIndex = activeParagraphIndex ?? -1;

        if (['Space', ' ', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
          e.preventDefault();
          return;
        }

        const now = Date.now();
        const timeDiff = now - lastKeyTime.current;
        lastKeyTime.current = now;
        
        const step = timeDiff < 100 ? 3 : 1;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = Math.min(currentIndex + step, totalParagraphs - 1);
          scrollToParagraph(nextIndex);
        } 
        else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = Math.max(currentIndex - step, 0);
          scrollToParagraph(prevIndex);
        }
      }

      switch (e.key) {
        case 'ArrowRight':
          if (!settings.focusMode || (activeParagraphIndex !== null && contentRef.current && activeParagraphIndex >= (contentRef.current.querySelectorAll('p').length - 1))) {
             if (book.currentPageIndex < totalChapters - 1) onPageChange(book.currentPageIndex + 1);
          }
          break;
        case 'ArrowLeft':
          if (!settings.focusMode || (activeParagraphIndex === 0)) {
             if (book.currentPageIndex > 0) onPageChange(book.currentPageIndex - 1);
          }
          break;
        case 'Escape':
          if (isTOCOpen) setIsTOCOpen(false);
          else if (selectedEntity) setSelectedEntity(null);
          else onCloseBook();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book.currentPageIndex, totalChapters, isTOCOpen, selectedEntity, settings.focusMode, activeParagraphIndex, scrollToParagraph]);

  // Intersection Observer
  useEffect(() => {
    if (!settings.focusMode || !contentRef.current) return;

    const options = {
      root: null,
      rootMargin: '-45% 0px -45% 0px',
      threshold: 0
    };

    const callback: IntersectionObserverCallback = (entries) => {
      if (isAutoScrolling.current) return;
      const visibleEntry = entries.find(entry => entry.isIntersecting);
      if (visibleEntry) {
         const index = Number(visibleEntry.target.getAttribute('data-index'));
         if (!isNaN(index)) {
             setActiveParagraphIndex(index);
         }
      }
    };

    const observer = new IntersectionObserver(callback, options);
    const paragraphs = contentRef.current.querySelectorAll('p');
    paragraphs.forEach(p => observer.observe(p));

    return () => observer.disconnect();
  }, [settings.focusMode, currentChapter]);


  // --- AI HANDLERS ---
  
  const handleEntityClick = useCallback((data: AIEntityData) => {
    setSelectedEntity(data);
    setHoveredEntity(null);
  }, []);

  const handleEntityHover = useCallback((e: React.MouseEvent, data: AIEntityData) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredEntity({
      data,
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  }, []);

  const handleEntityLeave = useCallback(() => {
    setHoveredEntity(null);
  }, []);

  const isParagraphFocused = (index: number) => {
    if (!settings.focusMode || activeParagraphIndex === null) return true;
    // Default to 1 per request
    const count = settings.focusParagraphCount || 1; 
    const half = Math.floor(count / 2);
    const start = activeParagraphIndex - half;
    const end = activeParagraphIndex + half + (count % 2 === 0 ? -1 : 0);
    return index >= start && index <= end;
  };

  if (!currentChapter) return null;

  // Split content into paragraphs
  const paragraphs = currentChapter.content.split('\n').filter(p => p.trim().length > 0);

  return (
    <div className={`min-h-screen flex flex-row transition-colors duration-500 ${themeStyles.bg} ${themeStyles.text} overflow-x-hidden`}>
      
      {/* TRIGGER ZONE (Left Edge) */}
      <div 
        className="fixed left-0 top-0 bottom-0 w-4 z-[60] bg-transparent"
        onMouseEnter={showSidebar}
      />

      {/* TOOLTIP */}
      {hoveredEntity && !selectedEntity && (
        <div 
          className="fixed z-[100] px-4 py-3 bg-gray-900/90 text-white rounded-lg shadow-xl backdrop-blur-md max-w-xs pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ left: hoveredEntity.x, top: hoveredEntity.y - 8 }}
        >
          <div className="flex items-center gap-2 mb-1 text-amber-400">
             <Sparkles className="w-3 h-3" />
             <span className="text-[10px] uppercase tracking-wider font-bold">AI Summary</span>
          </div>
          <p className="text-sm font-medium leading-relaxed">{hoveredEntity.data.summary}</p>
          <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-900/90 rotate-45"></div>
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <div 
        className={`
          fixed left-0 top-0 bottom-0 w-16 z-50 flex flex-col items-center py-6 gap-6
          border-r backdrop-blur-sm transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)]
          ${themeStyles.uiBg} ${themeStyles.border}
          ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}
        `}
        onMouseEnter={showSidebar}
        onMouseLeave={startSidebarHideTimer}
      >
        <button 
          onClick={onCloseBook}
          className={`p-3 rounded-full ${themeStyles.hover} transition-all group`}
          title="Back"
        >
          <ArrowLeft className={`w-5 h-5 ${themeStyles.icon}`} />
        </button>

        <div className="flex-1 flex flex-col items-center gap-6 justify-center">
            <button
              onClick={() => setIsTOCOpen(true)}
              className={`p-3 rounded-full ${themeStyles.hover} transition-colors`}
              title="TOC"
            >
              <List className={`w-5 h-5 ${themeStyles.icon}`} />
            </button>

             <button 
               onClick={onToggleFocusMode}
               className={`p-3 rounded-full transition-colors ${settings.focusMode ? 'bg-blue-100' : themeStyles.hover}`}
               title="Focus Mode"
             >
                <Target className={`w-5 h-5 ${settings.focusMode ? 'text-blue-600' : themeStyles.icon}`} />
             </button>

             <button
               onClick={() => onOpenSettings()}
               className={`p-3 rounded-full transition-colors cursor-pointer ${settings.aiMode ? 'bg-amber-100' : themeStyles.hover}`}
               title="AI Companion"
             >
                <Sparkles className={`w-5 h-5 ${settings.aiMode ? 'text-amber-600' : themeStyles.icon}`} />
             </button>

            <button 
              onClick={onOpenSettings}
              className={`p-3 rounded-full ${themeStyles.hover} transition-colors`}
              title="Settings"
            >
              <Settings className={`w-5 h-5 ${themeStyles.icon}`} />
            </button>
        </div>

        <div className="flex flex-col items-center text-[10px] font-mono opacity-50 gap-1">
             <span>{progress}%</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main 
        className={`
          flex-1 flex justify-center w-full min-h-screen transition-all duration-300
          ${isSidebarVisible ? 'pl-16' : 'pl-0'}
          ${selectedEntity ? 'pr-[24rem]' : 'pr-4'} 
          ${settings.focusMode ? 'py-0' : 'py-20'} 
        `}
        style={{
           // Apply padding for Typewriter effect in Focus Mode
           paddingTop: settings.focusMode ? '45vh' : undefined,
           paddingBottom: settings.focusMode ? '45vh' : undefined
        }}
      >
        <div 
          ref={contentRef}
          className={`w-full select-text transition-all duration-300 ease-in-out`}
          style={{ 
            maxWidth: settings.maxWidth,
            fontSize: settings.fontSize,
            lineHeight: settings.lineHeight,
            // Apply Font Family logic
            fontFamily: settings.fontFamily === 'elegant' 
              ? 'Lora, "Songti SC", serif' 
              : settings.fontFamily === 'mono'
              ? '"JetBrains Mono", monospace'
              : settings.fontFamily === 'heiti'
              ? 'Inter, "PingFang SC", sans-serif'
              : 'Merriweather, "Songti SC", serif'
          }}
        >
          {/* Chapter Title */}
          {!settings.focusMode && (
            <h1 className="text-3xl font-bold mb-12 text-center opacity-80">{currentChapter.title}</h1>
          )}

          {/* Paragraphs */}
          {paragraphs.map((text, i) => (
             <Paragraph 
               key={i}
               index={i}
               text={text}
               isActive={isParagraphFocused(i)}
               settings={settings}
               themeStyles={themeStyles}
               onEntityClick={handleEntityClick}
               onEntityHover={handleEntityHover}
               onEntityLeave={handleEntityLeave}
               selectedEntityTerm={selectedEntity?.term}
             />
          ))}

          {/* Pagination Hints (Standard Mode) */}
          {!settings.focusMode && (
            <div className="mt-20 flex justify-center gap-8 opacity-40">
              <button onClick={() => book.currentPageIndex > 0 && onPageChange(book.currentPageIndex - 1)} className="hover:opacity-100">
                Previous Chapter
              </button>
              <button onClick={() => book.currentPageIndex < totalChapters - 1 && onPageChange(book.currentPageIndex + 1)} className="hover:opacity-100">
                Next Chapter
              </button>
            </div>
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR (AI CONTEXT) */}
      <div className={`
        fixed right-0 top-0 bottom-0 w-[24rem] z-40 bg-white/95 border-l shadow-2xl backdrop-blur-md transform transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]
        ${selectedEntity ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {selectedEntity && (
           <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-br from-amber-50 to-white">
                 <div>
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">AI Knowledge</span>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-gray-900">{selectedEntity.term}</h2>
                 </div>
                 <button onClick={() => setSelectedEntity(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                 </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 font-sans">
                 
                 {/* Concise */}
                 <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Concise Explanation</h3>
                    <p className="text-gray-800 leading-relaxed text-[15px]">{selectedEntity.concise}</p>
                 </section>

                 {/* Background */}
                 <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                       <BookOpen className="w-3 h-3" /> Background
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed">{selectedEntity.background}</p>
                 </section>

                 {/* Wiki */}
                 <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                       <GraduationCap className="w-3 h-3" /> Wiki Entry
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed italic border-l-2 border-amber-200 pl-4">
                       "{selectedEntity.wiki}"
                    </p>
                 </section>

                 {/* Extended */}
                 <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                       <ExternalLink className="w-3 h-3" /> Related Topics
                    </h3>
                    <div className="flex flex-wrap gap-2">
                       {selectedEntity.extended.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-gray-600 text-xs rounded-full cursor-pointer transition-colors">
                             {tag}
                          </span>
                       ))}
                    </div>
                 </section>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                 <button className="text-xs text-amber-600 font-medium hover:underline flex items-center justify-center gap-1">
                    Ask AI for more details <ArrowLeft className="w-3 h-3 rotate-180" />
                 </button>
              </div>
           </div>
        )}
      </div>

      <TOC 
        isOpen={isTOCOpen} 
        onClose={() => setIsTOCOpen(false)}
        chapters={book.chapters}
        currentChapterIndex={book.currentPageIndex}
        onSelectChapter={onPageChange}
        currentTheme={settings.theme}
      />
    </div>
  );
};
