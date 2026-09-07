import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { startOfMonth, endOfMonth } from 'date-fns';

export const useStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    monthlyRevenue: 0,
    upcomingApps: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Clients count
    const qClients = query(collection(db, 'clients'), where('userId', '==', user.uid));
    const unsubClients = onSnapshot(qClients, (snap) => {
      setStats(prev => ({ ...prev, totalClients: snap.size }));
    });

    // Monthly revenue
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const qVisits = query(
      collection(db, 'visits'),
      where('userId', '==', user.uid),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end))
    );
    const unsubVisits = onSnapshot(qVisits, (snap) => {
      const revenue = snap.docs.reduce((sum, doc) => sum + (doc.data().payment || 0), 0);
      setStats(prev => ({ ...prev, monthlyRevenue: revenue }));
    });

    // Upcoming appointments
    const qApps = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid),
      where('status', '==', 'scheduled'),
      where('date', '>=', Timestamp.fromDate(new Date()))
    );
    const unsubApps = onSnapshot(qApps, (snap) => {
      setStats(prev => ({ ...prev, upcomingApps: snap.size }));
      setLoading(false);
    });

    return () => {
      unsubClients();
      unsubVisits();
      unsubApps();
    };
  }, [user]);

  return { stats, loading };
};
