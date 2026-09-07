import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  increment,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { OperationType } from '../types';

export interface Supplement {
  id: string;
  name: string;
  usageCount: number;
  userId: string;
}

export const useSupplements = () => {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'supplements'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const supps = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Supplement[];
        
        setSupplements(supps.sort((a, b) => b.usageCount - a.usageCount));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'supplements');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const addSupplement = async (name: string) => {
    if (!user) return;
    const normalized = name.trim();
    if (!normalized) return;

    // Use a predictable ID to avoid duplicates (e.g. lowercase name)
    const id = normalized.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const docRef = doc(db, 'supplements', id);

    try {
      await setDoc(docRef, {
        name: normalized,
        userId: user.uid,
        usageCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `supplements/${id}`);
    }
  };

  const incrementUsage = async (name: string) => {
    if (!user) return;
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const docRef = doc(db, 'supplements', id);
    try {
      await updateDoc(docRef, {
        usageCount: increment(1),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      // If it doesn't exist, we might want to create it, 
      // but the confirmation logic should have handled it.
      console.warn(`Failed to increment usage for ${name}`);
    }
  };

  const removeSupplement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'supplements', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `supplements/${id}`);
    }
  };

  const updateSupplement = async (id: string, newName: string) => {
    if (!user) return;
    const normalized = newName.trim();
    if (!normalized) return;
    
    try {
      await updateDoc(doc(db, 'supplements', id), {
        name: normalized,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `supplements/${id}`);
    }
  };

  return { supplements, loading, addSupplement, removeSupplement, updateSupplement, incrementUsage };
};
