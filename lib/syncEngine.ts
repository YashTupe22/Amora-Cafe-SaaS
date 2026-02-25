/**
 * syncEngine.ts — Three operations that power offline-first sync.
 *
 *  loadFromLocal()             → instant read from IndexedDB (works offline)
 *  fetchAndCacheFromFirebase() → pull Firestore → overwrite IndexedDB
 *  syncPendingToFirebase()     → push all _syncStatus:'pending' rows to Firestore
 */

import {
  doc, setDoc, updateDoc, getDoc,
  getDocs, query, orderBy, collection,
} from 'firebase/firestore';
import { db } from './firebase';
import { localDb } from './localDb';
import type { Profile } from './appStore';
import type { Employee, Invoice, InvoiceItem, InventoryItem, Transaction } from './mockData';
import type { LocalProfile } from './localDb';

// ─── Firestore path helpers ───────────────────────────────────────────────────

const userCol = (uid: string, col: string) => collection(db, 'users', uid, col);
const userDoc = (uid: string) => doc(db, 'users', uid);

// ─── 1. Load from local IndexedDB (INSTANT — works offline) ──────────────────

export async function loadFromLocal(uid: string): Promise<{
  employees: Employee[];
  invoices: Invoice[];
  transactions: Transaction[];
  inventory: InventoryItem[];
  profile: Profile | null;
}> {
  const [employees, invoices, txsRaw, inventory, profileArr] = await Promise.all([
    localDb.employees
      .where('_uid').equals(uid)
      .filter(e => e._syncStatus !== 'deleted')
      .sortBy('_createdAt'),
    localDb.invoices
      .where('_uid').equals(uid)
      .filter(i => i._syncStatus !== 'deleted')
      .sortBy('_createdAt')
      .then(arr => arr.reverse()),
    localDb.transactions
      .where('_uid').equals(uid)
      .filter(t => t._syncStatus !== 'deleted')
      .sortBy('date')
      .then(arr => arr.reverse()),
    localDb.inventory
      .where('_uid').equals(uid)
      .filter(i => i._syncStatus !== 'deleted')
      .sortBy('_createdAt'),
    localDb.profile.where('id').equals(uid).toArray(),
  ]);

  const rawProfile = profileArr[0] ?? null;
  const profile: Profile | null = rawProfile
    ? {
        id: rawProfile.id,
        name: rawProfile.name,
        businessName: rawProfile.businessName,
        email: rawProfile.email,
        phone: rawProfile.phone,
        gst: rawProfile.gst,
        address: rawProfile.address,
        currency: rawProfile.currency,
        emailNotifications: rawProfile.emailNotifications,
        darkMode: rawProfile.darkMode,
        twoFactorAuth: rawProfile.twoFactorAuth,
        onboardingComplete: rawProfile.onboardingComplete,
      }
    : null;

  return { employees, invoices, transactions: txsRaw, inventory, profile };
}

// ─── 2. Fetch from Firestore and cache to IndexedDB ──────────────────────────

