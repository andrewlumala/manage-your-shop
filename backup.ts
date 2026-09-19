import type { BackupPayload } from '@/types';

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Basic shape validation — enough to catch a wrong/corrupt file without
// pulling in a full schema validator for a single-purpose import.
export function parseBackup(raw: string): BackupPayload | null {
  try {
    const data = JSON.parse(raw);
    if (
      data &&
      Array.isArray(data.inventory) &&
      Array.isArray(data.sales) &&
      Array.isArray(data.notes) &&
      data.settings &&
      typeof data.settings.businessName === 'string' &&
      typeof data.settings.currency === 'string'
    ) {
      // Older backups (from before expenses/purchases/customers existed)
      // simply won't have these fields — default them rather than rejecting
      // the file. Team membership and the audit log are deliberately never
      // part of backups — restoring an old team roster could silently
      // reinstate someone who was removed.
      return {
        ...data,
        expenses: Array.isArray(data.expenses) ? data.expenses : [],
        purchases: Array.isArray(data.purchases) ? data.purchases : [],
        customers: Array.isArray(data.customers) ? data.customers : [],
      } as BackupPayload;
    }
    return null;
  } catch {
    return null;
  }
}
