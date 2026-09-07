import React, { useState, useMemo } from 'react';
import { 
  Calendar, Clock, Leaf, Activity, FileText, CheckCircle2, 
  Sparkles, Filter, ChevronRight, AlertCircle 
} from 'lucide-react';
import { format } from 'date-fns';
import { Client, Visit, Metric, MedicalDocument, Appointment } from '../types';

interface ClientHealthTimelineProps {
  client: Client;
  visits: Visit[];
  metrics: Metric[];
  documents: MedicalDocument[];
  appointments?: Appointment[];
  onOpenVisit?: (visit: Visit) => void;
  onOpenProtocol?: (visit: Visit) => void;
}

type TimelineItem = {
  id: string;
  type: 'visit' | 'metric' | 'document' | 'appointment' | 'registration';
  date: Date;
  title: string;
  subtitle?: string;
  details?: string;
  tags?: string[];
  raw?: any;
};

export const ClientHealthTimeline: React.FC<ClientHealthTimelineProps> = ({
  client,
  visits,
  metrics,
  documents,
  appointments = [],
  onOpenVisit,
  onOpenProtocol
}) => {
  const [filter, setFilter] = useState<'all' | 'visits' | 'vitals' | 'docs'>('all');

  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // Client registration milestone
    if (client.createdAt) {
      const regDate = client.createdAt?.toDate ? client.createdAt.toDate() : new Date();
      items.push({
        id: 'registration',
        type: 'registration',
        date: regDate,
        title: 'Initial Client Intake & Registration',
        subtitle: `Enrolled in clinic database with phone ${client.phone}`,
        details: client.intakeSummary ? 'Health intake assessment recorded' : undefined,
        tags: client.tags || []
      });
    }

    // Visits
    visits.forEach(v => {
      const vDate = v.date?.toDate ? v.date.toDate() : new Date(v.date);
      items.push({
        id: `visit-${v.id}`,
        type: 'visit',
        date: vDate,
        title: `Clinical Consultation (${v.supplements.length} remedies prescribed)`,
        subtitle: `Fee: KES ${v.payment.toLocaleString()} • ${v.supplements.join(', ')}`,
        details: v.notes || undefined,
        tags: v.supplements,
        raw: v
      });
    });

    // Metrics
    metrics.forEach(m => {
      const mDate = m.date?.toDate ? m.date.toDate() : new Date(m.date);
      items.push({
        id: `metric-${m.id}`,
        type: 'metric',
        date: mDate,
        title: `Vital Recorded: ${m.type} (${m.value} ${m.unit})`,
        subtitle: `Measured during clinical assessment`,
        raw: m
      });
    });

    // Documents
    documents.forEach(d => {
      const dDate = d.date?.toDate ? d.date.toDate() : new Date(d.date);
      items.push({
        id: `doc-${d.id}`,
        type: 'document',
        date: dDate,
        title: `Document Uploaded: ${d.title}`,
        subtitle: `${d.type} report attached`,
        details: d.contentSummary || undefined,
        raw: d
      });
    });

    // Appointments
    appointments.forEach(a => {
      const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      items.push({
        id: `apt-${a.id}`,
        type: 'appointment',
        date: aDate,
        title: `Scheduled Consultation (${a.status})`,
        subtitle: a.notes || undefined,
        raw: a
      });
    });

    // Sort descending by date
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [client, visits, metrics, documents, appointments]);

  const filteredItems = timelineItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'visits') return item.type === 'visit';
    if (filter === 'vitals') return item.type === 'metric';
    if (filter === 'docs') return item.type === 'document';
    return true;
  });

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-2xs space-y-6">
      {/* Header & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Patient Health Journey Timeline
          </h3>
          <p className="text-xs text-zinc-500">
            Synthesized milestones, consultations, vitals, and documentation
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
            }`}
          >
            All Events ({timelineItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('visits')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === 'visits'
                ? 'bg-emerald-800 text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            Visits ({visits.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('vitals')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === 'vitals'
                ? 'bg-blue-800 text-white'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-800'
            }`}
          >
            Vitals ({metrics.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('docs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === 'docs'
                ? 'bg-purple-800 text-white'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-800'
            }`}
          >
            Docs ({documents.length})
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => {
            let icon = <Clock className="w-4 h-4" />;
            let iconBg = 'bg-zinc-100 text-zinc-600 border-zinc-300';

            if (item.type === 'visit') {
              icon = <Leaf className="w-4 h-4" />;
              iconBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            } else if (item.type === 'metric') {
              icon = <Activity className="w-4 h-4" />;
              iconBg = 'bg-blue-100 text-blue-800 border-blue-300';
            } else if (item.type === 'document') {
              icon = <FileText className="w-4 h-4" />;
              iconBg = 'bg-purple-100 text-purple-800 border-purple-300';
            } else if (item.type === 'appointment') {
              icon = <Calendar className="w-4 h-4" />;
              iconBg = 'bg-amber-100 text-amber-800 border-amber-300';
            } else if (item.type === 'registration') {
              icon = <CheckCircle2 className="w-4 h-4" />;
              iconBg = 'bg-zinc-900 text-white border-zinc-900';
            }

            return (
              <div key={item.id} className="relative group">
                {/* Milestone Node */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center ${iconBg} shadow-2xs transition-transform group-hover:scale-110`}
                >
                  {icon}
                </div>

                {/* Milestone Content Box */}
                <div className="bg-zinc-50/70 group-hover:bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <h4 className="text-sm font-bold text-zinc-900">{item.title}</h4>
                    <span className="text-xs font-mono text-zinc-400">
                      {format(item.date, 'PPP')}
                    </span>
                  </div>

                  {item.subtitle && (
                    <p className="text-xs text-zinc-600 mb-2 font-medium">{item.subtitle}</p>
                  )}

                  {item.details && (
                    <div className="p-2.5 bg-white border border-zinc-200/60 rounded-xl text-xs text-zinc-700 whitespace-pre-line leading-relaxed mb-2 font-sans">
                      {item.details}
                    </div>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map(t => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions for visits */}
                  {item.type === 'visit' && item.raw && (
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/50 mt-2">
                      {onOpenProtocol && (
                        <button
                          type="button"
                          onClick={() => onOpenProtocol(item.raw)}
                          className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                        >
                          <span>Print Care Protocol</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-zinc-400 italic py-4">No events found matching this filter.</p>
        )}
      </div>
    </div>
  );
};
