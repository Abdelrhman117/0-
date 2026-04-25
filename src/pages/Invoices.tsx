import React, { useState, useMemo } from 'react';
import { FileText, Download, Printer, DollarSign, Search, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { useCollection } from '../hooks/useRealtimeData';
import { Invoice, InvoiceStatus } from '../types';
import { recordInvoicePayment, generateInvoicePDF } from '../services/invoiceService';
import { Card, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge, { statusBadgeVariant } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

const statusIcons: Record<InvoiceStatus, React.ReactNode> = {
  paid:    <CheckCircle size={14} className="text-green-400" />,
  partial: <Clock size={14} className="text-amber-400" />,
  unpaid:  <AlertCircle size={14} className="text-red-400" />,
};

const statusLabels: Record<InvoiceStatus | 'all', string> = {
  all:     'الكل',
  paid:    'مدفوعة',
  partial: 'جزئي',
  unpaid:  'غير مدفوعة',
};

export default function Invoices() {
  const { data: invoices, loading } = useCollection<Invoice>('invoices', [orderBy('createdAt', 'desc')]);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payModal, setPayModal]     = useState<Invoice | null>(null);
  const [payAmount, setPayAmount]   = useState('');
  const [saving, setSaving]         = useState(false);

  const filtered = useMemo(() =>
    invoices.filter((inv) => {
      const matchSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || inv.clientName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    }),
    [invoices, search, statusFilter],
  );

  const totalOutstanding = useMemo(() => invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.balance, 0), [invoices]);
  const totalCollected   = useMemo(() => invoices.reduce((s, i) => s + i.amountPaid, 0), [invoices]);
  const paidCount        = useMemo(() => invoices.filter((i) => i.status === 'paid').length, [invoices]);

  const handlePDFDownload = (inv: Invoice) => {
    try {
      generateInvoicePDF(inv);
      toast.success('تم تحميل ملف PDF');
    } catch (e: any) {
      toast.error('فشل إنشاء PDF: ' + e.message);
    }
  };

  const handlePrint = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setTimeout(() => window.print(), 300);
  };

  const handlePayment = async () => {
    if (!payModal) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return; }
    if (amount > payModal.balance) { toast.error(`المبلغ يتجاوز الرصيد المستحق (${payModal.balance.toFixed(2)})`); return; }
    setSaving(true);
    try {
      await recordInvoicePayment(payModal, amount);
      toast.success('تم تسجيل الدفعة');
      setPayModal(null);
      setPayAmount('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'إجمالي الفواتير',   value: invoices.length,                    sub: `${paidCount} مدفوعة`,          color: 'text-coffee-100' },
          { label: 'إجمالي المحصّل',    value: `$${totalCollected.toLocaleString()}`, sub: 'المبالغ المستلمة',            color: 'text-green-400'  },
          { label: 'المبالغ المستحقة',  value: `$${totalOutstanding.toLocaleString()}`, sub: 'قيد التحصيل',              color: 'text-amber-400'  },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-surface-card border border-surface-border rounded-xl p-4">
            <p className="text-coffee-500 text-xs uppercase tracking-wider mb-2">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-coffee-600 text-xs mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="البحث في الفواتير…" className="w-full pr-9 pl-4 py-2 bg-surface-card border border-surface-border rounded-lg text-sm text-coffee-200 placeholder-coffee-700 focus:outline-none focus:border-coffee-500" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'unpaid', 'partial', 'paid'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-coffee-300/15 text-coffee-300 border border-coffee-300/20' : 'text-coffee-600 hover:text-coffee-300 border border-transparent'}`}>
              {statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-coffee-600">جارٍ التحميل…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="لا توجد فواتير" description="يتم إنشاء الفواتير تلقائياً عند إنشاء الطلبات." />
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['رقم الفاتورة', 'التاريخ', 'تاريخ الاستحقاق', 'العميل', 'الإجمالي', 'المدفوع', 'الرصيد', 'الحالة', 'إجراءات'].map((h) => (
                    <th key={h} className={`text-coffee-500 text-xs font-medium py-3 ${h === 'إجراءات' ? 'pl-5 text-left' : 'pr-5 text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const isOverdue = inv.status !== 'paid' && inv.dueDate?.toDate && inv.dueDate.toDate() < new Date();
                  return (
                    <tr key={inv.id} className={`border-b border-surface-border/50 hover:bg-surface-hover transition-colors ${isOverdue ? 'border-r-2 border-r-red-600' : ''}`}>
                      <td className="pr-5 py-3 text-coffee-300 font-mono text-xs font-bold">{inv.invoiceNumber}</td>
                      <td className="pr-5 py-3 text-coffee-400 text-xs">
                        {inv.date?.toDate ? format(inv.date.toDate(), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="pr-5 py-3">
                        <span className={`text-xs ${isOverdue ? 'text-red-400 font-medium' : 'text-coffee-400'}`}>
                          {inv.dueDate?.toDate ? format(inv.dueDate.toDate(), 'dd/MM/yyyy') : '—'}
                          {isOverdue && ' (متأخرة)'}
                        </span>
                      </td>
                      <td className="pr-5 py-3 text-coffee-200 font-medium">{inv.clientName}</td>
                      <td className="pr-5 py-3 text-coffee-100 font-bold">{inv.currency} {inv.total.toFixed(2)}</td>
                      <td className="pr-5 py-3 text-green-400 font-medium">{inv.currency} {inv.amountPaid.toFixed(2)}</td>
                      <td className="pr-5 py-3">
                        <span className={`font-bold ${inv.balance > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                          {inv.currency} {inv.balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="pr-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {statusIcons[inv.status]}
                          <Badge variant={statusBadgeVariant(inv.status)}>{statusLabels[inv.status]}</Badge>
                        </div>
                      </td>
                      <td className="pl-5 py-3 text-left">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedInvoice(inv)} className="p-1.5 rounded-lg text-coffee-600 hover:text-coffee-300 hover:bg-surface-hover transition-colors" title="عرض">
                            <FileText size={14} />
                          </button>
                          <button onClick={() => handlePDFDownload(inv)} className="p-1.5 rounded-lg text-coffee-600 hover:text-blue-400 hover:bg-blue-900/20 transition-colors" title="تحميل PDF">
                            <Download size={14} />
                          </button>
                          {inv.status !== 'paid' && (
                            <button onClick={() => { setPayModal(inv); setPayAmount(''); }} className="p-1.5 rounded-lg text-coffee-600 hover:text-green-400 hover:bg-green-900/20 transition-colors" title="تسجيل دفعة">
                              <DollarSign size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Invoice Detail Modal */}
      <Modal open={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title={`فاتورة رقم ${selectedInvoice?.invoiceNumber}`} size="lg">
        {selectedInvoice && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between p-4 bg-coffee-950 rounded-xl border border-surface-border">
              <div>
                <p className="text-coffee-300 font-bold text-3xl">0%</p>
                <p className="text-coffee-600 text-xs">نظام إدارة القهوة</p>
              </div>
              <div className="text-left">
                <p className="text-coffee-300 font-bold text-xl">فاتورة</p>
                <p className="text-coffee-400 text-xs font-mono"># {selectedInvoice.invoiceNumber}</p>
                <p className="text-coffee-500 text-xs mt-1">التاريخ: {selectedInvoice.date?.toDate ? format(selectedInvoice.date.toDate(), 'dd/MM/yyyy') : '—'}</p>
                <p className="text-coffee-500 text-xs">الاستحقاق: {selectedInvoice.dueDate?.toDate ? format(selectedInvoice.dueDate.toDate(), 'dd/MM/yyyy') : '—'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-coffee-500 text-xs uppercase tracking-wider mb-1">فاتورة إلى</p>
                <p className="text-coffee-100 font-semibold">{selectedInvoice.clientName}</p>
                <p className="text-coffee-500 text-xs">الطلب: {selectedInvoice.orderNumber}</p>
              </div>
              <Badge variant={statusBadgeVariant(selectedInvoice.status)} className="text-sm px-3 py-1">
                {statusLabels[selectedInvoice.status]}
              </Badge>
            </div>

            {/* Items */}
            <table className="w-full text-sm">
              <thead><tr className="border-b border-surface-border"><th className="text-right text-coffee-500 text-xs py-2 px-2">الصنف</th><th className="text-left text-coffee-500 text-xs py-2">الوزن</th><th className="text-left text-coffee-500 text-xs py-2">السعر/كجم</th><th className="text-left text-coffee-500 text-xs py-2">المجموع</th></tr></thead>
              <tbody>
                {selectedInvoice.items.map((item, i) => (
                  <tr key={i} className="border-b border-surface-border/50">
                    <td className="py-2 px-2 text-coffee-200 text-right">{item.itemName}</td>
                    <td className="py-2 text-left text-coffee-400">{item.quantityKg} كجم</td>
                    <td className="py-2 text-left text-coffee-400">{selectedInvoice.currency} {item.pricePerKg}</td>
                    <td className="py-2 text-left text-coffee-100 font-medium">{selectedInvoice.currency} {item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mr-auto w-64 space-y-1.5 text-sm border-t border-surface-border pt-3">
              <div className="flex justify-between text-coffee-500"><span>المجموع الفرعي</span><span>{selectedInvoice.currency} {selectedInvoice.subtotal.toFixed(2)}</span></div>
              {selectedInvoice.discount > 0 && <div className="flex justify-between text-red-400"><span>الخصم</span><span>- {selectedInvoice.currency} {selectedInvoice.discount.toFixed(2)}</span></div>}
              {selectedInvoice.tax > 0 && <div className="flex justify-between text-coffee-500"><span>الضريبة ({selectedInvoice.tax}%)</span><span>{selectedInvoice.currency} {(selectedInvoice.subtotal * selectedInvoice.tax / 100).toFixed(2)}</span></div>}
              <div className="flex justify-between text-coffee-100 font-bold border-t border-surface-border pt-2">
                <span>الإجمالي</span><span className="text-coffee-300">{selectedInvoice.currency} {selectedInvoice.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-400"><span>المدفوع</span><span>{selectedInvoice.currency} {selectedInvoice.amountPaid.toFixed(2)}</span></div>
              <div className="flex justify-between text-amber-400 font-bold"><span>الرصيد المستحق</span><span>{selectedInvoice.currency} {selectedInvoice.balance.toFixed(2)}</span></div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2 border-t border-surface-border">
              <Button variant="secondary" icon={<Download size={14} />} onClick={() => handlePDFDownload(selectedInvoice)}>تحميل PDF</Button>
              {selectedInvoice.status !== 'paid' && (
                <Button icon={<DollarSign size={14} />} onClick={() => { setPayModal(selectedInvoice); setSelectedInvoice(null); setPayAmount(''); }}>
                  تسجيل دفعة
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="تسجيل دفعة" size="sm">
        {payModal && (
          <div className="space-y-4">
            <div className="px-4 py-3 bg-coffee-950 border border-surface-border rounded-lg">
              <p className="text-coffee-500 text-xs">رقم الفاتورة</p>
              <p className="text-coffee-300 font-mono font-bold">{payModal.invoiceNumber}</p>
              <p className="text-coffee-500 text-xs mt-2">العميل: <span className="text-coffee-200">{payModal.clientName}</span></p>
              <div className="flex justify-between mt-2">
                <div><p className="text-coffee-500 text-xs">الإجمالي</p><p className="text-coffee-200 font-bold">{payModal.currency} {payModal.total.toFixed(2)}</p></div>
                <div><p className="text-coffee-500 text-xs">الرصيد المستحق</p><p className="text-amber-400 font-bold text-lg">{payModal.currency} {payModal.balance.toFixed(2)}</p></div>
              </div>
            </div>
            <Input label={`مبلغ الدفعة (${payModal.currency})`} type="number" min="0.01" step="0.01" max={payModal.balance} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setPayAmount(String(payModal.balance))}>سداد الرصيد كاملاً</Button>
            </div>
            <div className="flex justify-start gap-3">
              <Button loading={saving} icon={<DollarSign size={14} />} onClick={handlePayment}>تسجيل الدفعة</Button>
              <Button variant="secondary" onClick={() => setPayModal(null)}>إلغاء</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
