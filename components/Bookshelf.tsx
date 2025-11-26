

import React, { useRef, useState, useEffect } from 'react';
import { Plus, Search, Trash2, FolderInput, Download, ChevronDown, FileText, FileUp, FileDown, Cloud, CloudLightning, RefreshCw } from 'lucide-react';
import { BookData } from '../types';
import { calculateProgress } from '../utils';

interface BookshelfProps {
  books: BookData[];
  onOpenBook: (book: BookData) => void;
  onImportBook: (file: File) => void;
  onImportFiles: (files: File[]) => void;
  onImportFolder: () => void;
  onExportBackup: () => void;
  onRestoreBackup: (file: File) => void;
  onDeleteBook: (id: string) => void;
  onConnectSync: () => void;
  onReconnectSync: () => void;
  isSyncConnected: boolean;
  hasSyncHandle: boolean;
}

const TABS = ['默认', '更新', '进度', '书名', '字数'];

export const Bookshelf: React.FC<BookshelfProps> = ({ 
  books, 
  onOpenBook, 
  onImportFiles,
  onImportFolder,
  onExportBackup,
  onRestoreBackup,
  onDeleteBook,
  onConnectSync,
  onReconnectSync,
  isSyncConnected,
  hasSyncHandle
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState('默认');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHoveringId, setIsHoveringId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<'import' | 'export' | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        importMenuRef.current && !importMenuRef.current.contains(event.target as Node) &&
        exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)
      ) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (activeTab === '进度') {
      const progA = calculateProgress(a.currentPageIndex, a.chapters?.length || 1);
      const progB = calculateProgress(b.currentPageIndex, b.chapters?.length || 1);
      return progB - progA;
    }
    if (activeTab === '更新') {
      return b.lastReadAt - a.lastReadAt;
    }
    if (activeTab === '书名') {
      return a.title.localeCompare(b.title, 'zh-CN');
    }
    if (activeTab === '字数') {
      return b.content.length - a.content.length;
    }
    return b.createdAt - a.createdAt;
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(Array.from(e.target.files));
    }
    if (e.target) e.target.value = '';
  };

  // Sync Status UI Logic
  let syncStatusUI;
  if (isSyncConnected) {
      syncStatusUI = (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             <span>Synced</span>
          </div>
      );
  } else if (hasSyncHandle) {
      // We have a handle but not connected (need permission)
      syncStatusUI = (
          <button 
             onClick={onReconnectSync}
             className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 hover:bg-amber-100 transition-colors"
          >
             <RefreshCw className="w-3 h-3" />
             <span>Reconnect</span>
          </button>
      );
  } else {
      // No sync set up
      // @ts-ignore
      const showSyncButton = !!window.showDirectoryPicker;
      if (showSyncButton) {
          syncStatusUI = (
            <button
                onClick={onConnectSync}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors group"
            >
                <div className="p-1.5 rounded-md bg-gray-100 group-hover:bg-blue-50 transition-colors">
                    <Cloud className="w-4 h-4" />
                </div>
                <span>Connect Sync Folder</span>
            </button>
          );
      }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900 pb-20 font-sans">
      
      {/* Top Search Bar */}
      <div className="bg-white/80 backdrop-blur-md px-6 py-3 sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1 bg-gray-100/50 hover:bg-gray-100 transition-colors rounded-lg h-9 flex items-center px-3 gap-2 text-gray-400 focus-within:text-gray-800 focus-within:bg-white focus-within:ring-1 focus-within:ring-gray-200">
            <Search className="w-4 h-4" />
            <input 
              type="text"
              placeholder="Type to search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400 text-gray-800"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-10">
        
        {/* Header Row: Title + Actions */}
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-none font-serif">书架</h1>
              {syncStatusUI}
          </div>
          
          {/* Actions Group */}
          <div className="flex items-center gap-6">
            
            {/* Import Dropdown */}
            <div className="relative" ref={importMenuRef}>
              <button
                onClick={() => setActiveMenu(activeMenu === 'import' ? null : 'import')}
                className={`
                  flex items-center gap-1.5 text-sm font-medium transition-colors
                  ${activeMenu === 'import' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}
                `}
              >
                <Plus className="w-4 h-4" />
                <span>导入</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${activeMenu === 'import' ? 'rotate-180' : ''}`} />
              </button>

              {activeMenu === 'import' && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <button
                      onClick={() => { setActiveMenu(null); fileInputRef.current?.click(); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>添加文件</span>
                    </button>
                    <button
                      onClick={() => { setActiveMenu(null); folderInputRef.current?.click(); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 transition-colors"
                    >
                      <FolderInput className="w-4 h-4" />
                      <span>扫描文件夹</span>
                    </button>
                    <div className="h-px bg-gray-50"></div>
                    <button
                      onClick={() => { setActiveMenu(null); backupInputRef.current?.click(); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 transition-colors"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>恢复备份</span>
                    </button>
                </div>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setActiveMenu(activeMenu === 'export' ? null : 'export')}
                className={`
                  flex items-center gap-1.5 text-sm font-medium transition-colors
                  ${activeMenu === 'export' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}
                `}
              >
                <Download className="w-4 h-4" />
                <span>导出</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${activeMenu === 'export' ? 'rotate-180' : ''}`} />
              </button>

               {activeMenu === 'export' && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-40 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <button
                      onClick={() => { setActiveMenu(null); onExportBackup(); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 transition-colors"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>备份数据</span>
                    </button>
                </div>
              )}
            </div>
          </div>

          {/* Hidden Inputs */}
          <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.epub,.pdf" multiple onChange={(e) => e.target.files && onImportFiles(Array.from(e.target.files))} />
          <input type="file" ref={folderInputRef} className="hidden" 
            // @ts-ignore
            webkitdirectory="" directory="" multiple onChange={handleFolderInputChange} 
          />
          <input type="file" ref={backupInputRef} className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && onRestoreBackup(e.target.files[0])} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar mb-8">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                whitespace-nowrap text-sm pb-1 transition-all relative font-medium
                ${activeTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Book Grid */}
        <div 
          className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          
          {/* Add Book Card - Modern Minimalist */}
          {books.length === 0 && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="
                group relative aspect-[2/3] w-full 
                flex flex-col items-center justify-center
                border-2 border-dashed border-gray-200 
                rounded-2xl bg-gray-50/50
                cursor-pointer transition-all duration-300
                hover:border-gray-300 hover:bg-white hover:shadow-sm
              "
            >
               {/* Icon */}
               <div className="p-4 rounded-full bg-white shadow-sm border border-gray-100 group-hover:scale-110 transition-transform duration-300">
                 <Plus className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors" />
               </div>

               {/* Label */}
               <div className="mt-4 text-[11px] font-sans font-medium text-gray-400 group-hover:text-gray-600 transition-colors tracking-wide">
                 ADD BOOK
               </div>
            </div>
          )}

          {/* Book Items */}
          {sortedBooks.map((book) => {
            const totalUnits = book.chapters && book.chapters.length > 0 ? book.chapters.length : Math.max(1, Math.ceil(book.content.length / 3000));
            const percentage = calculateProgress(book.currentPageIndex, totalUnits);

            return (
              <div 
                key={book.id} 
                className="flex flex-col gap-3 group relative cursor-pointer"
                onClick={() => onOpenBook(book)}
                onMouseEnter={() => setIsHoveringId(book.id)}
                onMouseLeave={() => setIsHoveringId(null)}
              >
                {/* Book Cover */}
                <div className="relative aspect-[2/3] w-full bg-white shadow-sm border border-gray-200 overflow-hidden rounded-md transition-transform duration-300 group-hover:-translate-y-1">
                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500" />
                  ) : (
                    <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center">
                       <div className="text-[9px] uppercase tracking-widest text-gray-400 mb-2 font-mono">{book.publisher || 'LIBRARY'}</div>
                       <h3 className="text-gray-900 font-serif font-bold text-lg leading-tight line-clamp-3 mb-2">{book.title}</h3>
                       {book.author && <p className="text-[10px] text-gray-500 uppercase tracking-wide">{book.author}</p>}
                    </div>
                  )}

                  {/* Delete Button */}
                  <button
                      onClick={(e) => { e.stopPropagation(); onDeleteBook(book.id); }}
                      className={`
                        absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-full border border-gray-200 shadow-sm
                        hover:bg-red-50 transition-all duration-200 z-10
                        ${isHoveringId === book.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
                      `}
                    >
                      <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Metadata */}
                <div>
                  <h3 className="text-[13px] font-medium text-gray-900 leading-tight line-clamp-1 mb-0.5">{book.title}</h3>
                  <p className="text-[11px] text-gray-400 font-mono">
                    {percentage === 0 ? 'UNREAD' : `${percentage}% DONE`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {sortedBooks.length === 0 && books.length > 0 && searchQuery && (
           <div className="text-center mt-20 text-gray-400 text-sm">No matching books found.</div>
        )}
      </div>
    </div>
  );
};
