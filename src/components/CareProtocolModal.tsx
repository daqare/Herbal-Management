import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, Share2, Copy, Check, X, Leaf, Calendar, Phone, HeartPulse } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Client, Visit } from '../types';

interface CareProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  visit: Visit;
  practitionerName?: string;
}

export const CareProtocolModal: React.FC<CareProtocolModalProps> = ({
  isOpen,
  onClose,
  client,
  visit,
  practitionerName = 'Consulting Herbalist'
}) => {
  const [copied, setCopied] = useState(false);
  const [protocolNotes, setProtocolNotes] = useState(
    visit.protocol || 'Take prescribed formulations as directed. Drink plenty of warm water throughout the day. Avoid heavy, oily foods during the active treatment phase.'
  );

  const visitDate = visit.date?.toDate ? visit.date.toDate() : new Date();
  const formattedDate = format(visitDate, 'PPP');

  // Format WhatsApp message
  const generateWhatsAppMessage = () => {
    const text = `🌿 *HERBAL CLINIC CARE PROTOCOL*
Client: *${client.name}*
Date: ${formattedDate}
Consultant: ${practitionerName}

📋 *PRESCRIBED REMEDIES:*
${visit.supplements.map((s, idx) => `  ${idx + 1}. *${s}*`).join('\n')}

📝 *DOSAGE & ADMINISTRATION:*
${protocolNotes}

⚠️ *ADVICE & PRECAUTIONS:*
${client.allergies && client.allergies.length > 0 ? `• Note recorded allergies: ${client.allergies.join(', ')}\n` : ''}• Store herbs in a cool, dry place away from direct sunlight.
• Contact the clinic if any unusual symptoms develop.

📞 For refills or questions, reply directly to this number.`;

    return text;
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(generateWhatsAppMessage());
    const url = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(url, '_blank');
  };

  const handleShareSMS = () => {
    const message = encodeURIComponent(generateWhatsAppMessage());
    window.open(`sms:${client.phone}?body=${message}`, '_blank');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateWhatsAppMessage());
      setCopied(true);
      toast.success('Care plan copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm print:hidden"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 my-6 z-10 print:p-0 print:m-0 print:shadow-none print:w-full print:max-w-none"
        >
          {/* Action Bar (Hidden when printing) */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-200 print:hidden flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-primary">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Take-Home Care Protocol</h3>
                <p className="text-xs text-zinc-500">Printable client care sheet & instructions</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl transition-colors shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Protocol</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-2xs"
                title="Send via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 transition-colors border border-zinc-200"
                title="Copy Text"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Prescription & Care Plan Sheet */}
          <div className="print-care-sheet bg-white border border-zinc-200 p-6 rounded-2xl print:border-none print:p-0">
            {/* Clinic Header */}
            <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-800 flex items-center justify-center text-white">
                  <Leaf className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-emerald-950 uppercase">Herbal Wellness Clinic</h1>
                  <p className="text-xs text-zinc-600">Integrative Herbalism & Botanical Practice</p>
                  <p className="text-[11px] text-zinc-400">Nairobi, Kenya • Practice Ref: #HW-{client.id.slice(0, 6).toUpperCase()}</p>
                </div>
              </div>
              <div className="text-right text-xs text-zinc-600">
                <p className="font-semibold text-zinc-900">Official Care Protocol</p>
                <p>{formattedDate}</p>
              </div>
            </div>

            {/* Client Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-zinc-50 rounded-xl mb-6 text-xs text-zinc-700 border border-zinc-200/70">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Client Name</span>
                <span className="font-bold text-zinc-900 text-sm">{client.name}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Phone / Contact</span>
                <span className="font-mono">{client.phone}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Consultant</span>
                <span>{practitionerName}</span>
              </div>
              {client.cautions && client.cautions.length > 0 && (
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-zinc-200/50">
                  <span className="text-red-700 font-bold text-[10px] uppercase">Precaution Flags: </span>
                  <span className="text-red-800 font-medium">{client.cautions.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Prescribed Formulations */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2.5 flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5 text-emerald-700" />
                Prescribed Botanical Remedies & Supplements
              </h4>
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100/80 text-zinc-700 border-b border-zinc-200 text-[11px] uppercase">
                    <tr>
                      <th className="py-2 px-3 font-semibold w-10">#</th>
                      <th className="py-2 px-3 font-semibold">Herbal Remedy / Formulation</th>
                      <th className="py-2 px-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {visit.supplements.length > 0 ? (
                      visit.supplements.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50">
                          <td className="py-2.5 px-3 font-mono text-zinc-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-zinc-900">{item}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active Regimen
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-3 px-3 text-center text-zinc-400 italic">
                          No supplements prescribed on this visit.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Administration & Dosage Protocol */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
                Administration & Preparation Instructions
              </h4>
              <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl text-xs text-zinc-800 leading-relaxed print:bg-white print:border-zinc-300">
                <textarea
                  value={protocolNotes}
                  onChange={e => setProtocolNotes(e.target.value)}
                  rows={4}
                  className="w-full bg-transparent border-none focus:outline-none resize-none font-sans text-xs leading-relaxed text-zinc-900 print:hidden"
                  placeholder="Enter detailed dosage schedule, preparation instructions (decoction, infusion, tinctures), and dietary guidelines..."
                />
                <div className="hidden print:block whitespace-pre-line font-sans text-xs">
                  {protocolNotes}
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 italic print:hidden">
                Tip: You can edit the dosage text above before printing or sending via WhatsApp.
              </p>
            </div>

            {/* General Advice & Signoff */}
            <div className="border-t border-zinc-200 pt-4 grid grid-cols-2 gap-4 text-[11px] text-zinc-500">
              <div>
                <p className="font-semibold text-zinc-700 mb-1">Standard Storage Instructions</p>
                <p>Keep tinctures and dried botanicals sealed tightly away from direct sunlight, heat, and moisture.</p>
              </div>
              <div className="text-right flex flex-col justify-end">
                <div className="h-8 border-b border-zinc-300 w-36 ml-auto mb-1" />
                <p className="text-zinc-600 font-semibold">{practitionerName}</p>
                <p className="text-[10px] text-zinc-400">Authorized Signature</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
