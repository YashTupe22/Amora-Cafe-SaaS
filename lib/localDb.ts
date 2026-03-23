/**
 * localDb.ts — Dexie (IndexedDB) schema for offline-first storage.
 *
 * Every table mirrors the Firestore collection but adds these fields:
 *   _uid         — the Firebase user ID that owns the record
 *   _syncStatus  — 'synced' | 'pending' | 'deleted'
 *   _createdAt   — ISO string used for sorting
 *
 * Data separation between restaurant and business interfaces:
 *   interface    — 'restaurant' | 'business' | 'shared' (for inventory)
 */

import Dexie, { type Table } from 'dexie';
import type { Employee, Invoice, InvoiceItem, InventoryItem, Transaction, InterfaceType } from './mockData';
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
  // Denormalized interface field for efficient filtering
  interface: InterfaceType;
}

export interface LocalTransaction extends Transaction {
  _uid: string;
  _syncStatus: SyncStatus;
  // Denormalized interface field for efficient filtering
  interface: InterfaceType;
}

export interface LocalInventoryItem extends InventoryItem {
  _uid: string;
  _syncStatus: SyncStatus;
  _createdAt: string;
  // Inventory can be shared between interfaces
  interface: InterfaceType | 'shared';
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
    // v3: add interface field for data separation between restaurant and business
    this.version(3).stores({
      employees:    'id, _uid, _syncStatus, _createdAt',
      invoices:     'id, _uid, _syncStatus, _createdAt, interface, [_uid+interface]',
      transactions: 'id, _uid, _syncStatus, date, interface, [_uid+interface]',
      inventory:    'id, _uid, _syncStatus, _createdAt, interface, [_uid+interface]',
      profile:      'id, _syncStatus',
      users:        'id, &email',
    }).upgrade(tx => {
      // Migration: set existing records to 'restaurant' interface (backward compatibility)
      return Promise.all([
        tx.table('invoices').toCollection().modify(inv => {
          if (!inv.interface) inv.interface = 'restaurant';
        }),
        tx.table('transactions').toCollection().modify(txn => {
          if (!txn.interface) txn.interface = 'restaurant';
        }),
        tx.table('inventory').toCollection().modify(item => {
          if (!item.interface) item.interface = 'shared';
        }),
      ]);
    });
  }
}

export const localDb = new SynplixDatabase();
