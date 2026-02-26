'use client';

import type { Employee, InventoryItem, Invoice, Transaction } from './mockData';
import * as XLSX from 'xlsx';
import { analytics } from './analytics';

type ExportData = {
  employees: Employee[];
  invoices: Invoice[];
  transactions: Transaction[];
  inventory: InventoryItem[];
  businessProfile: { businessName: string; email: string; phone: string; gst: string; address: string };
  preferences: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean };
};

export function exportAppDataToExcel(data: ExportData) {

  const wb = XLSX.utils.book_new();

  // Employees
  if (data.employees?.length) {
    const rows = data.employees.map(e => ({
      ID: e.id,
      Name: e.name,
      Role: e.role,
      Avatar: e.avatar,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  }

  // Invoices
  if (data.invoices?.length) {
    const rows = data.invoices.flatMap(inv => {
      const base = {
        InvoiceID: inv.id,
        InvoiceNo: inv.invoiceNo,
        Client: inv.client,
        Date: inv.date,
        DueDate: inv.dueDate,
        Status: inv.status,
      };
      if (!inv.items.length) {
        return [{ ...base, Item: '', Qty: 0, Price: 0, LineTotal: 0 }];
      }
      return inv.items.map(item => ({
        ...base,
        Item: item.description,
        Qty: item.qty,
        Price: item.price,
        LineTotal: item.qty * item.price,
      }));
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
  }

  // Transactions
  if (data.transactions?.length) {
    const rows = data.transactions.map(t => ({
      ID: t.id,
      Type: t.type,
      Category: t.category,
      Amount: t.amount,
      Date: t.date,
      Note: t.note,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  }

  // Inventory
  if (data.inventory?.length) {
    const rows = data.inventory.map(i => ({
      ID: i.id,
      Name: i.name,
      SKU: i.sku,
      Category: i.category,
      Unit: i.unit,
      OpeningQty: i.openingQty,
      CurrentQty: i.currentQty,
      PurchasePrice: i.purchasePrice,
      SellingPrice: i.sellingPrice,
      ReorderLevel: i.reorderLevel,
      GSTRate: i.gstRate,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  }

  // Settings
  const settingsRows = [
    {
      BusinessName: data.businessProfile.businessName,
      BusinessEmail: data.businessProfile.email,
      BusinessPhone: data.businessProfile.phone,
      GST: data.businessProfile.gst,
      Address: data.businessProfile.address,
      Currency: data.preferences.currency,
      EmailNotifications: data.preferences.emailNotifications ? 'On' : 'Off',
      DarkMode: data.preferences.darkMode ? 'On' : 'Off',
    },
  ];
  const wsSettings = XLSX.utils.json_to_sheet(settingsRows);
  XLSX.utils.book_append_sheet(wb, wsSettings, 'Settings');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `synplix-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  analytics.dataExportedExcel();
}

