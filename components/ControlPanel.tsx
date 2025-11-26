

import React from 'react';
import { 
  X, Sun, Moon, Coffee, Minus, Plus, AlignLeft, AlignJustify, Target, Sparkles, Layers, EyeOff, Clock, Languages,
  Scroll, File, BookOpen, ZoomIn, ZoomOut, RotateCcw, Key
} from 'lucide-react';
import { ReaderSettings, ThemeType, FontFamily, AILanguage, PdfViewMode } from '../types';
import { THEMES, FONT_LABELS, FONT_FAMILIES } from '../constants';

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  currentTheme: ThemeType;
  isPdf?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currentTheme,
  isPdf = false,
}) => {
  const themeStyles = THEMES[currentTheme];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 pointer-events-auto backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`
        relative w-full max-w-sm h-full shadow-2xl pointer-events-auto transform transition-transform duration-300 ease-in-out
        flex flex-col
        ${themeStyles.uiBg} ${themeStyles.text} border-l ${themeStyles.border}
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${themeStyles.border}`}>
          <h2 className="text-xl font-bold tracking-tight">Reading Settings</h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full ${themeStyles.hover} transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Themes */}
          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider opacity-60 font-bold">Theme</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: ThemeType.LIGHT, icon: Sun, label: 'Day' },
                { type: ThemeType.SEPIA, icon: Coffee, label: 'Warm' },
                { type: ThemeType.DARK, icon: Moon, label: 'Night' },
              ].map((t) => (
                <button
                  key={t.type}
                  onClick={() => onUpdateSettings({ theme: t.type })}
                  className={`
                    flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                    ${settings.theme === t.type 
                      ? 'border-blue-500 bg-blue-50/10' 
                      : `border-transparent ${themeStyles.hover}`
                    }
                  `}
                >
                  <t.icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* PDF Specific Settings */}
          {isPdf && (
            <section className="space-y-4">
              <h3 className="text-xs uppercase tracking-wider opacity-60 font-bold">PDF View Options</h3>
              
              {/* View Mode */}
              <div className={`flex p-1 rounded-lg ${themeStyles.active}`}>
                 {[
                   { value: 'scroll', icon: Scroll, label: 'Scroll' },
                   { value: 'single', icon: File, label: 'Single' },
                   { value: 'double', icon: BookOpen, label: 'Book' }, // Hide on mobile via CSS if needed
                 ].map((mode) => (
                   <button
                     key={mode.value}
                     onClick={() => onUpdateSettings({ pdfViewMode: mode.value as PdfViewMode })}
                     className={`
                       flex-1 flex flex-col items-center gap-1 py-2 rounded-md transition-all
                       ${settings.pdfViewMode === mode.value ? 'bg-white shadow-sm text-gray-900' : 'opacity-50 hover:opacity-100'}
                       ${mode.value === 'double' ? 'hidden md:flex' : 'flex'} 
                     `}
                     title={mode.label}
                   >
                     <mode.icon className="w-5 h-5" />
                   </button>
                 ))}
              </div>

              {/* Zoom Controls */}
              <div className="space-y-3">
                 <div className="flex justify-between text-sm opacity-80 font-medium">
                   <span>Zoom Level</span>
                   <span>{Math.round((settings.pdfScale || 1.2) * 100)}%</span>
                 </div>
                 <div className={`flex items-center gap-2 p-2 rounded-lg ${themeStyles.border} border`}>
                   <button 
                      onClick={() => onUpdateSettings({ pdfScale: Math.max(0.5, (settings.pdfScale || 1.2) - 0.1) })}
                      className={`p-2 rounded-md ${themeStyles.hover}`}
                      title="Zoom Out"
                   >
                     <ZoomOut className="w-4 h-4" />
                   </button>
                   
                   <div className="flex-1 text-center text-sm font-mono opacity-70">
                      {((settings.pdfScale || 1.2)).toFixed(1)}x
                   </div>

                   <button 
                      onClick={() => onUpdateSettings({ pdfScale: 1.2 })} // Reset
                      className={`p-2 rounded-md ${themeStyles.hover}`}
                      title="Reset Zoom"
                   >
                     <RotateCcw className="w-3.5 h-3.5" />
                   </button>

                   <button 
                      onClick={() => onUpdateSettings({ pdfScale: Math.min(3.0, (settings.pdfScale || 1.2) + 0.1) })}
                      className={`p-2 rounded-md ${themeStyles.hover}`}
                      title="Zoom In"
                   >
                     <ZoomIn className="w-4 h-4" />
                   </button>
                 </div>
              </div>
            </section>
          )}

          {/* Typography (Hidden for PDF) */}
          {!isPdf && (
            <section className="space-y-4">
              <h3 className="text-xs uppercase tracking-wider opacity-60 font-bold">Typography</h3>
              
              {/* Font Family List */}
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(FONT_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => onUpdateSettings({ fontFamily: key as FontFamily })}
                    className={`
                      flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors
                      ${settings.fontFamily === key ? themeStyles.active : themeStyles.hover}
                    `}
                  >
                    <span 
                      style={{ fontFamily: FONT_FAMILIES[key as FontFamily] }}
                      className="text-base"
                    >
                      {label}
                    </span>
                    {settings.fontFamily === key && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </button>
                ))}
              </div>

              {/* Font Size */}
              <div className="pt-4 space-y-3">
                 <div className="flex justify-between text-sm opacity-80 font-medium">
                   <span>Font Size</span>
                   <span>{settings.fontSize}px</span>
                 </div>
                 <div className={`flex items-center gap-4 p-2 rounded-lg ${themeStyles.border} border`}>
                   <button 
                      onClick={() => onUpdateSettings({ fontSize: Math.max(12, settings.fontSize - 1) })}
                      className={`p-2 rounded-md ${themeStyles.hover}`}
                   >
                     <Minus className="w-4 h-4" />
                   </button>
                   <input 
                      type="range" 
                      min="12" 
                      max="48" 
                      value={settings.fontSize} 
                      onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value) })}
                      className="flex-1 accent-blue-500 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                   />
                   <button 
                      onClick={() => onUpdateSettings({ fontSize: Math.min(48, settings.fontSize + 1) })}
                      className={`p-2 rounded-md ${themeStyles.hover}`}
                   >
                     <Plus className="w-4 h-4" />
                   </button>
                 </div>
              </div>

              {/* Line Height */}
               <div className="pt-2 space-y-3">
                 <div className="flex justify-between text-sm opacity-80 font-medium">
                   <span>Line Height</span>
                   <span>{settings.lineHeight}</span>
                 </div>
                 <input 
                    type="range" 
                    min="1.2" 
                    max="2.4" 
                    step="0.1"
                    value={settings.lineHeight} 
                    onChange={(e) => onUpdateSettings({ lineHeight: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                 />
              </div>
            </section>
          )}

          {/* Layout & Behavior */}
          <section className="space-y-3">
             <h3 className="text-xs uppercase tracking-wider opacity-60 font-bold">Layout & Behavior</h3>
             
             {!isPdf && (
               <div className={`flex p-1 rounded-lg ${themeStyles.active}`}>
                 <button
                   onClick={() => onUpdateSettings({ textAlign: 'left' })}
                   className={`flex-1 flex justify-center py-2 rounded-md transition-all ${settings.textAlign === 'left' ? 'bg-white shadow-sm text-gray-900' : 'opacity-50'}`}
                   title="Align Left"
                 >
                   <AlignLeft className="w-5 h-5" />
                 </button>
                 <button
                   onClick={() => onUpdateSettings({ textAlign: 'justify' })}
                   className={`flex-1 flex justify-center py-2 rounded-md transition-all ${settings.textAlign === 'justify' ? 'bg-white shadow-sm text-gray-900' : 'opacity-50'}`}
                   title="Justify"
                 >
                   <AlignJustify className="w-5 h-5" />
                 </button>
               </div>
             )}

             <div className="pt-2 space-y-3">
               <div className="flex justify-between text-sm opacity-80 font-medium">
                 <span>Page Width</span>
                 <span>{settings.maxWidth}px</span>
               </div>
               <input 
                  type="range" 
                  min="400" 
                  max="1200" 
                  step="50"
                  value={settings.maxWidth} 
                  onChange={(e) => onUpdateSettings({ maxWidth: parseInt(e.target.value) })}
                  className="w-full accent-blue-500 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
               />
            </div>

            {/* Immersion Settings */}
            <div className="pt-4 border-t border-gray-200/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                   <EyeOff className="w-4 h-4" />
                   <span>Auto-hide Toolbar</span>
                </div>
                <button
                  onClick={() => onUpdateSettings({ autoHideControls: !settings.autoHideControls })}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${settings.autoHideControls ? 'bg-blue-500' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${settings.autoHideControls ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {settings.autoHideControls && (
                <div className="pl-6 pr-1 space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between text-xs opacity-70">
                     <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Hide Delay</span>
                     <span>{settings.autoHideDuration || 3}s</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="10" 
                    step="1"
                    value={settings.autoHideDuration || 3} 
                    onChange={(e) => onUpdateSettings({ autoHideDuration: parseInt(e.target.value) })}
                    className="w-full accent-blue-500 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Focus Mode & AI Mode */}
            {!isPdf && (
              <div className="pt-4 border-t border-gray-200/20 space-y-4">
                
                {/* Focus Mode */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                       <Target className="w-4 h-4" />
                       <span>Focus Mode</span>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ focusMode: !settings.focusMode })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${settings.focusMode ? 'bg-blue-500' : 'bg-gray-300'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${settings.focusMode ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>

                  {/* Focus Paragraph Count */}
                  {settings.focusMode && (
                    <div className="pl-6 pr-1 space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between text-xs opacity-70">
                         <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Focus Lines</span>
                         <span>{settings.focusParagraphCount || 3}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="9" 
                        step="2" // Odd numbers work best for centering
                        value={settings.focusParagraphCount || 3} 
                        onChange={(e) => onUpdateSettings({ focusParagraphCount: parseInt(e.target.value) })}
                        className="w-full accent-blue-500 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* AI Mode */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                       <Sparkles className="w-4 h-4 text-amber-500" />
                       <span>AI Context Menu</span>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ aiMode: !settings.aiMode })}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${settings.aiMode ? 'bg-amber-500' : 'bg-gray-300'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${settings.aiMode ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>

                  {settings.aiMode && (
                    <div className="pl-6 pr-1 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      {/* Language Selection */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs opacity-70">
                          <span className="flex items-center gap-1"><Languages className="w-3 h-3" /> Output Language</span>
                        </div>
                        <div className={`flex p-1 rounded-lg ${themeStyles.active}`}>
                          {[
                            { value: 'auto', label: 'Auto' },
                            { value: 'zh', label: '中文' },
                            { value: 'en', label: 'Eng' },
                          ].map((lang) => (
                            <button
                              key={lang.value}
                              onClick={() => onUpdateSettings({ aiLanguage: lang.value as AILanguage })}
                              className={`
                                flex-1 py-1.5 text-xs font-medium rounded-md transition-all
                                ${settings.aiLanguage === lang.value ? 'bg-white shadow-sm text-gray-900' : 'opacity-50'}
                              `}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* API Key Input */}
                      <div className="pt-2">
                         <div className="flex justify-between text-xs opacity-70 mb-1.5">
                            <span className="flex items-center gap-1"><Key className="w-3 h-3" /> Gemini API Key</span>
                         </div>
                         <input 
                            type="password" 
                            value={settings.apiKey || ''}
                            onChange={(e) => onUpdateSettings({ apiKey: e.target.value })}
                            placeholder="Paste API Key here..."
                            className={`
                              w-full px-3 py-2 rounded-md text-xs
                              bg-transparent border ${themeStyles.border} 
                              focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none
                              transition-all
                            `}
                         />
                         <div className="text-[10px] mt-1 opacity-50 text-right">
                           <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="hover:underline hover:text-blue-500">
                             Get Key →
                           </a>
                         </div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs opacity-60">
                     Select text and right-click to trigger AI explanations and translations.
                  </p>
                </div>

              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};