export interface ConfirmState {
  title: string;
  message: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  state,
  onCancel,
}: {
  state: ConfirmState | null;
  onCancel: () => void;
}) {
  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm bg-white border border-violet-100 dark:bg-neutral-900 dark:border-violet-900/40 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">{state.title}</h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6">{state.message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white font-medium rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              state.onConfirm();
              onCancel();
            }}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
