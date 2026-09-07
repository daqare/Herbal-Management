import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, BarChart, Bar 
} from 'recharts';
import { BadgeDollarSign, TrendingUp, Receipt, Users, ArrowUpRight } from 'lucide-react';
import { Visit } from '../types';
import { formatKES } from '../lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface PracticeFinancialVisualizerProps {
  visits: Visit[];
  monthlyRevenue: number;
}

export const PracticeFinancialVisualizer: React.FC<PracticeFinancialVisualizerProps> = ({
  visits,
  monthlyRevenue,
}) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Compute 6-month historical monthly trajectory
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const targetMonth = subMonths(now, i);
      const start = startOfMonth(targetMonth);
      const end = endOfMonth(targetMonth);
      const monthLabel = format(targetMonth, 'MMM yyyy');

      const monthVisits = visits.filter(v => {
        if (!v.date) return false;
        const d = v.date?.toDate ? v.date.toDate() : new Date(v.date);
        return isWithinInterval(d, { start, end });
      });

      const revenue = monthVisits.reduce((sum, v) => sum + (Number(v.payment) || 0), 0);
      const count = monthVisits.length;

      months.push({
        month: monthLabel,
        revenue,
        visits: count,
        avgValue: count > 0 ? Math.round(revenue / count) : 0,
      });
    }
    return months;
  }, [visits]);

  // Aggregate metrics
  const totalRevenue = useMemo(() => {
    return visits.reduce((sum, v) => sum + (Number(v.payment) || 0), 0);
  }, [visits]);

  const totalVisitsCount = visits.length;
  const averageConsultationValue = totalVisitsCount > 0 ? Math.round(totalRevenue / totalVisitsCount) : 0;

  // Total herbal supplements dispensed
  const totalSupplementsDispensed = useMemo(() => {
    return visits.reduce((acc, v) => acc + (v.supplements?.length || 0), 0);
  }, [visits]);

  const avgSupplementsPerVisit = totalVisitsCount > 0 
    ? (totalSupplementsDispensed / totalVisitsCount).toFixed(1) 
    : '0';

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-800">
              <BadgeDollarSign className="w-4 h-4 text-primary" />
            </span>
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">Practice Revenue & Cashflow Analytics</h2>
          </div>
          <p className="text-xs text-zinc-500">
            Consultation billings, apothecary remittances, and practice financial trends
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartType('area')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              chartType === 'area'
                ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Trajectory
          </button>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              chartType === 'bar'
                ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Monthly Volume
          </button>
        </div>
      </div>

      {/* 3 Metric Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/70">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
            Avg Consultation Value (ACV)
          </span>
          <div className="text-lg font-black text-zinc-900">
            {formatKES(averageConsultationValue)}
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">Per patient visit</span>
        </div>

        <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/70">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
            Total Billed Consultations
          </span>
          <div className="text-lg font-black text-zinc-900">
            {totalVisitsCount.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">Recorded clinical sessions</span>
        </div>

        <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/70">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
            Remedies Prescribed / Visit
          </span>
          <div className="text-lg font-black text-zinc-900">
            {avgSupplementsPerVisit}
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">{totalSupplementsDispensed} total formulas</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#047857" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#047857" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fill: '#71717A' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#71717A' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(val) => `KES ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-zinc-900 text-white text-xs p-3 rounded-xl shadow-xl space-y-1">
                        <p className="font-bold text-zinc-200">{label}</p>
                        <p className="text-emerald-400 font-semibold font-mono">
                          Revenue: {formatKES(data.revenue)}
                        </p>
                        <p className="text-zinc-400">
                          Consultations: <span className="text-white font-medium">{data.visits}</span>
                        </p>
                        <p className="text-zinc-400">
                          Average Visit: <span className="text-white font-medium">{formatKES(data.avgValue)}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#047857" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorRev)" 
              />
            </AreaChart>
          ) : (
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fill: '#71717A' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#71717A' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(val) => `KES ${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-zinc-900 text-white text-xs p-3 rounded-xl shadow-xl space-y-1">
                        <p className="font-bold text-zinc-200">{label}</p>
                        <p className="text-emerald-400 font-semibold font-mono">
                          Revenue: {formatKES(data.revenue)}
                        </p>
                        <p className="text-zinc-400">
                          Visits: <span className="text-white font-medium">{data.visits}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="revenue" fill="#047857" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
