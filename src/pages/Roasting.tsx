import React, { useState, useMemo } from 'react';
import { Plus, Flame, Thermometer, Clock, User, AlertCircle } from 'lucide-react';
import { orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { useCollection } from '../hooks/useRealtimeData';
import { RoastingBatch, InventoryItem } from '../types';
import { logRoastingBatch } from '../services/roastingService';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge, { statusBadgeVariant } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

const ROAST_PROFILES = [
  { value: 'light',       label: 'تحميص فاتح',    shrink: '12%', color: 'text-amber-300'   },
  { value: 'medium',      label: 'تحميص متوسط',   shrink: '15%', color: 'text-amber-500'   },
  { value: 'medium-dark', label: 'متوسط داكن',    shrink: '18%', color: 'text-amber-700'   },
  { value: 'dark',        label: 'تحميص داكن',    shrink: '22%', color: 'text-coffee-400'  },
];

const profileColors: Record<string, string> = {
  light:        'bg-amber-300/10 text-amber-300 border-amber-300/20',
  medium:       'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'medium-dark':'bg-amber-700/10 text-amber-600 border-amber-700/20',
  dark:         'bg-coffee-400/10 text-coffee-400 border-coffee-400/20',
};

export default function Roasting() {
  const { data: batches, loading } = useCollection<RoastingBatch>('roasting_batches', [orderBy('createdAt', 'desc')]);
  const { data: inventory }        = useCollection<InventoryItem>('inventory');

  const rawItems     = useMemo(() => inventory.filter((i) => i.category === 'raw'),     [inventory]);
  const roastedItems = useMemo(() => inventory.filter((i) => i.category === 'roasted'), [inventory]);

  type RoastProfile = 'light' | 'medium' | 'medium-dark' | 'dark';
  interface RoastForm {
    rawItemId: string; roastedItemId: string; rawWeightKg: string;
    roastProfile: RoastProfile; temperatureC: string; durationMin: string;
    roasterName: string; notes: string; date: string;
  }
  const defaultForm: RoastForm = {
    rawItemId: '', roastedItemId: '', rawWeightKg: '', roastProfile: 'medium',
    temperatureC: '220', durationMin: '15', roasterName: '', notes: '',
    date: new Date().toISOString().split('T')[0],
  };

  const [modal, setModal]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState<RoastForm>(defaultForm);

  const selectedRawItem     = rawItems.find((i) => i.id === form.rawItemId);
  const selectedRoastedItem = roastedItems.find((i) => i.id === form.roastedItemId);
  const shrinkageMap: Record<string, number> = { light: 0.12, medium: 0.15, 'medium-dark': 0.18, dark: 0.22 };
  const shrinkagePct   = shrinkageMap[form.roastProfile] ?? 0.15;
  const roastedPreview = form.rawWeightKg ? (parseFloat(form.rawWeightKg) * (1 - shrinkagePct)).toFixed(2) : null;
  const lossPreview    = form.rawWeightKg ? (parseFloat(form.rawWeightKg) * shrinkagePct).toFixed(2) : null;

  const canRoast = selectedRawItem && parseFloat(form.rawWeightKg) > 0 && parseFloat(form.rawWeightKg) <= (selectedRawItem?.quantity ?? 0);

  const handleSave = async () => {
    if (!form.rawItemId)     { toast.error('اختر نوع البن الخام'); return; }
    if (!form.roastedItemId) { toast.error('اختر وجهة البن المحمص'); return; }
    if (!form.rawWeightKg || parseFloat(form.rawWeightKg) <= 0) { toast.error('أدخل وزنًا صحيحًا'); return; }
    if (!canRoast)           { toast.error(`مخزون غير كافٍ. المتاح: ${selectedRawItem?.quantity} kg`); return; }
    if (!form.roasterName)   { toast.error('أدخل اسم المحمص'); return; }
    setSaving(true);
    try {
      const result = await logRoastingBatch({
        rawItemId:       form.rawItemId,
        rawItemName:     selectedRawItem?.name ?? '',
        roastedItemId:   form.roastedItemId,
        roastedItemName: selectedRoastedItem?.name ?? '',
        rawWeightKg:     parseFloat(form.rawWeightKg),
        roastProfile:    form.roastProfile,
        temperatureC:    parseFloat(form.temperatureC) || 220,
        durationMin:     parseFloat(form.durationMin) || 15,
        roasterName:     form.roasterName,
        notes:           form.notes,
        date:            new Date(form.date),
      });
      toast.success(`تم تسجيل الدُفعة ${result.batchNumber}! ${result.roastedWeightKg} كجم محمص.`);
      setForm(defaultForm);
      setModal(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const totalRoasted = useMemo(() => batches.reduce((s, b) => s + (b.roastedWeightKg ?? 0), 0), [batches]);
  const avgShrinkage = useMemo(() => {
    if (!batches.length) return 0;
    return batches.reduce((s, b) => s + (b.shrinkagePct ?? 0), 0) / batches.length;
  }, [batches]);

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-coffee-500 text-xs uppercase tracking-wider">إجمالي الدُفعات</p>
            <p className="text-coffee-100 text-2xl font-bold">{batches.length}</p>
          </div>
          <div className="w-px bg-surface-border" />
          <div className="text-center">
            <p className="text-coffee-500 text-xs uppercase tracking-wider">إجمالي المحمص</p>
            <p className="text-coffee-300 text-2xl font-bold">{totalRoasted.toFixed(1)} kg</p>
          </div>
          <div className="w-px bg-surface-border" />
          <div className="text-center">
            <p className="text-coffee-500 text-xs uppercase tracking-wider">متوسط الفقد</p>
            <p className="text-amber-400 text-2xl font-bold">{avgShrinkage.toFixed(1)}%</p>
          </div>
        </div>
        <Button
          icon={<Flame size={15} />}
          onClick={() => setModal(true)}
          disabled={rawItems.length === 0 || roastedItems.length === 0}
        >
          تسجيل دُفعة تحميص
        </Button>
      </div>

      {(rawItems.length === 0 || roastedItems.length === 0) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-900/20 border border-amber-700/30 rounded-xl text-sm text-amber-300">
          <AlertCircle size={16} className="flex-shrink-0" />
          يجب إضافة أصناف خام ومحمص في المخزون قبل تسجيل دُفعة تحميص
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-coffee-600">جارٍ التحميل…</div>
      ) : batches.length === 0 ? (
        <EmptyState
          icon={Flame}
          title="لا توجد دُفعات تحميص"
          description="سجّل أول جلسة تحميص لبدء تتبع الإنتاج."
          action={<Button icon={<Flame size={15} />} onClick={() => setModal(true)} disabled={rawItems.length === 0 || roastedItems.length === 0}>تسجيل أول دُفعة</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {batches.map((b) => (
            <Card key={b.id} className="hover:border-coffee-700/50 transition-colors">
              <CardBody className="p-5">
                <div className="flex items-start gap-4">
                  {/* Profile badge */}
                  <div className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-semibold uppercase tracking-wider ${profileColors[b.roastProfile] ?? ''}`}>
                    {b.roastProfile.replace('-', '\n')}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-coffee-300 font-mono text-sm font-bold">{b.batchNumber}</span>
                      <span className="text-coffee-500 text-xs">
                        {b.date?.toDate ? format(b.date.toDate(), 'MMM dd, yyyy') : '—'}
                      </span>
                    </div>
                    <p className="text-coffee-200 font-medium">{b.rawItemName} → {b.roastedItemName}</p>
                    {b.notes && <p className="text-coffee-600 text-xs mt-1 truncate">{b.notes}</p>}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 flex-shrink-0 text-right">
                    <div>
                      <p className="text-coffee-500 text-xs">المدخل الخام</p>
                      <p className="text-coffee-200 font-bold">{b.rawWeightKg} kg</p>
                    </div>
                    <div>
                      <p className="text-coffee-500 text-xs">الناتج المحمص</p>
                      <p className="text-coffee-300 font-bold">{b.roastedWeightKg} kg</p>
                    </div>
                    <div>
                      <p className="text-coffee-500 text-xs">الفقد</p>
                      <p className="text-amber-400 font-bold">{b.shrinkagePct.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                {/* Process details */}
                <div className="flex items-center gap-5 mt-4 pt-4 border-t border-surface-border">
                  <div className="flex items-center gap-1.5 text-coffee-500 text-xs">
                    <Thermometer size={13} className="text-red-400" />
                    {b.temperatureC}°C
                  </div>
                  <div className="flex items-center gap-1.5 text-coffee-500 text-xs">
                    <Clock size={13} className="text-blue-400" />
                    {b.durationMin} min
                  </div>
                  <div className="flex items-center gap-1.5 text-coffee-500 text-xs">
                    <User size={13} className="text-coffee-400" />
                    {b.roasterName}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Roasting Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="تسجيل دُفعة تحميص" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="البن الأخضر الخام" value={form.rawItemId} onChange={(e) => setForm({ ...form, rawItemId: e.target.value })}>
              <option value="">اختر البن الخام...</option>
              {rawItems.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.quantity} كجم متاح)</option>)}
            </Select>
            <Select label="وجهة البن المحمص" value={form.roastedItemId} onChange={(e) => setForm({ ...form, roastedItemId: e.target.value })}>
              <option value="">اختر الوجهة...</option>
              {roastedItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="الوزن الخام (كجم)"
              type="number" min="0.1" step="0.1"
              value={form.rawWeightKg}
              onChange={(e) => setForm({ ...form, rawWeightKg: e.target.value })}
              hint={selectedRawItem ? `المتاح: ${selectedRawItem.quantity} كجم` : undefined}
              error={form.rawWeightKg && selectedRawItem && parseFloat(form.rawWeightKg) > selectedRawItem.quantity ? 'يتجاوز المخزون المتاح' : undefined}
            />
            <Input label="تاريخ التحميص" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          {/* Roast Profiles */}
          <div>
            <label className="text-xs font-medium text-coffee-400 uppercase tracking-wider block mb-2">بروفايل التحميص</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROAST_PROFILES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm({ ...form, roastProfile: p.value as RoastProfile })}
                  className={`px-3 py-3 rounded-xl border text-xs font-medium text-center transition-all ${
                    form.roastProfile === p.value
                      ? 'border-coffee-300/50 bg-coffee-300/10 text-coffee-200'
                      : 'border-surface-border text-coffee-600 hover:border-coffee-700'
                  }`}
                >
                  <p className={`font-bold mb-0.5 ${p.color}`}>{p.label}</p>
                  <p className="text-coffee-600">~{p.shrink} فقد</p>
                </button>
              ))}
            </div>
          </div>

          {/* Live calculation preview */}
          {roastedPreview && (
            <div className="grid grid-cols-3 gap-3">
              <div className="px-4 py-3 bg-coffee-950 border border-surface-border rounded-lg text-center">
                <p className="text-coffee-500 text-xs mb-1">المدخل الخام</p>
                <p className="text-coffee-200 font-bold">{form.rawWeightKg} kg</p>
              </div>
              <div className="px-4 py-3 bg-red-900/10 border border-red-800/20 rounded-lg text-center">
                <p className="text-red-400 text-xs mb-1">الفقد ({(shrinkagePct * 100).toFixed(0)}%)</p>
                <p className="text-red-300 font-bold">-{lossPreview} kg</p>
              </div>
              <div className="px-4 py-3 bg-coffee-300/5 border border-coffee-300/20 rounded-lg text-center">
                <p className="text-coffee-400 text-xs mb-1">الناتج المحمص</p>
                <p className="text-coffee-300 font-bold">{roastedPreview} kg</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <Input label="الحرارة (°م)" type="number" value={form.temperatureC} onChange={(e) => setForm({ ...form, temperatureC: e.target.value })} />
            <Input label="المدة (دقيقة)" type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
            <Input label="اسم المحمص" value={form.roasterName} onChange={(e) => setForm({ ...form, roasterName: e.target.value })} placeholder="e.g. Ahmed" />
          </div>

          <Textarea label="ملاحظات (اختياري)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات التحميص والجودة..." />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>إلغاء</Button>
            <Button loading={saving} icon={<Flame size={15} />} onClick={handleSave}>تسجيل الدُفعة</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
