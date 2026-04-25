import React, { useState, useMemo } from 'react';
import { Plus, ShoppingCart, Package, X, AlertCircle, Search } from 'lucide-react';
import { orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { useCollection } from '../hooks/useRealtimeData';
import { Order, OrderItem, Client, InventoryItem, OrderStatus } from '../types';
import { createOrder, updateOrderStatus } from '../services/orderService';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge, { statusBadgeVariant } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];

export default function Orders() {
  const { data: orders, loading } = useCollection<Order>('orders', [orderBy('createdAt', 'desc')]);
  const { data: clients }         = useCollection<Client>('clients');
  const { data: inventory }       = useCollection<InventoryItem>('inventory');
  const roastedItems              = useMemo(() => inventory.filter((i) => i.category === 'roasted'), [inventory]);

  const [modal, setModal]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [detailOrder, setDetailOrder]   = useState<Order | null>(null);

  const [form, setForm] = useState({
    clientId: '', discount: '0', tax: '0', currency: 'USD',
    notes: '', date: new Date().toISOString().split('T')[0],
  });
  const [orderItems, setOrderItems] = useState<Partial<OrderItem & { tempId: string }>[]>([
    { tempId: crypto.randomUUID(), inventoryItemId: '', itemName: '', quantityKg: 0, pricePerKg: 0, subtotal: 0 },
  ]);

  const selectedClient = clients.find((c) => c.id === form.clientId);

  const addItem = () => setOrderItems([...orderItems, { tempId: crypto.randomUUID(), inventoryItemId: '', itemName: '', quantityKg: 0, pricePerKg: 0, subtotal: 0 }]);
  const removeItem = (tid: string) => setOrderItems(orderItems.filter((i) => i.tempId !== tid));
  const updateItem = (tid: string, field: string, value: string | number) => {
    setOrderItems(orderItems.map((item) => {
      if (item.tempId !== tid) return item;
      const updated = { ...item, [field]: value };
      if (field === 'inventoryItemId') {
        const inv = roastedItems.find((i) => i.id === value);
        updated.itemName = inv?.name ?? '';
      }
      if (field === 'quantityKg' || field === 'pricePerKg') {
        updated.subtotal = (+(updated.quantityKg ?? 0)) * (+(updated.pricePerKg ?? 0));
      }
      return updated;
    }));
  };

  const subtotal = orderItems.reduce((s, i) => s + (i.subtotal ?? 0), 0);
  const discount = parseFloat(form.discount) || 0;
  const tax      = parseFloat(form.tax) || 0;
  const total    = subtotal - discount + (subtotal * tax) / 100;

  const handleCreate = async () => {
    if (!form.clientId) { toast.error('Select a client'); return; }
    if (orderItems.some((i) => !i.inventoryItemId || !(i.quantityKg ?? 0) || !(i.pricePerKg ?? 0))) {
      toast.error('Complete all order items'); return;
    }
    for (const item of orderItems) {
      const inv = roastedItems.find((i) => i.id === item.inventoryItemId);
      if (inv && (item.quantityKg ?? 0) > inv.quantity) {
        toast.error(`Insufficient stock for ${inv.name}. Available: ${inv.quantity} kg`); return;
      }
    }
    setSaving(true);
    try {
      const result = await createOrder({
        clientId:   form.clientId,
        clientName: selectedClient?.name ?? '',
        clientType: selectedClient?.type ?? 'local',
        items:      orderItems as OrderItem[],
        discount,
        tax,
        currency:   form.currency,
        notes:      form.notes,
        date:       new Date(form.date),
      });
      toast.success(`Order ${result.orderNumber} created! Invoice auto-generated.`);
      setModal(false);
      setOrderItems([{ tempId: crypto.randomUUID(), inventoryItemId: '', itemName: '', quantityKg: 0, pricePerKg: 0, subtotal: 0 }]);
      setForm({ clientId: '', discount: '0', tax: '0', currency: 'USD', notes: '', date: new Date().toISOString().split('T')[0] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order marked as ${status}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = useMemo(() =>
    orders.filter((o) => {
      const matchSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.clientName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    }),
    [orders, search, statusFilter],
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders…" className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-lg text-sm text-coffee-200 placeholder-coffee-700 focus:outline-none focus:border-coffee-500" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', ...STATUS_FLOW, 'cancelled'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${statusFilter === s ? 'bg-coffee-300/15 text-coffee-300 border border-coffee-300/20' : 'text-coffee-600 hover:text-coffee-300 border border-transparent'}`}>
              {s}
            </button>
          ))}
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setModal(true)} disabled={clients.length === 0 || roastedItems.length === 0}>
          New Order
        </Button>
      </div>

      {(clients.length === 0 || roastedItems.length === 0) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-sm text-amber-300">
          <AlertCircle size={16} className="flex-shrink-0" />
          {clients.length === 0 ? 'Add clients first.' : 'Add roasted inventory items first.'}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-coffee-600">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No orders found" description="Create your first sales order." action={<Button icon={<Plus size={15} />} onClick={() => setModal(true)} disabled={clients.length === 0 || roastedItems.length === 0}>New Order</Button>} />
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Order #', 'Date', 'Client', 'Type', 'Total', 'Status', 'Actions'].map((h) => (
                    <th key={h} className={`text-coffee-500 text-xs font-medium py-3 ${h === 'Actions' ? 'pr-5 text-right' : 'pl-5 text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
                    <td className="pl-5 py-3 text-coffee-300 font-mono text-xs font-bold">{o.orderNumber}</td>
                    <td className="pl-5 py-3 text-coffee-400 text-xs">
                      {o.date?.toDate ? format(o.date.toDate(), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="pl-5 py-3 text-coffee-200 font-medium">{o.clientName}</td>
                    <td className="pl-5 py-3"><Badge variant={o.clientType === 'export' ? 'info' : 'gold'} className="capitalize">{o.clientType}</Badge></td>
                    <td className="pl-5 py-3 text-coffee-100 font-bold">{o.currency} {o.total?.toLocaleString()}</td>
                    <td className="pl-5 py-3"><Badge variant={statusBadgeVariant(o.status)} className="capitalize">{o.status}</Badge></td>
                    <td className="pr-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetailOrder(o)} className="px-2 py-1 rounded text-xs text-coffee-400 hover:text-coffee-200 hover:bg-surface-hover transition-colors">Details</button>
                        {o.status !== 'delivered' && o.status !== 'cancelled' && (
                          <Select
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                            className="text-xs py-1 px-2 w-32"
                          >
                            {STATUS_FLOW.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                            <option value="cancelled">cancelled</option>
                          </Select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Create Order Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Create New Order" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <Select label="Client" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
            </Select>
            <Select label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
            </Select>
            <Input label="Order Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-coffee-400 uppercase tracking-wider">Order Items</label>
              <Button variant="ghost" size="sm" icon={<Plus size={13} />} onClick={addItem}>Add Item</Button>
            </div>

            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.tempId} className="grid grid-cols-12 gap-2 items-center bg-coffee-950 border border-surface-border rounded-lg p-3">
                  <div className="col-span-4">
                    <Select value={item.inventoryItemId ?? ''} onChange={(e) => updateItem(item.tempId!, 'inventoryItemId', e.target.value)}>
                      <option value="">Select item…</option>
                      {roastedItems.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.quantity} kg)</option>)}
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min="0" step="0.1" placeholder="Qty (kg)" value={item.quantityKg || ''} onChange={(e) => updateItem(item.tempId!, 'quantityKg', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min="0" step="0.01" placeholder="Price/kg" value={item.pricePerKg || ''} onChange={(e) => updateItem(item.tempId!, 'pricePerKg', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-1 text-coffee-300 font-bold text-xs text-center">
                    {(item.subtotal ?? 0).toFixed(0)}
                  </div>
                  <div className="col-span-1 text-right">
                    {orderItems.length > 1 && (
                      <button onClick={() => removeItem(item.tempId!)} className="text-coffee-700 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-4">
            <Textarea label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Order notes…" />
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Discount" type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                <Input label="Tax %" type="number" min="0" max="100" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
              </div>
              <div className="bg-coffee-950 border border-surface-border rounded-lg p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-coffee-500"><span>Subtotal</span><span>{form.currency} {subtotal.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-red-400"><span>Discount</span><span>- {form.currency} {discount.toFixed(2)}</span></div>}
                {tax > 0 && <div className="flex justify-between text-coffee-500"><span>Tax ({tax}%)</span><span>{form.currency} {(subtotal * tax / 100).toFixed(2)}</span></div>}
                <div className="flex justify-between text-coffee-100 font-bold border-t border-surface-border pt-2 mt-2">
                  <span>TOTAL</span>
                  <span className="text-coffee-300 text-base">{form.currency} {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button loading={saving} icon={<ShoppingCart size={15} />} onClick={handleCreate}>Create Order & Invoice</Button>
          </div>
        </div>
      </Modal>

      {/* Order Detail Modal */}
      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title={`Order ${detailOrder?.orderNumber}`} size="lg">
        {detailOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-coffee-500 text-xs">Client</p><p className="text-coffee-100 font-semibold">{detailOrder.clientName}</p></div>
              <div><p className="text-coffee-500 text-xs">Date</p><p className="text-coffee-100">{detailOrder.date?.toDate ? format(detailOrder.date.toDate(), 'MMM dd, yyyy') : '—'}</p></div>
              <div><p className="text-coffee-500 text-xs">Status</p><Badge variant={statusBadgeVariant(detailOrder.status)} className="capitalize mt-1">{detailOrder.status}</Badge></div>
              <div><p className="text-coffee-500 text-xs">Currency</p><p className="text-coffee-100">{detailOrder.currency}</p></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-surface-border"><th className="text-left text-coffee-500 text-xs py-2">Item</th><th className="text-right text-coffee-500 text-xs py-2">Qty</th><th className="text-right text-coffee-500 text-xs py-2">Price/kg</th><th className="text-right text-coffee-500 text-xs py-2">Subtotal</th></tr></thead>
              <tbody>
                {detailOrder.items.map((i, idx) => (
                  <tr key={idx} className="border-b border-surface-border/50">
                    <td className="py-2 text-coffee-200">{i.itemName}</td>
                    <td className="py-2 text-right text-coffee-400">{i.quantityKg} kg</td>
                    <td className="py-2 text-right text-coffee-400">{i.pricePerKg}</td>
                    <td className="py-2 text-right text-coffee-100 font-medium">{detailOrder.currency} {i.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right space-y-1 text-sm">
              <div className="flex justify-end gap-8 text-coffee-500"><span>Subtotal</span><span>{detailOrder.currency} {detailOrder.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-end gap-8 text-coffee-100 font-bold text-base pt-1 border-t border-surface-border"><span>Total</span><span className="text-coffee-300">{detailOrder.currency} {detailOrder.total.toFixed(2)}</span></div>
            </div>
            {detailOrder.notes && <p className="text-coffee-500 text-sm italic">Note: {detailOrder.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
