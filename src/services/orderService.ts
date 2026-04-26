import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Order, OrderItem, OrderStatus, ClientType } from '../types';
import { adjustStock } from './inventoryService';
import { updateClientAfterOrder } from './clientService';

export async function createOrder(data: {
  clientId: string;
  clientName: string;
  clientType: ClientType;
  items: OrderItem[];
  discount: number;
  tax: number;
  currency: string;
  notes?: string;
  date: Date;
}) {
  const subtotal = data.items.reduce((s, i) => s + i.subtotal, 0);
  const total    = subtotal - data.discount + (subtotal * data.tax) / 100;
  const totalKg  = data.items.reduce((s, i) => s + i.quantityKg, 0);

  const orderNumber = `ORD-${Date.now().toString().slice(-7)}`;

  const orderRef = await addDoc(collection(db, 'orders'), {
    orderNumber,
    clientId:   data.clientId,
    clientName: data.clientName,
    clientType: data.clientType,
    items:      data.items,
    subtotal,
    discount:   data.discount,
    tax:        data.tax,
    total,
    currency:   data.currency,
    status:     'pending' as OrderStatus,
    notes:      data.notes ?? '',
    date:       Timestamp.fromDate(data.date),
    createdAt:  serverTimestamp(),
  });

  // Deduct from roasted inventory for each item
  await Promise.all(
    data.items.map((item) => adjustStock(item.inventoryItemId, -item.quantityKg)),
  );

  // Update client ledger
  await updateClientAfterOrder(data.clientId, total, totalKg);

  // Auto-create invoice
  const invoiceNumber = `INV-${Date.now().toString().slice(-7)}`;
  const dueDate = new Date(data.date);
  dueDate.setDate(dueDate.getDate() + 30);

  await addDoc(collection(db, 'invoices'), {
    invoiceNumber,
    orderId:    orderRef.id,
    orderNumber,
    clientId:   data.clientId,
    clientName: data.clientName,
    items:      data.items,
    subtotal,
    discount:   data.discount,
    tax:        data.tax,
    total,
    amountPaid: 0,
    balance:    total,
    currency:   data.currency,
    status:     'unpaid',
    dueDate:    Timestamp.fromDate(dueDate),
    date:       Timestamp.fromDate(data.date),
    createdAt:  serverTimestamp(),
  });

  return { orderRef, orderNumber, total };
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  return updateDoc(doc(db, 'orders', id), { status });
}

export async function cancelOrder(order: Order) {
  // 1. Mark order cancelled
  await updateDoc(doc(db, 'orders', order.id), { status: 'cancelled' });

  // 2. Restore inventory stock for every item
  await Promise.all(
    order.items.map((item) => adjustStock(item.inventoryItemId, item.quantityKg)),
  );

  // 3. Find the linked invoice and reverse client balance
  const invSnap = await getDocs(
    query(collection(db, 'invoices'), where('orderId', '==', order.id)),
  );

  await Promise.all(
    invSnap.docs.map(async (invDoc) => {
      const inv = invDoc.data();
      const unpaidBalance = inv.balance ?? 0;

      // Cancel the invoice
      await updateDoc(invDoc.ref, { status: 'cancelled', balance: 0 });

      // Reverse only the outstanding (unpaid) portion from client balance
      if (unpaidBalance > 0) {
        await updateDoc(doc(db, 'clients', order.clientId), {
          balance: increment(-unpaidBalance),
        });
      }
    }),
  );

  // 4. Reverse order count and volume on the client
  const totalKg = order.items.reduce((s, i) => s + i.quantityKg, 0);
  await updateDoc(doc(db, 'clients', order.clientId), {
    totalOrders:   increment(-1),
    totalVolumeKg: increment(-totalKg),
  });
}
