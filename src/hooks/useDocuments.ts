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
import { MedicalDocument, OperationType } from '../types';

export const useDocuments = (clientId?: string) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let q = query(
      collection(db, 'documents'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    if (clientId) {
      q = query(
        collection(db, 'documents'),
        where('userId', '==', user.uid),
        where('clientId', '==', clientId),
        orderBy('date', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicalDocument)));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'documents');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, clientId]);

  const addDocument = async (docData: Omit<MedicalDocument, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'documents'), {
        ...docData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'documents');
    }
  };

  const updateDocument = async (id: string, docData: Partial<MedicalDocument>) => {
    try {
      await updateDoc(doc(db, 'documents', id), docData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `documents/${id}`);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'documents', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
    }
  };

  return { documents, loading, addDocument, updateDocument, deleteDocument };
};
