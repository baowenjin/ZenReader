

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Settings, ArrowLeft, ArrowRight, List, Target, Sparkles, X, ChevronLeft, ChevronRight, Loader2, Languages, Copy, StickyNote, Scan, Scaling, Minus, Plus, Maximize, Columns, File, Scroll, Cloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { BookData, ReaderSettings, AIEntityData, PdfViewMode, PdfFitMode } from '../types';
import { THEMES } from '../constants';
import { calculateProgress, ensurePdfLibraryLoaded } from '../utils';
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

// --- PDF Renderer ---

const PdfPage = ({ 
  pdf, 
  pageNum, 
  scale,
  theme,
  isScrollMode,
  onVisible 
}: { 
  pdf: any, 
  pageNum: number, 
  scale: number,
  theme: string,
  isScrollMode: boolean,
  onVisible?: () => void
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Lazy Loading logic via Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        setIsVisible(true);
        if (onVisible) onVisible();
      }
    }, { rootMargin: '500px 0px 500px 0px' }); 

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [pageNum, isScrollMode, onVisible]);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !isVisible) return;
    
    let renderTask: any = null;

    const render = async () => {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Theme Filters
        if (theme === 'dark') {
          canvas.style.filter = 'invert(0.92) hue-rotate(180deg) brightness(0.8)';
        } else if (theme === 'sepia') {
          canvas.style.filter = 'sepia(0.2) contrast(0.95) brightness(0.95)';
        } else {
          canvas.style.filter = 'none';
        }

        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

        renderTask = page.render({ canvasContext: ctx, viewport, transform });
        await renderTask.promise;
        setIsRendered(true);
      } catch (e: any) {
        if (e.name !== 'RenderingCancelledException') {
            console.error(e);
        }
      }
    };
    
    render();
    
    return () => {
        if (renderTask) renderTask.cancel();
    };
  }, [pdf, pageNum, scale, theme, isVisible]);
  
  return (
    <div ref={containerRef} className="flex justify-center relative min-h-[300px]">
        {isVisible ? (
           <canvas ref={canvasRef} className="bg-white shadow-sm transition-transform duration-200" />
        ) : (
           <div 
             className="flex items-center justify-center bg-black/5 rounded animate-pulse"
             style={{ width: '100%', height: '800px' }} // Placeholder height
           >
              <span className="text-xs opacity-50">Page {pageNum}</span>
           </div>
        )}
    </div>
  );
};

