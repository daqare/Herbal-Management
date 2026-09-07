import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, AlertTriangle, Columns, FileText, Sparkles, 
  Leaf, Activity, History, Plus, Trash2, HeartPulse, Stethoscope 
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Client, Visit, Metric } from '../types';
import { checkHerbInteractions } from './ClientCautions';

interface SoapConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  visits?: Visit[];
  recentVisits?: Visit[];
  metrics?: Metric[];
  availableSupplements: { id: string; name: string }[];
  editingVisit?: Visit | null;
  existingVisit?: Visit | null;
  onSaveVisit?: (data: {
    date: Date;
    supplements: string[];
    payment: number;
    notes?: string;
    protocol?: string;
  }) => Promise<void>;
  onSave?: (data: {
    date: Date;
    supplements: string[];
    payment: number;
    notes?: string;
    protocol?: string;
  }) => Promise<void>;
  onIncrementUsage?: (name: string) => Promise<void>;
}

const COMMON_SNIPPETS = {
  tongue: [
    'Tongue: Normal pink, thin white coat',
    'Tongue: Pale, swollen with scallop/teeth marks (Qi/Spleen dampness)',
    'Tongue: Red tip & edges, dry yellow coat (Heat)',
    'Tongue: Dusky/purple undertones with sublingual stasis'
  ],
  pulse: [
    'Pulse: Moderate, balanced rhythm (68 bpm)',
    'Pulse: Deep, thready, weak (Deficiency)',
    'Pulse: Wiry, tense (Liver Qi stagnation/stress)',
    'Pulse: Slippery, rapid (Damp-Heat)'
  ],
  instructions: [
    '5ml tincture in 100ml warm water, twice daily after meals.',
    'Decoction: Simmer 1 tbsp in 500ml water for 15 minutes. Strain and drink throughout day.',
    'Take 2 capsules morning and evening with food.',
    'Herbal tea infusion: Steep 1 tsp in boiled water for 10 minutes covered.'
  ]
};

