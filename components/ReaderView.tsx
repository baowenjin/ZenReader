
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Settings, ArrowLeft, ArrowRight, List, Target, Sparkles, X, ChevronLeft, ChevronRight, Loader2, Languages, Copy, StickyNote } from 'lucide-react';
import { BookData, ReaderSettings, AIEntityData } from '../types';
import { THEMES } from '../constants';
import { calculateProgress } from '../utils';
import { TOC } from './TOC';
import { GoogleGenAI } from "@google/genai";

// --- Types ---
interface Position {
  top: number;
  left: number;
  align: 'left' | 'right' | 'center';
  placement: 'top' | 'bottom';
}

interface ContextMenuState {
  left: number;
  top: number;
  text: string;
  selectionRect: DOMRect;
}

// --- Helper Components ---

const DefinitionPopover = ({ 
  data, 
  position, 
  onClose,
  theme,
  isLoading
}: { 
  data: AIEntityData; 
  position: Position | null; 
  onClose: () => void;
  theme: string;
  isLoading?: boolean;
}) => {
  if (!position) return null;

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';
  
  // Minimalist Colors
  const containerClasses = isDark
    ? 'bg-[#242424]/95 border-white/10 text-gray-200 shadow-black/50'
    : isSepia
    ? 'bg-[#F2F0E9]/95 border-[#8C857B]/20 text-[#2D2926] shadow-[#8C857B]/20'
    : 'bg-white/95 border-gray-200/50 text-gray-700 shadow-xl shadow-gray-200/50';

  const subTextClasses = isDark ? 'text-gray-500' : 'text-gray-400';

  // Dynamic Alignment Styles
  const transformOrigin = position.placement === 'top' ? 'bottom center' : 'top center';
  const translateY = position.placement === 'top' ? '-100%' : '0';
  // Adjust margin to distance slightly from text
  const marginTop = position.placement === 'bottom' ? '12px' : '-12px';

  return (
    <div 
      className={`
        absolute z-[100] flex flex-col w-[300px] rounded-xl border backdrop-blur-md
        transition-all duration-300 ease-out
        animate-in fade-in zoom-in-95
        ${containerClasses}
      `}
      style={{
        top: position.top,
        left: position.left,
        transform: `translate(-50%, ${translateY})`,
        marginTop: marginTop,
        transformOrigin: transformOrigin,
      }}
      onClick={(e) => e.stopPropagation()} // Prevent click-outside logic from triggering when clicking inside
    >
      {/* Content Container */}
      <div className="p-4 flex flex-col gap-2.5">
        
        {/* Header: Term + Actions */}
        <div className="flex justify-between items-start gap-3">
           <div className="flex items-center gap-2 overflow-hidden">
             <div className={`p-1 rounded-md ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
               <Sparkles className="w-3 h-3 text-amber-500" />
             </div>
             <span className="font-serif font-bold text-sm truncate opacity-90 select-none">
               {data.term}
             </span>
           </div>

           <div className="flex items-center gap-1">
              {!isLoading && (
                <button 
                  onClick={() => navigator.clipboard.writeText(data.definition)}
                  className={`p-1 rounded hover:bg-black/5 transition-colors ${subTextClasses} hover:text-gray-600`}
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
              <button 
                onClick={onClose}
                className={`p-1 rounded hover:bg-black/5 transition-colors ${subTextClasses} hover:text-gray-600`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
           </div>
        </div>

        {/* Body */}
        <div className={`text-[13px] leading-relaxed opacity-90 font-sans`}>
            {isLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500/80" />
                <span className={`text-xs ${subTextClasses} animate-pulse`}>Thinking...</span>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                {data.definition}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

interface ParagraphProps {
  text: string;
  index: number;
  isActive: boolean;
  settings: ReaderSettings;
}

const Paragraph = React.memo(({ 
  text, 
  index, 
  isActive, 
  settings, 
}: ParagraphProps) => {
  
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
        {text}
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
  const [showControls, setShowControls] = useState(true);

  // AI State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [activeEntity, setActiveEntity] = useState<{data: AIEntityData, position: Position, isLoading?: boolean} | null>(null);

  const themeStyles = THEMES[settings.theme];
  const totalChapters = book.chapters.length;
  const currentChapter = book.chapters[book.currentPageIndex];
  const progress = calculateProgress(book.currentPageIndex, totalChapters);

  // --- AI Interaction Logic ---

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only process if AI Mode is enabled
    if (!settings.aiMode) return;

    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length === 0) return;

    // Prevent default browser menu
    e.preventDefault();
    
    const text = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setContextMenu({
      left: e.clientX,
      top: e.clientY,
      text,
      selectionRect: rect
    });
    
    // Clear any existing popover
    setActiveEntity(null);
  }, [settings.aiMode]);

  const handleAIAction = async (action: 'explain' | 'translate') => {
    if (!contextMenu) return;
    const { text, selectionRect } = contextMenu;
    setContextMenu(null); // Close menu

    // 1. Calculate Absolute Position for Popover (Document based, not Viewport based)
    // This allows the popover to scroll WITH the text.
    
    const viewportWidth = window.innerWidth;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const absoluteLeft = selectionRect.left + scrollX;
    const absoluteTop = selectionRect.top + scrollY;
    const width = selectionRect.width;
    const height = selectionRect.height;
    
    // Center initially
    let left = absoluteLeft + (width / 2);
    let top = absoluteTop;
    let align: 'left' | 'right' | 'center' = 'center';
    let placement: 'top' | 'bottom' = 'top';

    // Horizontal logic (keep within screen bounds)
    // We only adjust the state 'left' coordinate. CSS transform handles centering.
    // If it's too close to edges, we might need manual offset, but centering usually works
    // unless the text is at the very edge.
    if (selectionRect.left < 150) { 
        // Too close to left
        left = absoluteLeft + 150; 
    } else if (selectionRect.right > viewportWidth - 150) {
        // Too close to right
        left = absoluteLeft + width - 150;
    }

    // Vertical logic
    // If close to top edge of viewport, show below.
    if (selectionRect.top < 220) {
        top = absoluteTop + height;
        placement = 'bottom';
    } else {
        top = absoluteTop;
        placement = 'top';
    }

    // 2. Set Loading State
    const displayTerm = text.length > 25 ? text.substring(0, 25) + '...' : text;
    
    setActiveEntity({
      data: { term: displayTerm, definition: '' },
      position: { top, left, align, placement },
      isLoading: true
    });
    
    // 3. Call AI
    if (!process.env.API_KEY) {
       setActiveEntity(prev => prev ? {
           ...prev,
           data: { ...prev.data, definition: "API Key not configured." },
           isLoading: false
       } : null);
       return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let prompt = "";
        const langInstruction = settings.aiLanguage === 'zh' 
            ? "Respond in Simplified Chinese." 
            : settings.aiLanguage === 'en' 
            ? "Respond in English." 
            : "Respond in the user's language.";

        if (action === 'explain') {
            // Updated Prompt: Concise, brief.
            prompt = `Define "${text}" briefly and concisely in under 60 words. Simple style. ${langInstruction}`;
        } else {
            prompt = `Translate "${text}" concisely. ${langInstruction}`;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        setActiveEntity(prev => prev ? ({
            ...prev,
            data: { ...prev.data, definition: response.text ? response.text.trim() : "No result." },
            isLoading: false
        }) : null);

    } catch (e) {
        console.error(e);
        setActiveEntity(prev => prev ? ({
            ...prev,
            data: { ...prev.data, definition: "Error processing request." },
            isLoading: false
        }) : null);
    }
  };

  // --- Standard Reader Logic ---

  // Scroll to top when chapter changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (settings.focusMode) {
      setTimeout(() => scrollToParagraph(0), 100);
    } else {
      setActiveParagraphIndex(null);
    }
  }, [book.currentPageIndex, settings.focusMode]);

  // Auto-Hide Controls Logic
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

  const handleUserInteraction = useCallback(() => {
    if (showControls) resetControlsTimer();
  }, [showControls, resetControlsTimer]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [resetControlsTimer]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    // Close context menu if open
    if (contextMenu) {
        setContextMenu(null);
        return;
    }
    // Close popover if open (clicking outside)
    if (activeEntity) {
      setActiveEntity(null);
      return;
    }

    if (window.getSelection()?.toString().length) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    setShowControls(prev => !prev);
  }, [activeEntity, contextMenu]);

  // Focus Mode Scrolling
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
    window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
    scrollTimeoutRef.current = window.setTimeout(() => {
      isAutoScrolling.current = false;
    }, 600);
  }, []);

  // Wheel Handler
  useEffect(() => {
     if (settings.focusMode) return;
     const handleWheel = (e: WheelEvent) => {
       if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
       // We NO LONGER close AI Entity on scroll, to allow reading while scrolling.
       // if (activeEntity) setActiveEntity(null); 
       
       if (contextMenu) setContextMenu(null); // Context menu should still close as it is fixed
       
       if (Math.abs(e.deltaY) > 20 && showControls && settings.autoHideControls) {
          setShowControls(false);
       }
     };
     window.addEventListener('wheel', handleWheel, { passive: true });
     return () => window.removeEventListener('wheel', handleWheel);
  }, [settings.focusMode, showControls, settings.autoHideControls, contextMenu]);

  // Keyboard
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
          scrollToParagraph(Math.min(currentIndex + step, totalParagraphs - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          scrollToParagraph(Math.max(currentIndex - step, 0));
        }
      }

      switch (e.key) {
        case 'ArrowRight':
          if (!settings.focusMode) {
             if (book.currentPageIndex < totalChapters - 1) onPageChange(book.currentPageIndex + 1);
          }
          break;
        case 'ArrowLeft':
          if (!settings.focusMode) {
             if (book.currentPageIndex > 0) onPageChange(book.currentPageIndex - 1);
          }
          break;
        case 'Escape':
          if (isTOCOpen) setIsTOCOpen(false);
          else if (activeEntity) setActiveEntity(null);
          else if (contextMenu) setContextMenu(null);
          else if (showControls) onCloseBook();
          else setShowControls(true);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book.currentPageIndex, totalChapters, isTOCOpen, activeEntity, settings.focusMode, activeParagraphIndex, scrollToParagraph, showControls, contextMenu]);

  // Intersection Observer
  useEffect(() => {
    if (!settings.focusMode || !contentRef.current) return;
    const options = { root: null, rootMargin: '-45% 0px -45% 0px', threshold: 0 };
    const callback: IntersectionObserverCallback = (entries) => {
      if (isAutoScrolling.current) return;
      const visibleEntry = entries.find(entry => entry.isIntersecting);
      if (visibleEntry) {
         const index = Number(visibleEntry.target.getAttribute('data-index'));
         if (!isNaN(index)) setActiveParagraphIndex(index);
      }
    };
    const observer = new IntersectionObserver(callback, options);
    const paragraphs = contentRef.current.querySelectorAll('p');
    paragraphs.forEach(p => observer.observe(p));
    return () => observer.disconnect();
  }, [settings.focusMode, currentChapter]);

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
    <div className={`relative min-h-screen flex flex-row transition-colors duration-500 ${themeStyles.bg} ${themeStyles.text} overflow-x-hidden`}>
      
      {/* Definition Popover (Absolute Positioned Tooltip) */}
      {activeEntity && (
        <DefinitionPopover 
          data={activeEntity.data}
          position={activeEntity.position}
          onClose={() => setActiveEntity(null)}
          theme={settings.theme}
          isLoading={activeEntity.isLoading}
        />
      )}

      {/* Context Menu (Minimalist Pill) */}
      {contextMenu && (
        <>
        {/* Invisible Backdrop to close menu */}
        <div className="fixed inset-0 z-[90]" onClick={() => setContextMenu(null)} />
        <div 
           className="fixed z-[100] bg-white/90 backdrop-blur-md shadow-lg shadow-black/5 rounded-full border border-gray-100/50 p-1 flex gap-1 items-center animate-in fade-in zoom-in-95 duration-200"
           style={{ top: contextMenu.top - 50, left: contextMenu.left }} 
        >
           <button 
             onClick={(e) => { e.stopPropagation(); handleAIAction('explain'); }}
             className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-black/5 rounded-full transition-colors flex items-center gap-1.5"
           >
             <StickyNote className="w-3.5 h-3.5 text-amber-500" />
             <span>Explain</span>
           </button>
           <div className="w-px h-3 bg-gray-200"></div>
           <button 
             onClick={(e) => { e.stopPropagation(); handleAIAction('translate'); }}
             className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-black/5 rounded-full transition-colors flex items-center gap-1.5"
           >
             <Languages className="w-3.5 h-3.5 text-blue-500" />
             <span>Translate</span>
           </button>
        </div>
        </>
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
        <button
           onClick={() => book.currentPageIndex > 0 && onPageChange(book.currentPageIndex - 1)}
           disabled={book.currentPageIndex === 0}
           className={`p-3 rounded-full ${themeStyles.hover} disabled:opacity-30 transition-colors`}
        >
           <ChevronLeft className="w-5 h-5" />
        </button>

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
             onClick={onOpenSettings}
             className={`p-3 rounded-full ${themeStyles.hover} transition-colors`}
             title="Settings"
           >
             <Settings className="w-5 h-5" />
           </button>
        </div>

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
        onContextMenu={handleContextMenu}
        className={`
          flex-1 flex justify-center w-full min-h-screen transition-all duration-300
          ${settings.focusMode ? 'py-0' : 'py-20'} 
          cursor-text
        `}
        style={{
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
            fontFamily: settings.fontFamily === 'elegant' 
              ? 'Lora, "Songti SC", serif' 
              : settings.fontFamily === 'mono'
              ? '"JetBrains Mono", monospace'
              : settings.fontFamily === 'heiti'
              ? 'Inter, "PingFang SC", sans-serif'
              : 'Merriweather, "Songti SC", serif'
          }}
        >
          {!settings.focusMode && (
            <h1 className="text-3xl font-bold mb-12 text-center opacity-80 pt-10">{currentChapter.title}</h1>
          )}

          {paragraphs.map((text, i) => (
             <Paragraph 
               key={i}
               index={i}
               text={text}
               isActive={isParagraphFocused(i)}
               settings={settings}
             />
          ))}

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
