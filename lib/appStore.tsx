'use client';

import React, {
  createContext, useContext, useEffect,
  useMemo, useState, useRef, useCallback,
} from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

// Minimal session interface — satisfied by both FirebaseUser and local auth objects
interface AppSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  metadata: { creationTime?: string };
}
import {
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs, deleteDoc,
  writeBatch, query, orderBy,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { localDb } from './localDb';
import { localDate } from './utils';
import {
  loadFromLocal,
  fetchAndCacheFromFirebase,
  syncPendingToFirebase,
  clearLocalData,
} from './syncEngine';
import type { CatalogueItem, Employee, InventoryItem, Invoice, InvoiceItem, Transaction } from './mockData';
import { INITIAL_CATALOGUE } from './mockData';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  businessName: string;
  email: string;
  phone: string;
  gst: string;
  address: string;
  currency: string;
  emailNotifications: boolean;
  darkMode: boolean;
  twoFactorAuth: boolean;
  onboardingComplete: boolean;
}

interface AddTransactionInput {
  type: Transaction['type'];
  category: string;
  amount: number;
  date: string;
  note: string;
}

interface AddInvoiceInput {
  client: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  // Cafe-specific fields
  tableNo?: string;
  orderType?: string;
  paymentMode?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

interface AppStoreContextValue {
  ready: boolean;
  session: AppSession | null;
  profile: Profile | null;
  currentUser: UserAccount | null;
  data: {
    employees: Employee[];
    invoices: Invoice[];
    transactions: Transaction[];
    inventory: InventoryItem[];
    catalogue: CatalogueItem[];
    businessProfile: { businessName: string; email: string; phone: string; gst: string; address: string };
    preferences: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean };
  };
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginDemo: () => void;
  logout: () => void;
  completeOnboarding: (info: { businessName: string; phone: string; gst: string; address: string }) => Promise<void>;
  addTransaction: (input: AddTransactionInput) => void;
  addInvoice: (input: AddInvoiceInput) => Invoice;
  updateInvoice: (id: string, input: Partial<AddInvoiceInput & { status: Invoice['status'] }>) => void;
  toggleInvoiceStatus: (id: string) => void;
  updateEmployees: (updater: (prev: Employee[]) => Employee[]) => void;
  updateInventory: (updater: (prev: InventoryItem[]) => InventoryItem[]) => void;
  updateCatalogue: (updater: (prev: CatalogueItem[]) => CatalogueItem[]) => void;
  updateBusinessProfile: (p: { businessName: string; email: string; phone: string; gst: string; address: string }) => void;
  updatePreferences: (p: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean }) => void;
  deleteEmployee: (id: string) => void;
  deleteInvoice: (id: string) => void;
  deleteTransaction: (id: string) => void;
  deleteInventoryItem: (id: string) => void;
  resetBusinessData: () => void;
  deleteCurrentAccount: () => void;
  isOnline: boolean;
  dashboard: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    pendingPayments: number;
    revenueChart: { month: string; revenue: number; expenses: number }[];
    expensePie: { name: string; value: number; color: string }[];
  };
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

// ─── Firestore helpers ────────────────────────────────────────────────────────

const userCol = (uid: string, col: string) => collection(db!, 'users', uid, col);
const userDoc = (uid: string)               => doc(db!, 'users', uid);
// canSync: only attempt Firestore writes when db is initialised AND online
const canSync  = () => Boolean(db) && typeof navigator !== 'undefined' && navigator.onLine;

// ─── Load all data for a user ─────────────────────────────────────────────────

