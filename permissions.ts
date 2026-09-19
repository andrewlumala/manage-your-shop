import type { UserRole } from '@/types';

export type Action =
  | 'inventory.view'
  | 'inventory.viewCost'
  | 'inventory.create'
  | 'inventory.edit'
  | 'inventory.delete'
  | 'inventory.restock'
  | 'inventory.import'
  | 'sales.create'
  | 'sales.edit'
  | 'sales.delete'
  | 'sales.viewProfit'
  | 'debtors.view'
  | 'debtors.recordPayment'
  | 'expenses.view'
  | 'expenses.manage'
  | 'notes.manage'
  | 'reports.view'
  | 'activity.view'
  | 'settings.manage'
  | 'team.manage'
  | 'data.clear'
  | 'data.backup';

const STAFF_ALLOWED = new Set<Action>([
  'inventory.view',
  'inventory.restock',
  'sales.create',
  'debtors.view',
  'debtors.recordPayment',
  'notes.manage',
]);

// Owner can do everything; staff is limited to running the till and basic
// stock handling — no pricing/cost visibility, no financial reports, no
// destructive or account-level actions.
export function can(role: UserRole | undefined, action: Action): boolean {
  if (role === 'owner') return true;
  if (role === 'staff') return STAFF_ALLOWED.has(action);
  return false;
}
