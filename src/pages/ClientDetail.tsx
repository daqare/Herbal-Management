import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClient } from '../hooks/useClient';
import { useVisits } from '../hooks/useVisits';
import { useSupplements, Supplement } from '../hooks/useSupplements';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  ArrowLeft, 
  Plus, 
  History, 
  Pill, 
  Banknote, 
  FileText,
  Calendar as CalendarIcon,
  Trash2,
  Clock,
  ChevronRight,
  Search,
  X,
  Settings2,
  AlertCircle,
  Edit2,
  Check,
  Sparkles,
  Activity,
  TrendingUp,
  FileText as FileIconDoc,
  Tag as TagIcon,
  Phone,
  ClipboardList,
  MessageSquare,
  Stethoscope,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatKES } from '../lib/utils';
import ClientMetrics from '../components/ClientMetrics';
import ClientDocuments from '../components/ClientDocuments';
import SupplementTimeline from '../components/SupplementTimeline';
import VisitMetricsTrends from '../components/VisitMetricsTrends';
import { ClientTagBadge, ClientTagSelector } from '../components/ClientTags';
import { getPatientInsights } from '../services/geminiService';
import { useMetrics } from '../hooks/useMetrics';
import { useDocuments } from '../hooks/useDocuments';
import { ClientCautions } from '../components/ClientCautions';
import { SoapConsultationModal } from '../components/SoapConsultationModal';
import { CareProtocolModal } from '../components/CareProtocolModal';
import { WhatsAppDispatchModal } from '../components/WhatsAppDispatchModal';
import { DigitalIntakeModal } from '../components/DigitalIntakeModal';
import { ClientHealthTimeline } from '../components/ClientHealthTimeline';

