import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Check, X, Copy, Send, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Client } from '../types';

interface DigitalIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSaveIntake: (summary: string) => Promise<void>;
}

export const DigitalIntakeModal: React.FC<DigitalIntakeModalProps> = ({
  isOpen,
  onClose,
  client,
  onSaveIntake
}) => {
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [duration, setDuration] = useState('');
  const [currentMeds, setCurrentMeds] = useState('');
  const [digestion, setDigestion] = useState('Regular, no significant bloating');
  const [sleep, setSleep] = useState('6-7 hours, occasional difficulty falling asleep');
  const [stress, setStress] = useState('Moderate (work/family related)');
  const [diet, setDiet] = useState('Mixed diet, 1.5L water/day');
  const [existingSummary, setExistingSummary] = useState(client.intakeSummary || '');
  const [activeMode, setActiveMode] = useState<'form' | 'raw'>(client.intakeSummary ? 'raw' : 'form');
  const [isSaving, setIsSaving] = useState(false);

  const generateStructuredSummary = () => {
    return `📋 CLINICAL HEALTH INTAKE:
• Chief Complaint: ${chiefComplaint || 'Not specified'}
• Duration / Onset: ${duration || 'Recent'}
• Current Medications: ${currentMeds || 'None reported'}
• Digestion & Bowels: ${digestion}
• Sleep & Energy: ${sleep}
• Stress Level: ${stress}
• Diet & Hydration: ${diet}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const summaryToSave = activeMode === 'form' ? generateStructuredSummary() : existingSummary;
      await onSaveIntake(summaryToSave);
      toast.success('Intake assessment saved');
      onClose();
    } catch {
      toast.error('Failed to save intake');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendQuestionsWhatsApp = () => {
    const questions = `🌿 *Herbal Wellness Clinic - Pre-Consultation Intake*
Hello ${client.name},
Before your upcoming appointment, please briefly reply with:
1. What is your primary health goal or main symptom?
2. How long have you experienced this?
3. Are you currently taking any prescription medications or supplements?
4. How is your sleep, energy, and digestion?

This helps us prepare your tailored botanical formulations. Thank you!`;

    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(questions)}`;
    window.open(url, '_blank');
  };

  const handleCopySummary = async () => {
    try {
      const text = activeMode === 'form' ? generateStructuredSummary() : existingSummary;
      await navigator.clipboard.writeText(text);
      toast.success('Intake summary copied to clipboard');
    } catch {
      toast.error('Failed to copy');
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
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Pre-Consultation Intake</h3>
                <p className="text-xs text-zinc-500">Health history & lifestyle baseline for {client.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSendQuestionsWhatsApp}
                className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1 border border-emerald-200"
                title="Send intake questions to client via WhatsApp"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp Questions</span>
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

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 mb-4 bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveMode('form')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeMode === 'form' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Structured Questionnaire
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('raw');
                if (!existingSummary) setExistingSummary(generateStructuredSummary());
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeMode === 'raw' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Custom Intake Notes
            </button>
          </div>

          {activeMode === 'form' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Chief Health Complaint & Reason for Visit *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chronic joint stiffness, fatigue, digestive bloating..."
                  value={chiefComplaint}
                  onChange={e => setChiefComplaint(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                    Onset & Duration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 months, worsening recently"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                    Current Medications
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metformin 500mg, Multivitamin"
                    value={currentMeds}
                    onChange={e => setCurrentMeds(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Digestion & Bowel Movements
                </label>
                <input
                  type="text"
                  value={digestion}
                  onChange={e => setDigestion(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                    Sleep & Energy Patterns
                  </label>
                  <input
                    type="text"
                    value={sleep}
                    onChange={e => setSleep(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                    Stress & Emotional State
                  </label>
                  <input
                    type="text"
                    value={stress}
                    onChange={e => setStress(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Dietary Habits & Fluid Intake
                </label>
                <input
                  type="text"
                  value={diet}
                  onChange={e => setDiet(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
                Raw Clinical Intake Notes
              </label>
              <textarea
                value={existingSummary}
                onChange={e => setExistingSummary(e.target.value)}
                rows={10}
                className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Paste or write detailed intake interview notes here..."
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-6 border-t border-zinc-100 mt-6">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3.5 py-2.5 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Summary</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 text-xs font-medium text-white bg-primary hover:bg-emerald-800 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : (
                <>
                  <Check className="w-4 h-4" />
                  Save Intake
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
