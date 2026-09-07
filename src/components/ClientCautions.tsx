import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Plus, X, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client } from '../types';

interface ClientCautionsProps {
  client: Client;
  onUpdate: (data: Partial<Client>) => Promise<void>;
  editable?: boolean;
}

// Clinical Herbal Interaction & Contraindication Reference
export const HERBAL_CONTRAINDICATIONS: Record<string, { caution: string; herbs: string[]; warning: string }> = {
  hypertension: {
    caution: 'Hypertension / High BP',
    herbs: ['licorice', 'glycyrrhiza', 'ephedra', 'ginseng', 'yohimbe', 'rosemary'],
    warning: 'Can increase blood pressure or cause sodium retention.'
  },
  pregnancy: {
    caution: 'Pregnancy',
    herbs: ['motherwort', 'mugwort', 'pennyroyal', 'black cohosh', 'tansy', 'rue', 'wormwood', 'juniper'],
    warning: 'Emmenagogue / uterine stimulant properties. Highly contraindicated.'
  },
  blood_thinners: {
    caution: 'Blood Thinners / Anticoagulants',
    herbs: ['ginkgo', 'garlic', 'ginger', 'dong quai', 'feverfew', 'danshen', 'willow bark'],
    warning: 'Additive antiplatelet / anticoagulant effect; risk of increased bleeding.'
  },
  diabetes: {
    caution: 'Diabetes / Hypoglycemia',
    herbs: ['bitter melon', 'gymnema', 'fenugreek', 'cinnamon', 'berberine'],
    warning: 'Additive hypoglycemic effect; monitor blood glucose closely.'
  },
  renal: {
    caution: 'Renal / Kidney Impairment',
    herbs: ['uva ursi', 'horsetail', 'juniper', 'licorice'],
    warning: 'Potential nephrotoxicity or electrolyte imbalances.'
  },
  sedatives: {
    caution: 'Sedatives / SSRIs / Antidepressants',
    herbs: ["st. john's wort", 'kava', 'valerian', 'passionflower', '5-htp'],
    warning: 'Risk of serotonin syndrome or excessive central nervous system depression.'
  }
};

export const checkHerbInteractions = (
  herbs: string[],
  cautions: string[] = [],
  allergies: string[] = []
): { type: 'danger' | 'warning'; message: string; herb: string }[] => {
  const alerts: { type: 'danger' | 'warning'; message: string; herb: string }[] = [];
  const normalizedHerbs = herbs.map(h => h.toLowerCase().trim());
  const normalizedCautions = cautions.map(c => c.toLowerCase());
  const normalizedAllergies = allergies.map(a => a.toLowerCase());

  // Check allergy overlaps
  normalizedHerbs.forEach(herb => {
    normalizedAllergies.forEach(allergy => {
      if (allergy && (herb.includes(allergy) || allergy.includes(herb))) {
        alerts.push({
          type: 'danger',
          herb,
          message: `Allergy Conflict: Client has a documented allergy to "${allergy}"!`
        });
      }
    });
  });

  // Check contraindications
  normalizedHerbs.forEach(herb => {
    Object.values(HERBAL_CONTRAINDICATIONS).forEach(rule => {
      const hasCaution = normalizedCautions.some(c => c.includes(rule.caution.toLowerCase().split(' ')[0]) || rule.caution.toLowerCase().includes(c));
      if (hasCaution) {
        const matchesHerb = rule.herbs.some(h => herb.includes(h));
        if (matchesHerb) {
          alerts.push({
            type: 'warning',
            herb,
            message: `Caution [${rule.caution}]: ${rule.warning}`
          });
        }
      }
    });
  });

  return alerts;
};

const COMMON_ALLERGIES = ['Ragweed', 'Pollen', 'Nightshades', 'Shellfish', 'Penicillin', 'Sulfa', 'Gluten', 'Latex', 'Aspirin/Salicylates'];
const COMMON_CAUTIONS = ['Hypertension / High BP', 'Pregnancy', 'Lactation', 'Diabetes', 'Blood Thinners', 'Renal Impairment', 'Hepatic Impairment', 'Autoimmune Condition', 'Heart Condition'];

