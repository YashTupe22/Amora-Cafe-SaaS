/**
 * localDb.ts — Dexie (IndexedDB) schema for offline-first storage.
 *
 * Every table mirrors the Firestore collection but adds three fields:
 *   _uid         — the Firebase user ID that owns the record
 *   _syncStatus  — 'synced' | 'pending' | 'deleted'
 *   _createdAt   — ISO string used for sorting
 */

import Dexie, { type Table } from 'dexie';
import type { Employee, Invoice, InvoiceItem, InventoryItem, Transaction } from './mockData';
import type { Profile } from './appStore';

// ─── Extended local types ─────────────────────────────────────────────────────

export type SyncStatus = 'synced' | 'pending' | 'deleted';

export interface LocalEmployee extends Employee {
  _uid: string;
  _syncStatus: SyncStatus;
  _createdAt: string;
}

export interface LocalInvoice extends Invoice {
  _uid: string;
  _syncStatus: SyncStatus;
  _createdAt: string;
}

export interface LocalTransaction extends Transaction {
  _uid: string;
  _syncStatus: SyncStatus;
}

export interface LocalInventoryItem extends InventoryItem {
  _uid: string;
  _syncStatus: SyncStatus;
  _createdAt: string;
}

export interface LocalProfile extends Profile {
  _syncStatus: 'synced' | 'pending';
}

// Local user account — used for auth when Firebase is unavailable
export interface LocalUser {
  id: string;       // UUID — acts as uid
  name: string;
  email: string;    // stored lowercase
  password: string; // bcrypt hash (via lib/crypto.ts) — never stored plain text
  createdAt: string;
}

// ─── Database ─────────────────────────────────────────────────────────────────

class SynplixDatabase extends Dexie {
  employees!:    Table<LocalEmployee>;
  invoices!:     Table<LocalInvoice>;
  transactions!: Table<LocalTransaction>;
  inventory!:    Table<LocalInventoryItem>;
  profile!:      Table<LocalProfile>;
  users!:        Table<LocalUser>;

  constructor() {
    super('SynplixDB');
    this.version(1).stores({
      employees:    'id, _uid, _syncStatus, _createdAt',
      invoices:     'id, _uid, _syncStatus, _createdAt',
      transactions: 'id, _uid, _syncStatus, date',
      inventory:    'id, _uid, _syncStatus, _createdAt',
      profile:      'id, _syncStatus',
    });
    // v2: add local users table for offline auth
    this.version(2).stores({
      employees:    'id, _uid, _syncStatus, _createdAt',
      invoices:     'id, _uid, _syncStatus, _createdAt',
      transactions: 'id, _uid, _syncStatus, date',
      inventory:    'id, _uid, _syncStatus, _createdAt',
      profile:      'id, _syncStatus',
      users:        'id, &email',
    });
  }
}

export const localDb = new SynplixDatabase();
