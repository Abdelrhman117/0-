import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { InventoryItem, InventoryCategory } from '../types';

const COL = 'inventory';

export async function addInventoryItem(data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateInventoryItem(id: string, data: Partial<InventoryItem>) {
  return updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteInventoryItem(id: string) {
  return deleteDoc(doc(db, COL, id));
}

export async function adjustStock(id: string, deltaKg: number) {
  return updateDoc(doc(db, COL, id), {
    quantity: increment(deltaKg),
    updatedAt: serverTimestamp(),
  });
}

export async function addSupplyShipment(data: {
  supplierId: string;
  supplierName: string;
  inventoryItemId: string;
  itemName: string;
  weightKg: number;
  costPerKg: number;
  currency: string;
  date: Date;
  notes?: string;
}) {
  const totalCost = data.weightKg * data.costPerKg;

  const shipmentRef = await addDoc(collection(db, 'supply_shipments'), {
    ...data,
    totalCost,
    date: Timestamp.fromDate(data.date),
    createdAt: serverTimestamp(),
  });

  await adjustStock(data.inventoryItemId, data.weightKg);

  return shipmentRef;
}
