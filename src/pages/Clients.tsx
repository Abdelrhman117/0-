import React, { useState, useMemo } from 'react';
import { Plus, Users, Globe, MapPin, Mail, Phone, TrendingUp, Edit2, Trash2, Search, DollarSign } from 'lucide-react';
import { orderBy } from 'firebase/firestore';
import { useCollection } from '../hooks/useRealtimeData';
import { Client, ClientType } from '../types';
import { addClient, updateClient, deleteClient, recordPayment } from '../services/clientService';
import { Card, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

interface FormState {
  name: string; type: ClientType; country: string;
  contactName: string; email: string; phone: string; address: string;
}
const emptyForm: FormState = { name: '', type: 'local', country: '', contactName: '', email: '', phone: '', address: '' };

export default function Clients() {
  const { data: clients, loading } = useCollection<Client>('clients', [orderBy('createdAt', 'desc')]);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all');
  const [modal, setModal]           = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [payModal, setPayModal]     = useState<Client | null>(null);
  const [payAmount, setPayAmount]   = useState('');
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  const filtered = useMemo(() =>
    clients.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.country.toLowerCase().includes(search.toLowerCase());
      const matchType   = typeFilter === 'all' || c.type === typeFilter;
      return matchSearch && matchType;
    }),
    [clients, search, typeFilter],
  );

  const totalBalance = useMemo(() => clients.reduce((s, c) => s + (c.balance ?? 0), 0), [clients]);
  const totalVolume  = useMemo(() => clients.reduce((s, c) => s + (c.totalVolumeKg ?? 0), 0), [clients]);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setModal(true); };
  const openEdit = (c: Client) => {
    setEditId(c.id);
    setForm({ name: c.name, type: c.type, country: c.country, contactName: c.contactName ?? '', email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '' });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Client name required'); return; }
    setSaving(true);
    try {
      if (editId) {
        await updateClient(editId, form);
        toast.success('Client updated');
      } else {
        await addClient(form);
        toast.success('Client added');
      }
      setModal(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async () => {
    if (!payModal || !payAmount) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter valid amount'); return; }
    setSaving(true);
    try {
      await recordPayment(payModal.id, amount);
      toast.success(`Payment of $${amount.toLocaleString()} recorded`);
      setPayModal(null);
      setPayAmount('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClient(id);
      toast.success('Client removed');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Clients', value: clients.length, sub: `${clients.filter((c) => c.type === 'local').length} local · ${clients.filter((c) => c.type === 'export').length} export` },
          { label: 'Total Outstanding', value: `$${totalBalance.toLocaleString()}`, sub: 'Unpaid balance' },
          { label: 'Total Volume Traded', value: `${totalVolume.toFixed(1)} kg`, sub: 'All time' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-xl p-4">
            <p className="text-coffee-500 text-xs uppercase tracking-wider mb-2">{label}</p>
            <p className="text-coffee-100 text-xl font-bold">{value}</p>
            <p className="text-coffee-600 text-xs mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full pl-9 pr-4 py-2 bg-surface-card border border-surface-border rounded-lg text-sm text-coffee-200 placeholder-coffee-700 focus:outline-none focus:border-coffee-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'local', 'export'] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${typeFilter === t ? 'bg-coffee-300/15 text-coffee-300 border border-coffee-300/20' : 'text-coffee-600 hover:text-coffee-300 border border-transparent'}`}>
              {t === 'local' ? 'Local' : t === 'export' ? 'Export' : 'All'}
            </button>
          ))}
        </div>
        <Button icon={<Plus size={15} />} onClick={openAdd}>Add Client</Button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-coffee-600">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No clients found" description="Add your first client to start managing accounts." action={<Button icon={<Plus size={15} />} onClick={openAdd}>Add Client</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <Card key={client.id} className="hover:border-coffee-700/50 transition-colors group">
              <CardBody>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${client.type === 'export' ? 'bg-blue-400/10' : 'bg-coffee-300/10'}`}>
                      {client.type === 'export' ? <Globe size={18} className="text-blue-400" /> : <MapPin size={18} className="text-coffee-300" />}
                    </div>
                    <div>
                      <h3 className="text-coffee-100 font-semibold text-sm leading-tight">{client.name}</h3>
                      <p className="text-coffee-500 text-xs">{client.country}</p>
                    </div>
                  </div>
                  <Badge variant={client.type === 'export' ? 'info' : 'gold'} className="capitalize">{client.type}</Badge>
                </div>

                {/* Contact */}
                <div className="space-y-1.5 mb-4">
                  {client.email && (
                    <div className="flex items-center gap-2 text-coffee-500 text-xs">
                      <Mail size={11} />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-coffee-500 text-xs">
                      <Phone size={11} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-coffee-950 rounded-lg">
                  <div className="text-center">
                    <p className="text-coffee-600 text-[10px] mb-0.5">Orders</p>
                    <p className="text-coffee-200 font-bold text-sm">{client.totalOrders}</p>
                  </div>
                  <div className="text-center border-x border-surface-border">
                    <p className="text-coffee-600 text-[10px] mb-0.5">Volume</p>
                    <p className="text-coffee-200 font-bold text-sm">{client.totalVolumeKg.toFixed(0)} kg</p>
                  </div>
                  <div className="text-center">
                    <p className="text-coffee-600 text-[10px] mb-0.5">Balance</p>
                    <p className={`font-bold text-sm ${client.balance > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                      ${client.balance.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {client.balance > 0 && (
                    <Button variant="secondary" size="sm" icon={<DollarSign size={12} />} className="flex-1" onClick={() => { setPayModal(client); setPayAmount(''); }}>
                      Record Payment
                    </Button>
                  )}
                  <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg text-coffee-600 hover:text-coffee-300 hover:bg-surface-hover transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteId(client.id)} className="p-1.5 rounded-lg text-coffee-600 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Client' : 'Add Client'}>
        <div className="space-y-4">
          <Input label="Client / Company Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Arabia Coffee Trading" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Client Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ClientType })}>
              <option value="local">Local</option>
              <option value="export">Export</option>
            </Select>
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. Saudi Arabia" />
          </div>
          <Input label="Contact Person (optional)" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Address (optional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>{editId ? 'Save Changes' : 'Add Client'}</Button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Record Payment" size="sm">
        {payModal && (
          <div className="space-y-4">
            <div className="px-4 py-3 bg-coffee-950 border border-surface-border rounded-lg">
              <p className="text-coffee-500 text-xs mb-1">Client</p>
              <p className="text-coffee-100 font-semibold">{payModal.name}</p>
              <p className="text-coffee-500 text-xs mt-2 mb-1">Outstanding Balance</p>
              <p className="text-amber-400 text-xl font-bold">${payModal.balance.toLocaleString()}</p>
            </div>
            <Input label="Payment Amount (USD)" type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPayModal(null)}>Cancel</Button>
              <Button loading={saving} icon={<DollarSign size={14} />} onClick={handlePayment}>Record Payment</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Client" size="sm">
        <p className="text-coffee-300 mb-6">Are you sure you want to remove this client? All historical records will remain but the client will no longer be accessible.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
