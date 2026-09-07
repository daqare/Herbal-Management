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
import { Appointment, OperationType } from '../types';

export const useAppointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const apps = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];
        setAppointments(apps);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'appointments');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const addAppointment = async (appData: Omit<Appointment, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      const recordDate = appData.date instanceof Date ? Timestamp.fromDate(appData.date) : appData.date;
      await addDoc(collection(db, 'appointments'), {
        ...appData,
        date: recordDate,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  const updateAppointment = async (id: string, appData: Partial<Omit<Appointment, 'id' | 'userId' | 'createdAt'>>) => {
    try {
      const appRef = doc(db, 'appointments', id);
      const data = { ...appData };
      if (data.date instanceof Date) {
        data.date = Timestamp.fromDate(data.date) as any;
      }
      await updateDoc(appRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${id}`);
    }
  };

  const updateStatus = async (id: string, status: Appointment['status']) => {
    await updateAppointment(id, { status });
  };

  const deleteAppointment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'appointments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `appointments/${id}`);
    }
  };

  return { appointments, loading, addAppointment, updateStatus, updateAppointment, deleteAppointment };
};
