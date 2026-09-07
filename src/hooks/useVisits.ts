import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Visit, OperationType } from '../types';

export const useVisits = (clientId?: string) => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = clientId
      ? query(
          collection(db, 'visits'),
          where('clientId', '==', clientId),
          where('userId', '==', user.uid)
        )
      : query(
          collection(db, 'visits'),
          where('userId', '==', user.uid)
        );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const visitsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Visit[];
        
        // Sort descending by date in memory
        visitsData.sort((a, b) => {
          const dateA = a.date?.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
          const dateB = b.date?.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
          return (dateB || 0) - (dateA || 0);
        });

        setVisits(visitsData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'visits');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, clientId]);

  const addVisit = async (visitData: Omit<Visit, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      // Ensure date is a Firestore Timestamp
      const recordDate = visitData.date instanceof Date ? Timestamp.fromDate(visitData.date) : visitData.date;
      
      const docRef = await addDoc(collection(db, 'visits'), {
        ...visitData,
        date: recordDate,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      // Update client's last visit date
      if (visitData.clientId) {
        const clientRef = doc(db, 'clients', visitData.clientId);
        await updateDoc(clientRef, {
          lastVisitAt: recordDate
        });
      }
      
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'visits');
    }
  };

  const updateVisit = async (id: string, visitData: Partial<Omit<Visit, 'id' | 'userId' | 'createdAt'>>) => {
    try {
      const visitRef = doc(db, 'visits', id);
      const data = { ...visitData };
      if (data.date instanceof Date) {
        data.date = Timestamp.fromDate(data.date) as any;
      }
      await updateDoc(visitRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `visits/${id}`);
    }
  };

  const deleteVisit = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'visits', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `visits/${id}`);
    }
  };

  return { visits, loading, addVisit, updateVisit, deleteVisit };
};
