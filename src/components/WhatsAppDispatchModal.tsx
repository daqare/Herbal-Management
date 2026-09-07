import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Copy, Check, X, Calendar, Phone, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Client } from '../types';

interface WhatsAppDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  latestVisit?: any;
  nextAppointmentDate?: string;
}

export const WhatsAppDispatchModal: React.FC<WhatsAppDispatchModalProps> = ({
  isOpen,
  onClose,
  client,
  latestVisit,
  nextAppointmentDate
}) => {
  const [template, setTemplate] = useState<'refill' | 'appointment' | 'dosage' | 'custom'>('refill');
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);

  // Template builders
  const getMessageText = () => {
    switch (template) {
      case 'refill':
        return `🌿 *Herbal Clinic Check-in*

Habari ${client.name},
This is your health consultant from Herbal Wellness Clinic checking in on your health journey.

How are you progressing with your current herbal regimen${
          latestVisit?.supplements?.length ? ` (${latestVisit.supplements.slice(0, 2).join(', ')})` : ''
        }? If your supply is running low or you would like to adjust your formula, please reply to schedule your refill.

Wishing you vibrant health!`;

      case 'appointment':
        return `🌿 *Appointment Reminder - Herbal Clinic*

Dear ${client.name},
This is a friendly reminder of your upcoming herbal consultation${
          nextAppointmentDate ? ` scheduled for *${nextAppointmentDate}*` : ''
        }.

Please let us know if you need to reschedule or confirm. We look forward to seeing your progress!

Herbal Wellness Clinic`;

      case 'dosage':
        return `🌿 *Your Herbal Regimen Schedule*

Dear ${client.name},
Here is your recommended administration schedule:
${
  latestVisit?.supplements?.length
    ? latestVisit.supplements.map((s: string, i: number) => `• *${s}*: Take as directed with warm water`).join('\n')
    : '• Take your prescribed herbal formulations with warm water after meals.'
}

${latestVisit?.protocol ? `Instructions: ${latestVisit.protocol}\n` : ''}
Stay hydrated throughout the day. Reach out if you have any questions!`;

      case 'custom':
        return customText || `Hello ${client.name}, this is Herbal Wellness Clinic...`;
    }
  };

  const message = getMessageText();

  const handleOpenWhatsApp = () => {
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleSendSMS = () => {
    const encoded = encodeURIComponent(message);
    window.open(`sms:${client.phone}?body=${encoded}`, '_blank');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
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
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">WhatsApp & SMS Dispatcher</h3>
                <p className="text-xs text-zinc-500">Contact {client.name} ({client.phone})</p>
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

          {/* Template Selector */}
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
              Select Message Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplate('refill')}
                className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                  template === 'refill'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                🌿 Regimen & Refill Check-in
              </button>
              <button
                type="button"
                onClick={() => setTemplate('appointment')}
                className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                  template === 'appointment'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                📅 Appointment Reminder
              </button>
              <button
                type="button"
                onClick={() => setTemplate('dosage')}
                className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                  template === 'dosage'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                📋 Take-Home Dosage
              </button>
              <button
                type="button"
                onClick={() => {
                  setTemplate('custom');
                  if (!customText) setCustomText(`Hello ${client.name},\n\n`);
                }}
                className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                  template === 'custom'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                ✍️ Custom Message
              </button>
            </div>
          </div>

          {/* Message Preview or Editor */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Message Content
              </label>
              <span className="text-[11px] text-zinc-400">Ready to dispatch</span>
            </div>

            {template === 'custom' ? (
              <textarea
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                rows={6}
                className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Type your custom message here..."
              />
            ) : (
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs text-zinc-800 whitespace-pre-line font-sans max-h-48 overflow-y-auto leading-relaxed">
                {message}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs shadow-md shadow-emerald-200/50 flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Open in WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleSendSMS}
              className="px-4 py-3 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Send SMS</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="p-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 rounded-xl flex items-center justify-center transition-colors"
              title="Copy text"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