async function loadUserData(userId: string) {
  const [profileSnap, empSnaps, invSnaps, txSnaps, invtSnaps] = await Promise.all([
    getDoc(userDoc(userId)),
    getDocs(query(userCol(userId, 'employees'), orderBy('createdAt'))),
    getDocs(query(userCol(userId, 'invoices'),  orderBy('createdAt', 'desc'))),
    getDocs(query(userCol(userId, 'transactions'), orderBy('date', 'desc'))),
    getDocs(query(userCol(userId, 'inventory'),  orderBy('createdAt'))),
  ]);

  const employees: Employee[] = empSnaps.docs.map(d => {
    const e = d.data();
    return {
      id: d.id,
      name: e.name,
      role: e.role,
      avatar: e.avatar,
      attendance: e.attendance ?? {},
      overtime: e.overtime ?? {},
      salary: e.salary ?? 0,
      dateOfJoining: e.dateOfJoining ?? '',
      salaryDeductionRules: e.salaryDeductionRules ?? '',
      email: e.email ?? '',
      phone: e.phone ?? '',
      aadhaar: e.aadhaar ?? '',
    };
  });

  const invoices: Invoice[] = invSnaps.docs.map(d => {
    const inv = d.data();
    return {
      id: d.id,
      invoiceNo: inv.invoiceNo,
      client: inv.client,
      date: inv.date,
      dueDate: inv.dueDate,
      status: inv.status as 'Paid' | 'Pending',
      items: (inv.items ?? []) as InvoiceItem[],
      clientEmail: inv.clientEmail ?? '',
      clientPhone: inv.clientPhone ?? '',
      clientAddress: inv.clientAddress ?? '',
      tableNo: inv.tableNo ?? '',
      orderType: inv.orderType ?? 'Dine-In',
      paymentMode: inv.paymentMode ?? 'Cash',
    };
  });

  const transactions: Transaction[] = txSnaps.docs.map(d => {
    const tx = d.data();
    return {
      id: d.id,
      type: tx.type as 'Income' | 'Expense',
      category: tx.category,
      amount: Number(tx.amount),
      date: tx.date,
      note: tx.note || '',
    };
  });

  const inventory: InventoryItem[] = invtSnaps.docs.map(d => {
    const i = d.data();
    return {
      id: d.id,
      name: i.name,
      sku: i.sku || '',
      category: i.category || 'General',
      unit: i.unit || 'Units',
      openingQty: Number(i.openingQty),
      currentQty: Number(i.currentQty),
      purchasePrice: Number(i.purchasePrice),
      sellingPrice: Number(i.sellingPrice),
      reorderLevel: Number(i.reorderLevel),
      gstRate: Number(i.gstRate),
    };
  });

  const profileData = profileSnap.data();
  const profile: Profile | null = profileData ? {
    id: userId,
    name: profileData.name || '',
    businessName: profileData.businessName || '',
    email: profileData.email || '',
    phone: profileData.phone || '',
    gst: profileData.gst || '',
    address: profileData.address || '',
    currency: profileData.currency || 'INR',
    emailNotifications: profileData.emailNotifications ?? true,
    darkMode: profileData.darkMode ?? true,
    twoFactorAuth: profileData.twoFactorAuth ?? false,
    onboardingComplete: profileData.onboardingComplete ?? false,
  } : null;

  return { employees, invoices, transactions, inventory, profile };
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function computeDashboard(invoices: Invoice[], transactions: Transaction[]) {
  const totals = invoices.map(inv => ({
    status: inv.status,
    total: inv.items.reduce((s, i) => s + i.qty * i.price, 0),
  }));
  const totalRevenue = totals.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
  const pendingPayments = totals.filter(i => i.status === 'Pending').reduce((s, i) => s + i.total, 0);
  const totalExpenses = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-IN', { month: 'short' }) };
  });

  const revenueChart = months.map(m => {
    let revenue = 0; let expenses = 0;
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (`${d.getFullYear()}-${d.getMonth()}` !== m.key) return;
      if (tx.type === 'Income') revenue += tx.amount; else expenses += tx.amount;
    });
    return { month: m.label, revenue, expenses };
  });

  const catMap = new Map<string, number>();
  transactions.filter(t => t.type === 'Expense').forEach(t => {
    catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
  });
  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#14b8a6'];
  const expensePie = Array.from(catMap.entries()).map(([name, value], idx) => ({
    name, value, color: COLORS[idx % COLORS.length],
  }));

  return { totalRevenue, totalExpenses, netProfit, pendingPayments, revenueChart, expensePie };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('amora-catalogue');
        if (stored) return JSON.parse(stored) as CatalogueItem[];
      } catch { /* ignore */ }
    }
    return INITIAL_CATALOGUE;
  });
  const [ready, setReady] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Refs for stable values inside callbacks (avoids stale closures)
  const uidRef = useRef<string | undefined>(undefined);
  const empRef = useRef<Employee[]>([]);
  const invtRef = useRef<InventoryItem[]>([]);
  const invoiceCountRef = useRef<number>(0);

  const refresh = useCallback(async (uid: string) => {
    // ── Step 1: Load from IndexedDB immediately (works offline) ──────────
    const local = await loadFromLocal(uid);
    const hasLocal =
      local.profile !== null ||
      local.invoices.length > 0 ||
      local.employees.length > 0;
    if (hasLocal) {
      setProfile(local.profile);
      setEmployees(local.employees); empRef.current = local.employees;
      setInvoices(local.invoices); invoiceCountRef.current = local.invoices.length;
      setTransactions(local.transactions);
      setInventory(local.inventory); invtRef.current = local.inventory;
    }

    // ── Step 2: If online, sync pending → fetch from Firestore → re-load ─
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        await syncPendingToFirebase(uid);
        await fetchAndCacheFromFirebase(uid);
        const fresh = await loadFromLocal(uid);
        setProfile(fresh.profile);
        setEmployees(fresh.employees); empRef.current = fresh.employees;
        setInvoices(fresh.invoices); invoiceCountRef.current = fresh.invoices.length;
        setTransactions(fresh.transactions);
        setInventory(fresh.inventory); invtRef.current = fresh.inventory;
      } catch (e) {
        console.warn('[Sync] Background fetch failed — using local data:', e);
      }
    }
  }, []);

  const updateCatalogue = useCallback((updater: (prev: CatalogueItem[]) => CatalogueItem[]) => {
    setCatalogue(prev => {
      const next = updater(prev);
      try { localStorage.setItem('amora-catalogue', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clearData = useCallback(() => {
    uidRef.current = undefined;
    setProfile(null);
    setEmployees([]); empRef.current = [];
    setInvoices([]); invoiceCountRef.current = 0;
    setTransactions([]);
    setInventory([]); invtRef.current = [];
  }, []);

  // Firebase auth listener — fires immediately with cached user (no network needed)
  useEffect(() => {
    let readySet = false;
    const markReady = () => { if (!readySet) { readySet = true; setReady(true); } };

    // Safety net: never leave the user on a blank loading screen
    const timeout = setTimeout(markReady, 5000);

    // If Firebase failed to initialise, fall back to a locally-stored session.
    if (!auth) {
      const localUid = sessionStorage.getItem('amora-local-uid');
      if (localUid) {
        localDb.users.get(localUid).then(user => {
          if (user) {
            setSession({ uid: user.id, email: user.email, displayName: user.name, metadata: { creationTime: user.createdAt } });
            uidRef.current = user.id;
            refresh(user.id).finally(markReady);
          } else {
            sessionStorage.removeItem('amora-local-uid');
            markReady();
          }
        }).catch(() => markReady());
      } else {
        markReady();
      }
      return () => { clearTimeout(timeout); };
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setSession(user);
        if (user) {
          uidRef.current = user.uid;
          markReady();
          await refresh(user.uid);
        } else {
          clearData();
          markReady();
        }
      },
      // Error handler: prevents unhandled Firebase errors (e.g. auth/invalid-api-key)
      // from propagating as uncaught React runtime errors.
      (error) => {
        console.warn('[Firebase] Auth listener error:', error.message);
        markReady();
      },
    );

    return () => { unsubscribe(); clearTimeout(timeout); };
  }, [refresh, clearData]);

  // ── Online / offline detection + background sync ──────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const uid = uidRef.current;
      if (!uid) return;
      try {
        const count = await syncPendingToFirebase(uid);
        if (count > 0) {
          await fetchAndCacheFromFirebase(uid);
          const fresh = await loadFromLocal(uid);
          setProfile(fresh.profile);
          setEmployees(fresh.employees); empRef.current = fresh.employees;
          setInvoices(fresh.invoices); invoiceCountRef.current = fresh.invoices.length;
          setTransactions(fresh.transactions);
          setInventory(fresh.inventory); invtRef.current = fresh.inventory;
          console.log(`[Sync] Flushed ${count} pending record(s) to Firestore.`);
        }
      } catch (e) {
        console.warn('[Sync] Online sync failed:', e);
      }
    };
    const handleOffline = () => setIsOnline(false);
    // SW background-sync trigger
    const handleSwSync = () => handleOnline();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sw-sync', handleSwSync);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sw-sync', handleSwSync);
    };
  }, []);

  // Theme hydration: prefer localStorage, then profile.darkMode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('synplix-theme');
    const theme = stored === 'light' || stored === 'dark'
      ? stored
      : (profile?.darkMode === false ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
  }, [profile?.darkMode]);

  // Keep invoiceCountRef in sync whenever invoices state changes
  useEffect(() => {
    invoiceCountRef.current = invoices.length;
  }, [invoices.length]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    // ── Firebase path ───────────────────────────────────────────────────────
    if (auth) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        return { ok: true };
      } catch (e: any) {
        const msg: string = e?.message ?? 'Login failed.';
        return { ok: false, error: msg.replace('Firebase: ', '').replace(/ \(auth\/.*\)\.?/, '') };
      }
    }
    // ── Local auth fallback (Firebase unavailable) ──────────────────────────
    try {
      const user = await localDb.users.where('email').equals(email.trim().toLowerCase()).first();
      if (!user || user.password !== password) {
        return { ok: false, error: 'Invalid email or password.' };
      }
      const appSession: AppSession = { uid: user.id, email: user.email, displayName: user.name, metadata: { creationTime: user.createdAt } };
      setSession(appSession);
      uidRef.current = user.id;
      sessionStorage.setItem('amora-local-uid', user.id);
      refresh(user.id).catch(console.error);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: 'Login failed. Please try again.' };
    }
  }, [refresh]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    // ── Firebase path ───────────────────────────────────────────────────────
    if (auth) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await setDoc(userDoc(cred.user.uid), {
          name, email, businessName: '', phone: '', gst: '', address: '',
          currency: 'INR', emailNotifications: true, darkMode: true,
          twoFactorAuth: false, onboardingComplete: false,
        });
        return { ok: true };
      } catch (e: any) {
        const msg: string = e?.message ?? 'Signup failed.';
        return { ok: false, error: msg.replace('Firebase: ', '').replace(/ \(auth\/.*\)\.?/, '') };
      }
    }
    // ── Local auth fallback (Firebase unavailable) ──────────────────────────
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await localDb.users.where('email').equals(normalizedEmail).first();
      if (existing) return { ok: false, error: 'An account with this email already exists.' };
      const uid = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      await localDb.users.put({ id: uid, name: name.trim(), email: normalizedEmail, password, createdAt });
      await localDb.profile.put({
        id: uid, name: name.trim(), email: normalizedEmail,
        businessName: '', phone: '', gst: '', address: '',
        currency: 'INR', emailNotifications: true, darkMode: true,
        twoFactorAuth: false, onboardingComplete: false, _syncStatus: 'pending',
      });
      const appSession: AppSession = { uid, email: normalizedEmail, displayName: name.trim(), metadata: { creationTime: createdAt } };
      setSession(appSession);
      uidRef.current = uid;
      sessionStorage.setItem('amora-local-uid', uid);
      refresh(uid).catch(console.error);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: 'Sign up failed. Please try again.' };
    }
  }, [refresh]);

  const loginDemo = useCallback(() => { }, []);

  const logout = useCallback(() => {
    const uid = uidRef.current;
    if (uid) clearLocalData(uid).catch(console.error);
    if (auth) firebaseSignOut(auth).catch(err => console.error('signOut:', err));
    sessionStorage.removeItem('amora-local-uid');
    clearData();
  }, [clearData]);

  // ── Onboarding ────────────────────────────────────────────────────────────

  const completeOnboarding = useCallback(async (info: {
    businessName: string; phone: string; gst: string; address: string;
  }) => {
    const uid = uidRef.current;
    if (!uid) return;
    // Always update local DB first
    await localDb.profile.update(uid, { ...info, onboardingComplete: true, _syncStatus: 'pending' }).catch(console.error);
    // Sync to Firestore if available
    if (canSync()) {
      updateDoc(userDoc(uid), { ...info, onboardingComplete: true })
        .then(() => localDb.profile.update(uid, { _syncStatus: 'synced' }))
        .catch(console.error);
    }
    setProfile(prev => prev ? { ...prev, ...info, onboardingComplete: true } : prev);
  }, []);

  // ── addTransaction ────────────────────────────────────────────────────────

  const addTransaction = useCallback((input: AddTransactionInput) => {
    const uid = uidRef.current;
    if (!uid) return;
    const id = crypto.randomUUID();
    const tx: Transaction = { id, ...input };
    // 1. Update state immediately
    setTransactions(prev => [tx, ...prev]);
    // 2. Write local DB (pending)
    localDb.transactions.put({ ...tx, _uid: uid, _syncStatus: 'pending' }).catch(console.error);
    // 3. Try Firestore; on success mark synced
    if (canSync()) {
      setDoc(doc(userCol(uid, 'transactions'), id), {
        type: input.type, category: input.category,
        amount: input.amount, date: input.date, note: input.note,
      }).then(() => localDb.transactions.update(id, { _syncStatus: 'synced' }).catch(console.error))
        .catch(() => console.warn('[Offline] Transaction queued for sync'));
    }
  }, []);

  // ── addInvoice ────────────────────────────────────────────────────────────

  const addInvoice = useCallback((input: AddInvoiceInput): Invoice => {
    const uid = uidRef.current;
    if (!uid) return {} as Invoice;
    const id = crypto.randomUUID();
    const invoiceNo = `BILL-${String(invoiceCountRef.current + 1).padStart(3, '0')}`;
    invoiceCountRef.current += 1;
    const invoice: Invoice = {
      id, invoiceNo, client: input.client,
      date: input.date, dueDate: input.dueDate || input.date,
      items: input.items, status: 'Pending',
      clientEmail: input.clientEmail ?? '',
      clientPhone: input.clientPhone ?? '',
      clientAddress: input.clientAddress ?? '',
      tableNo: input.tableNo ?? '',
      orderType: (input.orderType as Invoice['orderType']) ?? 'Dine-In',
      paymentMode: (input.paymentMode as Invoice['paymentMode']) ?? 'Cash',
    };
    const createdAt = new Date().toISOString();
    // 1. Update state immediately
    setInvoices(prev => [invoice, ...prev]);
    // 2. Write local DB (pending)
    localDb.invoices.put({ ...invoice, _uid: uid, _syncStatus: 'pending', _createdAt: createdAt }).catch(console.error);
    // 3. Try Firestore
    if (canSync()) {
      setDoc(doc(userCol(uid, 'invoices'), id), {
        invoiceNo, client: input.client,
        date: input.date, dueDate: input.dueDate || input.date,
        status: 'Pending', items: input.items, createdAt,
        clientEmail: input.clientEmail ?? '',
        clientPhone: input.clientPhone ?? '',
        clientAddress: input.clientAddress ?? '',
        tableNo: input.tableNo ?? '',
        orderType: input.orderType ?? 'Dine-In',
        paymentMode: input.paymentMode ?? 'Cash',
      }).then(() => localDb.invoices.update(id, { _syncStatus: 'synced' }).catch(console.error))
        .catch(() => console.warn('[Offline] Invoice queued for sync'));
    }
    return invoice;
  }, []);

  // ── updateInvoice ─────────────────────────────────────────────────────────────

  const updateInvoice = useCallback((id: string, input: Partial<AddInvoiceInput & { status: Invoice['status'] }>) => {
    const uid = uidRef.current;
    if (!uid) return;
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== id) return inv;
      const updated: Invoice = {
        ...inv,
        ...(input.client !== undefined ? { client: input.client } : {}),
        ...(input.date !== undefined ? { date: input.date } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.items !== undefined ? { items: input.items } : {}),
        ...(input.clientEmail !== undefined ? { clientEmail: input.clientEmail } : {}),
        ...(input.clientPhone !== undefined ? { clientPhone: input.clientPhone } : {}),
        ...(input.clientAddress !== undefined ? { clientAddress: input.clientAddress } : {}),
        ...(input.tableNo !== undefined ? { tableNo: input.tableNo } : {}),
        ...(input.orderType !== undefined ? { orderType: input.orderType as Invoice['orderType'] } : {}),
        ...(input.paymentMode !== undefined ? { paymentMode: input.paymentMode as Invoice['paymentMode'] } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      };
      localDb.invoices.update(id, { ...updated, _syncStatus: 'pending' }).catch(console.error);
      if (canSync()) {
        updateDoc(doc(userCol(uid, 'invoices'), id), {
          client: updated.client,
          date: updated.date,
          dueDate: updated.dueDate,
          items: updated.items,
          clientEmail: updated.clientEmail ?? '',
          clientPhone: updated.clientPhone ?? '',
          clientAddress: updated.clientAddress ?? '',
          tableNo: updated.tableNo ?? '',
          orderType: updated.orderType ?? 'Dine-In',
          paymentMode: updated.paymentMode ?? 'Cash',
        }).then(() => localDb.invoices.update(id, { _syncStatus: 'synced' }).catch(console.error))
          .catch(() => console.warn('[Offline] Invoice update queued'));
      }
      return updated;
    }));
  }, []);

  // ── toggleInvoiceStatus ───────────────────────────────────────────────────

  const toggleInvoiceStatus = useCallback((id: string) => {
    const uid = uidRef.current;
    if (!uid) return;
    setInvoices(prev => {
      const target = prev.find(i => i.id === id);
      if (!target) return prev;
      const isPaid = target.status === 'Paid';
      const nextStatus: Invoice['status'] = isPaid ? 'Pending' : 'Paid';
      // Local DB: mark invoice status pending
      localDb.invoices.update(id, { status: nextStatus, _syncStatus: 'pending' }).catch(console.error);
      if (canSync()) {
        updateDoc(doc(userCol(uid, 'invoices'), id), { status: nextStatus })
          .then(() => localDb.invoices.update(id, { _syncStatus: 'synced' }).catch(console.error))
          .catch(() => console.warn('[Offline] Invoice status queued'));
      }
      if (!isPaid) {
        const total = target.items.reduce((s, i) => s + i.qty * i.price, 0);
        const txId = crypto.randomUUID();
        const tx: Transaction = {
          id: txId, type: 'Income', category: 'Bill Sales', amount: total,
          date: localDate(),
          note: `${target.invoiceNo} — ${target.tableNo ?? target.client}`,

        };
        setTransactions(p => [tx, ...p]);
        localDb.transactions.put({ ...tx, _uid: uid, _syncStatus: 'pending' }).catch(console.error);
        if (canSync()) {
          setDoc(doc(userCol(uid, 'transactions'), txId), {
            type: 'Income', category: 'Client Payment', amount: total,
            date: tx.date, note: tx.note,
          }).then(() => localDb.transactions.update(txId, { _syncStatus: 'synced' }).catch(console.error))
            .catch(() => console.warn('[Offline] Toggle transaction queued'));
        }
      }
      return prev.map(i => i.id === id ? { ...i, status: nextStatus } : i);
    });
  }, []);

  // ── updateEmployees (diff-sync with embedded attendance) ─────────────────

  const updateEmployees = useCallback((updater: (prev: Employee[]) => Employee[]) => {
    const uid = uidRef.current;
    const prev = empRef.current;
    const next = updater(prev);
    empRef.current = next;
    setEmployees(next);
    if (!uid) return;
    const prevIds = new Set(prev.map(e => e.id));
    const now = new Date().toISOString();
    for (const emp of next) {
      if (!prevIds.has(emp.id)) {
        localDb.employees.put({ ...emp, _uid: uid, _syncStatus: 'pending', _createdAt: now }).catch(console.error);
        if (canSync()) {
          setDoc(doc(userCol(uid, 'employees'), emp.id), {
            name: emp.name, role: emp.role, avatar: emp.avatar,
            attendance: emp.attendance ?? {},
            overtime: emp.overtime ?? {},
            salary: emp.salary ?? 0,
            dateOfJoining: emp.dateOfJoining ?? '',
            salaryDeductionRules: emp.salaryDeductionRules ?? '',
            email: emp.email ?? '',
            phone: emp.phone ?? '',
            aadhaar: emp.aadhaar ?? '',
            createdAt: now,
          }).then(() => localDb.employees.update(emp.id, { _syncStatus: 'synced' }).catch(console.error))
            .catch(() => console.warn('[Offline] Employee queued'));
        }
      } else {
        const old = prev.find(e => e.id === emp.id);
        if (old && JSON.stringify(old) !== JSON.stringify(emp)) {
          const updateData = {
            name: emp.name,
            role: emp.role,
            avatar: emp.avatar,
            attendance: emp.attendance,
            overtime: emp.overtime ?? {},
            salary: emp.salary ?? 0,
            dateOfJoining: emp.dateOfJoining ?? '',
            salaryDeductionRules: emp.salaryDeductionRules ?? '',
            email: emp.email ?? '',
            phone: emp.phone ?? '',
            aadhaar: emp.aadhaar ?? '',
            _syncStatus: 'pending' as const,
          };
          localDb.employees.update(emp.id, updateData).catch(console.error);
          if (canSync()) {
            updateDoc(doc(userCol(uid, 'employees'), emp.id), {
              name: emp.name,
              role: emp.role,
              avatar: emp.avatar,
              attendance: emp.attendance,
              overtime: emp.overtime ?? {},
              salary: emp.salary ?? 0,
              dateOfJoining: emp.dateOfJoining ?? '',
              salaryDeductionRules: emp.salaryDeductionRules ?? '',
              email: emp.email ?? '',
              phone: emp.phone ?? '',
              aadhaar: emp.aadhaar ?? '',
            })
              .then(() => localDb.employees.update(emp.id, { _syncStatus: 'synced' }).catch(console.error))
              .catch(() => console.warn('[Offline] Employee update queued'));
          }
        }
      }
    }
  }, []);

  // ── updateInventory ───────────────────────────────────────────────────────

  const updateInventory = useCallback((updater: (prev: InventoryItem[]) => InventoryItem[]) => {
    const uid = uidRef.current;
    const prev = invtRef.current;
    const next = updater(prev);
    invtRef.current = next;
    setInventory(next);
    if (!uid) return;
    const prevIds = new Set(prev.map(i => i.id));
    const now = new Date().toISOString();
    for (const item of next) {
      if (!prevIds.has(item.id)) {
        localDb.inventory.put({ ...item, _uid: uid, _syncStatus: 'pending', _createdAt: now }).catch(console.error);
        if (canSync()) {
          setDoc(doc(userCol(uid, 'inventory'), item.id), {
            name: item.name, sku: item.sku, category: item.category, unit: item.unit,
            openingQty: item.openingQty, currentQty: item.currentQty,
            purchasePrice: item.purchasePrice, sellingPrice: item.sellingPrice,
            reorderLevel: item.reorderLevel, gstRate: item.gstRate, createdAt: now,
          }).then(() => localDb.inventory.update(item.id, { _syncStatus: 'synced' }).catch(console.error))
            .catch(() => console.warn('[Offline] Inventory queued'));
        }
      } else {
        localDb.inventory.update(item.id, {
          openingQty:    item.openingQty,
          currentQty:    item.currentQty,
          purchasePrice: item.purchasePrice,
          sellingPrice:  item.sellingPrice,
          reorderLevel:  item.reorderLevel,
          _syncStatus: 'pending',
        }).catch(console.error);
        if (canSync()) {
          updateDoc(doc(userCol(uid, 'inventory'), item.id), {
            openingQty:    item.openingQty,
            currentQty:    item.currentQty,
            purchasePrice: item.purchasePrice,
            sellingPrice:  item.sellingPrice,
            reorderLevel:  item.reorderLevel,
          }).then(() => localDb.inventory.update(item.id, { _syncStatus: 'synced' }).catch(console.error))
            .catch(() => console.warn('[Offline] Inventory update queued'));
        }
      }
    }
  }, []);

  // ── Profile / Preferences ─────────────────────────────────────────────────

  const updateBusinessProfile = useCallback((p: { businessName: string; email: string; phone: string; gst: string; address: string }) => {
    const uid = uidRef.current;
    if (!uid) return;
    setProfile(prev => prev ? { ...prev, ...p } : prev);
    localDb.profile.where('id').equals(uid).modify({ ...p, _syncStatus: 'pending' }).catch(console.error);
    if (canSync()) {
      updateDoc(userDoc(uid), { businessName: p.businessName, email: p.email, phone: p.phone, gst: p.gst, address: p.address })
        .then(() => localDb.profile.where('id').equals(uid).modify({ _syncStatus: 'synced' }).catch(console.error))
        .catch(() => console.warn('[Offline] Business profile queued'));
    }
  }, []);

  const updatePreferences = useCallback((p: { emailNotifications: boolean; darkMode: boolean; currency: string; twoFactorAuth: boolean }) => {
    const uid = uidRef.current;
    if (!uid) return;
    setProfile(prev => prev ? { ...prev, emailNotifications: p.emailNotifications, darkMode: p.darkMode, currency: p.currency, twoFactorAuth: p.twoFactorAuth } : prev);
    localDb.profile.where('id').equals(uid).modify({ ...p, _syncStatus: 'pending' }).catch(console.error);
    if (canSync()) {
      updateDoc(userDoc(uid), { emailNotifications: p.emailNotifications, darkMode: p.darkMode, currency: p.currency, twoFactorAuth: p.twoFactorAuth })
        .then(() => localDb.profile.where('id').equals(uid).modify({ _syncStatus: 'synced' }).catch(console.error))
        .catch(() => console.warn('[Offline] Preferences queued'));
    }
    if (typeof window !== 'undefined') {
      const theme = p.darkMode ? 'dark' : 'light';
      window.localStorage.setItem('synplix-theme', theme);
      document.documentElement.dataset.theme = theme;
    }
  }, []);

  // ── Individual delete actions ─────────────────────────────────────────────

  const deleteEmployee = useCallback((id: string) => {
    const uid = uidRef.current;
    empRef.current = empRef.current.filter(e => e.id !== id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    localDb.employees.delete(id).catch(console.error);
    if (uid && canSync()) {
      deleteDoc(doc(userCol(uid, 'employees'), id)).catch(console.error);
    }
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    const uid = uidRef.current;
    setInvoices(prev => prev.filter(i => i.id !== id));
    localDb.invoices.delete(id).catch(console.error);
    if (uid && canSync()) {
      deleteDoc(doc(userCol(uid, 'invoices'), id)).catch(console.error);
    }
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    const uid = uidRef.current;
    setTransactions(prev => prev.filter(t => t.id !== id));
    localDb.transactions.delete(id).catch(console.error);
    if (uid && canSync()) {
      deleteDoc(doc(userCol(uid, 'transactions'), id)).catch(console.error);
    }
  }, []);

  const deleteInventoryItem = useCallback((id: string) => {
    const uid = uidRef.current;
    invtRef.current = invtRef.current.filter(i => i.id !== id);
    setInventory(prev => prev.filter(i => i.id !== id));
    localDb.inventory.delete(id).catch(console.error);
    if (uid && canSync()) {
      deleteDoc(doc(userCol(uid, 'inventory'), id)).catch(console.error);
    }
  }, []);

  const resetBusinessData = useCallback(() => {
    const uid = uidRef.current;
    if (!uid) return;
    // Clear local DB
    Promise.all([
      localDb.employees.where('_uid').equals(uid).delete(),
      localDb.invoices.where('_uid').equals(uid).delete(),
      localDb.transactions.where('_uid').equals(uid).delete(),
      localDb.inventory.where('_uid').equals(uid).delete(),
    ]).then(() => {
      setEmployees([]); empRef.current = [];
      setInvoices([]); invoiceCountRef.current = 0;
      setTransactions([]);
      setInventory([]); invtRef.current = [];
    }).catch(err => console.error('resetBusinessData:', err));
    // Also clear Firestore if available
    if (canSync()) {
      const deleteAll = async (colName: string) => {
        const snaps = await getDocs(userCol(uid, colName));
        const batch = writeBatch(db!);
        snaps.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      };
      Promise.all([deleteAll('employees'), deleteAll('invoices'), deleteAll('transactions'), deleteAll('inventory')])
        .catch(err => console.error('resetBusinessData Firestore:', err));
    }
  }, []);

  const deleteCurrentAccount = useCallback(() => {
    if (auth) firebaseSignOut(auth).catch(err => console.error('deleteAccount signOut:', err));
    sessionStorage.removeItem('amora-local-uid');
    clearData();
  }, [clearData]);

  // ── Derived values ────────────────────────────────────────────────────────

  // currentUser derived from session ONLY (not requiring profile) so it is
  // non-null the instant signInWithPassword resolves — prevents redirect loop
  // where AppLayout sees null user before profile loads and bounces back to /.
  const currentUser = useMemo<UserAccount | null>(() => {
    if (!session) return null;
    return {
      id: session.uid,
      name: profile?.name ?? session.displayName ?? session.email?.split('@')[0] ?? 'User',
      email: profile?.email ?? session.email ?? '',
      password: '',
      createdAt: session.metadata.creationTime ?? '',
    };
  }, [session, profile]);

  const data = useMemo(() => ({
    employees,
    invoices,
    transactions,
    inventory,
    catalogue,
    businessProfile: {
      businessName: profile?.businessName ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
      gst: profile?.gst ?? '',
      address: profile?.address ?? '',
    },
    preferences: {
      emailNotifications: profile?.emailNotifications ?? true,
      darkMode: profile?.darkMode ?? true,
      currency: profile?.currency ?? 'INR',
      twoFactorAuth: profile?.twoFactorAuth ?? false,
    },
  }), [employees, invoices, transactions, inventory, catalogue, profile]);

  const dashboard = useMemo(() => computeDashboard(invoices, transactions), [invoices, transactions]);

  const value = useMemo<AppStoreContextValue>(() => ({
    ready, session, profile, currentUser, data,
    login, signup, loginDemo, logout,
    completeOnboarding,
    addTransaction, addInvoice, updateInvoice, toggleInvoiceStatus,
    updateEmployees, updateInventory, updateCatalogue, updateBusinessProfile, updatePreferences,
    deleteEmployee, deleteInvoice, deleteTransaction, deleteInventoryItem,
    resetBusinessData, deleteCurrentAccount,
    isOnline,
    dashboard,
  }), [
    ready, session, profile, currentUser, data,
    login, signup, loginDemo, logout, completeOnboarding,
    addTransaction, addInvoice, updateInvoice, toggleInvoiceStatus,
    updateEmployees, updateInventory, updateCatalogue, updateBusinessProfile, updatePreferences,
    deleteEmployee, deleteInvoice, deleteTransaction, deleteInventoryItem,
    resetBusinessData, deleteCurrentAccount, isOnline, dashboard,
  ]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
