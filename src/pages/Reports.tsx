import React, { useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Download, 
  Filter, 
  FileSpreadsheet, 
  Search,
  Calendar as CalendarIcon,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Activity
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { formatKES } from '../lib/utils';
import { motion } from 'motion/react';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  const generateReport = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'visits'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(new Date(startDate))),
        where('date', '<=', Timestamp.fromDate(new Date(endDate + 'T23:59:59'))),
        orderBy('date', 'desc')
      );

      const snap = await getDocs(q);
      const data = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          formattedDate: format(d.date.toDate(), 'PPP'),
          csvDate: format(d.date.toDate(), 'yyyy-MM-dd HH:mm'),
          clientId: d.clientId as string,
          payment: d.payment as number,
          supplements: d.supplements as string[]
        };
      });

      // Fetch client names (for the report table and export)
      const clientsQ = query(collection(db, 'clients'), where('userId', '==', user.uid));
      const clientsSnap = await getDocs(clientsQ);
      const clientMap = new Map(clientsSnap.docs.map(d => [d.id, d.data().name]));

      const enrichedData = data.map(v => ({
        ...v,
        clientName: clientMap.get(v.clientId) || 'Unknown Client'
      }));

      setReportData(enrichedData);
      if (enrichedData.length === 0) {
        toast.info('No records found for this period');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const csvData = reportData.map(v => ({
      'Date': v.csvDate,
      'Client Name': v.clientName,
      'Supplements': v.supplements.join(', '),
      'Payment (KES)': v.payment,
      'Notes': v.notes || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `herbal_clinic_report_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV');
  };

  const totalRevenue = reportData.reduce((sum, v) => sum + (v.payment || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 leading-tight">Financial & Visit Reports</h1>
          <p className="text-zinc-500 text-sm">Analyze your clinic performance and export data for your records.</p>
        </div>
        {reportData.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-100 font-bold"
          >
            <Download className="w-4 h-4" />
            <span>Export to CSV</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2 uppercase text-xs tracking-wider text-zinc-400">
           <Filter className="w-4 h-4" />
           Filter Period
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-tight">Start Date</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-zinc-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-tight">End Date</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-zinc-700"
              />
            </div>
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="md:col-span-1 h-[46px] flex items-center justify-center gap-2 bg-primary text-white rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : <><Search className="w-4 h-4" /> Generate Report</>}
          </button>
          
          <div className="flex gap-2">
             <button onClick={() => { setStartDate(format(subMonths(new Date(), 1), 'yyyy-MM-dd')); generateReport(); }} className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-xs font-bold transition-colors">Last Month</button>
             <button onClick={() => { setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd')); generateReport(); }} className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-xs font-bold transition-colors">This Month</button>
          </div>
        </div>
      </div>

      {reportData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Revenue Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 flex items-center justify-between shadow-sm">
                <div>
                   <p className="text-sm font-bold text-emerald-700 uppercase tracking-widest mb-1">Total Revenue</p>
                   <p className="text-4xl font-black text-emerald-800">{formatKES(totalRevenue)}</p>
                </div>
                <div className="bg-emerald-100 p-4 rounded-full">
                    <TrendingUp className="w-8 h-8 text-emerald-700" />
                </div>
             </div>

             <div className="bg-primary border border-emerald-800 rounded-2xl p-8 flex items-center justify-between text-white shadow-xl shadow-emerald-100">
                <div>
                   <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest mb-1">Total Consultations</p>
                   <p className="text-4xl font-black">{reportData.length}</p>
                </div>
                <div className="bg-emerald-800/30 p-4 rounded-full">
                    <Activity className="w-8 h-8" />
                </div>
             </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-bottom border-zinc-100 bg-zinc-50 flex items-center gap-2">
               <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
               <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">Detailed Visit Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-zinc-100">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Supplements</th>
                    <th className="px-6 py-4 text-right">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {reportData.map((visit) => (
                    <tr key={visit.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-zinc-500 whitespace-nowrap">{visit.formattedDate}</td>
                      <td className="px-6 py-4 font-bold text-zinc-900">{visit.clientName}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {visit.supplements.map((s: string) => (
                            <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded uppercase border border-emerald-100">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-emerald-700">{formatKES(visit.payment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {!loading && reportData.length === 0 && (
        <div className="py-20 text-center flex flex-col items-center gap-4 bg-white border border-zinc-200 border-dashed rounded-2xl">
           <FileSpreadsheet className="w-16 h-16 text-zinc-100" />
           <p className="text-zinc-500 font-medium">Select a date range and click generate to see reports.</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
