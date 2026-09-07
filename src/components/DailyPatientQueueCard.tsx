import React, { useState } from 'react';
import { 
  Calendar, Clock, CheckCircle2, XCircle, AlertCircle, 
  Stethoscope, MessageSquare, ArrowRight, UserPlus, Sparkles 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, isToday, isSameDay } from 'date-fns';
import { Appointment, Client } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface DailyPatientQueueCardProps {
  appointments: Appointment[];
  clients: Client[];
  loading: boolean;
  onUpdateStatus: (id: string, status: Appointment['status']) => Promise<void>;
  onOpenSoap: (client: Client, appointment?: Appointment) => void;
  onOpenWhatsApp: (client: Client) => void;
  onOpenWalkIn: () => void;
}

export const DailyPatientQueueCard: React.FC<DailyPatientQueueCardProps> = ({
  appointments,
  clients,
  loading,
  onUpdateStatus,
  onOpenSoap,
  onOpenWhatsApp,
  onOpenWalkIn,
}) => {
  const [viewMode, setViewMode] = useState<'today' | 'upcoming'>('today');

  const clientMap = new Map<string, Client>(clients.map(c => [c.id, c]));

  // Today's appointments
  const todayApps = appointments.filter(app => {
    if (!app.date) return false;
    const d = app.date?.toDate ? app.date.toDate() : new Date(app.date);
    return isToday(d);
  });

  // Upcoming appointments
  const upcomingApps = appointments.filter(app => {
    if (!app.date) return false;
    const d = app.date?.toDate ? app.date.toDate() : new Date(app.date);
    return !isToday(d) && d > new Date() && app.status === 'scheduled';
  });

  const displayedApps = viewMode === 'today' ? todayApps : upcomingApps;

  const handleQuickStatusChange = async (app: Appointment, newStatus: Appointment['status']) => {
    try {
      await onUpdateStatus(app.id, newStatus);
      toast.success(`Consultation status updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const todayCompletedCount = todayApps.filter(a => a.status === 'completed').length;
  const todayScheduledCount = todayApps.filter(a => a.status === 'scheduled').length;

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-800">
              <Calendar className="w-4 h-4 text-primary" />
            </span>
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">Clinical Day Sheet & Patient Queue</h2>
          </div>
          <p className="text-xs text-zinc-500">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} •{' '}
            <span className="font-semibold text-emerald-800">{todayScheduledCount} Pending</span> /{' '}
            <span className="font-semibold text-zinc-700">{todayCompletedCount} Completed</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-zinc-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('today')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                viewMode === 'today'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800'
              )}
            >
              Today ({todayApps.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('upcoming')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                viewMode === 'upcoming'
                  ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800'
              )}
            >
              Upcoming ({upcomingApps.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenWalkIn}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-emerald-800 rounded-xl transition-colors shadow-2xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Walk-In Triage</span>
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="space-y-2 py-4">
            <div className="h-16 bg-zinc-50 rounded-2xl animate-pulse" />
            <div className="h-16 bg-zinc-50 rounded-2xl animate-pulse" />
          </div>
        ) : displayedApps.length === 0 ? (
          <div className="bg-zinc-50 rounded-2xl p-8 text-center border border-dashed border-zinc-200">
            <Clock className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-zinc-700 mb-1">
              {viewMode === 'today' ? 'No appointments scheduled for today' : 'No upcoming consultations scheduled'}
            </p>
            <p className="text-[11px] text-zinc-400 mb-4">
              Have an unscheduled client or herbal refill walk in? Log them straight into the queue.
            </p>
            <button
              type="button"
              onClick={onOpenWalkIn}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary hover:bg-emerald-800 rounded-xl transition-colors shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Log Walk-In Patient</span>
            </button>
          </div>
        ) : (
          displayedApps.map(app => {
            const dateObj = app.date?.toDate ? app.date.toDate() : new Date(app.date);
            const client: Client = clientMap.get(app.clientId) || {
              id: app.clientId,
              name: app.clientName,
              phone: '',
              sex: 'Other',
              userId: app.userId,
              createdAt: new Date(),
              cautions: [],
              allergies: [],
              tags: []
            };

            const isScheduled = app.status === 'scheduled';
            const isCompleted = app.status === 'completed';
            const isCancelled = app.status === 'cancelled';

            return (
              <div
                key={app.id}
                className={cn(
                  'p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3',
                  isCompleted
                    ? 'bg-zinc-50/70 border-zinc-200/70 opacity-80'
                    : isCancelled
                    ? 'bg-zinc-50/50 border-zinc-200/50 opacity-60'
                    : 'bg-white border-zinc-200 hover:border-emerald-200/80 shadow-2xs'
                )}
              >
                {/* Client Info & Time */}
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0',
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : isCancelled
                        ? 'bg-zinc-200 text-zinc-600'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    )}
                  >
                    {format(dateObj, 'HH:mm')}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/clients/${app.clientId}`}
                        className="font-bold text-xs text-zinc-900 hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {app.clientName}
                      </Link>
                      {client.cautions && client.cautions.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Caution
                        </span>
                      )}
                      {client.allergies && client.allergies.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200/80">
                          Allergy
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5 flex-wrap">
                      <span>{client.phone || 'No phone'}</span>
                      {app.notes && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-600 italic line-clamp-1">{app.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Switcher & Action Buttons */}
                <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                  {/* Status Dropdown / Button */}
                  <select
                    value={app.status}
                    onChange={e => handleQuickStatusChange(app, e.target.value as any)}
                    className={cn(
                      'text-xs font-bold px-2.5 py-1.5 rounded-xl border appearance-none cursor-pointer pr-6 bg-no-repeat bg-[right_8px_center] focus:outline-none transition-colors',
                      isScheduled && 'bg-blue-50 text-blue-800 border-blue-200',
                      isCompleted && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      isCancelled && 'bg-zinc-100 text-zinc-600 border-zinc-200'
                    )}
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundSize: '12px'
                    }}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  {/* Direct Launch SOAP Consultation Button */}
                  <button
                    type="button"
                    onClick={() => onOpenSoap(client, app)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-primary hover:bg-emerald-800 rounded-xl transition-colors shadow-2xs"
                    title="Launch SOAP Clinical Charting"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>SOAP</span>
                  </button>

                  {/* WhatsApp Quick Ping Button */}
                  {client.phone && (
                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp(client)}
                      className="p-2 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
                      title="Send WhatsApp or SMS reminder"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    </button>
                  )}

                  {/* View Chart Link */}
                  <Link
                    to={`/clients/${app.clientId}`}
                    className="p-2 text-zinc-400 hover:text-primary hover:bg-zinc-100 rounded-xl transition-colors"
                    title="Open full client chart"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
