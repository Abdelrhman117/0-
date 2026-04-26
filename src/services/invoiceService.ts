import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { recordPayment } from './clientService';
import { Invoice } from '../types';

export async function recordInvoicePayment(invoice: Invoice, amount: number) {
  const newAmountPaid = invoice.amountPaid + amount;
  const newBalance    = invoice.total - newAmountPaid;
  const status        = newBalance <= 0 ? 'paid' : 'partial';

  await updateDoc(doc(db, 'invoices', invoice.id), {
    amountPaid: increment(amount),
    balance:    increment(-amount),
    status,
    updatedAt:  serverTimestamp(),
  });

  await recordPayment(invoice.clientId, amount);
}

export function generateInvoicePDF(invoice: Invoice): void {
  const fmt = (ts: any) => {
    try { return ts.toDate().toLocaleDateString('ar-EG'); } catch { return '—'; }
  };

  const statusLabel: Record<string, string> = {
    paid: 'مدفوعة', partial: 'جزئي', unpaid: 'غير مدفوعة',
  };
  const statusColor: Record<string, string> = {
    paid: '#27ae60', partial: '#e6a01e', unpaid: '#dc3c3c',
  };

  const rows = invoice.items.map((item) => `
    <tr>
      <td>${item.itemName}</td>
      <td class="num">${item.quantityKg.toFixed(2)}</td>
      <td class="num">${invoice.currency} ${item.pricePerKg.toFixed(2)}</td>
      <td class="num">${invoice.currency} ${item.subtotal.toFixed(2)}</td>
    </tr>`).join('');

  const discountRow = invoice.discount > 0
    ? `<div class="row red"><span>الخصم</span><span>- ${invoice.currency} ${invoice.discount.toFixed(2)}</span></div>` : '';
  const taxRow = invoice.tax > 0
    ? `<div class="row"><span>الضريبة (${invoice.tax}%)</span><span>${invoice.currency} ${(invoice.subtotal * invoice.tax / 100).toFixed(2)}</span></div>` : '';

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>فاتورة ${invoice.invoiceNumber}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Cairo',sans-serif;background:#fff;color:#1e1408;direction:rtl;font-size:13px}
  .header{background:#130D05;padding:22px 32px;display:flex;justify-content:space-between;align-items:flex-start}
  .brand{color:#D4A843;font-size:38px;font-weight:800;line-height:1}
  .brand-sub{color:#A07850;font-size:10px;margin-top:5px}
  .inv-title{color:#D4A843;font-size:22px;font-weight:700;text-align:left}
  .inv-meta{color:#C8B496;font-size:11px;margin-top:6px;line-height:2;text-align:left}
  .bill{padding:18px 32px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #ede5d8}
  .bill-label{color:#8B5E2A;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px}
  .bill-name{font-size:15px;font-weight:700}
  .bill-order{font-size:10px;color:#8B6A4A;margin-top:3px}
  .badge{padding:6px 16px;border-radius:6px;font-size:11px;font-weight:700;color:#fff}
  table{width:calc(100% - 64px);margin:20px 32px 0;border-collapse:collapse}
  thead{background:#130D05}
  thead th{padding:10px 12px;font-size:10px;font-weight:600;color:#D4A843;text-align:right}
  tbody td{padding:9px 12px;border-bottom:1px solid #f0e6d6}
  tbody tr:nth-child(even) td{background:#faf6f0}
  .num{text-align:left;font-variant-numeric:tabular-nums}
  .totals{display:flex;justify-content:flex-start;margin:18px 32px 0}
  .totals-box{width:300px}
  .row{display:flex;justify-content:space-between;padding:5px 0;color:#5a3e28;font-size:12px}
  .row.bold{font-weight:800;font-size:14px;color:#1e1408;border-top:2px solid #D4A843;margin-top:10px;padding-top:10px}
  .row.green{color:#27ae60;font-weight:600}
  .row.amber{color:#c8870a;font-weight:800;font-size:13px}
  .row.red{color:#dc3c3c}
  .footer{background:#130D05;color:#A07850;font-size:9px;text-align:center;padding:12px 0;margin-top:32px;line-height:2.2}
  @media print{@page{size:A4;margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="brand">0%</div>
    <div class="brand-sub">نظام إدارة القهوة</div>
  </div>
  <div>
    <div class="inv-title">فـاتـورة</div>
    <div class="inv-meta">
      # ${invoice.invoiceNumber}<br/>
      التاريخ: ${fmt(invoice.date)}<br/>
      الاستحقاق: ${fmt(invoice.dueDate)}
    </div>
  </div>
</div>

<div class="bill">
  <div>
    <div class="bill-label">فاتورة إلى</div>
    <div class="bill-name">${invoice.clientName}</div>
    <div class="bill-order">رقم الطلب: ${invoice.orderNumber}</div>
  </div>
  <div class="badge" style="background:${statusColor[invoice.status] ?? '#999'}">
    ${statusLabel[invoice.status] ?? invoice.status}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>الصنف</th>
      <th style="text-align:left">الوزن (كجم)</th>
      <th style="text-align:left">السعر / كجم</th>
      <th style="text-align:left">المجموع الفرعي</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="totals">
  <div class="totals-box">
    <div class="row"><span>المجموع الفرعي</span><span>${invoice.currency} ${invoice.subtotal.toFixed(2)}</span></div>
    ${discountRow}
    <div class="row"><span>الضريبة (${invoice.tax ?? 0}%)</span><span>${invoice.currency} ${(invoice.subtotal * (invoice.tax ?? 0) / 100).toFixed(2)}</span></div>
    <div class="row bold"><span>الإجمالي</span><span>${invoice.currency} ${invoice.total.toFixed(2)}</span></div>
    <div class="row green"><span>المدفوع</span><span>${invoice.currency} ${invoice.amountPaid.toFixed(2)}</span></div>
    <div class="row amber"><span>الرصيد المستحق</span><span>${invoice.currency} ${invoice.balance.toFixed(2)}</span></div>
  </div>
</div>

<div class="footer">
  0% قهوة &mdash; جودة بريميوم &nbsp;|&nbsp; شكراً لتعاملكم معنا
</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { throw new Error('يرجى السماح بالنوافذ المنبثقة في المتصفح'); }
  win.document.write(html);
  win.document.close();
}
