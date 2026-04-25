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
  raw:       'Green Beans (Raw)',
  roasted:   'Roasted Coffee',
  packaging: 'Packaging Materials',
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
    if (!form.name.trim()) { toast.error('Name is required'); return; }
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
        toast.success('Item updated');
      } else {
        await addInventoryItem(payload);
        toast.success('Item added');
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
      toast.success('Item removed');
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
            placeholder="Search inventory…"
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
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>

        <Button icon={<Plus size={15} />} onClick={openAdd}>Add Item</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {grouped.map(({ category, items: catItems, total }) => (
          <div key={category} className="bg-surface-card border border-surface-border rounded-xl p-4">
            <p className="text-coffee-500 text-xs font-medium uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[category]}
            </p>
            <p className="text-coffee-100 text-2xl font-bold">{total.toFixed(1)}</p>
            <p className="text-coffee-600 text-xs mt-0.5">{catItems.length} items tracked</p>
            {catItems.some((i) => i.quantity <= i.lowStockThreshold) && (
              <div className="flex items-center gap-1 mt-2 text-amber-400 text-xs">
                <AlertTriangle size={12} />
                <span>Low stock alert</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Items table per category */}
      {loading ? (
        <div className="text-center py-20 text-coffee-600">Loading inventory…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory items"
          description="Start by adding your first coffee bean or packaging item."
          action={<Button icon={<Plus size={15} />} onClick={openAdd}>Add First Item</Button>}
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
                      {['Name', 'Origin', 'Quantity', 'Unit', 'Low Stock At', 'Status', 'Actions'].map((h) => (
                        <th key={h} className={`text-coffee-500 text-xs font-medium py-3 ${h === 'Actions' ? 'pr-5 text-right' : 'pl-5 text-left'}`}>
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
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="success">In Stock</Badge>
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
        title={editId ? 'Edit Inventory Item' : 'Add Inventory Item'}
      >
        <div className="space-y-4">
          <Input label="Item Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ethiopian Yirgacheffe" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as InventoryCategory })}>
              <option value="raw">Green Beans (Raw)</option>
              <option value="roasted">Roasted Coffee</option>
              <option value="packaging">Packaging Materials</option>
            </Select>
            <Select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              <option value="kg">kg</option>
              <option value="bag">bag</option>
              <option value="box">box</option>
              <option value="unit">unit</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Current Quantity" type="number" min="0" step="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <Input label="Low Stock Alert At" type="number" min="0" step="0.1" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
          </div>
          <Input label="Origin / Country (optional)" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="e.g. Ethiopia" />
          <Textarea label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>{editId ? 'Save Changes' : 'Add Item'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Item" size="sm">
        <p className="text-coffee-300 mb-6">Are you sure you want to remove this item from inventory? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
