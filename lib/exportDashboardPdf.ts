'use client';

import { jsPDF } from 'jspdf';
import type { Profile } from './appStore';
import { analytics } from './analytics';

interface DashboardSnapshot {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingPayments: number;
}

export function exportDashboardPdf(dashboard: DashboardSnapshot, profile: Profile | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const marginX = 48;
  let y = 72;

  const title = profile?.businessName || 'Synplix Dashboard';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, marginX, y);
  y += 22;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Email: ${profile?.email || '-'}`, marginX, y);
  y += 14;
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, marginX, y);
  y += 30;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Overview', marginX, y);
  y += 18;

  const rows = [
    ['Total Revenue', `₹${dashboard.totalRevenue.toLocaleString('en-IN')}`],
    ['Total Expenses', `₹${dashboard.totalExpenses.toLocaleString('en-IN')}`],
    ['Net Profit', `₹${dashboard.netProfit.toLocaleString('en-IN')}`],
    ['Pending Payments', `₹${dashboard.pendingPayments.toLocaleString('en-IN')}`],
  ];

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  rows.forEach(([label, value]) => {
    doc.text(label, marginX, y);
    doc.text(value, marginX + 260, y, { align: 'right' });
    y += 18;
  });

  y += 18;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.text(
    'This PDF is a snapshot of your current Synplix dashboard. Use it to share key numbers with your CA, investors, or team.',
    marginX,
    y,
    { maxWidth: 500 }
  );

  doc.save(`synplix-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
  analytics.invoiceExportedPdf();
}

