import type { TeamMember, UserRole } from '@/types';

export function TeamPanel({
  team,
  currentUserId,
  onApprove,
  onSetRole,
  onRemove,
}: {
  team: TeamMember[];
  currentUserId: string;
  onApprove: (member: TeamMember) => void;
  onSetRole: (member: TeamMember, role: UserRole) => void;
  onRemove: (member: TeamMember) => void;
}) {
  const pending = team.filter((m) => m.status === 'pending');
  const approved = team.filter((m) => m.status === 'approved');

  return (
    <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">Team</h3>
      <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-5">
        Everyone approved here shares the same inventory, sales, and records. Staff can't see cost prices, profit
        figures, or reach Settings/Expenses/Reports.
      </p>

      {pending.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            Waiting for approval ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 rounded-lg px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-neutral-900 dark:text-white truncate">{m.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onApprove(m)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-all"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onRemove(m)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 text-sm font-medium rounded-lg transition-all"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {approved.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 bg-violet-50 dark:bg-neutral-800/50 rounded-lg px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm text-neutral-900 dark:text-white truncate">
                {m.name} {m.userId === currentUserId && <span className="text-neutral-400 dark:text-neutral-500">(you)</span>}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{m.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={m.role}
                onChange={(e) => onSetRole(m, e.target.value as UserRole)}
                disabled={m.userId === currentUserId}
                className="px-2 py-1.5 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-sm text-neutral-900 dark:text-white disabled:opacity-50"
              >
                <option value="owner">Owner</option>
                <option value="staff">Staff</option>
              </select>
              {m.userId !== currentUserId && (
                <button onClick={() => onRemove(m)} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
        {approved.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-500">No approved members yet.</p>}
      </div>
    </div>
  );
}
