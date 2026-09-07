import React, { useState } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { useClients } from '../hooks/useClients';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  X, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  User,
  Edit2,
  Trash2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay, isToday, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const appointmentSchema = z.object({
  clientId: z.string().min(1, 'Please select a client'),
  date: z.string(),
  time: z.string(),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

const Appointments: React.FC = () => {
  const { appointments, loading: appsLoading, addAppointment, updateStatus, updateAppointment, deleteAppointment } = useAppointments();
  const { clients } = useClients();
  const [isAdding, setIsAdding] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      time: '09:00'
    }
  });

  const onSubmit = async (data: AppointmentFormValues) => {
    try {
      const client = clients.find(c => c.id === data.clientId);
      if (!client) throw new Error('Client not found');

      // Combine date and time
      const [year, month, day] = data.date.split('-').map(Number);
      const [hours, minutes] = data.time.split(':').map(Number);
      const fullDate = new Date(year, month - 1, day, hours, minutes);

      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, {
          clientId: client.id,
          clientName: client.name,
          date: fullDate,
          notes: data.notes
        });
        toast.success('Appointment updated');
        setEditingAppointment(null);
      } else {
        await addAppointment({
          clientId: client.id,
          clientName: client.name,
          date: fullDate,
          status: 'scheduled',
          notes: data.notes
        });
        toast.success('Appointment scheduled');
        setIsAdding(false);
      }
      reset();
    } catch (error) {
      toast.error(editingAppointment ? 'Failed to update appointment' : 'Failed to schedule appointment');
    }
  };

  const startEdit = (app: any) => {
    setEditingAppointment(app);
    const dateObj = app.date.toDate();
    setValue('clientId', app.clientId);
    setValue('date', dateObj.toISOString().split('T')[0]);
    setValue('time', format(dateObj, 'HH:mm'));
    setValue('notes', app.notes || '');
  };

  const handleDelete = async () => {
    if (!deletingAppointment) return;
    try {
      await deleteAppointment(deletingAppointment.id);
      toast.success('Appointment deleted');
      setDeletingAppointment(null);
    } catch (error) {
      toast.error('Failed to delete appointment');
    }
  };

  const filteredApps = appointments.filter(a => isSameDay(a.date.toDate(), selectedDate));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Appointments</h1>
          <p className="text-zinc-500 text-sm">Schedule and manage your patient visits.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-800 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>New Appointment</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Date Selector / Calendar Simple */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
             <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Select Date</h3>
             <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5, 6].map(i => {
                  const d = addDays(new Date(), i);
                  const active = isSameDay(d, selectedDate);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(d)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                        active 
                          ? "bg-accent border-primary text-primary shadow-sm" 
                          : "bg-zinc-50 border-transparent hover:bg-zinc-100 text-zinc-600"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold opacity-70">
                          {isToday(d) ? 'Today' : format(d, 'EEEE')}
                        </span>
                        <span className="font-bold">{format(d, 'MMM d')}</span>
                      </div>
                      {active && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  );
                })}
             </div>
          </div>
        </div>

        {/* Appointments List for Selected Date */}
        <div className="lg:col-span-3 space-y-4">
           <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-lg font-bold text-zinc-900">
                   {format(selectedDate, 'PPPP')}
                 </h2>
                 <span className="px-2 py-1 bg-zinc-100 rounded text-xs font-bold text-zinc-500">
                    {filteredApps.length} session{filteredApps.length !== 1 ? 's' : ''}
                 </span>
              </div>

              <div className="space-y-4">
                {appsLoading ? (
                  <p className="text-center py-12 text-zinc-400">Loading appointments...</p>
                ) : filteredApps.length === 0 ? (
                  <div className="text-center py-20">
                     <Clock className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                     <p className="text-zinc-400 font-medium italic">No appointments for this day.</p>
                     <button onClick={() => setIsAdding(true)} className="text-primary text-sm font-bold hover:underline mt-2">Schedule one</button>
                  </div>
                ) : (
                  filteredApps.map((app) => (
                    <div key={app.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-primary/20 transition-all gap-4">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-primary border border-zinc-100 shadow-sm">
                             <Clock className="w-6 h-6" />
                          </div>
                          <div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-black text-zinc-900">{format(app.date.toDate(), 'p')}</span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] uppercase font-bold border",
                                  app.status === 'scheduled' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                  app.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                  "bg-zinc-100 text-zinc-500 border-zinc-200"
                                )}>
                                  {app.status}
                                </span>
                             </div>
                             <Link to={`/clients/${app.clientId}`} className="text-zinc-600 font-bold hover:text-primary transition-colors flex items-center gap-1">
                                {app.clientName}
                             </Link>
                          </div>
                       </div>

                       <div className="flex items-center gap-2">
                          <button 
                            onClick={() => startEdit(app)}
                            className="p-2 text-zinc-400 hover:text-primary hover:bg-emerald-50 rounded-lg transition-all"
                            title="Edit Appointment"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => setDeletingAppointment(app)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Appointment"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          {app.status === 'scheduled' && (
                             <>
                                <button 
                                  onClick={() => updateStatus(app.id, 'completed')}
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm"
                                  title="Mark as Completed"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => updateStatus(app.id, 'cancelled')}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                                  title="Cancel Appointment"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                             </>
                          )}
                          <Link to={`/clients/${app.clientId}`} className="p-2 bg-white border border-zinc-200 rounded-lg text-zinc-400 hover:text-primary transition-all">
                             <MoreVertical className="w-5 h-5" />
                          </Link>
                       </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      </div>

       {/* Add Appointment Modal */}
       <AnimatePresence>
        {(isAdding || editingAppointment) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setIsAdding(false);
                setEditingAppointment(null);
                reset();
              }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-zinc-900">
                  {editingAppointment ? 'Edit Appointment' : 'New Appointment'}
                </h2>
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingAppointment(null);
                    reset();
                  }}
                  className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Select Client</label>
                  <select
                    {...register('clientId')}
                    className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none bg-white font-medium"
                  >
                    <option value="">-- Choose a patient --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Date</label>
                    <input
                      {...register('date')}
                      type="date"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Time</label>
                    <input
                      {...register('time')}
                      type="time"
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Appointment Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                    placeholder="Reason for visit, symptoms recorded, etc."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingAppointment(null);
                      reset();
                    }}
                    className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-xl font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {isSubmitting ? (editingAppointment ? 'Updating...' : 'Scheduling...') : (editingAppointment ? 'Update' : 'Schedule')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setDeletingAppointment(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">Delete Appointment?</h3>
                <p className="text-sm text-zinc-500 mb-6">
                  Are you sure you want to delete this appointment for <span className="font-bold text-zinc-700">{deletingAppointment.clientName}</span>?
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setDeletingAppointment(null)}
                    className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Appointments;