export const SoapConsultationModal: React.FC<SoapConsultationModalProps> = ({
  isOpen,
  onClose,
  client,
  visits,
  recentVisits,
  metrics = [],
  availableSupplements,
  editingVisit,
  existingVisit,
  onSaveVisit,
  onSave,
  onIncrementUsage
}) => {
  const currentVisit = editingVisit || existingVisit || null;
  const historyVisits = visits || recentVisits || [];
  const handleSave = onSaveVisit || onSave;

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payment, setPayment] = useState<number>(0);
  const [suppInput, setSuppInput] = useState('');
  const [selectedSupps, setSelectedSupps] = useState<string[]>([]);
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [activeSoapTab, setActiveSoapTab] = useState<'all' | 'S' | 'O' | 'A' | 'P'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SOAP fields
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [protocol, setProtocol] = useState('');

  // Populate form if editing
  useEffect(() => {
    if (currentVisit) {
      const d = currentVisit.date?.toDate ? currentVisit.date.toDate() : new Date(currentVisit.date);
      setDate(d.toISOString().split('T')[0]);
      setPayment(currentVisit.payment || 0);
      setSelectedSupps(currentVisit.supplements || []);
      setProtocol(currentVisit.protocol || '');

      // Parse SOAP notes if formatted, or put into subjective
      const rawNotes = currentVisit.notes || '';
      if (rawNotes.includes('[S]') || rawNotes.includes('[O]') || rawNotes.includes('[A]') || rawNotes.includes('[P]')) {
        const sMatch = rawNotes.match(/\[S\]\s*([\s\S]*?)(?=\n\[[OAP]\]|$)/);
        const oMatch = rawNotes.match(/\[O\]\s*([\s\S]*?)(?=\n\[[SAP]\]|$)/);
        const aMatch = rawNotes.match(/\[A\]\s*([\s\S]*?)(?=\n\[[SOP]\]|$)/);
        const pMatch = rawNotes.match(/\[P\]\s*([\s\S]*?)(?=\n\[[SOA]\]|$)/);
        setSubjective(sMatch ? sMatch[1].trim() : '');
        setObjective(oMatch ? oMatch[1].trim() : '');
        setAssessment(aMatch ? aMatch[1].trim() : '');
        setPlan(pMatch ? pMatch[1].trim() : '');
      } else {
        setSubjective(rawNotes);
        setObjective('');
        setAssessment('');
        setPlan('');
      }
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setPayment(0);
      setSelectedSupps([]);
      setSubjective('');
      setObjective('');
      setAssessment('');
      setPlan('');
      setProtocol('5ml twice daily in warm water after meals.');
    }
  }, [currentVisit, isOpen]);

  // Herb safety interaction check
  const safetyAlerts = checkHerbInteractions(selectedSupps, client.cautions || [], client.allergies || []);

  const handleAddSupplement = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !selectedSupps.includes(trimmed)) {
      setSelectedSupps([...selectedSupps, trimmed]);
      setSuppInput('');
    }
  };

  const handleRemoveSupplement = (name: string) => {
    setSelectedSupps(selectedSupps.filter(s => s !== name));
  };

  const insertSnippet = (snippet: string, target: 'O' | 'P' | 'protocol') => {
    if (target === 'O') {
      setObjective(prev => (prev ? `${prev}\n• ${snippet}` : `• ${snippet}`));
    } else if (target === 'P') {
      setPlan(prev => (prev ? `${prev}\n• ${snippet}` : `• ${snippet}`));
    } else if (target === 'protocol') {
      setProtocol(prev => (prev ? `${prev}\n${snippet}` : snippet));
    }
    toast.info('Snippet added to notes');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSupps.length === 0) {
      toast.error('Please add at least one herbal supplement or remedy');
      return;
    }

    // Build consolidated SOAP note
    const consolidatedNotes = [
      subjective.trim() ? `[S] ${subjective.trim()}` : '',
      objective.trim() ? `[O] ${objective.trim()}` : '',
      assessment.trim() ? `[A] ${assessment.trim()}` : '',
      plan.trim() ? `[P] ${plan.trim()}` : ''
    ]
      .filter(Boolean)
      .join('\n\n');

    setIsSubmitting(true);
    try {
      if (handleSave) {
        await handleSave({
          date: new Date(date),
          supplements: selectedSupps,
          payment: Number(payment) || 0,
          notes: consolidatedNotes,
          protocol: protocol.trim()
        });
      }

      // Increment supplement usage counts if handler provided
      if (onIncrementUsage) {
        for (const s of selectedSupps) {
          await onIncrementUsage(s);
        }
      }

      toast.success(currentVisit ? 'Consultation updated' : 'SOAP consultation saved');
      onClose();
    } catch {
      toast.error('Failed to save consultation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
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
          className={`relative w-full ${
            isSplitScreen ? 'max-w-6xl' : 'max-w-3xl'
          } bg-white rounded-3xl shadow-2xl p-5 sm:p-7 overflow-hidden my-4 z-10 max-h-[92vh] flex flex-col transition-all duration-300`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  {currentVisit ? 'Edit Consultation & SOAP Note' : 'SOAP Consultation & Prescribing'}
                </h2>
                <p className="text-xs text-zinc-500">
                  Client: <span className="font-semibold text-zinc-800">{client.name}</span> ({client.phone})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSplitScreen(!isSplitScreen)}
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  isSplitScreen
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
                title="Toggle split-screen history view"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>{isSplitScreen ? 'Single View' : 'Split-Screen History'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Safety Alerts Banner if detected */}
          {safetyAlerts.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl shrink-0">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-red-900">Herbal Interaction & Safety Warning</p>
                  {safetyAlerts.map((alert, idx) => (
                    <p key={idx} className="text-xs text-red-800">
                      • <span className="font-semibold">{alert.herb.toUpperCase()}</span>: {alert.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Body: Split View or Standard */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className={`grid ${isSplitScreen ? 'grid-cols-1 md:grid-cols-2 gap-6' : 'grid-cols-1'}`}>
              {/* Left Pane (Split Screen): Previous Consultations & Vitals */}
              {isSplitScreen && (
                <div className="space-y-4 border-r border-zinc-100 pr-4 hidden md:block">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-primary" />
                      Patient Clinical History & Vitals
                    </h3>
                    <span className="text-[11px] text-zinc-400">{visits.length} past visits</span>
                  </div>

                  {/* Vitals Summary */}
                  {metrics.length > 0 && (
                    <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200/80">
                      <p className="text-[11px] font-bold text-zinc-700 uppercase mb-2 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-600" /> Recent Vitals
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {metrics.slice(0, 4).map(m => (
                          <div key={m.id} className="bg-white p-2 rounded-xl border border-zinc-100">
                            <span className="text-[10px] text-zinc-400 block">{m.type}</span>
                            <span className="font-bold text-zinc-800">{m.value} {m.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past Visits Feed */}
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {historyVisits.map(v => {
                      const vDate = v.date?.toDate ? v.date.toDate() : new Date(v.date);
                      return (
                        <div key={v.id} className="p-3 bg-white border border-zinc-200 rounded-2xl shadow-2xs space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-900">{format(vDate, 'PPP')}</span>
                            <span className="text-emerald-700 font-mono font-semibold">KES {v.payment.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {v.supplements.map(s => (
                              <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-100">
                                {s}
                              </span>
                            ))}
                          </div>
                          {v.notes && (
                            <p className="text-[11px] text-zinc-600 bg-zinc-50 p-2 rounded-xl whitespace-pre-line line-clamp-3">
                              {v.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Right Pane / Main Consultation Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Date & Payment Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                      Consultation Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                      Payment Received (KES)
                    </label>
                    <input
                      type="number"
                      value={payment}
                      onChange={e => setPayment(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      min={0}
                    />
                  </div>
                </div>

                {/* Supplement Prescribing & Quick Add */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                    Prescribed Herbal Remedies & Supplements *
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Type herb/formula name (e.g., Ashwagandha, Moringa, Triphala)..."
                      value={suppInput}
                      onChange={e => setSuppInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSupplement(suppInput);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSupplement(suppInput)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Herb</span>
                    </button>
                  </div>

                  {/* Quick-Pick Master Herbs */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase">Quick Pick:</span>
                    {availableSupplements.slice(0, 8).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleAddSupplement(s.name)}
                        className="px-2 py-0.5 rounded-lg text-[11px] bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                      >
                        + {s.name}
                      </button>
                    ))}
                  </div>

                  {/* Selected Supplements Tags */}
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-zinc-50 rounded-2xl border border-zinc-200 min-h-[46px] items-center">
                    {selectedSupps.length > 0 ? (
                      selectedSupps.map(s => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200"
                        >
                          <Leaf className="w-3 h-3 text-emerald-700" />
                          {s}
                          <button
                            type="button"
                            onClick={() => handleRemoveSupplement(s)}
                            className="hover:text-red-700 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-400 italic">No remedies added to this prescription yet</span>
                    )}
                  </div>
                </div>

                {/* Administration Protocol */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                      Dosage & Administration Protocol
                    </label>
                    <div className="flex items-center gap-1">
                      {COMMON_SNIPPETS.instructions.slice(0, 2).map((snip, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => insertSnippet(snip, 'protocol')}
                          className="text-[10px] text-primary hover:underline"
                        >
                          + Snippet {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={protocol}
                    onChange={e => setProtocol(e.target.value)}
                    placeholder="e.g. 5ml twice daily in warm water after meals"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-sans"
                  />
                </div>

                {/* Structured SOAP Framework */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Structured SOAP Clinical Charting
                    </label>
                    <div className="flex items-center gap-1 text-xs">
                      {(['all', 'S', 'O', 'A', 'P'] as const).map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveSoapTab(tab)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors ${
                            activeSoapTab === tab
                              ? 'bg-zinc-900 text-white'
                              : 'text-zinc-500 hover:bg-zinc-100'
                          }`}
                        >
                          {tab.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* S - Subjective */}
                  {(activeSoapTab === 'all' || activeSoapTab === 'S') && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">
                          [S] Subjective — Symptoms, Energy, Sleep & Client Description
                        </span>
                      </div>
                      <textarea
                        value={subjective}
                        onChange={e => setSubjective(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="Client reports fatigue, bloating after dinner for 2 weeks. Sleep interrupted at 3am..."
                      />
                    </div>
                  )}

                  {/* O - Objective */}
                  {(activeSoapTab === 'all' || activeSoapTab === 'O') && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-xs font-bold text-emerald-900">
                          [O] Objective — Vitals, Tongue & Pulse Diagnosis
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-400">Quick Insert:</span>
                          <button
                            type="button"
                            onClick={() => insertSnippet(COMMON_SNIPPETS.tongue[1], 'O')}
                            className="text-[10px] text-primary hover:underline"
                          >
                            + Pale Tongue
                          </button>
                          <button
                            type="button"
                            onClick={() => insertSnippet(COMMON_SNIPPETS.pulse[2], 'O')}
                            className="text-[10px] text-primary hover:underline"
                          >
                            + Wiry Pulse
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={objective}
                        onChange={e => setObjective(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="BP: 122/78. Pulse: 72 wiry. Tongue: Pale with scalloped edges and light greasy coating..."
                      />
                    </div>
                  )}

                  {/* A - Assessment */}
                  {(activeSoapTab === 'all' || activeSoapTab === 'A') && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-emerald-900">
                        [A] Assessment — Herbal Pattern & Constitutional Evaluation
                      </span>
                      <textarea
                        value={assessment}
                        onChange={e => setAssessment(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="Spleen Qi deficiency with secondary Liver Qi stagnation and damp accumulation. Improving compared to initial visit..."
                      />
                    </div>
                  )}

                  {/* P - Plan */}
                  {(activeSoapTab === 'all' || activeSoapTab === 'P') && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">
                          [P] Plan — Protocol, Dietary Adjustments & Follow-up Timeline
                        </span>
                      </div>
                      <textarea
                        value={plan}
                        onChange={e => setPlan(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="Initiate warming adaptogenic formula. Avoid raw/cold dairy. Follow up in 3 weeks for reassessment..."
                      />
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 text-xs font-medium text-white bg-primary hover:bg-emerald-800 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : (
                      <>
                        <Check className="w-4 h-4" />
                        {editingVisit ? 'Update Consultation' : 'Save Consultation Note'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
