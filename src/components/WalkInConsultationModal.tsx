import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Calendar, Clock, Stethoscope, Search, CheckCircle2 } from 'lucide-react';
import { Client } from '../types';
import { toast } from 'sonner';

interface WalkInConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onAddClient: (data: { name: string; phone: string; sex: 'Male' | 'Female' | 'Other' }) => Promise<string | void>;
  onScheduleAppointment: (data: { clientId: string; clientName: string; date: Date; notes?: string }) => Promise<void>;
  onStartDirectSoap: (client: Client) => void;
}

export const WalkInConsultationModal: React.FC<WalkInConsultationModalProps> = ({
  isOpen,
  onClose,
  clients,
  onAddClient,
  onScheduleAppointment,
  onStartDirectSoap,
}) => {
  const [tab, setTab] = useState<'existing' | 'new'>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // New Client Fields
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+254 ');
  const [newSex, setNewSex] = useState<'Male' | 'Female' | 'Other'>('Female');

  // Appointment details
  const [time, setTime] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(Math.ceil(now.getMinutes() / 15) * 15 % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  const [notes, setNotes] = useState('Walk-in triage / consultation');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleSubmitQueue = async (actionType: 'queue' | 'soap') => {
    setIsSubmitting(true);
    try {
      let targetClient: Client | null = selectedClient;

      if (tab === 'new') {
        if (!newName.trim()) {
          toast.error('Please enter client full name');
          setIsSubmitting(false);
          return;
        }
        // Create client first
        const newClientId = await onAddClient({
          name: newName.trim(),
          phone: newPhone.trim(),
          sex: newSex
        });

        targetClient = {
          id: typeof newClientId === 'string' ? newClientId : 'temp-id',
          name: newName.trim(),
          phone: newPhone.trim(),
          sex: newSex,
          userId: '',
          createdAt: new Date(),
        };
      }

      if (!targetClient) {
        toast.error('Please select or create a client');
        setIsSubmitting(false);
        return;
      }

      // Schedule appointment for today
      const today = new Date();
      const [hh, mm] = time.split(':').map(Number);
      today.setHours(hh || 10, mm || 0, 0, 0);

      await onScheduleAppointment({
        clientId: targetClient.id,
        clientName: targetClient.name,
        date: today,
        notes: notes.trim()
      });

      toast.success(`${targetClient.name} added to today's patient queue`);
      onClose();

      if (actionType === 'soap') {
        onStartDirectSoap(targetClient);
      }
    } catch {
      toast.error('Failed to log walk-in consultation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-7 z-10 max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900">Walk-In & Quick Triage</h2>
                <p className="text-xs text-zinc-500">Add an unscheduled client to today's clinical queue</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 p-1 bg-zinc-100 rounded-2xl mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTab('existing')}
              className={`flex-1 py-2 rounded-xl transition-all ${
                tab === 'existing'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Select Existing Client
            </button>
            <button
              type="button"
              onClick={() => setTab('new')}
              className={`flex-1 py-2 rounded-xl transition-all ${
                tab === 'new'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              + Register New Walk-In
            </button>
          </div>

          <div className="overflow-y-auto flex-1 pr-1 space-y-4">
            {tab === 'existing' ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search by client name or phone..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-2xl">
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-400">
                      No client found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredClients.slice(0, 10).map(c => {
                      const isSelected = selectedClient?.id === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedClient(c)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-zinc-50'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-zinc-900">{c.name}</p>
                            <p className="text-[11px] text-zinc-500">{c.phone} • {c.sex}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wanjiku Mwangi"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+254 700 000000"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Sex / Constitution
                    </label>
                    <select
                      value={newSex}
                      onChange={e => setNewSex(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Time & Consultation Reason */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  Time Today
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  Visit Purpose
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Herbal refill, Triage..."
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || (tab === 'existing' && !selectedClient)}
              onClick={() => handleSubmitQueue('queue')}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 rounded-xl transition-colors"
            >
              Add to Queue Only
            </button>
            <button
              type="button"
              disabled={isSubmitting || (tab === 'existing' && !selectedClient)}
              onClick={() => handleSubmitQueue('soap')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-primary hover:bg-emerald-800 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Start SOAP Note Now</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
