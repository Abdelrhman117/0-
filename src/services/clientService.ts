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
import { Client, ClientType } from '../types';

const COL = 'clients';

export async function addClient(data: Omit<Client, 'id' | 'createdAt' | 'balance' | 'totalOrders' | 'totalVolumeKg'>) {
  return addDoc(collection(db, COL), {
    ...data,
    balance: 0,
    totalOrders: 0,
    totalVolumeKg: 0,
    createdAt: serverTimestamp(),
  });
}

export async function updateClient(id: string, data: Partial<Client>) {
  return updateDoc(doc(db, COL, id), data);
}

export async function deleteClient(id: string) {
  return deleteDoc(doc(db, COL, id));
}

export async function updateClientAfterOrder(
  id: string,
  totalAmount: number,
  totalKg: number,
) {
  return updateDoc(doc(db, COL, id), {
    balance:       increment(totalAmount),
    totalOrders:   increment(1),
    totalVolumeKg: increment(totalKg),
  });
}

export async function recordPayment(clientId: string, amount: number) {
  return updateDoc(doc(db, COL, clientId), {
    balance: increment(-amount),
  });
}
