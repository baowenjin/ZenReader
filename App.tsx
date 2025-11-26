
import React, { useState, useEffect } from 'react';
import { Bookshelf } from './components/Bookshelf';
import { ReaderView } from './components/ReaderView';
import { ControlPanel } from './components/ControlPanel';
import { BookData, ReaderSettings, Chapter } from './types';
import { DEFAULT_SETTINGS, THEME_COLORS } from './constants';
import { parseChapters, parseEpub, parsePdf, generateId, extractMetadata, scanDirectoryForFiles } from './utils';
import { initDB, saveBook, getAllBooks, updateBookProgress, deleteBook } from './db';

const App: React.FC = () => {
  // Application State
  const [view, setView] = useState<'shelf' | 'reader'>('shelf');
  const [books, setBooks] = useState<BookData[]>([]);
  const [activeBook, setActiveBook] = useState<BookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem('zenreader-settings');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    // Ensure new settings fields exist
    return { ...DEFAULT_SETTINGS, ...parsed };
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize DB and load books
  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        const loadedBooks = await getAllBooks();
        setBooks(loadedBooks);
      } catch (e) {
        console.error("Failed to load database", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Sync Settings & Body Theme
  useEffect(() => {
    localStorage.setItem('zenreader-settings', JSON.stringify(settings));
    
    // Only apply theme to body if in reader mode, otherwise use default gray for shelf
    if (view === 'reader') {
      // Use centralized theme colors to ensure consistency
      document.body.style.backgroundColor = THEME_COLORS[settings.theme].bg;
    } else {
       document.body.style.backgroundColor = THEME_COLORS.light.uiBg; // Default shelf bg
    }
  }, [settings, view]);

  const processFile = async (file: File): Promise<BookData | null> => {
      // Default title from filename
      let title = file.name.replace(/\.(txt|epub|pdf)$/i, '');
      let content = '';
      let chapters: Chapter[] = [];
      let coverImage: string | undefined;
      let author: string | undefined;
      let publisher: string | undefined;
      
      try {
        const lowerName = file.name.toLowerCase();
  
        if (lowerName.endsWith('.epub')) {
          // Parse EPUB
          const result = await parseEpub(file);
          chapters = result.chapters;
          coverImage = result.coverImage;
          author = result.author;
          content = chapters.map(c => c.content).join('\n\n'); 
        } else if (lowerName.endsWith('.pdf')) {
          // Parse PDF
          const result = await parsePdf(file);
          content = result.content;
          coverImage = result.coverImage;
          if (result.author) author = result.author;
          if (result.title && result.title.trim().length > 0) title = result.title;
          
          chapters = parseChapters(content);
        } else {
          // Parse TXT
          content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const text = e.target?.result as string;
              // Normalize newlines
              const cleanContent = text.replace(/\r\n/g, '\n');
              resolve(cleanContent);
            };
            reader.readAsText(file, 'utf-8');
          });
          
          // Extract Metadata from first 1000 chars
          const metadata = extractMetadata(content);
          if (metadata.author) author = metadata.author;
          if (metadata.publisher) publisher = metadata.publisher;
          if (metadata.title && metadata.title.length < 50) {
            title = metadata.title;
          }
          
          chapters = parseChapters(content);
        }
  
        const newBook: BookData = {
          id: generateId(),
          title: title,
          author: author,
          publisher: publisher,
          content: content,
          chapters: chapters,
          currentPageIndex: 0,
          createdAt: Date.now(),
          lastReadAt: Date.now(),
          coverImage: coverImage,
        };
        
        return newBook;
  
      } catch (err) {
        console.error(`Failed to import book: ${file.name}`, err);
        return null;
      }
  };

  // Bulk import handler
  const handleBooksImport = async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsLoading(true);
    let importedCount = 0;
    
    // Filter supported files
    const validFiles = files.filter(f => {
       const name = f.name.toLowerCase();
       return name.endsWith('.txt') || name.endsWith('.epub') || name.endsWith('.pdf');
    });

    if (validFiles.length === 0) {
        alert("No supported files found (.txt, .epub, .pdf)");
        setIsLoading(false);
        return;
    }

    try {
        for (const file of validFiles) {
            // Simple check to avoid exact duplicates by title/filename
            const exists = books.some(b => b.title === file.name.replace(/\.(txt|epub|pdf)$/i, ''));
            if (!exists) {
               const book = await processFile(file);
               if (book) {
                 await saveBook(book);
                 importedCount++;
               }
            }
        }
        
        if (importedCount > 0) {
           const updatedBooks = await getAllBooks();
           setBooks(updatedBooks);
           alert(`Successfully imported ${importedCount} books.`);
        } else {
           alert("No new books imported (duplicates skipped).");
        }
    } catch (err) {
        console.error("Bulk import error", err);
        alert("An error occurred during import.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleImportBook = async (file: File) => {
    await handleBooksImport([file]);
  };

  const handleImportFolder = async () => {
     try {
       // Check for modern API support
       // @ts-ignore
       if (window.showDirectoryPicker) {
           // @ts-ignore
           const dirHandle = await window.showDirectoryPicker();
           setIsLoading(true);
           const files = await scanDirectoryForFiles(dirHandle);
           setIsLoading(false); // handleBooksImport sets it true again, but we need to reset to avoid stuck state if 0 files
           await handleBooksImport(files);
       } else {
           // This path shouldn't be reached if Bookshelf handles the fallback properly,
           // but we keep it safe.
           alert("Feature not supported in this browser.");
       }
     } catch (err) {
       if ((err as Error).name !== 'AbortError') {
          console.error("Folder import failed", err);
          alert("Failed to access folder.");
       }
     } finally {
        setIsLoading(false);
     }
  };

  const handleExportBackup = async () => {
    try {
      setIsLoading(true);
      const allBooks = await getAllBooks();
      const backupData = JSON.stringify(allBooks);
      
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `zenreader_backup_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);
        
        if (!Array.isArray(data)) {
          throw new Error("Invalid backup format");
        }

        let restoredCount = 0;
        for (const book of data) {
          if (book.id && book.title && book.content) {
            // restore timestamp if missing from older backups
            if (!book.lastReadAt) book.lastReadAt = Date.now();
            await saveBook(book);
            restoredCount++;
          }
        }

        const updatedBooks = await getAllBooks();
        setBooks(updatedBooks);
        alert(`Successfully restored ${restoredCount} books from backup.`);
      } catch (err) {
        console.error("Restore failed", err);
        alert("Failed to restore backup. Invalid file format.");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleOpenBook = async (book: BookData) => {
    // Check if chapters are parsed. If not (old data), parse them now.
    let chapters = book.chapters;
    if (!chapters || chapters.length === 0) {
      chapters = parseChapters(book.content);
    }

    // Ensure we don't start on a page that doesn't exist
    const validPageIndex = Math.min(book.currentPageIndex, Math.max(0, chapters.length - 1));

    setActiveBook({ ...book, chapters, currentPageIndex: validPageIndex });
    
    // Update last read timestamp immediately
    await updateBookProgress(book.id, validPageIndex);
    setView('reader');
  };

  const handleDeleteBook = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      await deleteBook(id);
      const updatedBooks = await getAllBooks();
      setBooks(updatedBooks);
    }
  };

  const handleUpdateSettings = (newSettings: Partial<ReaderSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handlePageChange = async (pageIndex: number) => {
    if (activeBook) {
      const updatedBook = { ...activeBook, currentPageIndex: pageIndex };
      setActiveBook(updatedBook);
      // Persist progress to DB
      await updateBookProgress(activeBook.id, pageIndex);
    }
  };

  const handleCloseBook = async () => {
    setView('shelf');
    setActiveBook(null);
    // Refresh list to show updated timestamps/progress
    const updatedBooks = await getAllBooks();
    setBooks(updatedBooks);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
        <p className="mt-4 text-gray-500 text-sm">Loading Library...</p>
      </div>
    </div>;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300`}>
      {view === 'shelf' ? (
        <Bookshelf 
          books={books}
          onImportBook={handleImportBook}
          onImportFiles={handleBooksImport}
          onImportFolder={handleImportFolder}
          onExportBackup={handleExportBackup}
          onRestoreBackup={handleRestoreBackup}
          onOpenBook={handleOpenBook}
          onDeleteBook={handleDeleteBook}
        />
      ) : activeBook ? (
        <>
          <ReaderView 
            book={activeBook}
            settings={settings}
            onPageChange={handlePageChange}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onCloseBook={handleCloseBook}
            onToggleFocusMode={() => handleUpdateSettings({ focusMode: !settings.focusMode })}
          />
          <ControlPanel 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            currentTheme={settings.theme}
          />
        </>
      ) : null}
    </div>
  );
};

export default App;