export const ClientCautions: React.FC<ClientCautionsProps> = ({ client, onUpdate, editable = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempAllergies, setTempAllergies] = useState<string[]>(client.allergies || []);
  const [tempCautions, setTempCautions] = useState<string[]>(client.cautions || []);
  const [tempEmergency, setTempEmergency] = useState(client.emergencyContact || '');
  const [newAllergyInput, setNewAllergyInput] = useState('');
  const [newCautionInput, setNewCautionInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const allergies = client.allergies || [];
  const cautions = client.cautions || [];
  const hasFlags = allergies.length > 0 || cautions.length > 0 || !!client.emergencyContact;

  const handleOpen = () => {
    setTempAllergies(client.allergies || []);
    setTempCautions(client.cautions || []);
    setTempEmergency(client.emergencyContact || '');
    setIsOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        allergies: tempAllergies,
        cautions: tempCautions,
        emergencyContact: tempEmergency.trim()
      });
      setIsOpen(false);
    } catch {
      // Error handled by parent toast
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTempItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addCustomItem = (
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput('');
    }
  };

  return (
    <>
      <div className="w-full">
        {hasFlags ? (
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Clinical Flags & Safety Alerts
                  </span>
                  {cautions.map(c => (
                    <span key={c} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      {c}
                    </span>
                  ))}
                  {allergies.map(a => (
                    <span key={a} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                      Allergy: {a}
                    </span>
                  ))}
                </div>

                {client.emergencyContact && (
                  <p className="text-xs text-amber-900/80">
                    <span className="font-semibold">Emergency Contact:</span> {client.emergencyContact}
                  </p>
                )}
              </div>
            </div>

            {editable && (
              <button
                type="button"
                id="btn-edit-cautions"
                onClick={handleOpen}
                className="self-start sm:self-center px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors shrink-0 shadow-2xs"
              >
                Manage Cautions
              </button>
            )}
          </div>
        ) : (
          editable && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-zinc-500 text-xs">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-zinc-400" />
                <span>No clinical cautions, allergies, or contraindications recorded yet.</span>
              </div>
              <button
                type="button"
                onClick={handleOpen}
                className="px-2.5 py-1 text-xs font-medium text-primary hover:text-emerald-800 bg-white border border-zinc-200 rounded-lg hover:border-primary transition-colors"
              >
                + Add Safety Flags
              </button>
            </div>
          )
        )}
      </div>

      {/* Edit Cautions & Allergies Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900">Clinical Safety & Cautions</h3>
                    <p className="text-xs text-zinc-500">Flags contraindications and cross-allergies for {client.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Cautions Section */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
                    Health Precautions & Conditions
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {COMMON_CAUTIONS.map(c => {
                      const isSelected = tempCautions.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleTempItem(tempCautions, setTempCautions, c)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {c}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add custom precaution (e.g., Gallstones)..."
                      value={newCautionInput}
                      onChange={e => setNewCautionInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomItem(newCautionInput, setNewCautionInput, tempCautions, setTempCautions);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomItem(newCautionInput, setNewCautionInput, tempCautions, setTempCautions)}
                      className="px-3 py-1.5 text-xs font-medium bg-zinc-800 text-white rounded-xl hover:bg-black"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Allergies Section */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
                    Known Allergies
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {COMMON_ALLERGIES.map(a => {
                      const isSelected = tempAllergies.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleTempItem(tempAllergies, setTempAllergies, a)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {a}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add custom allergy (e.g., Chamomile)..."
                      value={newAllergyInput}
                      onChange={e => setNewAllergyInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomItem(newAllergyInput, setNewAllergyInput, tempAllergies, setTempAllergies);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => addCustomItem(newAllergyInput, setNewAllergyInput, tempAllergies, setTempAllergies)}
                      className="px-3 py-1.5 text-xs font-medium bg-zinc-800 text-white rounded-xl hover:bg-black"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
                    Emergency Contact / Caregiver
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mary Odhiambo (Spouse) - +254712345678"
                    value={tempEmergency}
                    onChange={e => setTempEmergency(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2.5 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-save-cautions"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 text-xs font-medium text-white bg-primary hover:bg-emerald-800 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Safety Flags
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
