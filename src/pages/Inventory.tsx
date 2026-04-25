import React, { useState, useMemo } from 'react';
import { Plus, Package, AlertTriangle, Edit2, Trash2, Search } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { useCollection } from '../hooks/useRealtimeData';
import { InventoryItem, InventoryCategory } from '../types';
import { addInventoryItem, updateInventoryItem, deleteInventoryItem } from '../services/inventoryService';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge, { statusBadgeVariant } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  raw:       'بن أخضر (خام)',
  roasted:   'قهوة محمصة',
  packaging: 'مستلزمات التغليف',
};

const CATEGORY_COLORS: Record<InventoryCategory, string> = {
  raw:       'border-l-blue-500',
  roasted:   'border-l-coffee-300',
  packaging: 'border-l-green-500',
};

interface FormState {
  name: string;
  category: InventoryCategory;
  quantity: string;
  unit: string;
  lowStockThreshold: string;
  origin: string;
  notes: string;
}

const emptyForm: FormState = {
  name: '', category: 'raw', quantity: '', unit: 'kg', lowStockThreshold: '50', origin: '', notes: '',
};

export default function Inventory() {
  const { data: items, loading } = useCollection<InventoryItem>('inventory');
  const [search, setSearch]      = useState('');
  const [catFilter, setCatFilter] = useState<InventoryCategory | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]           = useState<FormState>(emptyForm);
  const [editId, setEditId]       = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
      const matchCat    = catFilter === 'all' || i.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, catFilter]);

  const grouped = useMemo(() => {
    const cats: InventoryCategory[] = ['raw', 'roasted', 'packaging'];
    return cats.map((cat) => ({
      category: cat,
      items: filtered.filter((i) => i.category === cat),
      total: filtered.filter((i) => i.category === cat).reduce((s, i) => s + (i.quantity ?? 0), 0),
    }));
  }, [filtered]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setModalOpen(true); };
  const openEdit = (item: InventoryItem) => {
    setForm({
      name:              item.name,
      category:          item.category,
      quantity:          String(item.quantity),
      unit:              item.unit,
      lowStockThreshold: String(item.lowStockThreshold),
      origin:            item.origin ?? '',
      notes:             item.notes ?? '',
    });
    setEditId(item.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('الاسم مطلوب'); return; }
    setSaving(true);
    try {
      const payload = {
        name:              form.name.trim(),
        category:          form.category,
        quantity:          parseFloat(form.quantity) || 0,
        unit:              form.unit,
        lowStockThreshold: parseFloat(form.lowStockThreshold) || 0,
        origin:            form.origin,
        notes:             form.notes,
      };
      if (editId) {
        await updateInventoryItem(editId, payload);
        toast.success('تم تحديث الصنف');
      } else {
        await addInventoryItem(payload);
        toast.success('تم إضافة الصنف');
      }
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInventoryItem(id);
      toast.success('تم حذف الصنف');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث في المخزون…"
            className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-lg text-sm text-coffee-200 placeholder-coffee-700 focus:outline-none focus:border-coffee-500"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'raw', 'roasted', 'packaging'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                catFilter === c
                  ? 'bg-coffee-300/15 text-coffee-300 border border-coffee-300/20'
                  : 'text-coffee-600 hover:text-coffee-300 border border-transparent'
              }`}
            >
              {c === 'all' ? 'الكل' : c === 'raw' ? 'خام' : c === 'roasted' ? 'محمص' : 'تغليف'}
            </button>
          ))}
        </div>

        <Button icon={<Plus size={15} />} onClick={openAdd}>إضافة صنف</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {grouped.map(({ category, items: catItems, total }) => (
          <div key={category} className="bg-surface-card border border-surface-border rounded-xl p-4">
            <p className="text-coffee-500 text-xs font-medium uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[category]}
            </p>
            <p className="text-coffee-100 text-2xl font-bold">{total.toFixed(1)}</p>
            <p className="text-coffee-600 text-xs mt-0.5">{catItems.length} صنف مُتتبَّع</p>
            {catItems.some((i) => i.quantity <= i.lowStockThreshold) && (
              <div className="flex items-center gap-1 mt-2 text-amber-400 text-xs">
                <AlertTriangle size={12} />
                <span>تنبيه مخزون منخفض</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Items table per category */}
      {loading ? (
        <div className="text-center py-20 text-coffee-600">جارٍ التحميل…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="لا توجد أصناف في المخزون"
          description="ابدأ بإضافة أول صنف من البن أو مستلزمات التغليف."
          action={<Button icon={<Plus size={15} />} onClick={openAdd}>إضافة أول صنف</Button>}
        />
      ) : (
        grouped.map(({ category, items: catItems }) =>
          catItems.length > 0 ? (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{CATEGORY_LABELS[category]}</CardTitle>
                <Badge variant={statusBadgeVariant(category)} className="capitalize">{category}</Badge>
              </CardHeader>
              <CardBody className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      {['اسم الصنف', 'المصدر / البلد', 'الكمية', 'الوحدة', 'تنبيه عند', 'الحالة', 'الإجراءات'].map((h) => (
                        <th key={h} className={`text-coffee-500 text-xs font-medium py-3 ${h === 'الإجراءات' ? 'pr-5 text-right' : 'pl-5 text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map((item) => {
                      const isLow = item.quantity <= item.lowStockThreshold;
                      return (
                        <tr key={item.id} className={`border-b border-surface-border/50 hover:bg-surface-hover transition-colors border-l-2 ${CATEGORY_COLORS[item.category]}`}>
                          <td className="pl-5 py-3 text-coffee-100 font-medium">{item.name}</td>
                          <td className="pl-5 py-3 text-coffee-400">{item.origin || '—'}</td>
                          <td className="pl-5 py-3">
                            <span className={`font-bold ${isLow ? 'text-amber-400' : 'text-coffee-100'}`}>
                              {item.quantity.toFixed(1)}
                            </span>
                          </td>
                          <td className="pl-5 py-3 text-coffee-500">{item.unit}</td>
                          <td className="pl-5 py-3 text-coffee-500">{item.lowStockThreshold} {item.unit}</td>
                          <td className="pl-5 py-3">
                            {isLow ? (
                              <Badge variant="warning">
                                <AlertTriangle size={10} className="mr-1" />
                                مخزون منخفض
                              </Badge>
                            ) : (
                              <Badge variant="success">متوفر</Badge>
                            )}
                          </td>
                          <td className="pr-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(item)}
                                className="p-1.5 rounded-lg text-coffee-600 hover:text-coffee-300 hover:bg-surface-hover transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteId(item.id)}
                                className="p-1.5 rounded-lg text-coffee-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          ) : null,
        )
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'تعديل الصنف' : 'إضافة صنف جديد'}
      >
        <div className="space-y-4">
          <Input label="اسم الصنف" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ethiopian Yirgacheffe" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="الفئة" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as InventoryCategory })}>
              <option value="raw">بن أخضر (خام)</option>
              <option value="roasted">قهوة محمصة</option>
              <option value="packaging">مستلزمات التغليف</option>
            </Select>
            <Select label="الوحدة" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              <option value="kg">kg</option>
              <option value="bag">bag</option>
              <option value="box">box</option>
              <option value="unit">unit</option>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="الكمية الحالية" type="number" min="0" step="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <Input label="تنبيه المخزون المنخفض عند" type="number" min="0" step="0.1" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
          </div>
          <Input label="المصدر (اختياري)" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="e.g. Ethiopia" />
          <Textarea label="ملاحظات (اختياري)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button loading={saving} onClick={handleSave}>{editId ? 'حفظ التغييرات' : 'إضافة صنف'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="حذف الصنف" size="sm">
        <p className="text-coffee-300 mb-6">هل أنت متأكد من حذف هذا الصنف؟ لا يمكن التراجع عن هذا الإجراء.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>إلغاء</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)}>حذف</Button>
        </div>
      </Modal>
    </div>
  );
}
