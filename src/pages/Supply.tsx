import React, { useState, useMemo } from 'react';
import { Plus, Truck, Search, Edit2, Trash2, Building2 } from 'lucide-react';
import { orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { useCollection } from '../hooks/useRealtimeData';
import { SupplyShipment, Supplier, InventoryItem } from '../types';
import { addSupplyShipment } from '../services/inventoryService';
import { addSupplier, updateSupplier, deleteSupplier } from '../services/supplierService';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function Supply() {
  const { data: shipments, loading } = useCollection<SupplyShipment>('supply_shipments', [orderBy('createdAt', 'desc')]);
  const { data: suppliers }          = useCollection<Supplier>('suppliers');
  const { data: rawItems }           = useCollection<InventoryItem>('inventory');
  const rawInventory                 = useMemo(() => rawItems.filter((i) => i.category === 'raw'), [rawItems]);

  const [tab, setTab]                        = useState<'shipments' | 'suppliers'>('shipments');
  const [shipmentModal, setShipmentModal]    = useState(false);
  const [supplierModal, setSupplierModal]    = useState(false);
  const [editSupplier, setEditSupplier]      = useState<Supplier | null>(null);
  const [saving, setSaving]                  = useState(false);
  const [search, setSearch]                  = useState('');

  const [shipForm, setShipForm] = useState({
    supplierId: '', inventoryItemId: '', weightKg: '', costPerKg: '', currency: 'USD', date: new Date().toISOString().split('T')[0], notes: '',
  });

  const [supForm, setSupForm] = useState({
    name: '', country: '', contactName: '', email: '', phone: '',
  });

  const filteredShipments = useMemo(() =>
    shipments.filter((s) => s.supplierName.toLowerCase().includes(search.toLowerCase()) || s.itemName.toLowerCase().includes(search.toLowerCase())),
    [shipments, search],
  );

  const openNewShipment = () => {
    setShipForm({ supplierId: '', inventoryItemId: '', weightKg: '', costPerKg: '', currency: 'USD', date: new Date().toISOString().split('T')[0], notes: '' });
    setShipmentModal(true);
  };

  const handleShipmentSave = async () => {
    if (!shipForm.supplierId) { toast.error('Select a supplier'); return; }
    if (!shipForm.inventoryItemId) { toast.error('Select an inventory item'); return; }
    if (!shipForm.weightKg || !shipForm.costPerKg) { toast.error('Fill in weight and cost'); return; }
    setSaving(true);
    try {
      const supplier  = suppliers.find((s) => s.id === shipForm.supplierId);
      const invItem   = rawInventory.find((i) => i.id === shipForm.inventoryItemId);
      await addSupplyShipment({
        supplierId:       shipForm.supplierId,
        supplierName:     supplier?.name ?? '',
        inventoryItemId:  shipForm.inventoryItemId,
        itemName:         invItem?.name ?? '',
        weightKg:         parseFloat(shipForm.weightKg),
        costPerKg:        parseFloat(shipForm.costPerKg),
        currency:         shipForm.currency,
        date:             new Date(shipForm.date),
        notes:            shipForm.notes,
      });
      toast.success('Shipment recorded & inventory updated!');
      setShipmentModal(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditSupplier = (s: Supplier) => {
    setEditSupplier(s);
    setSupForm({ name: s.name, country: s.country, contactName: s.contactName ?? '', email: s.email ?? '', phone: s.phone ?? '' });
    setSupplierModal(true);
  };

  const openNewSupplier = () => {
    setEditSupplier(null);
    setSupForm({ name: '', country: '', contactName: '', email: '', phone: '' });
    setSupplierModal(true);
  };

  const handleSupplierSave = async () => {
    if (!supForm.name.trim()) { toast.error('Supplier name required'); return; }
    setSaving(true);
    try {
      if (editSupplier) {
        await updateSupplier(editSupplier.id, supForm);
        toast.success('Supplier updated');
      } else {
        await addSupplier(supForm);
        toast.success('Supplier added');
      }
      setSupplierModal(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await deleteSupplier(id);
      toast.success('Supplier deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const selectedSupplier = suppliers.find((s) => s.id === shipForm.supplierId);

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex items-center justify-between">
        <div className="flex bg-surface-card border border-surface-border rounded-lg p-1 gap-1">
          {(['shipments', 'suppliers'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-coffee-300/15 text-coffee-300' : 'text-coffee-600 hover:text-coffee-300'
              }`}
            >
              {t === 'shipments' ? 'Shipments' : 'Suppliers'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {tab === 'shipments' && (
            <Button icon={<Plus size={15} />} onClick={openNewShipment}
              disabled={suppliers.length === 0 || rawInventory.length === 0}
            >
              Record Shipment
            </Button>
          )}
          {tab === 'suppliers' && (
            <Button icon={<Plus size={15} />} onClick={openNewSupplier}>Add Supplier</Button>
          )}
        </div>
      </div>

      {/* ── SHIPMENTS ──────────────────────────────────────────────────────── */}
      {tab === 'shipments' && (
        <>
          {(suppliers.length === 0 || rawInventory.length === 0) && (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-900/20 border border-blue-700/30 rounded-xl text-sm text-blue-300">
              <Truck size={16} className="flex-shrink-0" />
              {suppliers.length === 0
                ? 'Add at least one supplier before recording shipments.'
                : 'Add at least one raw inventory item before recording shipments.'}
            </div>
          )}

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shipments…"
              className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-lg text-sm text-coffee-200 placeholder-coffee-700 focus:outline-none focus:border-coffee-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-20 text-coffee-600">Loading…</div>
          ) : filteredShipments.length === 0 ? (
            <EmptyState icon={Truck} title="No shipments recorded" description="Record your first incoming coffee shipment." action={<Button icon={<Plus size={15} />} onClick={openNewShipment} disabled={suppliers.length === 0 || rawInventory.length === 0}>Record Shipment</Button>} />
          ) : (
            <Card>
              <CardBody className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      {['Date', 'Supplier', 'Item', 'Weight', 'Cost/kg', 'Total Cost', 'Currency'].map((h) => (
                        <th key={h} className="text-left text-coffee-500 text-xs font-medium px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShipments.map((s) => (
                      <tr key={s.id} className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
                        <td className="px-5 py-3 text-coffee-400 text-xs">
                          {s.date?.toDate ? format(s.date.toDate(), 'MMM dd, yyyy') : '—'}
                        </td>
                        <td className="px-5 py-3 text-coffee-200 font-medium">{s.supplierName}</td>
                        <td className="px-5 py-3 text-coffee-300">{s.itemName}</td>
                        <td className="px-5 py-3 text-coffee-100 font-bold">{s.weightKg} kg</td>
                        <td className="px-5 py-3 text-coffee-400">{s.costPerKg}</td>
                        <td className="px-5 py-3 text-green-400 font-semibold">{s.totalCost.toLocaleString()}</td>
                        <td className="px-5 py-3"><Badge variant="info">{s.currency}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* ── SUPPLIERS ──────────────────────────────────────────────────────── */}
      {tab === 'suppliers' && (
        suppliers.length === 0 ? (
          <EmptyState icon={Building2} title="No suppliers yet" description="Add your coffee bean suppliers to start recording shipments." action={<Button icon={<Plus size={15} />} onClick={openNewSupplier}>Add First Supplier</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <Card key={s.id} className="hover:border-coffee-700/50 transition-colors">
                <CardBody>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-coffee-300/10 flex items-center justify-center">
                      <Building2 size={18} className="text-coffee-300" />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditSupplier(s)} className="p-1.5 rounded-lg text-coffee-600 hover:text-coffee-300 hover:bg-surface-hover transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDeleteSupplier(s.id)} className="p-1.5 rounded-lg text-coffee-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <h3 className="text-coffee-100 font-semibold mb-0.5">{s.name}</h3>
                  <p className="text-coffee-500 text-sm mb-3">{s.country}</p>
                  {s.contactName && <p className="text-coffee-400 text-xs">Contact: {s.contactName}</p>}
                  {s.email && <p className="text-coffee-600 text-xs">{s.email}</p>}
                  <div className="mt-3 pt-3 border-t border-surface-border">
                    <p className="text-coffee-500 text-xs">Total Purchased</p>
                    <p className="text-coffee-300 font-bold text-lg">{s.totalPurchased.toFixed(0)} kg</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Shipment Modal */}
      <Modal open={shipmentModal} onClose={() => setShipmentModal(false)} title="Record New Shipment">
        <div className="space-y-4">
          <Select label="Supplier" value={shipForm.supplierId} onChange={(e) => setShipForm({ ...shipForm, supplierId: e.target.value })}>
            <option value="">Select supplier…</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.country}</option>)}
          </Select>
          <Select label="Inventory Item (Raw Beans)" value={shipForm.inventoryItemId} onChange={(e) => setShipForm({ ...shipForm, inventoryItemId: e.target.value })}>
            <option value="">Select item…</option>
            {rawInventory.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Weight (kg)" type="number" min="0" step="0.1" value={shipForm.weightKg} onChange={(e) => setShipForm({ ...shipForm, weightKg: e.target.value })} />
            <Input label="Cost per kg" type="number" min="0" step="0.01" value={shipForm.costPerKg} onChange={(e) => setShipForm({ ...shipForm, costPerKg: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Currency" value={shipForm.currency} onChange={(e) => setShipForm({ ...shipForm, currency: e.target.value })}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
            </Select>
            <Input label="Date" type="date" value={shipForm.date} onChange={(e) => setShipForm({ ...shipForm, date: e.target.value })} />
          </div>
          {shipForm.weightKg && shipForm.costPerKg && (
            <div className="px-4 py-3 bg-coffee-300/5 border border-coffee-300/15 rounded-lg">
              <p className="text-coffee-500 text-xs mb-1">Total Cost Preview</p>
              <p className="text-coffee-300 text-xl font-bold">
                {shipForm.currency} {(parseFloat(shipForm.weightKg) * parseFloat(shipForm.costPerKg)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          <Textarea label="Notes (optional)" value={shipForm.notes} onChange={(e) => setShipForm({ ...shipForm, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShipmentModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleShipmentSave}>Record & Update Stock</Button>
          </div>
        </div>
      </Modal>

      {/* Supplier Modal */}
      <Modal open={supplierModal} onClose={() => setSupplierModal(false)} title={editSupplier ? 'Edit Supplier' : 'Add Supplier'}>
        <div className="space-y-4">
          <Input label="Company Name" value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} placeholder="e.g. Ethiopian Coffee Exports" />
          <Input label="Country" value={supForm.country} onChange={(e) => setSupForm({ ...supForm, country: e.target.value })} placeholder="e.g. Ethiopia" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Name (optional)" value={supForm.contactName} onChange={(e) => setSupForm({ ...supForm, contactName: e.target.value })} />
            <Input label="Phone (optional)" value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} />
          </div>
          <Input label="Email (optional)" type="email" value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setSupplierModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSupplierSave}>{editSupplier ? 'Save Changes' : 'Add Supplier'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