export async function fetchAndCacheFromFirebase(uid: string): Promise<void> {
  const [profileSnap, empSnaps, invSnaps, txSnaps, invtSnaps] = await Promise.all([
    getDoc(userDoc(uid)),
    getDocs(query(userCol(uid, 'employees'), orderBy('createdAt'))),
    getDocs(query(userCol(uid, 'invoices'), orderBy('createdAt', 'desc'))),
    getDocs(query(userCol(uid, 'transactions'), orderBy('date', 'desc'))),
    getDocs(query(userCol(uid, 'inventory'), orderBy('createdAt'))),
  ]);

  const now = new Date().toISOString();

  // Read existing local employees BEFORE deleting, so we can merge missing fields
  const existingEmps = await localDb.employees.where('_uid').equals(uid).toArray();
  const existingEmpMap = new Map(existingEmps.map(e => [e.id, e]));

  // Remove only synced rows (keep pending ones created offline)
  await Promise.all([
    localDb.employees.where('_uid').equals(uid).filter(e => e._syncStatus === 'synced').delete(),
    localDb.invoices.where('_uid').equals(uid).filter(i => i._syncStatus === 'synced').delete(),
    localDb.transactions.where('_uid').equals(uid).filter(t => t._syncStatus === 'synced').delete(),
    localDb.inventory.where('_uid').equals(uid).filter(i => i._syncStatus === 'synced').delete(),
  ]);

  const emps = empSnaps.docs.map(d => {
    const e = d.data();
    // Merge with existing local record — preserves fields that Firestore doc may not have yet
    const local = existingEmpMap.get(d.id);
    return {
      id: d.id,
      name: e.name ?? local?.name ?? '',
      role: e.role ?? local?.role ?? 'Team Member',
      avatar: e.avatar ?? local?.avatar ?? '',
      attendance: e.attendance ?? local?.attendance ?? {},
      overtime: e.overtime ?? local?.overtime ?? {},
      salary: e.salary ?? local?.salary ?? 0,
      dateOfJoining: e.dateOfJoining ?? local?.dateOfJoining ?? '',
      salaryDeductionRules: e.salaryDeductionRules ?? local?.salaryDeductionRules ?? '',
      email: e.email ?? local?.email ?? '',
      phone: e.phone ?? local?.phone ?? '',
      aadhaar: e.aadhaar ?? local?.aadhaar ?? '',
      _uid: uid, _syncStatus: 'synced' as const,
      _createdAt: e.createdAt ?? local?._createdAt ?? now,
    };
  });
  if (emps.length) await localDb.employees.bulkPut(emps);

  // Read existing local invoices BEFORE deleting, so we can merge missing fields
  const existingInvs = await localDb.invoices.where('_uid').equals(uid).toArray();
  const existingInvMap = new Map(existingInvs.map(i => [i.id, i]));

  const invs = invSnaps.docs.map(d => {
    const i = d.data();
    const local = existingInvMap.get(d.id);
    return {
      id: d.id, invoiceNo: i.invoiceNo, client: i.client,
      date: i.date, dueDate: i.dueDate,
      status: i.status as 'Paid' | 'Pending',
      items: (i.items ?? local?.items ?? []) as InvoiceItem[],
      clientEmail: i.clientEmail ?? local?.clientEmail ?? '',
      clientPhone: i.clientPhone ?? local?.clientPhone ?? '',
      clientAddress: i.clientAddress ?? local?.clientAddress ?? '',
      tableNo: i.tableNo ?? local?.tableNo ?? '',
      orderType: i.orderType ?? local?.orderType ?? 'Dine-In',
      paymentMode: i.paymentMode ?? local?.paymentMode ?? 'Cash',
      _uid: uid, _syncStatus: 'synced' as const,
      _createdAt: i.createdAt ?? local?._createdAt ?? now,
    };
  });
  if (invs.length) await localDb.invoices.bulkPut(invs);

  const txs = txSnaps.docs.map(d => {
    const t = d.data();
    return {
      id: d.id, type: t.type as 'Income' | 'Expense',
      category: t.category, amount: Number(t.amount),
      date: t.date, note: t.note || '',
      _uid: uid, _syncStatus: 'synced' as const,
    };
  });
  if (txs.length) await localDb.transactions.bulkPut(txs);

  const invt = invtSnaps.docs.map(d => {
    const i = d.data();
    return {
      id: d.id, name: i.name, sku: i.sku || '',
      category: i.category || 'General', unit: i.unit || 'Units',
      openingQty: Number(i.openingQty), currentQty: Number(i.currentQty),
      purchasePrice: Number(i.purchasePrice), sellingPrice: Number(i.sellingPrice),
      reorderLevel: Number(i.reorderLevel), gstRate: Number(i.gstRate),
      _uid: uid, _syncStatus: 'synced' as const,
      _createdAt: i.createdAt ?? now,
    };
  });
  if (invt.length) await localDb.inventory.bulkPut(invt);

  const pd = profileSnap.data();
  if (pd) {
    await localDb.profile.put({
      id: uid,
      name: pd.name || '', businessName: pd.businessName || '',
      email: pd.email || '', phone: pd.phone || '',
      gst: pd.gst || '', address: pd.address || '',
      currency: pd.currency || 'INR',
      emailNotifications: pd.emailNotifications ?? true,
      darkMode: pd.darkMode ?? true,
      twoFactorAuth: pd.twoFactorAuth ?? false,
      onboardingComplete: pd.onboardingComplete ?? false,
      _syncStatus: 'synced',
    });
  }
}

// ─── 3. Push pending local changes to Firestore ───────────────────────────────

