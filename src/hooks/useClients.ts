import { useState, useEffect, useMemo } from 'react';
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
  writeBatch,
  getDocs,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Client, OperationType } from '../types';

export const useClients = (searchTerm: string = '', tagFilter: string = '') => {
  const { user } = useAuth();
  const [rawClients, setRawClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const clientsRef = collection(db, 'clients');
    const q = query(
      clientsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(250)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const clientsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];
        setRawClients(clientsData);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore Error in useClients:', error);
        handleFirestoreError(error, OperationType.LIST, 'clients');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  // Compute filtered clients based on search term and tag filter
  const clients = useMemo(() => {
    let result = rawClients;

    if (tagFilter && tagFilter !== 'all') {
      result = result.filter(c => Array.isArray(c.tags) && c.tags.includes(tagFilter));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(c => 
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (Array.isArray(c.tags) && c.tags.some(t => t.toLowerCase().includes(term)))
      );
    }

    return result;
  }, [rawClients, searchTerm, tagFilter]);

  // Extract all unique tags used across all clients
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    rawClients.forEach(c => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach(t => {
          if (t && t.trim()) tagSet.add(t.trim());
        });
      }
    });
    return Array.from(tagSet);
  }, [rawClients]);

  const addClient = async (clientData: Omit<Client, 'id' | 'userId' | 'createdAt'>): Promise<string | undefined> => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        ...clientData,
        tags: clientData.tags || [],
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
      throw error;
    }
  };

  const updateClient = async (id: string, clientData: Partial<Omit<Client, 'id' | 'userId' | 'createdAt'>>) => {
    try {
      const clientRef = doc(db, 'clients', id);
      await updateDoc(clientRef, clientData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
      throw error;
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);

      // 1. Delete client document
      batch.delete(doc(db, 'clients', clientId));

      // 2. Find and delete related visits
      const visitsSnapshot = await getDocs(query(
        collection(db, 'visits'), 
        where('clientId', '==', clientId),
        where('userId', '==', user.uid)
      ));
      visitsSnapshot.forEach((visitDoc) => batch.delete(visitDoc.ref));

      // 3. Find and delete related appointments
      const appointmentsSnapshot = await getDocs(query(
        collection(db, 'appointments'),
        where('clientId', '==', clientId),
        where('userId', '==', user.uid)
      ));
      appointmentsSnapshot.forEach((appDoc) => batch.delete(appDoc.ref));

      // 4. Find and delete related metrics
      const metricsSnapshot = await getDocs(query(
        collection(db, 'metrics'),
        where('clientId', '==', clientId),
        where('userId', '==', user.uid)
      ));
      metricsSnapshot.forEach((doc) => batch.delete(doc.ref));

      // 5. Find and delete related documents
      const docsSnapshot = await getDocs(query(
        collection(db, 'documents'),
        where('clientId', '==', clientId),
        where('userId', '==', user.uid)
      ));
      docsSnapshot.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();
    } catch (error) {
      // Internal error handling - we don't know exactly which failed in the batch
      // but we can report the primary target.
      handleFirestoreError(error, OperationType.DELETE, `clients/${clientId}`);
      throw error;
    }
  };

  return { clients, rawClients, allTags, loading, addClient, updateClient, deleteClient };
};
