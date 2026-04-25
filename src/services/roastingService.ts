import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { adjustStock } from './inventoryService';

export async function logRoastingBatch(data: {
  rawItemId: string;
  rawItemName: string;
  roastedItemId: string;
  roastedItemName: string;
  rawWeightKg: number;
  roastProfile: 'light' | 'medium' | 'medium-dark' | 'dark';
  temperatureC: number;
  durationMin: number;
  roasterName: string;
  notes?: string;
  date: Date;
}) {
  const shrinkageMap = { light: 0.12, medium: 0.15, 'medium-dark': 0.18, dark: 0.22 };
  const shrinkagePct = shrinkageMap[data.roastProfile];
  const roastedWeightKg = +(data.rawWeightKg * (1 - shrinkagePct)).toFixed(2);

  const batchCount = Date.now();
  const batchNumber = `RB-${batchCount.toString().slice(-6)}`;

  const batchRef = await addDoc(collection(db, 'roasting_batches'), {
    batchNumber,
    rawItemId:       data.rawItemId,
    rawItemName:     data.rawItemName,
    roastedItemId:   data.roastedItemId,
    roastedItemName: data.roastedItemName,
    rawWeightKg:     data.rawWeightKg,
    roastedWeightKg,
    shrinkagePct:    shrinkagePct * 100,
    roastProfile:    data.roastProfile,
    temperatureC:    data.temperatureC,
    durationMin:     data.durationMin,
    roasterName:     data.roasterName,
    notes:           data.notes ?? '',
    date:            Timestamp.fromDate(data.date),
    createdAt:       serverTimestamp(),
  });

  // Deduct raw beans, add roasted beans
  await adjustStock(data.rawItemId, -data.rawWeightKg);
  await adjustStock(data.roastedItemId, roastedWeightKg);

  return { batchRef, batchNumber, roastedWeightKg, shrinkagePct };
}
