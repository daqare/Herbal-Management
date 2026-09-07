import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Client, OperationType } from '../types';

export const useClient = (id: string | undefined) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'clients', id), 
      (doc) => {
        if (doc.exists()) {
          setClient({ id: doc.id, ...doc.data() } as Client);
        } else {
          setClient(null);
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `clients/${id}`);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [id]);

  const updateClient = async (data: Partial<Omit<Client, 'id' | 'userId' | 'createdAt'>>) => {
    if (!id) return;
    try {
      const clientRef = doc(db, 'clients', id);
      await updateDoc(clientRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
      throw error;
    }
  };

  return { client, loading, updateClient };
};
