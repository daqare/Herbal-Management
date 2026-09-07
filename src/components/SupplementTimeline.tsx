import React, { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Pill, 
  Calendar, 
  Search, 
  Plus, 
  ArrowUpDown, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Filter,
  X,
  Edit2
} from 'lucide-react';
import { Visit } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SupplementTimelineProps {
  visits: Visit[];
  loading?: boolean;
  onRecordIntake: () => void;
  onEditVisit?: (visit: Visit) => void;
}

const parseVisitDate = (date: any): Date => {
  if (!date) return new Date();
  if (typeof date.toDate === 'function') return date.toDate();
  if (date instanceof Date) return date;
  if (date.seconds) return new Date(date.seconds * 1000);
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const SupplementTimeline: React.FC<SupplementTimelineProps> = ({
  visits,
  loading = false,
  onRecordIntake,
  onEditVisit
}) => {
  const [selectedSuppFilter, setSelectedSuppFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filter only visits that have supplements recorded
  const visitsWithSupplements = useMemo(() => {
    return visits.filter(v => Array.isArray(v.supplements) && v.supplements.length > 0);
  }, [visits]);

  // Determine chronological introduction order of supplements (oldest visit first)
  const supplementIntroductionMap = useMemo(() => {
    const sortedOldestFirst = [...visitsWithSupplements].sort((a, b) => {
      return parseVisitDate(a.date).getTime() - parseVisitDate(b.date).getTime();
    });

    const firstSeenMap = new Map<string, string>(); // supplementName -> visitId where first seen
    sortedOldestFirst.forEach(visit => {
      visit.supplements.forEach(s => {
        const trimmed = s.trim();
        if (trimmed && !firstSeenMap.has(trimmed.toLowerCase())) {
          firstSeenMap.set(trimmed.toLowerCase(), visit.id);
        }
      });
    });

    return firstSeenMap;
  }, [visitsWithSupplements]);

  // Calculate unique supplements and counts
  const supplementStats = useMemo(() => {
    const counts = new Map<string, { name: string; count: number; lastDate: Date }>();
    
    visitsWithSupplements.forEach(visit => {
      const vDate = parseVisitDate(visit.date);
      visit.supplements.forEach(s => {
        const trimmed = s.trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
          if (vDate > existing.lastDate) {
            existing.lastDate = vDate;
          }
        } else {
          counts.set(key, { name: trimmed, count: 1, lastDate: vDate });
        }
      });
    });

    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [visitsWithSupplements]);

  // Most recent regimen
  const mostRecentVisit = useMemo(() => {
    if (visitsWithSupplements.length === 0) return null;
    return [...visitsWithSupplements].sort(
      (a, b) => parseVisitDate(b.date).getTime() - parseVisitDate(a.date).getTime()
    )[0];
  }, [visitsWithSupplements]);

  // Filter and sort visits for timeline rendering
  const filteredTimelineVisits = useMemo(() => {
    return visitsWithSupplements
      .filter(visit => {
        // Filter by supplement tag
        if (selectedSuppFilter) {
          const hasSupp = visit.supplements.some(
            s => s.trim().toLowerCase() === selectedSuppFilter.toLowerCase()
          );
          if (!hasSupp) return false;
        }

        // Filter by search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchSupp = visit.supplements.some(s => s.toLowerCase().includes(q));
          const matchNotes = visit.notes?.toLowerCase().includes(q) || false;
          if (!matchSupp && !matchNotes) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = parseVisitDate(a.date).getTime();
        const timeB = parseVisitDate(b.date).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [visitsWithSupplements, selectedSuppFilter, searchQuery, sortOrder]);

  if (loading) {
    return (
      <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center shadow-sm">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-zinc-500 font-medium text-sm">Loading supplement intake history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stat Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Intake Consultations</span>
            <div className="p-2 bg-emerald-50 text-primary rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900">{visitsWithSupplements.length}</div>
          <p className="text-xs text-zinc-400 mt-0.5">Recorded visit dates</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Unique Supplements</span>
            <div className="p-2 bg-emerald-50 text-primary rounded-xl">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900">{supplementStats.length}</div>
          <p className="text-xs text-zinc-400 mt-0.5">Items prescribed to date</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Top Supplement</span>
            <div className="p-2 bg-emerald-50 text-primary rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-bold text-zinc-900 truncate">
            {supplementStats[0]?.name || 'None'}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {supplementStats[0] ? `Prescribed ${supplementStats[0].count} times` : 'No data yet'}
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Latest Regimen</span>
            <div className="p-2 bg-emerald-50 text-primary rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-bold text-zinc-900 truncate">
            {mostRecentVisit ? format(parseVisitDate(mostRecentVisit.date), 'MMM d, yyyy') : 'None'}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {mostRecentVisit ? `${mostRecentVisit.supplements.length} active item(s)` : 'No records'}
          </p>
        </div>
      </div>

      {/* Filter & Action Controls Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search supplement name or notes..."
              className="w-full pl-10 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold border border-zinc-200 transition-colors"
              title="Toggle timeline direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </button>

            <button
              onClick={onRecordIntake}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-emerald-800 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Record Intake
            </button>
          </div>
        </div>

        {/* Supplement Filter Chips */}
        {supplementStats.length > 0 && (
          <div className="pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filter:
              </span>
              <button
                onClick={() => setSelectedSuppFilter(null)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                  selectedSuppFilter === null
                    ? "bg-primary text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                )}
              >
                All Supplements ({visitsWithSupplements.length})
              </button>
              {supplementStats.map(stat => {
                const isSelected = selectedSuppFilter?.toLowerCase() === stat.name.toLowerCase();
                return (
                  <button
                    key={stat.name}
                    onClick={() => setSelectedSuppFilter(isSelected ? null : stat.name)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap border",
                      isSelected
                        ? "bg-emerald-800 text-white border-emerald-800 shadow-sm"
                        : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                  >
                    <span>{stat.name}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                      isSelected ? "bg-emerald-950/40 text-emerald-200" : "bg-zinc-100 text-zinc-500"
                    )}>
                      {stat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Timeline Stream */}
      {filteredTimelineVisits.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <Pill className="w-7 h-7" />
          </div>
          {visitsWithSupplements.length === 0 ? (
            <>
              <h3 className="text-lg font-bold text-zinc-900 mb-1">No Supplement History Yet</h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6">
                Supplements recorded during client visits will automatically populate this chronological timeline view.
              </p>
              <button
                onClick={onRecordIntake}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-emerald-800 transition-all shadow-md shadow-emerald-100"
              >
                <Plus className="w-4 h-4" />
                Record First Intake
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-zinc-900 mb-1">No Matches Found</h3>
              <p className="text-zinc-500 text-sm max-w-md mx-auto mb-4">
                No timeline records match your current filter or search criteria.
              </p>
              <button
                onClick={() => {
                  setSelectedSuppFilter(null);
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all"
              >
                Clear All Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-600 before:via-emerald-300 before:to-zinc-200">
          <div className="space-y-8">
            {filteredTimelineVisits.map((visit, index) => {
              const visitDate = parseVisitDate(visit.date);
              const isFirstItem = index === 0;

              return (
                <motion.div
                  key={visit.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="relative group"
                >
                  {/* Timeline Node Icon */}
                  <div className={cn(
                    "absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm transition-transform group-hover:scale-110",
                    isFirstItem && sortOrder === 'desc'
                      ? "bg-primary text-white"
                      : "bg-emerald-50 text-primary border border-emerald-300"
                  )}>
                    <Pill className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>

                  {/* Timeline Event Card */}
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
                    {/* Header: Date and relative time */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-zinc-100">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span>{format(visitDate, 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-medium">
                          ({formatDistanceToNow(visitDate, { addSuffix: true })})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isFirstItem && sortOrder === 'desc' && (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-primary border border-emerald-200 text-[10px] font-black uppercase tracking-wider rounded-full">
                            Latest Entry
                          </span>
                        )}
                        {onEditVisit && (
                          <button
                            onClick={() => onEditVisit(visit)}
                            className="p-1.5 text-zinc-400 hover:text-primary hover:bg-emerald-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            title="Edit consultation and supplements"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Supplements Prescribed / Taken */}
                    <div>
                      <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <span>Supplements in Regimen</span>
                        <span className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded-full">
                          {visit.supplements.length}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {visit.supplements.map((suppName) => {
                          const trimmed = suppName.trim();
                          const isFirstIntroduction = supplementIntroductionMap.get(trimmed.toLowerCase()) === visit.id;
                          const isFilteredMatch = selectedSuppFilter && trimmed.toLowerCase() === selectedSuppFilter.toLowerCase();

                          return (
                            <div
                              key={trimmed}
                              onClick={() => setSelectedSuppFilter(trimmed)}
                              className={cn(
                                "cursor-pointer group/pill flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all",
                                isFilteredMatch
                                  ? "bg-primary text-white border-primary shadow-sm"
                                  : "bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 border-emerald-200/80"
                              )}
                              title="Click to filter by this supplement"
                            >
                              <Pill className={cn(
                                "w-3.5 h-3.5 transition-transform group-hover/pill:rotate-12",
                                isFilteredMatch ? "text-emerald-200" : "text-primary"
                              )} />
                              <span>{trimmed}</span>

                              {isFirstIntroduction && (
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded-md flex items-center gap-1",
                                  isFilteredMatch
                                    ? "bg-white/20 text-white"
                                    : "bg-emerald-200 text-emerald-900"
                                )}>
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Introduced
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Consultation Notes if provided */}
                    {visit.notes && (
                      <div className="mt-4 pt-3.5 border-t border-zinc-100 flex items-start gap-2.5 text-xs text-zinc-600 bg-zinc-50/80 p-3 rounded-xl border border-zinc-200/60">
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                            Consultation & Usage Notes
                          </span>
                          <p className="leading-relaxed italic text-zinc-700">"{visit.notes}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplementTimeline;
