import React, { useState, useMemo } from 'react';
import { useStats } from '../hooks/useStats';
import { useAppointments } from '../hooks/useAppointments';
import { useClients } from '../hooks/useClients';
import { useVisits } from '../hooks/useVisits';
import { useSupplements } from '../hooks/useSupplements';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  Calendar, 
  BadgeDollarSign, 
  ArrowRight,
  Clock,
  TrendingUp,
  User,
  Plus,
  MessageSquare,
  Leaf,
  UserPlus,
  Stethoscope,
  Activity,
  ShieldAlert,
  Sparkles,
  HeartPulse
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { cn, formatKES } from '../lib/utils';
import { motion } from 'motion/react';
import { OverdueFollowupsCard } from '../components/OverdueFollowupsCard';
import { WhatsAppDispatchModal } from '../components/WhatsAppDispatchModal';
import { DailyPatientQueueCard } from '../components/DailyPatientQueueCard';
import { PracticeFinancialVisualizer } from '../components/PracticeFinancialVisualizer';
import { ApothecaryInventoryHealthCard } from '../components/ApothecaryInventoryHealthCard';
import { WalkInConsultationModal } from '../components/WalkInConsultationModal';
import { SoapConsultationModal } from '../components/SoapConsultationModal';
import { Client, Appointment } from '../types';
import { toast } from 'sonner';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats, loading: statsLoading } = useStats();
  const { appointments, loading: appsLoading, updateStatus, addAppointment } = useAppointments();
  const { rawClients, addClient } = useClients('', 'all');
  const { visits, addVisit } = useVisits();
  const { supplements, loading: suppsLoading, incrementUsage, addSupplement } = useSupplements();

  // Modal states
  const [activeWhatsAppClient, setActiveWhatsAppClient] = useState<Client | null>(null);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [activeSoapClient, setActiveSoapClient] = useState<Client | null>(null);
  const [activeAppointmentForSoap, setActiveAppointmentForSoap] = useState<Appointment | null>(null);

  // Time-adaptive greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const practitionerTitle = useMemo(() => {
    if (user?.displayName) return user.displayName;
    if (user?.email) {
      const namePart = user.email.split('@')[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return 'Practitioner';
  }, [user]);

  // Today's appointments count
  const todayApps = useMemo(() => {
    return appointments.filter(app => {
      if (!app.date) return false;
      const d = app.date?.toDate ? app.date.toDate() : new Date(app.date);
      return isToday(d);
    });
  }, [appointments]);

  const todayScheduledCount = todayApps.filter(a => a.status === 'scheduled').length;
  const todayCompletedCount = todayApps.filter(a => a.status === 'completed').length;

  // Handler to open SOAP modal from Patient Queue
  const handleOpenSoapFromQueue = (client: Client, appointment?: Appointment) => {
    setActiveSoapClient(client);
    setActiveAppointmentForSoap(appointment || null);
  };

  // Handler to save SOAP consultation from Dashboard
  const handleSaveSoapConsultation = async (data: {
    date: Date;
    supplements: string[];
    payment: number;
    notes?: string;
    protocol?: string;
  }) => {
    if (!activeSoapClient) return;

    await addVisit({
      clientId: activeSoapClient.id,
      date: data.date,
      supplements: data.supplements,
      payment: data.payment,
      notes: data.notes,
      protocol: data.protocol,
    });

    if (activeAppointmentForSoap) {
      await updateStatus(activeAppointmentForSoap.id, 'completed');
    }

    for (const s of data.supplements) {
      await incrementUsage(s);
    }
  };

  // Handler for Walk-In Scheduling
  const handleScheduleWalkIn = async (data: { clientId: string; clientName: string; date: Date; notes?: string }) => {
    await addAppointment({
      clientId: data.clientId,
      clientName: data.clientName,
      date: data.date,
      notes: data.notes,
      status: 'scheduled',
    });
  };

  const handleAddWalkInClient = async (data: { name: string; phone: string; sex: 'Male' | 'Female' | 'Other' }) => {
    const id = await addClient({
      name: data.name,
      phone: data.phone,
      sex: data.sex,
      tags: ['Walk-in', 'New Client'],
    });
    return id;
  };

  return (
    <div className="space-y-8">
      {/* Clinic Header with Dynamic Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              {greeting}, {practitionerTitle}
            </h1>
          </div>
          <p className="text-zinc-500 font-medium text-xs sm:text-sm mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • Clinical Practice Operations & Day Sheet
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsWalkInOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 shadow-2xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-primary" />
            <span>Walk-In Triage</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/appointments')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 shadow-2xs transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>Appointments</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-emerald-800 text-white shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Top Bento Stats Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          label="Registered Clients" 
          value={stats.totalClients} 
          subtitle="Active patient records"
          icon={Users} 
          color="bg-blue-50 text-blue-600"
          loading={statsLoading}
        />
        <StatCard 
          label="Monthly Practice Revenue" 
          value={formatKES(stats.monthlyRevenue)} 
          subtitle={`${format(new Date(), 'MMMM yyyy')} billings`}
          icon={BadgeDollarSign} 
          color="bg-emerald-50 text-emerald-600"
          loading={statsLoading}
        />
        <StatCard 
          label="Today's Patient Queue" 
          value={`${todayScheduledCount} Pending`} 
          subtitle={`${todayCompletedCount} attended today`}
          icon={Clock} 
          color="bg-amber-50 text-amber-600"
          loading={appsLoading}
        />
        <StatCard 
          label="Apothecary Formulas" 
          value={`${supplements.length} Botanicals`} 
          subtitle="Formulas & tinctures tracked"
          icon={Leaf} 
          color="bg-teal-50 text-teal-600"
          loading={suppsLoading}
        />
      </div>

      {/* Main Content Grid: 2 Cols Left, 1 Col Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Clinical Day Sheet & Financial Visualizer */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Clinical Day Sheet & Patient Queue */}
          <DailyPatientQueueCard
            appointments={appointments}
            clients={rawClients}
            loading={appsLoading}
            onUpdateStatus={updateStatus}
            onOpenSoap={handleOpenSoapFromQueue}
            onOpenWhatsApp={(client) => setActiveWhatsAppClient(client)}
            onOpenWalkIn={() => setIsWalkInOpen(true)}
          />

          {/* Practice Financial Health & Revenue Visualizer */}
          <PracticeFinancialVisualizer
            visits={visits}
            monthlyRevenue={stats.monthlyRevenue}
          />
        </div>

        {/* Right 1 Col: Apothecary Health, Follow-ups, and Safety Vigilance */}
        <div className="space-y-6">
          {/* Herbal Dispensary & Stock Health */}
          <ApothecaryInventoryHealthCard
            supplements={supplements}
            loading={suppsLoading}
            onIncrementUsage={incrementUsage}
            onAddSupplement={addSupplement}
          />

          {/* Retention & Overdue Follow-ups Hub */}
          <OverdueFollowupsCard
            clients={rawClients}
            visits={visits}
            onOpenWhatsApp={(client) => setActiveWhatsAppClient(client)}
          />

          {/* Clinical Precaution & Botanical Safety Guidelines Card */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-50 text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
              </span>
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800">
                Clinical Herbal Safety Vigilance
              </h3>
            </div>
            <div className="space-y-2 text-xs text-zinc-600">
              <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/50 space-y-1">
                <p className="font-semibold text-amber-900">Glycyrrhiza (Licorice Root)</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Contraindicated with diagnosed hypertension, sodium-sensitive edema, or concurrent diuretic therapies.
                </p>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/50 space-y-1">
                <p className="font-semibold text-emerald-900">Withania (Ashwagandha)</p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Avoid in acute autoimmune flare-ups and adjust dosage when combined with sedatives or thyroid hormone therapy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Walk-In / Quick Triage Modal */}
      {isWalkInOpen && (
        <WalkInConsultationModal
          isOpen={isWalkInOpen}
          onClose={() => setIsWalkInOpen(false)}
          clients={rawClients}
          onAddClient={handleAddWalkInClient}
          onScheduleAppointment={handleScheduleWalkIn}
          onStartDirectSoap={(client) => {
            setActiveSoapClient(client);
            setActiveAppointmentForSoap(null);
          }}
        />
      )}

      {/* Direct SOAP Consultation Modal from Dashboard */}
      {activeSoapClient && (
        <SoapConsultationModal
          isOpen={!!activeSoapClient}
          onClose={() => {
            setActiveSoapClient(null);
            setActiveAppointmentForSoap(null);
          }}
          client={activeSoapClient}
          availableSupplements={supplements}
          visits={visits.filter(v => v.clientId === activeSoapClient.id)}
          onSaveVisit={handleSaveSoapConsultation}
          onIncrementUsage={incrementUsage}
        />
      )}

      {/* WhatsApp Dispatcher Modal */}
      {activeWhatsAppClient && (
        <WhatsAppDispatchModal
          isOpen={!!activeWhatsAppClient}
          onClose={() => setActiveWhatsAppClient(null)}
          client={activeWhatsAppClient}
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{ 
  label: string; 
  value: string | number; 
  subtitle?: string;
  icon: any; 
  color: string; 
  loading?: boolean 
}> = ({ label, value, subtitle, icon: Icon, color, loading }) => (
  <div className="bg-white border border-zinc-200 rounded-3xl p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-shadow group">
    <div className="flex items-center justify-between mb-3.5">
      <div className={cn("p-2.5 rounded-2xl transition-colors", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 group-hover:bg-primary transition-colors" />
    </div>
    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
    <div className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
      {loading ? (
        <div className="h-7 w-24 bg-zinc-100 animate-pulse rounded-lg" />
      ) : (
        value
      )}
    </div>
    {subtitle && (
      <p className="text-[11px] text-zinc-400 font-medium mt-1">{subtitle}</p>
    )}
  </div>
);

export default Dashboard;
