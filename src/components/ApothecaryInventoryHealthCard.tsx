import React, { useState } from 'react';
import { Leaf, Plus, TrendingUp, AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Supplement } from '../hooks/useSupplements';
import { toast } from 'sonner';

interface ApothecaryInventoryHealthCardProps {
  supplements: Supplement[];
  loading: boolean;
  onIncrementUsage: (name: string) => Promise<void>;
  onAddSupplement: (name: string) => Promise<void>;
}

export const ApothecaryInventoryHealthCard: React.FC<ApothecaryInventoryHealthCardProps> = ({
  supplements,
  loading,
  onIncrementUsage,
  onAddSupplement,
}) => {
  const [newHerbName, setNewHerbName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Top 5 botanicals
  const topSupplements = supplements.slice(0, 5);
  const maxUsage = topSupplements.length > 0 ? Math.max(...topSupplements.map(s => s.usageCount), 1) : 1;

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newHerbName.trim();
    if (!trimmed) return;
    setIsAdding(true);
    try {
      await onAddSupplement(trimmed);
      setNewHerbName('');
      toast.success(`${trimmed} added to apothecary catalog`);
    } catch {
      toast.error('Failed to add botanical formula');
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuickDispense = async (name: string) => {
    try {
      await onIncrementUsage(name);
      toast.success(`Dispensed +1 ${name}`);
    } catch {
      toast.error(`Failed to update dispense count`);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-800">
            <Leaf className="w-4 h-4 text-primary" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Dispensary Stock & Velocity</h3>
            <p className="text-[11px] text-zinc-400">Most active botanicals & turnover</p>
          </div>
        </div>
        <Link
          to="/reports"
          className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
        >
          View All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Supplement List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <div className="h-10 bg-zinc-50 rounded-xl animate-pulse" />
            <div className="h-10 bg-zinc-50 rounded-xl animate-pulse" />
            <div className="h-10 bg-zinc-50 rounded-xl animate-pulse" />
          </div>
        ) : topSupplements.length === 0 ? (
          <div className="p-4 bg-zinc-50 rounded-2xl text-center border border-dashed border-zinc-200">
            <p className="text-xs text-zinc-400 italic">No botanicals registered in apothecary.</p>
          </div>
        ) : (
          topSupplements.map((supp, index) => {
            const percentage = Math.round((supp.usageCount / maxUsage) * 100);
            return (
              <div key={supp.id} className="space-y-1 group">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center font-bold text-[10px]">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-zinc-800">{supp.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-800 text-[11px]">
                      {supp.usageCount} {supp.usageCount === 1 ? 'prescription' : 'prescriptions'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickDispense(supp.name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 hover:bg-emerald-100 text-zinc-700 hover:text-emerald-800"
                      title="Quick record 1 dispense"
                    >
                      +1 Dispense
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Herb Inline */}
      <form onSubmit={handleQuickAdd} className="pt-2 border-t border-zinc-100 flex gap-2">
        <input
          type="text"
          value={newHerbName}
          onChange={e => setNewHerbName(e.target.value)}
          placeholder="Add botanical formula..."
          className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <button
          type="submit"
          disabled={isAdding || !newHerbName.trim()}
          className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-800 text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>
    </div>
  );
};