const visitSchema = z.object({
  date: z.string(),
  supplements: z.string().min(1, 'Please list supplements'),
  payment: z.number().min(0, 'Payment cannot be negative'),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

type VisitFormValues = z.infer<typeof visitSchema>;

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { client, loading: clientLoading, updateClient } = useClient(id);
  const { visits, loading: visitsLoading, addVisit, updateVisit, deleteVisit } = useVisits(id);
  const { supplements, addSupplement, removeSupplement, updateSupplement, incrementUsage } = useSupplements();
  const { metrics } = useMetrics(id);
  const { documents } = useDocuments(id);
  const [activeTab, setActiveTab] = useState<'visits' | 'timeline' | 'supplements' | 'trends' | 'metrics' | 'documents'>('visits');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [isSoapModalOpen, setIsSoapModalOpen] = useState(false);
  const [isCareProtocolOpen, setIsCareProtocolOpen] = useState(false);
  const [protocolVisit, setProtocolVisit] = useState<any>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [deletingVisit, setDeletingVisit] = useState<any>(null);
  const [isManagingSupps, setIsManagingSupps] = useState(false);
  const [editingSuppId, setEditingSuppId] = useState<string | null>(null);
  const [editingSuppName, setEditingSuppName] = useState('');
  const [newSuppToConfirm, setNewSuppToConfirm] = useState<string | null>(null);
  const [suppInput, setSuppInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tempTags, setTempTags] = useState<string[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const handleOpenEditTags = () => {
    setTempTags(client?.tags || []);
    setIsEditingTags(true);
  };

  const handleSaveTags = async () => {
    if (!client) return;
    setIsSavingTags(true);
    try {
      await updateClient({ tags: tempTags });
      toast.success('Tags updated successfully');
      setIsEditingTags(false);
    } catch (error) {
      toast.error('Failed to update tags');
    } finally {
      setIsSavingTags(false);
    }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      payment: 0,
      supplements: '',
      notes: ''
    }
  });

  const onSubmitVisit = async (data: VisitFormValues) => {
    if (!id) return;
    try {
      const selectedSupps = data.supplements.split(',').map(s => s.trim()).filter(Boolean);
      
      if (editingVisit) {
        await updateVisit(editingVisit.id, {
          date: new Date(data.date),
          supplements: selectedSupps,
          payment: data.payment,
          notes: data.notes,
        });
        toast.success('Visit record updated');
        setEditingVisit(null);
      } else {
        await addVisit({
          clientId: id,
          date: new Date(data.date),
          supplements: selectedSupps,
          payment: data.payment,
          notes: data.notes,
        });

        // Increment usage counts in master list
        for (const suppName of selectedSupps) {
          await incrementUsage(suppName);
        }

        toast.success('Visit record saved');
        setIsAddingVisit(false);
      }
      reset();
      setSuppInput('');
    } catch (error) {
      toast.error(editingVisit ? 'Failed to update visit' : 'Failed to save visit');
    }
  };

  const handleSaveSoapVisit = async (data: {
    date: Date;
    supplements: string[];
    payment: number;
    notes?: string;
    protocol?: string;
  }) => {
    if (!id) return;
    try {
      if (editingVisit) {
        await updateVisit(editingVisit.id, {
          date: data.date,
          supplements: data.supplements,
          payment: data.payment,
          notes: data.notes,
          protocol: data.protocol
        });
        toast.success('Consultation updated successfully');
        setEditingVisit(null);
      } else {
        await addVisit({
          clientId: id,
          date: data.date,
          supplements: data.supplements,
          payment: data.payment,
          notes: data.notes,
          protocol: data.protocol
        });
        for (const supp of data.supplements) {
          await incrementUsage(supp);
        }
        toast.success('SOAP Consultation recorded successfully');
      }
      setIsSoapModalOpen(false);
    } catch (err) {
      toast.error('Failed to save consultation');
    }
  };

  const startEditVisit = (visit: any) => {
    setEditingVisit(visit);
    const dateObj = visit.date?.toDate ? visit.date.toDate() : (visit.date instanceof Date ? visit.date : new Date(visit.date?.seconds ? visit.date.seconds * 1000 : visit.date));
    setValue('date', dateObj.toISOString().split('T')[0]);
    setValue('payment', visit.payment);
    setValue('supplements', Array.isArray(visit.supplements) ? visit.supplements.join(', ') : (visit.supplements || ''));
    setValue('notes', visit.notes || '');
  };

  const handleDeleteVisit = async () => {
    if (!deletingVisit) return;
    try {
      await deleteVisit(deletingVisit.id);
      toast.success('Visit record deleted');
      setDeletingVisit(null);
    } catch (error) {
      toast.error('Failed to delete visit');
    }
  };

  const currentSuppsStr = watch('supplements');
  const currentSuppsList = currentSuppsStr ? currentSuppsStr.split(',').map(s => s.trim()).filter(Boolean) : [];

  const addSupp = async (suppName: string) => {
    const exists = supplements.some(s => s.name.toLowerCase() === suppName.toLowerCase());
    if (!exists) {
      setNewSuppToConfirm(suppName);
      return;
    }

    if (!currentSuppsList.includes(suppName)) {
      const newList = [...currentSuppsList, suppName];
      setValue('supplements', newList.join(', '));
    }
    setSuppInput('');
    setShowSuggestions(false);
  };

  const handleConfirmNewSupp = async () => {
    if (!newSuppToConfirm) return;
    await addSupplement(newSuppToConfirm);
    
    if (!currentSuppsList.includes(newSuppToConfirm)) {
      const newList = [...currentSuppsList, newSuppToConfirm];
      setValue('supplements', newList.join(', '));
    }
    
    setNewSuppToConfirm(null);
    setSuppInput('');
    setShowSuggestions(false);
    toast.success(`"${newSuppToConfirm}" added to master list`);
  };

  const removeSupp = (supp: string) => {
    const newList = currentSuppsList.filter(s => s !== supp);
    setValue('supplements', newList.join(', '));
  };

  const generateAIInsight = async () => {
    if (!client || isGeneratingInsight) return;
    setIsGeneratingInsight(true);
    setAiInsight(null);
    try {
      const insight = await getPatientInsights({
        name: client.name,
        visits: visits.slice(0, 5).map(v => ({
          date: format(v.date.toDate(), 'PPP'),
          supplements: v.supplements,
          notes: v.notes
        })),
        metrics: metrics.slice(0, 5).map(m => ({
          date: format(m.date.toDate(), 'PPP'),
          type: m.type,
          value: m.value,
          unit: m.unit
        })),
        documents: documents.slice(0, 5).map(d => ({
          date: format(d.date.toDate(), 'PPP'),
          title: d.title,
          type: d.type,
          contentSummary: d.contentSummary
        }))
      });
      setAiInsight(insight);
      toast.success('AI Insights generated');
    } catch (error) {
      toast.error('Failed to generate AI insights');
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const filteredSuggestions = supplements.filter(s => 
    s.name.toLowerCase().includes(suppInput.toLowerCase()) && 
    !currentSuppsList.includes(s.name)
  ).slice(0, 5);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (clientLoading) return <div className="p-8 text-center text-zinc-500">Loading client profile...</div>;
  if (!client) return <div className="p-8 text-center text-red-500">Client not found.</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-zinc-200 shadow-xs">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/clients')}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors shrink-0"
            title="Back to clients"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-emerald-100 shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">{client.name}</h1>
                <button
                  id="btn-edit-client-tags"
                  onClick={handleOpenEditTags}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-primary hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                  title="Assign or edit client tags"
                >
                  <TagIcon className="w-3.5 h-3.5" />
                  <span>{Array.isArray(client.tags) && client.tags.length > 0 ? 'Edit Tags' : 'Assign Tags'}</span>
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs sm:text-sm text-zinc-500 mt-1 flex-wrap">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    client.sex === 'Male' ? "bg-blue-400" : client.sex === 'Female' ? "bg-pink-400" : "bg-zinc-400"
                  )} />
                  {client.sex}
                </span>

                {client.phone && (
                  <span className="flex items-center gap-1.5 text-zinc-600 font-mono">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    {client.phone}
                  </span>
                )}

                <span className="flex items-center gap-1.5 italic text-zinc-400">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Joined {client.createdAt ? format(client.createdAt.toDate(), 'PPP') : 'N/A'}
                </span>
              </div>

              {/* Tags Display */}
              <div className="flex items-center gap-1.5 flex-wrap mt-3" id="client-detail-tags">
                {Array.isArray(client.tags) && client.tags.length > 0 ? (
                  client.tags.map((tag) => (
                    <ClientTagBadge
                      key={tag}
                      tag={tag}
                      size="sm"
                    />
                  ))
                ) : (
                  <span className="text-xs text-zinc-400 italic">No tags assigned yet</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap md:justify-end">
          <button
            type="button"
            id="btn-open-intake"
            onClick={() => setIsIntakeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200 transition-colors shadow-2xs"
            title="Pre-Consultation Intake Assessment"
          >
            <ClipboardList className="w-4 h-4 text-zinc-500" />
            <span>Intake Form</span>
          </button>
          <button
            type="button"
            id="btn-open-whatsapp"
            onClick={() => setIsWhatsAppOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors shadow-2xs"
            title="Dispatch WhatsApp or SMS Message"
          >
            <MessageSquare className="w-4 h-4 text-primary" />
            <span>WhatsApp / SMS</span>
          </button>
          <button
            type="button"
            id="btn-open-soap-new"
            onClick={() => {
              setEditingVisit(null);
              setIsSoapModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-primary hover:bg-emerald-800 rounded-xl transition-all shadow-md shadow-emerald-900/10"
          >
            <Stethoscope className="w-4 h-4" />
            <span>SOAP Consultation</span>
          </button>
        </div>
      </div>

      {/* Clinical Flags, Allergies, Cautions & Emergency Contact */}
      <ClientCautions client={client} onUpdate={updateClient} />

      {/* AI Insight Section */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-900 border border-emerald-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800/30 rounded-full -translate-y-32 translate-x-32 blur-3xl group-hover:scale-125 transition-transform duration-1000" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-800 rounded-2xl">
                <Sparkles className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold">AI Patient Insights</h3>
                <p className="text-emerald-300 text-xs font-medium">Smart analysis of history and metrics</p>
              </div>
            </div>
            <button 
              onClick={generateAIInsight}
              disabled={isGeneratingInsight}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-emerald-900 rounded-2xl font-bold hover:bg-emerald-50 transition-all shadow-lg shadow-emerald-950/20 disabled:opacity-50"
            >
              {isGeneratingInsight ? (
                <>
                  <div className="w-4 h-4 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Refresh
                </>
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {aiInsight ? (
              <motion.div
                key="insight"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-800/40 backdrop-blur-md rounded-2xl p-6 border border-emerald-700/50"
              >
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-emerald-50">
                  {aiInsight}
                </div>
              </motion.div>
            ) : !isGeneratingInsight && (
              <motion.div
                key="placeholder"
                className="text-center py-4 text-emerald-300/70 italic text-sm"
              >
                Click generate to analyze {client.name}'s performance trends.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Info
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Phone Number</label>
                <div className="flex items-center gap-2 text-zinc-700 font-medium bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                   <span className="bg-emerald-100 text-primary p-1 rounded">KE</span>
                   {client.phone}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Last Visit</label>
                <p className="text-zinc-700 font-medium px-1">
                   {client.lastVisitAt ? format(client.lastVisitAt.toDate ? client.lastVisitAt.toDate() : new Date(client.lastVisitAt.seconds * 1000), 'PPP') : 'No visits recorded'}
                </p>
              </div>
              <div className="pt-2 space-y-3">
                <button 
                  id="sidebar-btn-soap-consultation"
                  onClick={() => {
                    setEditingVisit(null);
                    setIsSoapModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-100"
                >
                  <Stethoscope className="w-5 h-5" />
                  SOAP Consultation
                </button>
                {visits.length > 0 && (
                  <button 
                    id="sidebar-btn-care-plan"
                    onClick={() => {
                      setProtocolVisit(visits[0]);
                      setIsCareProtocolOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all"
                  >
                    <Printer className="w-4 h-4 text-primary" />
                    Print Take-Home Plan
                  </button>
                )}
                <button 
                  onClick={() => setIsManagingSupps(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-bold text-xs hover:bg-zinc-50 transition-all"
                >
                  <Settings2 className="w-4 h-4" />
                  Master Supplement List
                </button>
                <button 
                  id="sidebar-btn-view-timeline"
                  onClick={() => setActiveTab('timeline')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl font-bold text-xs hover:bg-zinc-100 transition-all"
                >
                  <Clock className="w-4 h-4 text-primary" />
                  Health Journey Timeline
                </button>
                <button 
                  id="sidebar-btn-view-trends"
                  onClick={() => setActiveTab('trends')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all"
                >
                  <TrendingUp className="w-4 h-4 text-primary" />
                  View Note Metrics Trends
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-2xl inline-flex flex-wrap">
            <button 
              id="tab-btn-visits"
              onClick={() => setActiveTab('visits')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === 'visits' 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <History className="w-4 h-4" />
              Visits
            </button>
            <button 
              id="tab-btn-timeline"
              onClick={() => setActiveTab('timeline')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === 'timeline' 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Clock className="w-4 h-4" />
              Health Timeline
            </button>
            <button 
              id="tab-btn-trends"
              onClick={() => setActiveTab('trends')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === 'trends' 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Trends
            </button>
            <button 
              id="tab-btn-supplements"
              onClick={() => setActiveTab('supplements')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === 'supplements' 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Pill className="w-4 h-4" />
              Supplements
            </button>
            <button 
              id="tab-btn-metrics"
              onClick={() => setActiveTab('metrics')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === 'metrics' 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Activity className="w-4 h-4" />
              Metrics
            </button>
            <button 
              id="tab-btn-documents"
              onClick={() => setActiveTab('documents')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === 'documents' 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <FileIconDoc className="w-4 h-4" />
              Documents
            </button>
          </div>

          <div className="space-y-4">
            {activeTab === 'visits' && (
              <>
                {visits.length > 0 && (
                  <div id="banner-visit-trends-shortcut" className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white text-primary rounded-xl shadow-xs border border-emerald-100">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">Health Metrics Trends from Notes</h4>
                        <p className="text-[11px] text-zinc-500">Visualize blood pressure, weight, pulse, and glucose trends plotted over time.</p>
                      </div>
                    </div>
                    <button
                      id="btn-switch-to-trends"
                      onClick={() => setActiveTab('trends')}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-white px-3.5 py-2 rounded-xl border border-emerald-200 hover:bg-emerald-100/60 transition-colors shadow-xs"
                    >
                      <span>Open Trends Graph</span>
                      <ChevronRight className="w-3.5 h-3.5 text-primary" />
                    </button>
                  </div>
                )}
                {visitsLoading ? (
                  <div className="text-center py-12 text-zinc-400">Loading visit history...</div>
                ) : visits.length === 0 ? (
                  <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl p-12 text-center">
                    <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                    <p className="text-zinc-500 font-medium">No visits recorded for this client yet.</p>
                  </div>
                ) : (
                  visits.map((visit, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={visit.id}
                      className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-colors relative overflow-hidden group"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="bg-emerald-50 text-primary p-2 rounded-lg">
                              <CalendarIcon className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-zinc-900">
                              {format(visit.date.toDate(), 'PPP')}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {visit.supplements.map(s => (
                              <span key={s} className="px-2 py-1 bg-accent text-primary rounded-md text-xs font-semibold flex items-center gap-1.5 border border-emerald-100">
                                <Pill className="w-3 h-3" />
                                {s}
                              </span>
                            ))}
                          </div>

                          {visit.notes && (
                            <p className="text-sm text-zinc-600 bg-zinc-50 p-3 rounded-xl border-l-4 border-zinc-300">
                              "{visit.notes}"
                            </p>
                          )}

                          {visit.protocol && (
                            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-950 space-y-1">
                              <div className="font-bold flex items-center gap-1.5 text-primary">
                                <Pill className="w-3.5 h-3.5" />
                                <span>Take-Home Care Protocol:</span>
                              </div>
                              <p className="whitespace-pre-line text-zinc-700">{visit.protocol}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setProtocolVisit(visit);
                                setIsCareProtocolOpen(true);
                              }}
                              className="p-1.5 text-zinc-400 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-all"
                              title="Print / Share Care Protocol"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingVisit(visit);
                                setIsSoapModalOpen(true);
                              }}
                              className="p-1.5 text-zinc-400 hover:text-primary hover:bg-emerald-50 rounded-md transition-all"
                              title="Edit in SOAP Consultation"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setDeletingVisit(visit)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                              title="Delete Visit"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xl">
                            <Banknote className="w-5 h-5" />
                            {formatKES(visit.payment)}
                          </div>
                          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Payment Received</span>

                          <button
                            type="button"
                            onClick={() => {
                              setProtocolVisit(visit);
                              setIsCareProtocolOpen(true);
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                          >
                            <Printer className="w-3.5 h-3.5 text-primary" />
                            <span>Care Plan</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </>
            )}

            {activeTab === 'timeline' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <ClientHealthTimeline
                  client={client}
                  visits={visits}
                  metrics={metrics}
                  documents={documents}
                  onAddVisit={() => {
                    setEditingVisit(null);
                    setIsSoapModalOpen(true);
                  }}
                  onSelectVisit={(v) => {
                    setProtocolVisit(v);
                    setIsCareProtocolOpen(true);
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'trends' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <VisitMetricsTrends 
                  visits={visits}
                  loading={visitsLoading}
                  onRecordVisit={() => setIsAddingVisit(true)}
                  onEditVisit={startEditVisit}
                  clientName={client.name}
                />
              </motion.div>
            )}

            {activeTab === 'supplements' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <SupplementTimeline 
                  visits={visits}
                  loading={visitsLoading}
                  onRecordIntake={() => setIsAddingVisit(true)}
                  onEditVisit={startEditVisit}
                />
              </motion.div>
            )}

            {activeTab === 'metrics' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <ClientMetrics clientId={id!} />
              </motion.div>
            )}

            {activeTab === 'documents' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <ClientDocuments clientId={id!} />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* New Visit Modal */}
      <AnimatePresence>
        {(isAddingVisit || editingVisit) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setIsAddingVisit(false);
                setEditingVisit(null);
                reset();
              }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-zinc-900">
                  {editingVisit ? 'Edit Visit Record' : 'Record New Visit'}
                </h2>
                <button 
                  onClick={() => {
                    setIsAddingVisit(false);
                    setEditingVisit(null);
                    reset();
                  }}
                  className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmitVisit)} className="space-y-5">
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
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Payment (KES)</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs ring-1 ring-zinc-200 px-1 rounded bg-zinc-100">KSh</span>
                       <input
                        {...register('payment', { valueAsNumber: true })}
                        type="number"
                        className="w-full pl-14 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-zinc-900"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Supplements Taken</label>
                  <div className="flex flex-wrap gap-2 p-2 min-h-[42px] bg-zinc-50 border border-zinc-200 rounded-xl mb-2">
                    {currentSuppsList.map(s => (
                      <span key={s} className="px-2 py-1 bg-emerald-100 text-primary rounded-md text-xs font-bold flex items-center gap-1">
                        {s}
                        <button type="button" onClick={() => removeSupp(s)} className="hover:text-emerald-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={suppInput}
                      onChange={(e) => {
                        setSuppInput(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && suppInput.trim()) {
                          e.preventDefault();
                          addSupp(suppInput.trim());
                        }
                      }}
                      className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px]"
                      placeholder={currentSuppsList.length === 0 ? "Search or type new..." : ""}
                    />
                  </div>

                  <AnimatePresence>
                    {showSuggestions && (suppInput || filteredSuggestions.length > 0) && (
                      <motion.div
                        ref={suggestionRef}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                      >
                        {filteredSuggestions.map((s) => (
                          <button
                            key={s.name}
                            type="button"
                            onClick={() => addSupp(s.name)}
                            className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center justify-between border-b border-zinc-100 last:border-0"
                          >
                            <span className="text-sm font-medium text-zinc-700">{s.name}</span>
                            <span className="text-[10px] bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                              Used {s.usageCount}x
                            </span>
                          </button>
                        ))}
                        {suppInput && !supplements.some(s => s.name.toLowerCase() === suppInput.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => addSupp(suppInput)}
                            className="w-full px-4 py-2 text-left hover:bg-emerald-50 text-primary flex items-center gap-2 border-t border-zinc-100"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm font-bold">Add "{suppInput}" as new</span>
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <input type="hidden" {...register('supplements')} />
                  {errors.supplements && <p className="text-red-500 text-xs mt-1">{errors.supplements.message}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-zinc-700">Notes (Diagnostic / Progress)</label>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold uppercase",
                        (watch('notes')?.length || 0) > 900 ? "text-orange-500" : "text-zinc-400"
                      )}>
                        {watch('notes')?.length || 0} / 1000
                      </span>
                      <span className="text-[10px] text-zinc-300 font-bold uppercase">•</span>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Optional</span>
                    </div>
                  </div>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    maxLength={1000}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                    placeholder="Describe how the patient is doing... (e.g. BP: 120/80, Weight: 72kg)"
                  />
                  {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>}

                  {/* Quick Vitals Inserters */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-primary" />
                      Add Vitals to Chart:
                    </span>
                    <button
                      type="button"
                      id="btn-quick-insert-bp"
                      onClick={() => {
                        const cur = watch('notes') || '';
                        setValue('notes', cur ? `${cur.trim()} BP: 120/80` : 'BP: 120/80');
                      }}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-primary rounded-md hover:bg-emerald-100 transition-colors border border-emerald-100"
                    >
                      + BP: 120/80
                    </button>
                    <button
                      type="button"
                      id="btn-quick-insert-weight"
                      onClick={() => {
                        const cur = watch('notes') || '';
                        setValue('notes', cur ? `${cur.trim()} Weight: 70kg` : 'Weight: 70kg');
                      }}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-primary rounded-md hover:bg-emerald-100 transition-colors border border-emerald-100"
                    >
                      + Weight: 70kg
                    </button>
                    <button
                      type="button"
                      id="btn-quick-insert-pulse"
                      onClick={() => {
                        const cur = watch('notes') || '';
                        setValue('notes', cur ? `${cur.trim()} Pulse: 72 bpm` : 'Pulse: 72 bpm');
                      }}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-primary rounded-md hover:bg-emerald-100 transition-colors border border-emerald-100"
                    >
                      + Pulse: 72 bpm
                    </button>
                    <button
                      type="button"
                      id="btn-quick-insert-sugar"
                      onClick={() => {
                        const cur = watch('notes') || '';
                        setValue('notes', cur ? `${cur.trim()} Blood sugar: 95 mg/dL` : 'Blood sugar: 95 mg/dL');
                      }}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-primary rounded-md hover:bg-emerald-100 transition-colors border border-emerald-100"
                    >
                      + Sugar: 95
                    </button>
                    <button
                      type="button"
                      id="btn-quick-insert-pain"
                      onClick={() => {
                        const cur = watch('notes') || '';
                        setValue('notes', cur ? `${cur.trim()} Pain: 2/10` : 'Pain: 2/10');
                      }}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-primary rounded-md hover:bg-emerald-100 transition-colors border border-emerald-100"
                    >
                      + Pain: 2/10
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                   <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : (editingVisit ? 'Update Record' : 'Record Visit')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingVisit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setDeletingVisit(null)}
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
                <h3 className="text-lg font-bold text-zinc-900 mb-2">Delete Visit Record?</h3>
                <p className="text-sm text-zinc-500 mb-6 font-medium">
                  This action cannot be undone. Are you sure you want to remove this visit record?
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setDeletingVisit(null)}
                    className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteVisit}
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

      {/* Confirmation for New Supplement */}
      <AnimatePresence>
        {newSuppToConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            >
              <button 
                onClick={() => {
                  setNewSuppToConfirm(null);
                  setSuppInput('');
                }}
                className="absolute right-4 top-4 p-1 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-emerald-100 text-primary rounded-full flex items-center justify-center mb-4">
                  <Pill className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">New Supplement?</h3>
                <p className="text-sm text-zinc-500 mb-6">
                  Add <span className="font-bold text-zinc-700">"{newSuppToConfirm}"</span> to your master list for future autocompletion?
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => {
                      if (newSuppToConfirm && !currentSuppsList.includes(newSuppToConfirm)) {
                        const newList = [...currentSuppsList, newSuppToConfirm];
                        setValue('supplements', newList.join(', '));
                      }
                      setNewSuppToConfirm(null);
                      setSuppInput('');
                      setShowSuggestions(false);
                      toast.info(`"${newSuppToConfirm}" added to visit only`);
                    }}
                    className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-medium hover:bg-zinc-200 transition-colors text-xs"
                  >
                    Just this visit
                  </button>
                  <button
                    onClick={handleConfirmNewSupp}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-emerald-800 transition-colors text-xs"
                  >
                    Add to master list
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Master List Management */}
      <AnimatePresence>
        {isManagingSupps && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsManagingSupps(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Master Supplement List</h2>
                  <p className="text-sm text-zinc-500">Manage suggestions for visit records.</p>
                </div>
                <button 
                  onClick={() => setIsManagingSupps(false)}
                  className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {supplements.length === 0 ? (
                   <div className="text-center py-12 text-zinc-400">No supplements in master list yet.</div>
                ) : (
                  supplements.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100 group">
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-primary flex items-center justify-center shrink-0">
                          <Pill className="w-4 h-4" />
                        </div>
                        {editingSuppId === s.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              autoFocus
                              value={editingSuppName}
                              onChange={(e) => setEditingSuppName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateSupplement(s.id, editingSuppName);
                                  setEditingSuppId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingSuppId(null);
                                }
                              }}
                              className="flex-1 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                              onClick={() => {
                                updateSupplement(s.id, editingSuppName);
                                setEditingSuppId(null);
                              }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingSuppId(null)}
                              className="p-1 text-zinc-400 hover:bg-zinc-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-zinc-900">{s.name}</p>
                            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Used in {s.usageCount} visits</p>
                          </div>
                        )}
                      </div>
                      
                      {editingSuppId !== s.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingSuppId(s.id);
                              setEditingSuppName(s.name);
                            }}
                            className="p-2 text-zinc-300 hover:text-primary hover:bg-emerald-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`Remove "${s.name}" from master list suggestions?`)) {
                                removeSupplement(s.id);
                              }
                            }}
                            className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-100">
                <button
                  onClick={() => setIsManagingSupps(false)}
                  className="w-full px-4 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Tags Modal */}
      <AnimatePresence>
        {isEditingTags && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsEditingTags(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-primary">
                    <TagIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">Manage Profile Tags</h2>
                    <p className="text-xs text-zinc-500">Categorize {client.name} for quick search & filtering</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingTags(false)}
                  className="p-1 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-2">
                <ClientTagSelector
                  selectedTags={tempTags}
                  onChange={setTempTags}
                  label="Assigned Tags"
                  helperText="Assign common clinic tags (like Chronic, Follow-up, Consultation) or create custom tags."
                />
              </div>

              <div className="flex gap-3 pt-5 border-t border-zinc-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingTags(false)}
                  className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-xl font-medium text-zinc-600 hover:bg-zinc-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-save-tags"
                  onClick={handleSaveTags}
                  disabled={isSavingTags}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-100 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {isSavingTags ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Tags</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clinical SOAP Consultation Modal */}
      <SoapConsultationModal
        isOpen={isSoapModalOpen}
        onClose={() => {
          setIsSoapModalOpen(false);
          setEditingVisit(null);
        }}
        client={client}
        existingVisit={editingVisit}
        availableSupplements={supplements}
        recentVisits={visits}
        onSave={handleSaveSoapVisit}
      />

      {/* Take-Home Care Protocol Modal & Printable View */}
      {protocolVisit && (
        <CareProtocolModal
          isOpen={isCareProtocolOpen}
          onClose={() => {
            setIsCareProtocolOpen(false);
            setProtocolVisit(null);
          }}
          client={client}
          visit={protocolVisit}
        />
      )}

      {/* WhatsApp / SMS Direct Dispatch Modal */}
      <WhatsAppDispatchModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        client={client}
        latestVisit={visits[0]}
      />

      {/* Digital Pre-Consultation Intake Assessment Modal */}
      <DigitalIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        client={client}
        onSave={async (intake) => {
          await updateClient({ intakeSummary: intake });
          toast.success('Intake assessment saved to patient chart');
        }}
      />
    </div>
  );
};

export default ClientDetail;
