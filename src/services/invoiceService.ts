import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { recordPayment } from './clientService';
import { Invoice } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();

  // ── Header background ──────────────────────────────────────────────────────
  pdf.setFillColor(19, 13, 5);
  pdf.rect(0, 0, pageW, 45, 'F');

  // Logo / brand
  pdf.setTextColor(212, 168, 67);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('0%', 15, 28);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(160, 120, 80);
  pdf.text('Premium Coffee Management', 15, 36);

  // Invoice title
  pdf.setTextColor(212, 168, 67);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INVOICE', pageW - 15, 22, { align: 'right' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(200, 180, 150);
  pdf.text(`# ${invoice.invoiceNumber}`, pageW - 15, 30, { align: 'right' });
  pdf.text(
    `Date: ${invoice.date.toDate().toLocaleDateString()}`,
    pageW - 15,
    36,
    { align: 'right' },
  );
  pdf.text(
    `Due:  ${invoice.dueDate.toDate().toLocaleDateString()}`,
    pageW - 15,
    41,
    { align: 'right' },
  );

  // ── Bill To ────────────────────────────────────────────────────────────────
  pdf.setTextColor(80, 50, 20);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BILL TO', 15, 58);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(30, 20, 10);
  pdf.text(invoice.clientName, 15, 65);

  pdf.setFontSize(9);
  pdf.setTextColor(100, 80, 60);
  pdf.text(`Order: ${invoice.orderNumber}`, 15, 71);

  // ── Status badge ──────────────────────────────────────────────────────────
  const statusColors: Record<string, [number, number, number]> = {
    paid:    [39, 174, 96],
    partial: [230, 160, 30],
    unpaid:  [220, 60, 60],
  };
  const [r, g, b] = statusColors[invoice.status] ?? [150, 150, 150];
  pdf.setFillColor(r, g, b);
  pdf.roundedRect(pageW - 40, 54, 28, 10, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(invoice.status.toUpperCase(), pageW - 26, 61, { align: 'center' });

  // ── Items table ────────────────────────────────────────────────────────────
  autoTable(pdf, {
    startY: 80,
    head: [['Item', 'Weight (kg)', 'Price / kg', 'Subtotal']],
    body: invoice.items.map((item) => [
      item.itemName,
      item.quantityKg.toFixed(2),
      `${invoice.currency} ${item.pricePerKg.toFixed(2)}`,
      `${invoice.currency} ${item.subtotal.toFixed(2)}`,
    ]),
    headStyles: {
      fillColor: [19, 13, 5],
      textColor: [212, 168, 67],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles:       { textColor: [30, 20, 10], fontSize: 10 },
    alternateRowStyles: { fillColor: [250, 245, 238] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  // ── Totals block ───────────────────────────────────────────────────────────
  const finalY = (pdf as any).lastAutoTable.finalY + 8;

  const drawRow = (label: string, value: string, y: number, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(bold ? 11 : 10);
    pdf.setTextColor(bold ? 30 : 90, bold ? 20 : 70, bold ? 10 : 50);
    pdf.text(label, pageW - 70, y);
    pdf.setTextColor(30, 20, 10);
    pdf.text(value, pageW - 15, y, { align: 'right' });
  };

  drawRow('Subtotal',   `${invoice.currency} ${invoice.subtotal.toFixed(2)}`,   finalY);
  drawRow('Discount',   `- ${invoice.currency} ${invoice.discount.toFixed(2)}`, finalY + 7);
  drawRow(`Tax (${invoice.tax}%)`, `${invoice.currency} ${(invoice.subtotal * invoice.tax / 100).toFixed(2)}`, finalY + 14);

  // divider
  pdf.setDrawColor(212, 168, 67);
  pdf.setLineWidth(0.5);
  pdf.line(pageW - 70, finalY + 18, pageW - 15, finalY + 18);

  drawRow('TOTAL',      `${invoice.currency} ${invoice.total.toFixed(2)}`,      finalY + 25, true);
  drawRow('Amount Paid',`${invoice.currency} ${invoice.amountPaid.toFixed(2)}`, finalY + 32);
  drawRow('Balance Due',`${invoice.currency} ${invoice.balance.toFixed(2)}`,    finalY + 39, true);

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = pdf.internal.pageSize.getHeight() - 18;
  pdf.setFillColor(19, 13, 5);
  pdf.rect(0, footerY, pageW, 18, 'F');
  pdf.setTextColor(160, 120, 80);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('0% Coffee — Premium Quality Since Day One', pageW / 2, footerY + 8, { align: 'center' });
  pdf.text('Thank you for your business.', pageW / 2, footerY + 13, { align: 'center' });

  pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
}
