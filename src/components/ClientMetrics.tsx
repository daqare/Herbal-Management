import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { Plus, Trash2, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { useMetrics } from '../hooks/useMetrics';
import { Metric } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ClientMetricsProps {
  clientId: string;
}

const ClientMetrics: React.FC<ClientMetricsProps> = ({ clientId }) => {
  const { metrics, loading, addMetric, deleteMetric } = useMetrics(clientId);
  const [isAdding, setIsAdding] = useState(false);
  const [metricType, setMetricType] = useState<Metric['type']>('Weight');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const units: Record<Metric['type'], string> = {
    'Weight': 'kg',
    'Blood Pressure': 'mmHg',
    'Heart Rate': 'bpm',
    'Blood Sugar': 'mg/dL',
    'Temperature': '°C'
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) return;

    await addMetric({
      clientId,
      type: metricType,
      value,
      unit: units[metricType],
      date: new Date(date)
    });

    setValue('');
    setIsAdding(false);
  };

  const chartData = metrics
    .filter(m => m.type === metricType)
    .map(m => ({
      date: format(m.date.toDate(), 'MMM d'),
      value: parseFloat(m.value.split('/')[0]), // Handle BP like "120/80" by taking systolic
      fullValue: m.value,
      originalDate: m.date.toDate()
    }))
    .reverse();

  const currentMetrics = metrics.filter(m => m.type === metricType);
  const latestMetric = currentMetrics[0];
  const previousMetric = currentMetrics[1];

  let trend = null;
  if (latestMetric && previousMetric) {
    const lat = parseFloat(latestMetric.value);
    const prev = parseFloat(previousMetric.value);
    if (!isNaN(lat) && !isNaN(prev)) {
      trend = lat > prev ? 'up' : lat < prev ? 'down' : 'stable';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-zinc-100 p-1 rounded-xl">
          {Object.keys(units).map((type) => (
            <button
              key={type}
              onClick={() => setMetricType(type as Metric['type'])}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                metricType === type 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {type}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Entry
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end overflow-hidden"
          >
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Value ({units[metricType]})</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={metricType === 'Blood Pressure' ? '120/80' : 'e.g. 70'}
                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-bold hover:bg-emerald-800 transition-colors"
              >
                Save {metricType}
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 border border-zinc-200 text-zinc-500 rounded-lg text-sm font-bold hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric Summary Card */}
        <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
               <div className="p-2 bg-emerald-50 text-primary rounded-xl">
                  <Activity className="w-5 h-5" />
               </div>
               {trend && (
                 <div className={cn(
                   "flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                   trend === 'up' ? "bg-orange-50 text-orange-600 border-orange-100" :
                   trend === 'down' ? "bg-blue-50 text-blue-600 border-blue-100" :
                   "bg-zinc-50 text-zinc-500 border-zinc-100"
                 )}>
                   {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                   {trend}
                 </div>
               )}
            </div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Latest {metricType}</p>
            <h3 className="text-4xl font-black text-zinc-900">
               {latestMetric ? `${latestMetric.value}` : '--'}
               <span className="text-lg text-zinc-400 ml-1 font-medium">{units[metricType]}</span>
            </h3>
          </div>
          
          <div className="mt-6 pt-6 border-t border-zinc-50 space-y-2">
            {currentMetrics.slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center justify-between group">
                <div>
                  <p className="text-xs font-bold text-zinc-900">{m.value} {m.unit}</p>
                  <p className="text-[10px] text-zinc-400">{format(m.date.toDate(), 'PPP')}</p>
                </div>
                <button 
                  onClick={() => deleteMetric(m.id)}
                  className="p-1.5 text-zinc-200 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chart View */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm min-h-[300px]">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Progress History</h3>
          <div className="h-[200px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#A1A1AA', fontWeight: 600 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#A1A1AA', fontWeight: 600 }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }}
                    itemStyle={{ color: '#059669' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#059669" 
                    strokeWidth={3} 
                    dot={{ fill: '#059669', strokeWidth: 2, r: 4, stroke: '#fff' }} 
                    activeDot={{ r: 6, stroke: '#059669', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-300 italic text-sm">
                Enter at least two data points to see trends.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientMetrics;
