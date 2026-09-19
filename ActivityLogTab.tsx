import type { AuditLogEntry } from '@/types';
import { formatDateDMY } from '@/lib/format';

export function ActivityLogTab({ log }: { log: AuditLogEntry[] }) {
  const sorted = [...log].reverse();

  return (
    <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-violet-100 dark:border-neutral-800">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Activity Log <span className="text-neutral-500 dark:text-neutral-500 font-normal text-sm">— last {sorted.length} actions</span>
        </h3>
      </div>
      <div className="divide-y divide-violet-100 dark:divide-neutral-800 max-h-[70vh] overflow-y-auto">
        {sorted.map((entry) => (
          <div key={entry.id} className="px-6 py-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-neutral-900 dark:text-white">{entry.action}</p>
              {entry.details && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{entry.details}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{entry.userName}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-600">
                {formatDateDMY(entry.timestamp)}{' '}
                {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {sorted.length === 0 && <p className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-500 text-sm">No activity recorded yet.</p>}
      </div>
    </div>
  );
}
