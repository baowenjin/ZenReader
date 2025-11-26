import React, { useEffect, useRef } from 'react';
import { X, MapPin } from 'lucide-react';
import { Chapter, ThemeType } from '../types';
import { THEMES } from '../constants';

interface TOCProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  currentChapterIndex: number;
  onSelectChapter: (index: number) => void;
  currentTheme: ThemeType;
}

export const TOC: React.FC<TOCProps> = ({
  isOpen,
  onClose,
  chapters,
  currentChapterIndex,
  onSelectChapter,
  currentTheme,
}) => {
  const themeStyles = THEMES[currentTheme];
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current chapter when opening
  useEffect(() => {
    if (isOpen && activeItemRef.current && listRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'center',
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 pointer-events-auto backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`
        relative w-full max-w-xs h-full shadow-2xl pointer-events-auto transform transition-transform duration-300 ease-in-out
        flex flex-col
        ${themeStyles.uiBg} ${themeStyles.text} border-r ${themeStyles.border}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${themeStyles.border}`}>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">Table of Contents</h2>
            <span className="text-xs opacity-60 bg-black/5 px-2 py-0.5 rounded-full">
              {chapters.length}
            </span>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full ${themeStyles.hover} transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto scrollbar-thin"
        >
          {chapters.map((chapter, index) => {
            const isActive = index === currentChapterIndex;
            return (
              <button
                key={index}
                ref={isActive ? activeItemRef : null}
                onClick={() => {
                  onSelectChapter(index);
                  onClose();
                }}
                className={`
                  w-full text-left px-4 py-3 border-b text-sm transition-colors flex items-start gap-3
                  ${themeStyles.border}
                  ${isActive 
                    ? `bg-blue-500 text-white border-blue-600` 
                    : `${themeStyles.hover} opacity-80 hover:opacity-100`
                  }
                `}
              >
                {isActive && <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 animate-pulse" />}
                <span className={`line-clamp-2 ${!isActive && 'pl-7'}`}>
                  {chapter.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};