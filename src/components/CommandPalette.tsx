import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Users, Calendar, LayoutDashboard, BarChart3, 
  Plus, Download, Moon, Sun, ArrowRight, Tag, X, Sparkles, Phone 
} from 'lucide-react';
import { Client } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onNewClient?: () => void;
  onExport?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  clients,
  onNewClient,
  onExport
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Actions list
  const staticActions = [
    {
      id: 'nav-dash',
      title: 'Go to Dashboard',
      subtitle: 'Overview of revenue, active clients, and metrics',
      icon: LayoutDashboard,
      action: () => navigate('/')
    },
    {
      id: 'nav-clients',
      title: 'Browse All Clients',
      subtitle: 'Directory of registered clients & profiles',
      icon: Users,
      action: () => navigate('/clients')
    },
    {
      id: 'nav-appointments',
      title: 'View Appointments',
      subtitle: 'Upcoming & scheduled consultations calendar',
      icon: Calendar,
      action: () => navigate('/appointments')
    },
    {
      id: 'nav-reports',
      title: 'Practice Analytics & Reports',
      subtitle: 'Revenue trends, top prescribed herbs, and volume',
      icon: BarChart3,
      action: () => navigate('/reports')
    },
    {
      id: 'act-new-client',
      title: 'Add New Client Profile',
      subtitle: 'Register a new patient with contact details & tags',
      icon: Plus,
      action: () => {
        if (onNewClient) onNewClient();
        else navigate('/clients');
      }
    },
    {
      id: 'act-export',
      title: 'Export Practice Data & Charts',
      subtitle: 'Download complete CSV / JSON backup of clinic records',
      icon: Download,
      action: () => {
        if (onExport) onExport();
      }
    }
  ];

  // Filter clients by query
  const filteredClients = query.trim()
    ? clients
        .filter(c => {
          const q = query.toLowerCase();
          const matchName = c.name.toLowerCase().includes(q);
          const matchPhone = c.phone.toLowerCase().includes(q);
          const matchTags = c.tags?.some(t => t.toLowerCase().includes(q));
          return matchName || matchPhone || matchTags;
        })
        .slice(0, 5)
    : [];

  // Filter actions
  const filteredActions = query.trim()
    ? staticActions.filter(a => a.title.toLowerCase().includes(query.toLowerCase()) || a.subtitle.toLowerCase().includes(query.toLowerCase()))
    : staticActions;

  // Flattened active items for keyboard navigation
  const totalItems = [
    ...filteredClients.map(c => ({ type: 'client', item: c })),
    ...filteredActions.map(a => ({ type: 'action', item: a }))
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, totalItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems.length) % Math.max(1, totalItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = totalItems[selectedIndex];
      if (current) {
        if (current.type === 'client') {
          navigate(`/clients/${(current.item as Client).id}`);
        } else {
          (current.item as typeof staticActions[0]).action();
        }
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 z-10"
        >
          {/* Search Input */}
          <div className="flex items-center px-4 py-3.5 border-b border-zinc-100 gap-3">
            <Search className="w-5 h-5 text-zinc-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search clients by name, phone (+254), tags, or jump to actions..."
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
            />
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200 rounded-md">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="max-h-96 overflow-y-auto p-2 space-y-1">
            {/* Matching Clients Section */}
            {filteredClients.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Clients ({filteredClients.length})
                </div>
                {filteredClients.map((client, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        navigate(`/clients/${client.id}`);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left transition-colors ${
                        isSelected ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-zinc-50 text-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{client.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                            <span className="font-mono">{client.phone}</span>
                            {client.tags && client.tags.length > 0 && (
                              <span className="text-primary font-medium">• {client.tags[0]}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-400" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Actions Section */}
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {filteredClients.length > 0 ? 'Quick Actions' : 'Navigation & Practice Actions'}
              </div>
              {filteredActions.map((action, actionIdx) => {
                const globalIndex = filteredClients.length + actionIdx;
                const isSelected = selectedIndex === globalIndex;
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      action.action();
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left transition-colors ${
                      isSelected ? 'bg-zinc-100 text-zinc-900' : 'hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{action.title}</p>
                        <p className="text-[11px] text-zinc-400">{action.subtitle}</p>
                      </div>
                    </div>
                    <kbd className="text-[10px] text-zinc-400 font-mono">↵</kbd>
                  </button>
                );
              })}
            </div>

            {totalItems.length === 0 && (
              <div className="text-center py-8 text-zinc-400 text-xs">
                No matching clients or actions found for "{query}"
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-3">
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> open</span>
              <span><kbd className="font-mono">esc</kbd> close</span>
            </div>
            <span className="font-medium text-emerald-800">Herbal Clinical Suite</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
