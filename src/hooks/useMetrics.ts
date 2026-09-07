import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Metric, OperationType } from '../types';

export const useMetrics = (clientId?: string) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let q = query(
      collection(db, 'metrics'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    if (clientId) {
      q = query(
        collection(db, 'metrics'),
        where('userId', '==', user.uid),
        where('clientId', '==', clientId),
        orderBy('date', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setMetrics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Metric)));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'metrics');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, clientId]);

  const addMetric = async (metricData: Omit<Metric, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'metrics'), {
        ...metricData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'metrics');
    }
  };

  const updateMetric = async (id: string, metricData: Partial<Metric>) => {
    try {
      await updateDoc(doc(db, 'metrics', id), metricData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `metrics/${id}`);
    }
  };

  const deleteMetric = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'metrics', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `metrics/${id}`);
    }
  };

  return { metrics, loading, addMetric, updateMetric, deleteMetric };
};
