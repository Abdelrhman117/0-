import React, { useState, useMemo } from 'react';
import { Plus, ShoppingCart, Package, X, AlertCircle, Search } from 'lucide-react';
import { orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { useCollection } from '../hooks/useRealtimeData';
import { Order, OrderItem, Client, InventoryItem, OrderStatus } from '../types';
import { createOrder, updateOrderStatus, cancelOrder } from '../services/orderService';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge, { statusBadgeVariant } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];

const statusLabels: Record<string, string> = {
  all:       'الكل',
  pending:   'قيد الانتظار',
  confirmed: 'مؤكد',
  shipped:   'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

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
    clientId: '', discount: '0', tax: '0', currency: 'EGP',
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
    if (!form.clientId) { toast.error('يرجى اختيار العميل'); return; }
    if (orderItems.some((i) => !i.inventoryItemId || !(i.quantityKg ?? 0) || !(i.pricePerKg ?? 0))) {
      toast.error('يرجى إكمال بيانات جميع الأصناف'); return;
    }
    for (const item of orderItems) {
      const inv = roastedItems.find((i) => i.id === item.inventoryItemId);
      if (inv && (item.quantityKg ?? 0) > inv.quantity) {
        toast.error(`المخزون غير كافٍ لـ ${inv.name}. المتاح: ${inv.quantity} كجم`); return;
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
      toast.success(`تم إنشاء الطلب ${result.orderNumber} وتم إنشاء الفاتورة تلقائياً`);
      setModal(false);
      setOrderItems([{ tempId: crypto.randomUUID(), inventoryItemId: '', itemName: '', quantityKg: 0, pricePerKg: 0, subtotal: 0 }]);
      setForm({ clientId: '', discount: '0', tax: '0', currency: 'EGP', notes: '', date: new Date().toISOString().split('T')[0] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      if (status === 'cancelled') {
        const order = orders.find((o) => o.id === orderId);
        if (!order) return;
        await cancelOrder(order);
        toast.success('تم إلغاء الطلب وإعادة المخزون');
      } else {
        await updateOrderStatus(orderId, status);
        toast.success(`تم تحديث حالة الطلب إلى: ${statusLabels[status] ?? status}`);
      }
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
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="البحث في الطلبات…" className="w-full pr-9 pl-4 py-2 bg-surface-card border border-surface-border rounded-lg text-sm text-coffee-200 placeholder-coffee-700 focus:outline-none focus:border-coffee-500" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', ...STATUS_FLOW, 'cancelled'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-coffee-300/15 text-coffee-300 border border-coffee-300/20' : 'text-coffee-600 hover:text-coffee-300 border border-transparent'}`}>
              {statusLabels[s] ?? s}
            </button>
          ))}
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setModal(true)} disabled={clients.length === 0 || roastedItems.length === 0}>
          طلب جديد
        </Button>
      </div>

      {(clients.length === 0 || roastedItems.length === 0) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-sm text-amber-300">
          <AlertCircle size={16} className="flex-shrink-0" />
          {clients.length === 0 ? 'يرجى إضافة عملاء أولاً.' : 'يرجى إضافة أصناف محمصة في المخزون أولاً.'}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-coffee-600">جارٍ التحميل…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="لا توجد طلبات" description="أنشئ أول طلب مبيعات." action={<Button icon={<Plus size={15} />} onClick={() => setModal(true)} disabled={clients.length === 0 || roastedItems.length === 0}>طلب جديد</Button>} />
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['رقم الطلب', 'التاريخ', 'العميل', 'النوع', 'الإجمالي', 'الحالة', 'إجراءات'].map((h) => (
                    <th key={h} className={`text-coffee-500 text-xs font-medium py-3 ${h === 'إجراءات' ? 'pl-5 text-left' : 'pr-5 text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
                    <td className="pr-5 py-3 text-coffee-300 font-mono text-xs font-bold">{o.orderNumber}</td>
                    <td className="pr-5 py-3 text-coffee-400 text-xs">
                      {o.date?.toDate ? format(o.date.toDate(), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className="pr-5 py-3 text-coffee-200 font-medium">{o.clientName}</td>
                    <td className="pr-5 py-3"><Badge variant={o.clientType === 'export' ? 'info' : 'gold'}>{o.clientType === 'export' ? 'تصدير' : 'محلي'}</Badge></td>
                    <td className="pr-5 py-3 text-coffee-100 font-bold">{o.currency} {o.total?.toLocaleString()}</td>
                    <td className="pr-5 py-3"><Badge variant={statusBadgeVariant(o.status)}>{statusLabels[o.status] ?? o.status}</Badge></td>
                    <td className="pl-5 py-3 text-left">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setDetailOrder(o)} className="px-2 py-1 rounded text-xs text-coffee-400 hover:text-coffee-200 hover:bg-surface-hover transition-colors">تفاصيل</button>
                        {o.status !== 'delivered' && o.status !== 'cancelled' && (
                          <Select
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                            className="text-xs py-1 px-2 w-32"
                          >
                            {STATUS_FLOW.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                            <option value="cancelled">ملغي</option>
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
      <Modal open={modal} onClose={() => setModal(false)} title="إنشاء طلب جديد" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="العميل" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">اختر العميل…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type === 'export' ? 'تصدير' : 'محلي'})</option>)}
            </Select>
            <Select label="العملة" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="EGP">EGP — جنيه مصري</option>
              <option value="USD">USD — دولار</option>
              <option value="EUR">EUR — يورو</option>
              <option value="SAR">SAR — ريال سعودي</option>
              <option value="AED">AED — درهم إماراتي</option>
            </Select>
            <Input label="تاريخ الطلب" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-coffee-400 uppercase tracking-wider">أصناف الطلب</label>
              <Button variant="ghost" size="sm" icon={<Plus size={13} />} onClick={addItem}>إضافة صنف</Button>
            </div>

            <div className="space-y-2">
              {orderItems.map((item) => (
                <div key={item.tempId} className="bg-coffee-950 border border-surface-border rounded-lg p-3">
                  {/* Mobile: stacked; Desktop: row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5">
                    <Select value={item.inventoryItemId ?? ''} onChange={(e) => updateItem(item.tempId!, 'inventoryItemId', e.target.value)}>
                      <option value="">اختر الصنف…</option>
                      {roastedItems.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.quantity} كجم)</option>)}
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
                    <Input type="number" min="0" step="0.1" placeholder="الكمية (كجم)" value={item.quantityKg || ''} onChange={(e) => updateItem(item.tempId!, 'quantityKg', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="sm:col-span-3">
                    <Input type="number" min="0" step="0.01" placeholder="سعر/كجم" value={item.pricePerKg || ''} onChange={(e) => updateItem(item.tempId!, 'pricePerKg', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-between sm:justify-center">
                    <span className="text-coffee-300 font-bold text-xs">{(item.subtotal ?? 0).toFixed(0)}</span>
                    {orderItems.length > 1 && (
                      <button onClick={() => removeItem(item.tempId!)} className="sm:hidden text-coffee-700 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="hidden sm:block sm:col-span-1 text-left">
                    {orderItems.length > 1 && (
                      <button onClick={() => removeItem(item.tempId!)} className="text-coffee-700 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea label="ملاحظات (اختياري)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات الطلب…" />
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <Input label="الخصم" type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                <Input label="الضريبة %" type="number" min="0" max="100" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
              </div>
              <div className="bg-coffee-950 border border-surface-border rounded-lg p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-coffee-500"><span>المجموع الفرعي</span><span>{form.currency} {subtotal.toFixed(2)}</span></div>
                {discount > 0 && <div className="flex justify-between text-red-400"><span>الخصم</span><span>- {form.currency} {discount.toFixed(2)}</span></div>}
                {tax > 0 && <div className="flex justify-between text-coffee-500"><span>الضريبة ({tax}%)</span><span>{form.currency} {(subtotal * tax / 100).toFixed(2)}</span></div>}
                <div className="flex justify-between text-coffee-100 font-bold border-t border-surface-border pt-2 mt-2">
                  <span>الإجمالي</span>
                  <span className="text-coffee-300 text-base">{form.currency} {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-start gap-3">
            <Button loading={saving} icon={<ShoppingCart size={15} />} onClick={handleCreate}>إنشاء الطلب والفاتورة</Button>
            <Button variant="secondary" onClick={() => setModal(false)}>إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Order Detail Modal */}
      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title={`طلب رقم ${detailOrder?.orderNumber}`} size="lg">
        {detailOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-coffee-500 text-xs">العميل</p><p className="text-coffee-100 font-semibold">{detailOrder.clientName}</p></div>
              <div><p className="text-coffee-500 text-xs">التاريخ</p><p className="text-coffee-100">{detailOrder.date?.toDate ? format(detailOrder.date.toDate(), 'dd/MM/yyyy') : '—'}</p></div>
              <div><p className="text-coffee-500 text-xs">الحالة</p><Badge variant={statusBadgeVariant(detailOrder.status)} className="mt-1">{statusLabels[detailOrder.status] ?? detailOrder.status}</Badge></div>
              <div><p className="text-coffee-500 text-xs">العملة</p><p className="text-coffee-100">{detailOrder.currency}</p></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-surface-border"><th className="text-right text-coffee-500 text-xs py-2">الصنف</th><th className="text-left text-coffee-500 text-xs py-2">الكمية</th><th className="text-left text-coffee-500 text-xs py-2">السعر/كجم</th><th className="text-left text-coffee-500 text-xs py-2">المجموع</th></tr></thead>
              <tbody>
                {detailOrder.items.map((i, idx) => (
                  <tr key={idx} className="border-b border-surface-border/50">
                    <td className="py-2 text-coffee-200 text-right">{i.itemName}</td>
                    <td className="py-2 text-left text-coffee-400">{i.quantityKg} كجم</td>
                    <td className="py-2 text-left text-coffee-400">{i.pricePerKg}</td>
                    <td className="py-2 text-left text-coffee-100 font-medium">{detailOrder.currency} {i.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-left space-y-1 text-sm">
              <div className="flex justify-end gap-8 text-coffee-500"><span>المجموع الفرعي</span><span>{detailOrder.currency} {detailOrder.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-end gap-8 text-coffee-100 font-bold text-base pt-1 border-t border-surface-border"><span>الإجمالي</span><span className="text-coffee-300">{detailOrder.currency} {detailOrder.total.toFixed(2)}</span></div>
            </div>
            {detailOrder.notes && <p className="text-coffee-500 text-sm italic">ملاحظة: {detailOrder.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