const PdfRenderer = ({ 
  data, 
  pageIndex, 
  scale,
  theme, 
  settings,
  onPageVisible,
  onLoad
}: { 
  data: ArrayBuffer, 
  pageIndex: number, 
  scale: number,
  theme: string,
  settings: ReaderSettings,
  onPageVisible: (index: number) => void,
  onLoad: (meta: { width: number, height: number, numPages: number }) => void
}) => {
  const [pdf, setPdf] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
        await ensurePdfLibraryLoaded();
        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
             const loadingTask = pdfjsLib.getDocument(new Uint8Array(data.slice(0)));
             const pdfDoc = await loadingTask.promise;
             setPdf(pdfDoc);
             
             // Extract metadata from first page to help with scaling
             const page1 = await pdfDoc.getPage(1);
             const viewport = page1.getViewport({ scale: 1 });
             onLoad({ width: viewport.width, height: viewport.height, numPages: pdfDoc.numPages });
        }
    };
    load();
  }, [data]);

  if (!pdf) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin w-8 h-8 opacity-50"/></div>;

  const mode = settings.pdfViewMode || 'single';

  // SCROLL MODE
  if (mode === 'scroll') {
      return (
        <div className="w-full flex flex-col gap-6 pb-32 items-center">
           {Array.from({ length: pdf.numPages }).map((_, i) => (
             <div key={i} data-page={i} className="max-w-full">
                <PdfPage 
                  pdf={pdf} 
                  pageNum={i + 1} 
                  scale={scale} 
                  theme={theme}
                  isScrollMode={true}
                  onVisible={() => onPageVisible(i)}
                />
                <div className="text-center text-[10px] text-gray-400 mt-2">{i + 1}</div>
             </div>
           ))}
        </div>
      );
  }

  // DOUBLE PAGE MODE
  if (mode === 'double') {
     const isCover = pageIndex === 0;
     const leftPageIndex = isCover ? 0 : (pageIndex % 2 !== 0 ? pageIndex : pageIndex - 1);
     const rightPageIndex = leftPageIndex + 1;
     const hasRightPage = rightPageIndex < pdf.numPages;

     return (
       <div className="w-full flex justify-center items-start gap-0 min-h-screen pt-10">
          {isCover ? (
             <div className="shadow-2xl">
               <PdfPage pdf={pdf} pageNum={1} scale={scale} theme={theme} isScrollMode={false} />
             </div>
          ) : (
             <div className="flex shadow-2xl">
               <div className="flex-1 flex justify-end">
                 <PdfPage pdf={pdf} pageNum={leftPageIndex + 1} scale={scale} theme={theme} isScrollMode={false} />
               </div>
               {hasRightPage && (
                 <div className="flex-1 flex justify-start">
                   <PdfPage pdf={pdf} pageNum={rightPageIndex + 1} scale={scale} theme={theme} isScrollMode={false} />
                 </div>
               )}
             </div>
          )}
       </div>
     );
  }

  // SINGLE PAGE MODE
  return (
      <div className="w-full flex justify-center min-h-screen pt-10">
          <div className="shadow-xl">
             <PdfPage pdf={pdf} pageNum={pageIndex + 1} scale={scale} theme={theme} isScrollMode={false} />
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
  
  // Identify if it's a heading
  const isHeading = text.startsWith('## ');
  const cleanText = isHeading ? text.replace(/^##\s+/, '') : text;

  // Focus Mode Styles
  let containerClass = "relative transition-all duration-500 ease-in-out px-4 md:px-0 mb-6";
  
  // Removing 'leading-relaxed' to allow inheritance from parent style
  let textClass = "transition-all duration-500";
  
  if (isHeading) {
     // Headings keep specific size
     textClass += " font-bold text-2xl mt-12 mb-6 opacity-90";
     containerClass += " mb-2"; // Reduce margin after heading container slightly
  } else {
     // Removing 'text-lg' to allow inheritance of fontSize from parent style
     // textClass += " text-lg";
  }

  if (settings.focusMode) {
    if (isActive) {
      containerClass += " opacity-100 scale-[1.01] my-10"; // Highlight
      textClass += isHeading ? "" : " font-medium";
    } else {
      containerClass += " opacity-1 blur-[1.5px] grayscale my-10"; // Dim others
    }
  }

  return (
    <div 
      data-index={index}
      className={containerClass}
      style={{
        textAlign: isHeading ? 'left' : settings.textAlign,
      }}
    >
      <div className={textClass}>
        {cleanText}
      </div>
    </div>
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
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  settings,
  onPageChange,
  onOpenSettings,
  onCloseBook,
  onToggleFocusMode,
  onUpdateSettings,
  syncStatus = 'idle'
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const lastKeyTime = useRef<number>(0);
  const controlsTimerRef = useRef<number | null>(null);

  const [isTOCOpen, setIsTOCOpen] = useState(false);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(true);

  // PDF State
  const [pdfMeta, setPdfMeta] = useState<{ width: number, height: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // AI State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [activeEntity, setActiveEntity] = useState<{data: AIEntityData, position: Position, isLoading?: boolean} | null>(null);

  const themeStyles = THEMES[settings.theme];
  
  // Determine progress metrics
  const isPdf = !!book.pdfArrayBuffer;
  const totalUnits = isPdf ? (book.pageCount || 1) : book.chapters.length;
  const progress = calculateProgress(book.currentPageIndex, totalUnits);
  
  const currentChapter = isPdf ? null : book.chapters[book.currentPageIndex];

  // Track window resize for PDF auto-fit
  useEffect(() => {
    const handleResize = () => {
        setContainerSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate PDF Scale
  const effectivePdfScale = useMemo(() => {
    if (!isPdf || !pdfMeta) return 1.0;

    if (settings.pdfFitMode === 'width') {
        const padding = 32; // Horizontal padding
        const availableWidth = containerSize.width - padding;
        const widthToFit = settings.pdfViewMode === 'double' ? availableWidth / 2 : availableWidth;
        return widthToFit / pdfMeta.width;
    } 
    
    if (settings.pdfFitMode === 'height') {
        const padding = 120; // Vertical padding (toolbar + header)
        const availableHeight = containerSize.height - padding;
        return availableHeight / pdfMeta.height;
    }

    return settings.pdfScale || 1.0;
  }, [isPdf, pdfMeta, settings.pdfFitMode, settings.pdfViewMode, settings.pdfScale, containerSize]);


  // --- AI Interaction Logic ---

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only process if AI Mode is enabled AND not PDF (unless we implement PDF text layer)
    if (!settings.aiMode || isPdf) return;

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
  }, [settings.aiMode, isPdf]);

  const handleAIAction = async (action: 'explain' | 'translate') => {
    if (!contextMenu) return;
    const { text, selectionRect } = contextMenu;
    setContextMenu(null); // Close menu

    // 1. Calculate Absolute Position for Popover
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

    // Horizontal logic
    if (selectionRect.left < 150) { 
        left = absoluteLeft + 150; 
    } else if (selectionRect.right > viewportWidth - 150) {
        left = absoluteLeft + width - 150;
    }

    // Vertical logic
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
    const apiKey = settings.apiKey;
    
    if (!apiKey) {
       setActiveEntity(prev => prev ? {
           ...prev,
           data: { ...prev.data, definition: "API Key not configured. Please set it in Settings." },
           isLoading: false
       } : null);
       return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        
        let prompt = "";
        const langInstruction = settings.aiLanguage === 'zh' 
            ? "Respond in Simplified Chinese." 
            : settings.aiLanguage === 'en' 
            ? "Respond in English." 
            : "Respond in the user's language.";

        if (action === 'explain') {
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

  // Scroll to top when chapter changes (Unless PDF Scroll Mode)
  useEffect(() => {
    if (settings.pdfViewMode !== 'scroll') {
       window.scrollTo({ top: 0, behavior: 'auto' });
    }
    
    if (settings.focusMode && !isPdf) {
      setTimeout(() => scrollToParagraph(0), 100);
    } else {
      setActiveParagraphIndex(null);
    }
  }, [book.currentPageIndex, settings.focusMode, isPdf, settings.pdfViewMode]);

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
       // if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
       if (contextMenu) setContextMenu(null); 
       
       if (Math.abs(e.deltaY) > 20 && showControls && settings.autoHideControls) {
          setShowControls(false);
       }
     };
     window.addEventListener('wheel', handleWheel, { passive: true });
     return () => window.removeEventListener('wheel', handleWheel);
  }, [settings.focusMode, showControls, settings.autoHideControls, contextMenu]);

  // Helper for PDF Page navigation logic
  const navigatePdf = (direction: 'next' | 'prev') => {
      if (!isPdf) return;
      
      const step = settings.pdfViewMode === 'double' ? 2 : 1;
      let nextIndex = book.currentPageIndex;

      if (direction === 'next') {
          // In Double mode, if cover (0), goto 1. If 1, goto 3.
          if (settings.pdfViewMode === 'double' && book.currentPageIndex === 0) {
              nextIndex = 1;
          } else {
              nextIndex += step;
          }
      } else {
          // Prev
           if (settings.pdfViewMode === 'double' && book.currentPageIndex === 1) {
              nextIndex = 0;
           } else {
              nextIndex -= step;
           }
      }

      // Bounds check
      if (nextIndex < 0) nextIndex = 0;
      if (nextIndex >= totalUnits) nextIndex = totalUnits - 1;
      
      if (nextIndex !== book.currentPageIndex) {
          onPageChange(nextIndex);
      }
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (settings.focusMode && !isPdf) {
        const totalParagraphs = contentRef.current?.querySelectorAll('div[data-index]').length || 0;
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
             if (isPdf && settings.pdfViewMode !== 'scroll') {
                 navigatePdf('next');
             } else if (!isPdf && book.currentPageIndex < totalUnits - 1) {
                 onPageChange(book.currentPageIndex + 1);
             }
          }
          break;
        case 'ArrowLeft':
          if (!settings.focusMode) {
             if (isPdf && settings.pdfViewMode !== 'scroll') {
                 navigatePdf('prev');
             } else if (!isPdf && book.currentPageIndex > 0) {
                 onPageChange(book.currentPageIndex - 1);
             }
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
  }, [book.currentPageIndex, totalUnits, isTOCOpen, activeEntity, settings.focusMode, activeParagraphIndex, scrollToParagraph, showControls, contextMenu, isPdf, settings.pdfViewMode]);

  // Intersection Observer (Only for Text Mode)
  useEffect(() => {
    if (!settings.focusMode || !contentRef.current || isPdf) return;
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
    const paragraphs = contentRef.current.querySelectorAll('div[data-index]');
    paragraphs.forEach(p => observer.observe(p));
    return () => observer.disconnect();
  }, [settings.focusMode, currentChapter, isPdf]);

  const isParagraphFocused = (index: number) => {
    if (!settings.focusMode || activeParagraphIndex === null) return true;
    const count = settings.focusParagraphCount || 1; 
    const half = Math.floor(count / 2);
    const start = activeParagraphIndex - half;
    const end = activeParagraphIndex + half + (count % 2 === 0 ? -1 : 0);
    return index >= start && index <= end;
  };

  const handlePdfPageVisible = useCallback((pageIdx: number) => {
      if (Math.abs(book.currentPageIndex - pageIdx) > 0) {
          // Logic for updating progress silently could go here
      }
  }, [book.currentPageIndex]);

  if (!currentChapter && !isPdf) return null;

  const paragraphs = currentChapter?.content.split('\n').filter(p => p.trim().length > 0) || [];

  return (
    <div className={`relative min-h-screen flex flex-row transition-colors duration-500 ${themeStyles.bg} ${themeStyles.text} overflow-x-hidden`}>
      
      {/* Definition Popover */}
      {activeEntity && (
        <DefinitionPopover 
          data={activeEntity.data}
          position={activeEntity.position}
          onClose={() => setActiveEntity(null)}
          theme={settings.theme}
          isLoading={activeEntity.isLoading}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
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
            <h1 className="text-sm font-bold truncate max-w-md mx-auto">{currentChapter?.title || book.title}</h1>
         </div>

         <div className="flex items-center gap-4 text-xs font-mono font-medium opacity-60 w-auto min-w-[3rem] text-right justify-end">
             {/* Sync Status Indicator */}
             {syncStatus !== 'idle' && (
               <div className="flex items-center gap-1.5" title={syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'success' ? 'Saved' : 'Sync Error'}>
                 {syncStatus === 'syncing' && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                 {syncStatus === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                 {syncStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
               </div>
             )}
             
             {/* Page Count */}
             <div>
               {isPdf && settings.pdfViewMode === 'scroll' 
                  ? 'SCROLL' 
                  : isPdf 
                  ? `${book.currentPageIndex + 1}/${totalUnits}` 
                  : `${progress}%`
               }
             </div>
         </div>
      </div>

      {/* BOTTOM BAR - PDF Enhancer or Standard */}
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
        {isPdf ? (
            /* PDF ENHANCER BAR */
            <div className="w-full flex items-center justify-between max-w-4xl mx-auto">
               <div className="flex items-center gap-2">
                 <button
                   onClick={() => setIsTOCOpen(true)}
                   className={`p-2.5 rounded-full ${themeStyles.hover} transition-colors`}
                   title="Chapters"
                 >
                   <List className="w-5 h-5" />
                 </button>
               </div>

               {/* Central PDF Controls Group */}
               <div className={`flex items-center gap-4 bg-black/5 rounded-full px-4 py-1.5 ${settings.theme === 'dark' ? 'bg-white/5' : ''}`}>
                   {/* View Modes */}
                   <div className="flex items-center gap-1 border-r border-gray-400/20 pr-4 mr-1">
                      {[
                        { mode: 'scroll', icon: Scroll, label: 'Scroll' },
                        { mode: 'single', icon: File, label: 'Single' },
                        { mode: 'double', icon: Columns, label: 'Spread' },
                      ].map(m => (
                          <button
                            key={m.mode}
                            onClick={() => onUpdateSettings({ pdfViewMode: m.mode as PdfViewMode })}
                            className={`p-2 rounded-full transition-all ${settings.pdfViewMode === m.mode ? 'bg-white shadow-sm text-black' : 'opacity-50 hover:opacity-100'}`}
                            title={m.label}
                          >
                             <m.icon className="w-4 h-4" />
                          </button>
                      ))}
                   </div>
                   
                   {/* Zoom Controls */}
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onUpdateSettings({ pdfFitMode: 'width' })}
                        className={`p-2 rounded-full transition-all ${settings.pdfFitMode === 'width' ? 'bg-white shadow-sm text-black' : 'opacity-50 hover:opacity-100'}`}
                        title="Fit Width"
                      >
                         <Scan className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onUpdateSettings({ pdfFitMode: 'height' })}
                        className={`p-2 rounded-full transition-all ${settings.pdfFitMode === 'height' ? 'bg-white shadow-sm text-black' : 'opacity-50 hover:opacity-100'}`}
                        title="Fit Page"
                      >
                         <Scaling className="w-4 h-4" />
                      </button>

                      <div className="w-px h-4 bg-gray-400/20 mx-1"></div>

                      <button 
                        onClick={() => onUpdateSettings({ pdfFitMode: 'manual', pdfScale: Math.max(0.2, effectivePdfScale - 0.2) })}
                        className="p-1.5 opacity-60 hover:opacity-100 hover:bg-black/5 rounded-full"
                      >
                         <Minus className="w-3 h-3" />
                      </button>
                      
                      <span className="text-xs font-mono w-10 text-center opacity-80 select-none">
                         {Math.round(effectivePdfScale * 100)}%
                      </span>

                      <button 
                        onClick={() => onUpdateSettings({ pdfFitMode: 'manual', pdfScale: Math.min(5.0, effectivePdfScale + 0.2) })}
                        className="p-1.5 opacity-60 hover:opacity-100 hover:bg-black/5 rounded-full"
                      >
                         <Plus className="w-3 h-3" />
                      </button>
                   </div>
               </div>

               <button 
                 onClick={onOpenSettings}
                 className={`p-2.5 rounded-full ${themeStyles.hover} transition-colors`}
                 title="Settings"
               >
                 <Settings className="w-5 h-5" />
               </button>
            </div>
        ) : (
          /* STANDARD TEXT BAR */
          <>
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
                className={`p-3 rounded-full ${themeStyles.hover} transition-colors disabled:opacity-30`}
                title="Table of Contents"
              >
                <List className="w-5 h-5" />
              </button>

              <button 
                onClick={onToggleFocusMode}
                className={`p-3 rounded-full transition-colors ${settings.focusMode ? 'bg-blue-100 text-blue-600' : themeStyles.hover} disabled:opacity-30`}
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
              onClick={() => book.currentPageIndex < totalUnits - 1 && onPageChange(book.currentPageIndex + 1)}
              disabled={book.currentPageIndex === totalUnits - 1}
              className={`p-3 rounded-full ${themeStyles.hover} disabled:opacity-30 transition-colors`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* MAIN CONTENT */}
      <main 
        onClick={handleContentClick}
        onContextMenu={handleContextMenu}
        className={`
          flex-1 flex justify-center w-full min-h-screen transition-all duration-300
          ${settings.focusMode && !isPdf ? 'py-0' : 'py-20'} 
          cursor-text
        `}
        style={{
           paddingTop: settings.focusMode && !isPdf ? '45vh' : undefined,
           paddingBottom: settings.focusMode && !isPdf ? '45vh' : undefined
        }}
      >
        <div 
          ref={contentRef}
          className={`w-full select-text transition-all duration-300 ease-in-out px-4`}
          style={{ 
            maxWidth: isPdf ? undefined : settings.maxWidth, // PDF handles its own width
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
          {isPdf && book.pdfArrayBuffer ? (
              <PdfRenderer 
                data={book.pdfArrayBuffer} 
                pageIndex={book.currentPageIndex}
                scale={effectivePdfScale}
                theme={settings.theme}
                settings={settings}
                onPageVisible={handlePdfPageVisible}
                onLoad={(meta) => setPdfMeta(meta)}
              />
          ) : (
            <>
              {!settings.focusMode && (
                <h1 className="text-3xl font-bold mb-12 text-center opacity-80 pt-10">{currentChapter?.title}</h1>
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
                    onClick={(e) => { e.stopPropagation(); book.currentPageIndex < totalUnits - 1 && onPageChange(book.currentPageIndex + 1); }}
                    disabled={book.currentPageIndex === totalUnits - 1}
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
            </>
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