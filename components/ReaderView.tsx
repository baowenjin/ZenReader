
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Settings, ArrowLeft, ArrowRight, List, Target, Sparkles, X, ExternalLink, BookOpen, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const controlsTimerRef = useRef<number | null>(null);

  const [isTOCOpen, setIsTOCOpen] = useState(false);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);

  // Controls Visibility State (Top/Bottom bars)
  const [showControls, setShowControls] = useState(true);

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

  // --- Auto-Hide Controls Logic ---

  const resetControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }

    if (settings.autoHideControls && showControls) {
      controlsTimerRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, (settings.autoHideDuration || 3) * 1000);
    }
  }, [settings.autoHideControls, settings.autoHideDuration, showControls]);

  // Handle manual interaction to keep controls alive
  const handleUserInteraction = useCallback(() => {
    if (showControls) {
      resetControlsTimer();
    }
  }, [showControls, resetControlsTimer]);

  // Initial timer setup & cleanup
  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [resetControlsTimer]);

  // Toggle controls on tap
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    // Prevent toggling if text is selected
    if (window.getSelection()?.toString().length) return;
    
    // Prevent toggling if clicking entity or interactive elements
    if ((e.target as HTMLElement).closest('button, a')) return;

    setShowControls(prev => !prev);
  }, []);

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

  // Responsive Scroll Scaling Logic
  useEffect(() => {
     if (settings.focusMode) return; // Focus mode handles scrolling differently

     const handleWheel = (e: WheelEvent) => {
       // Only hijack vertical scroll
       if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

       e.preventDefault();

       const baseFontSize = 16;
       const currentFontSize = settings.fontSize;
       const fontSizeRatio = currentFontSize / baseFontSize;
       
       const scrollMultiplier = fontSizeRatio * 1.5;
       const scrollAmount = e.deltaY * scrollMultiplier;

       window.scrollBy({
         top: scrollAmount,
         behavior: 'auto' 
       });
       
       // Hide controls on scroll if needed
       if (Math.abs(e.deltaY) > 20 && showControls && settings.autoHideControls) {
          setShowControls(false);
       }
     };

     window.addEventListener('wheel', handleWheel, { passive: false });
     return () => window.removeEventListener('wheel', handleWheel);
  }, [settings.focusMode, settings.fontSize, showControls, settings.autoHideControls]);

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
          else if (showControls) onCloseBook();
          else setShowControls(true);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book.currentPageIndex, totalChapters, isTOCOpen, selectedEntity, settings.focusMode, activeParagraphIndex, scrollToParagraph, showControls]);

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
    const count = settings.focusParagraphCount || 1; 
    const half = Math.floor(count / 2);
    const start = activeParagraphIndex - half;
    const end = activeParagraphIndex + half + (count % 2 === 0 ? -1 : 0);
    return index >= start && index <= end;
  };

  if (!currentChapter) return null;

  const paragraphs = currentChapter.content.split('\n').filter(p => p.trim().length > 0);

  return (
    <div className={`min-h-screen flex flex-row transition-colors duration-500 ${themeStyles.bg} ${themeStyles.text} overflow-x-hidden`}>

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

      {/* TOP BAR */}
      <div 
        className={`
          fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3
          transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]
          bg-white/90 backdrop-blur-md border-b shadow-sm
          ${themeStyles.text} ${themeStyles.border}
          ${settings.theme === 'dark' ? 'bg-[#242424]/90' : settings.theme === 'sepia' ? 'bg-[#F2F0E9]/90' : 'bg-white/90'}
          ${showControls ? 'translate-y-0' : '-translate-y-full'}
        `}
        onClick={handleUserInteraction}
      >
         <button 
           onClick={onCloseBook}
           className={`p-2 rounded-full ${themeStyles.hover} transition-all group`}
           title="Back to Shelf"
         >
           <ArrowLeft className="w-5 h-5" />
         </button>
         
         <div className="flex-1 text-center mx-4">
            <h1 className="text-sm font-bold truncate max-w-md mx-auto">{currentChapter.title}</h1>
         </div>

         <div className="text-xs font-mono font-medium opacity-60 w-8 text-right">
            {progress}%
         </div>
      </div>

      {/* BOTTOM BAR */}
      <div 
        className={`
          fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4
          transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]
          bg-white/90 backdrop-blur-md border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]
          ${themeStyles.text} ${themeStyles.border}
          ${settings.theme === 'dark' ? 'bg-[#242424]/90' : settings.theme === 'sepia' ? 'bg-[#F2F0E9]/90' : 'bg-white/90'}
          ${showControls ? 'translate-y-0' : 'translate-y-full'}
        `}
        onClick={handleUserInteraction}
      >
        {/* Previous Chapter */}
        <button
           onClick={() => book.currentPageIndex > 0 && onPageChange(book.currentPageIndex - 1)}
           disabled={book.currentPageIndex === 0}
           className={`p-3 rounded-full ${themeStyles.hover} disabled:opacity-30 transition-colors`}
        >
           <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Tools Group */}
        <div className="flex items-center gap-6">
           <button
             onClick={() => setIsTOCOpen(true)}
             className={`p-3 rounded-full ${themeStyles.hover} transition-colors`}
             title="Table of Contents"
           >
             <List className="w-5 h-5" />
           </button>

           <button 
             onClick={onToggleFocusMode}
             className={`p-3 rounded-full transition-colors ${settings.focusMode ? 'bg-blue-100 text-blue-600' : themeStyles.hover}`}
             title="Focus Mode"
           >
              <Target className="w-5 h-5" />
           </button>

           <button
             onClick={() => onOpenSettings()}
             className={`p-3 rounded-full transition-colors ${settings.aiMode ? 'bg-amber-100 text-amber-600' : themeStyles.hover}`}
             title="AI Companion"
           >
              <Sparkles className="w-5 h-5" />
           </button>

           <button 
             onClick={onOpenSettings}
             className={`p-3 rounded-full ${themeStyles.hover} transition-colors`}
             title="Settings"
           >
             <Settings className="w-5 h-5" />
           </button>
        </div>

        {/* Next Chapter */}
        <button
           onClick={() => book.currentPageIndex < totalChapters - 1 && onPageChange(book.currentPageIndex + 1)}
           disabled={book.currentPageIndex === totalChapters - 1}
           className={`p-3 rounded-full ${themeStyles.hover} disabled:opacity-30 transition-colors`}
        >
           <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* MAIN CONTENT */}
      <main 
        onClick={handleContentClick}
        className={`
          flex-1 flex justify-center w-full min-h-screen transition-all duration-300
          ${selectedEntity ? 'pr-[24rem]' : ''} 
          ${settings.focusMode ? 'py-0' : 'py-20'} 
          cursor-pointer
        `}
        style={{
           // Apply padding for Typewriter effect in Focus Mode
           paddingTop: settings.focusMode ? '45vh' : undefined,
           paddingBottom: settings.focusMode ? '45vh' : undefined
        }}
      >
        <div 
          ref={contentRef}
          className={`w-full select-text transition-all duration-300 ease-in-out px-4`}
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
          {/* Chapter Title in Body (Hidden in Focus Mode) */}
          {!settings.focusMode && (
            <h1 className="text-3xl font-bold mb-12 text-center opacity-80 pt-10">{currentChapter.title}</h1>
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

          {/* Pagination Hints (Body Bottom) */}
          {!settings.focusMode && (
            <div className="mt-20 flex justify-between gap-4 max-w-2xl mx-auto px-6 pb-32">
              <button 
                onClick={(e) => { e.stopPropagation(); book.currentPageIndex > 0 && onPageChange(book.currentPageIndex - 1); }}
                disabled={book.currentPageIndex === 0}
                className={`
                   flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200 font-medium text-sm
                   bg-black/5 hover:bg-black/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black/5
                `}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); book.currentPageIndex < totalChapters - 1 && onPageChange(book.currentPageIndex + 1); }}
                disabled={book.currentPageIndex === totalChapters - 1}
                className={`
                   flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200 font-medium text-sm
                   bg-black/5 hover:bg-black/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black/5
                `}
              >
                <span>Next Chapter</span>
                <ChevronRight className="w-4 h-4" />
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
