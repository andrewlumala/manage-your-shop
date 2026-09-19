import type { InventoryItem, SaleRecord, Note, AppSettings, Expense, Purchase, Customer, TeamMember, AuditLogEntry } from '@/types';
import { supabase, WORKSPACE_TABLE } from '@/lib/supabaseClient';

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can throw in private-browsing / quota-exceeded cases.
    // Failing silently here is preferable to crashing the whole app.
  }
}

export const KEYS = {
  inventory: 'wholesale-inventory',
  sales: 'wholesale-sales',
  notes: 'wholesale-notes',
  settings: 'wholesale-settings',
  seeded: 'wholesale-seeded',
  expenses: 'wholesale-expenses',
  purchases: 'wholesale-purchases',
  customers: 'wholesale-customers',
  team: 'wholesale-team',
  auditLog: 'wholesale-audit-log',
};

const AUDIT_LOG_CAP = 500;

// --- Generic key/value load & save for non-array values (routed to Supabase when configured) ---

async function loadValue<T>(key: string, fallback: T): Promise<T> {
  if (supabase) {
    const { data, error } = await supabase.from(WORKSPACE_TABLE).select('value').eq('key', key).maybeSingle();
    if (error) {
      console.error(`Failed to load "${key}" from Supabase:`, error.message);
      return loadJSON(key, fallback); // fall back to whatever's cached locally
    }
    return (data?.value as T) ?? fallback;
  }
  return loadJSON(key, fallback);
}

async function saveValue(key: string, value: unknown): Promise<void> {
  saveJSON(key, value);
  if (supabase) {
    const { error } = await supabase.from(WORKSPACE_TABLE).upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw new Error(`Failed to sync "${key}": ${error.message}`);
  }
}

// --- Three-way merge for array values, so two devices saving around the ---
// --- same time don't silently clobber each other's changes.            ---
//
// "base" is the last copy this device successfully loaded or saved — its
// view of what was last agreed. Comparing local + remote against it lets us
// tell a genuine deletion (present in base, gone from one side) apart from
// "this device just doesn't know about that record yet" (absent from base
// entirely) — a plain union of local+remote can't make that distinction,
// and would silently undo deletions by resurrecting anything remote still
// has. Edits to the same record by two people at once still just take
// whichever side is applied — a real conflict there isn't resolved, only
// contained to that one record instead of losing everything else.
function mergeThreeWay<T extends { id: string }>(base: T[], local: T[], remote: T[]): T[] {
  const baseIds = new Set(base.map((x) => x.id));
  const localIds = new Set(local.map((x) => x.id));
  const remoteIds = new Set(remote.map((x) => x.id));
  const localMap = new Map(local.map((x) => [x.id, x]));
  const remoteMap = new Map(remote.map((x) => [x.id, x]));

  const allIds = new Set<string>([...baseIds, ...localIds, ...remoteIds]);
  const result: T[] = [];

  for (const id of allIds) {
    const inBase = baseIds.has(id);
    const inLocal = localIds.has(id);
    const inRemote = remoteIds.has(id);

    if (!inLocal && !inRemote) continue; // gone from both sides
    if (inBase && !inLocal) continue; // this device deleted it
    if (inBase && !inRemote) continue; // another device deleted it — honor that
    if (inLocal) result.push(localMap.get(id)!);
    else result.push(remoteMap.get(id)!);
  }
  return result;
}

async function saveArrayValue<T extends { id: string }>(key: string, base: T[], local: T[]): Promise<T[]> {
  saveJSON(key, local); // optimistic local cache, in case the round-trip below fails
  if (!supabase) return local;

  const { data: existing, error: fetchError } = await supabase.from(WORKSPACE_TABLE).select('value').eq('key', key).maybeSingle();
  const remote = fetchError ? base : ((existing?.value as T[]) ?? []);
  const merged = mergeThreeWay(base, local, remote);

  const { error } = await supabase.from(WORKSPACE_TABLE).upsert({ key, value: merged, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to sync "${key}": ${error.message}`);
  saveJSON(key, merged);
  return merged;
}

export async function loadInventory(fallback: InventoryItem[]): Promise<InventoryItem[]> {
  return loadValue(KEYS.inventory, fallback);
}
export function saveInventory(base: InventoryItem[], next: InventoryItem[]): Promise<InventoryItem[]> {
  return saveArrayValue(KEYS.inventory, base, next);
}

export async function loadSales(fallback: SaleRecord[]): Promise<SaleRecord[]> {
  return loadValue(KEYS.sales, fallback);
}
export function saveSales(base: SaleRecord[], next: SaleRecord[]): Promise<SaleRecord[]> {
  return saveArrayValue(KEYS.sales, base, next);
}

export async function loadNotes(): Promise<Note[]> {
  return loadValue(KEYS.notes, []);
}
export function saveNotes(base: Note[], next: Note[]): Promise<Note[]> {
  return saveArrayValue(KEYS.notes, base, next);
}

export async function loadExpenses(): Promise<Expense[]> {
  return loadValue(KEYS.expenses, []);
}
export function saveExpenses(base: Expense[], next: Expense[]): Promise<Expense[]> {
  return saveArrayValue(KEYS.expenses, base, next);
}

export async function loadPurchases(): Promise<Purchase[]> {
  return loadValue(KEYS.purchases, []);
}
export function savePurchases(base: Purchase[], next: Purchase[]): Promise<Purchase[]> {
  return saveArrayValue(KEYS.purchases, base, next);
}

export async function loadCustomers(): Promise<Customer[]> {
  return loadValue(KEYS.customers, []);
}
export function saveCustomers(base: Customer[], next: Customer[]): Promise<Customer[]> {
  return saveArrayValue(KEYS.customers, base, next);
}

export async function loadTeam(): Promise<TeamMember[]> {
  return loadValue(KEYS.team, []);
}
export function saveTeam(base: TeamMember[], next: TeamMember[]): Promise<TeamMember[]> {
  return saveArrayValue(KEYS.team, base, next);
}

export async function loadAuditLog(): Promise<AuditLogEntry[]> {
  return loadValue(KEYS.auditLog, []);
}
export async function appendAuditEntry(base: AuditLogEntry[], entry: AuditLogEntry): Promise<AuditLogEntry[]> {
  const next = [...base, entry].slice(-AUDIT_LOG_CAP);
  return saveArrayValue(KEYS.auditLog, base, next);
}

const DEFAULT_SETTINGS: AppSettings = { businessName: 'Kikuubo Wholesale Tracker', currency: 'UGX' };

export async function loadSettings(): Promise<AppSettings> {
  return loadValue(KEYS.settings, DEFAULT_SETTINGS);
}
export function saveSettings(settings: AppSettings): Promise<void> {
  return saveValue(KEYS.settings, settings);
}

export async function hasSeededData(): Promise<boolean> {
  if (supabase) {
    const { data, error } = await supabase.from(WORKSPACE_TABLE).select('key').eq('key', KEYS.inventory).maybeSingle();
    if (error) return localStorage.getItem(KEYS.seeded) === 'true';
    return Boolean(data);
  }
  return localStorage.getItem(KEYS.seeded) === 'true';
}
export async function markSeeded(): Promise<void> {
  localStorage.setItem(KEYS.seeded, 'true');
  // No separate Supabase write needed — hasSeededData() checks for the
  // presence of the inventory row itself once Supabase is configured.
}
