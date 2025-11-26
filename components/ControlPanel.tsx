
import React from 'react';
import { 
  X, Sun, Moon, Coffee, Minus, Plus, AlignLeft, AlignJustify, Target, Sparkles, Layers
} from 'lucide-react';
import { ReaderSettings, ThemeType, FontFamily } from '../types';
import { THEMES, FONT_LABELS, FONT_FAMILIES } from '../constants';

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: Partial<ReaderSettings>) => void;
  currentTheme: ThemeType;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currentTheme,
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

          {/* Typography */}
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

          {/* Layout & Behavior */}
          <section className="space-y-3">
             <h3 className="text-xs uppercase tracking-wider opacity-60 font-bold">Layout & Behavior</h3>
             
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

            {/* Focus Mode & AI Mode */}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                   <Sparkles className="w-4 h-4 text-amber-500" />
                   <span>AI Companion</span>
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
              <p className="text-xs opacity-60">Unlock context by clicking underlined terms.</p>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
