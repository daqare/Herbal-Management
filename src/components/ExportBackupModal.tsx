import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, FileSpreadsheet, FileCode, Check, X, Database, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Client, Visit, Metric } from '../types';

interface ExportBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  visits: Visit[];
  supplements?: { id: string; name: string; usageCount: number }[];
  metrics?: Metric[];
}

export const ExportBackupModal: React.FC<ExportBackupModalProps> = ({
  isOpen,
  onClose,
  clients,
  visits,
  supplements = [],
  metrics = []
}) => {
  const [downloading, setDownloading] = useState(false);

  // Helper to trigger file download
  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Complete Backup JSON
  const handleExportFullJSON = () => {
    setDownloading(true);
    try {
      const backup = {
        meta: {
          clinic: 'Herbal Wellness Clinic',
          exportedAt: new Date().toISOString(),
          version: '1.0'
        },
        clients,
        visits,
        supplements,
        metrics
      };
      const jsonStr = JSON.stringify(backup, null, 2);
      const filename = `herbal_clinic_full_backup_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;
      triggerDownload(jsonStr, filename, 'application/json');
      toast.success('Full clinic database archive exported successfully');
    } catch {
      toast.error('Failed to export backup');
    } finally {
      setDownloading(false);
    }
  };

  // Export Clients CSV
  const handleExportClientsCSV = () => {
    try {
      const headers = ['ID', 'Name', 'Sex', 'Phone', 'Tags', 'Allergies', 'Cautions', 'Emergency Contact', 'Created At'];
      const rows = clients.map(c => [
        c.id,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        c.sex,
        `"${c.phone}"`,
        `"${(c.tags || []).join('; ')}"`,
        `"${(c.allergies || []).join('; ')}"`,
        `"${(c.cautions || []).join('; ')}"`,
        `"${(c.emergencyContact || '').replace(/"/g, '""')}"`,
        c.createdAt?.toDate ? format(c.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : ''
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const filename = `clients_directory_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
      toast.success('Clients CSV exported successfully');
    } catch {
      toast.error('Failed to export clients CSV');
    }
  };

  // Export Visits CSV
  const handleExportVisitsCSV = () => {
    try {
      const clientMap = new Map<string, string>(clients.map(c => [c.id, c.name]));
      const headers = ['Visit ID', 'Client ID', 'Client Name', 'Date', 'Supplements Prescribed', 'Payment (KES)', 'Protocol', 'Notes'];
      const rows = visits.map(v => {
        const vDate = v.date?.toDate ? format(v.date.toDate(), 'yyyy-MM-dd') : '';
        const clientName = clientMap.get(v.clientId) || 'Unknown Client';
        return [
          v.id,
          v.clientId,
          `"${String(clientName).replace(/"/g, '""')}"`,
          vDate,
          `"${(v.supplements || []).join('; ')}"`,
          v.payment || 0,
          `"${(v.protocol || '').replace(/"/g, '""')}"`,
          `"${(v.notes || '').replace(/"/g, '""')}"`
        ];
      });

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const filename = `consultation_visits_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
      toast.success('Visits & Prescriptions CSV exported successfully');
    } catch {
      toast.error('Failed to export visits CSV');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Clinical Export & Backup</h3>
                <p className="text-xs text-zinc-500">Download practice records, charts, and prescriptions</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Database Stat Summary */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/70 text-center mb-5">
            <div>
              <span className="block text-[10px] uppercase font-bold text-zinc-400">Total Clients</span>
              <span className="text-base font-bold text-zinc-800">{clients.length}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-zinc-400">Consultations</span>
              <span className="text-base font-bold text-zinc-800">{visits.length}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-zinc-400">Remedies Logged</span>
              <span className="text-base font-bold text-zinc-800">{supplements.length}</span>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            {/* Complete JSON Backup */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 mt-0.5">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Full Practice Archive (JSON)</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Complete snapshot containing clients, consultations, SOAP notes, and metrics.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportFullJSON}
                disabled={downloading}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shrink-0 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>

            {/* Clients Directory CSV */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-zinc-200 text-zinc-700 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Client Directory (CSV)</h4>
                  <p className="text-xs text-zinc-500">
                    Names, phones, tags, allergies, and emergency contacts for Excel or Sheets.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportClientsCSV}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold shrink-0 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Visits & Prescriptions CSV */}
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-zinc-200 text-zinc-700 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Visits & Prescriptions (CSV)</h4>
                  <p className="text-xs text-zinc-500">
                    Chronological consultation visits, fees paid, remedies given, and protocols.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportVisitsCSV}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-xs font-semibold shrink-0 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Direct browser export (no third-party storage)
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-600 hover:text-zinc-900 font-medium"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
