import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Calendar, MessageSquare, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { Client, Visit } from '../types';

interface OverdueFollowupsCardProps {
  clients: Client[];
  visits: Visit[];
  onOpenWhatsApp?: (client: Client) => void;
}

export const OverdueFollowupsCard: React.FC<OverdueFollowupsCardProps> = ({
  clients,
  visits,
  onOpenWhatsApp
}) => {
  const navigate = useNavigate();

  // Find latest visit for each client
  const clientLatestVisitMap = new Map<string, Date>();
  visits.forEach(v => {
    const vDate = v.date?.toDate ? v.date.toDate() : new Date(v.date);
    const existing = clientLatestVisitMap.get(v.clientId);
    if (!existing || vDate > existing) {
      clientLatestVisitMap.set(v.clientId, vDate);
    }
  });

  const now = new Date();

  // Compute clients overdue for follow-up (> 30 days since last visit or has 'Follow-up' tag)
  const overdueClients = clients
    .map(client => {
      const lastVisit = clientLatestVisitMap.get(client.id) || (client.createdAt?.toDate ? client.createdAt.toDate() : null);
      const daysSince = lastVisit ? differenceInDays(now, lastVisit) : 999;
      const isTaggedFollowUp = client.tags?.some(t => t.toLowerCase().includes('follow') || t.toLowerCase().includes('chronic'));
      return {
        client,
        lastVisit,
        daysSince,
        isTaggedFollowUp
      };
    })
    .filter(item => item.daysSince >= 30 || item.isTaggedFollowUp)
    .sort((a, b) => b.daysSince - a.daysSince)
    .slice(0, 5);

  if (overdueClients.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Follow-Up & Refill Alerts</h3>
            <p className="text-xs text-zinc-500">Clients requiring clinical re-engagement</p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
          {overdueClients.length} due
        </span>
      </div>

      <div className="divide-y divide-zinc-100">
        {overdueClients.map(({ client, lastVisit, daysSince }) => (
          <div key={client.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate(`/clients/${client.id}`)}
                className="text-xs font-bold text-zinc-900 hover:text-emerald-800 text-left truncate block"
              >
                {client.name}
              </button>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="font-mono">{client.phone}</span>
                <span>•</span>
                <span className={daysSince > 45 ? 'text-red-600 font-semibold' : 'text-amber-700 font-semibold'}>
                  {lastVisit ? `${daysSince} days ago` : 'No visits recorded'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenWhatsApp && (
                <button
                  type="button"
                  onClick={() => onOpenWhatsApp(client)}
                  className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors"
                  title="WhatsApp check-in message"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/clients/${client.id}`)}
                className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
                title="View Client Chart"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
