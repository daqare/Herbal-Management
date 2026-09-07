import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { ExportBackupModal } from './ExportBackupModal';
import { useClients } from '../hooks/useClients';
import { useVisits } from '../hooks/useVisits';
import { useSupplements } from '../hooks/useSupplements';
import { Search, Download, Plus, Command, Leaf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { rawClients } = useClients('', 'all');
  const { visits } = useVisits();
  const { supplements } = useSupplements();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Global keydown listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 ml-0 md:ml-64 transition-all duration-300">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Bar with Quick Search & Actions */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-zinc-200/60 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="global-search-trigger"
                onClick={() => setIsCommandOpen(true)}
                className="flex items-center gap-3 px-3.5 py-2 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-2xl text-xs text-zinc-400 hover:text-zinc-700 transition-all shadow-2xs w-64 sm:w-80 justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">Quick search clients or actions...</span>
                </span>
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-400 bg-zinc-100 rounded-md border border-zinc-200 shrink-0">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-global-export"
                onClick={() => setIsExportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors shadow-2xs"
                title="Export clinic charts & records"
              >
                <Download className="w-3.5 h-3.5 text-zinc-500" />
                <span className="hidden sm:inline">Export & Backup</span>
              </button>

              <button
                type="button"
                id="btn-global-new-client"
                onClick={() => navigate('/clients')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-emerald-800 rounded-xl transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Client</span>
              </button>
            </div>
          </div>

          {/* Page Content */}
          {children}
        </div>
      </main>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        clients={rawClients}
        onNewClient={() => {
          setIsCommandOpen(false);
          navigate('/clients');
        }}
        onExport={() => {
          setIsCommandOpen(false);
          setIsExportOpen(true);
        }}
      />

      {/* Global Clinical Export Modal */}
      <ExportBackupModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        clients={rawClients}
        visits={visits}
        supplements={supplements}
      />
    </div>
  );
};

export default Layout;