export async function syncPendingToFirebase(uid: string): Promise<number> {
  let synced = 0;

  // Employees
  const pendingEmps = await localDb.employees
    .where('_uid').equals(uid)
    .filter(e => e._syncStatus === 'pending')
    .toArray();
  for (const emp of pendingEmps) {
    await setDoc(doc(userCol(uid, 'employees'), emp.id), {
      name: emp.name,
      role: emp.role,
      avatar: emp.avatar,
      attendance: emp.attendance ?? {},
      overtime: emp.overtime ?? {},
      salary: emp.salary ?? 0,
      dateOfJoining: emp.dateOfJoining ?? '',
      salaryDeductionRules: emp.salaryDeductionRules ?? '',
      email: emp.email ?? '',
      phone: emp.phone ?? '',
      aadhaar: emp.aadhaar ?? '',
      createdAt: emp._createdAt,
    });
    await localDb.employees.update(emp.id, { _syncStatus: 'synced' });
    synced++;
  }

  // Invoices
  const pendingInvs = await localDb.invoices
    .where('_uid').equals(uid)
    .filter(i => i._syncStatus === 'pending')
    .toArray();
  for (const inv of pendingInvs) {
    await setDoc(doc(userCol(uid, 'invoices'), inv.id), {
      invoiceNo: inv.invoiceNo, client: inv.client,
      date: inv.date, dueDate: inv.dueDate,
      status: inv.status, items: inv.items,
      clientEmail: inv.clientEmail ?? '',
      clientPhone: inv.clientPhone ?? '',
      clientAddress: inv.clientAddress ?? '',
      tableNo: inv.tableNo ?? '',
      orderType: inv.orderType ?? 'Dine-In',
      paymentMode: inv.paymentMode ?? 'Cash',
      createdAt: inv._createdAt,
    });
    await localDb.invoices.update(inv.id, { _syncStatus: 'synced' });
    synced++;
  }

  // Transactions
  const pendingTxs = await localDb.transactions
    .where('_uid').equals(uid)
    .filter(t => t._syncStatus === 'pending')
    .toArray();
  for (const tx of pendingTxs) {
    await setDoc(doc(userCol(uid, 'transactions'), tx.id), {
      type: tx.type, category: tx.category,
      amount: tx.amount, date: tx.date, note: tx.note,
    });
    await localDb.transactions.update(tx.id, { _syncStatus: 'synced' });
    synced++;
  }

  // Inventory
  const pendingInvt = await localDb.inventory
    .where('_uid').equals(uid)
    .filter(i => i._syncStatus === 'pending')
    .toArray();
  for (const item of pendingInvt) {
    await setDoc(doc(userCol(uid, 'inventory'), item.id), {
      name: item.name, sku: item.sku, category: item.category,
      unit: item.unit, openingQty: item.openingQty,
      currentQty: item.currentQty, purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice, reorderLevel: item.reorderLevel,
      gstRate: item.gstRate, createdAt: item._createdAt,
    });
    await localDb.inventory.update(item.id, { _syncStatus: 'synced' });
    synced++;
  }

  // Invoice status updates stored as a separate patch
  const pendingStatusInvs = await localDb.invoices
    .where('_uid').equals(uid)
    .filter(i => i._syncStatus === 'pending')
    .toArray();
  for (const inv of pendingStatusInvs) {
    await updateDoc(doc(userCol(uid, 'invoices'), inv.id), { status: inv.status });
    await localDb.invoices.update(inv.id, { _syncStatus: 'synced' });
    synced++;
  }

  // Profile
  const pendingProfile = await localDb.profile
    .filter(p => p.id === uid && p._syncStatus === 'pending')
    .toArray();
  for (const p of pendingProfile) {
    await updateDoc(userDoc(uid), {
      businessName: p.businessName, phone: p.phone,
      gst: p.gst, address: p.address, currency: p.currency,
      emailNotifications: p.emailNotifications,
      darkMode: p.darkMode, twoFactorAuth: p.twoFactorAuth,
    });
    await localDb.profile.update(uid, { _syncStatus: 'synced' });
    synced++;
  }

  return synced;
}

// ─── Clear all local data for a user (on logout) ─────────────────────────────

export async function clearLocalData(uid: string): Promise<void> {
  await Promise.all([
    localDb.employees.where('_uid').equals(uid).delete(),
    localDb.invoices.where('_uid').equals(uid).delete(),
    localDb.transactions.where('_uid').equals(uid).delete(),
    localDb.inventory.where('_uid').equals(uid).delete(),
    localDb.profile.where('id').equals(uid).delete(),
  ]);
}
