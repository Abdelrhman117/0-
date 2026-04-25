import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Supplier } from '../types';

const COL = 'suppliers';

export async function addSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'totalPurchased'>) {
  return addDoc(collection(db, COL), {
    ...data,
    totalPurchased: 0,
    createdAt: serverTimestamp(),
  });
}

export async function updateSupplier(id: string, data: Partial<Supplier>) {
  return updateDoc(doc(db, COL, id), data);
}

export async function deleteSupplier(id: string) {
  return deleteDoc(doc(db, COL, id));
}

export async function incrementSupplierPurchase(id: string, amount: number) {
  return updateDoc(doc(db, COL, id), { totalPurchased: increment(amount) });
}
