import type { ToastMessage } from '@/types';

const STYLES: Record<ToastMessage['type'], string> = {
  success: 'bg-white border-emerald-200 text-emerald-600 dark:bg-neutral-900 dark:border-emerald-500/30 dark:text-emerald-400',
  error: 'bg-white border-red-200 text-red-600 dark:bg-neutral-900 dark:border-red-500/30 dark:text-red-400',
  info: 'bg-white border-violet-200 text-violet-600 dark:bg-neutral-900 dark:border-violet-500/30 dark:text-violet-400',
};

const ICON_PATH: Record<ToastMessage['type'], string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in fade-in slide-in-from-top-2 ${STYLES[toast.type]}`}
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICON_PATH[toast.type]} />
          </svg>
          <p className="text-sm flex-1 text-neutral-700 dark:text-neutral-300">{toast.message}</p>
          <button onClick={() => onDismiss(toast.id)} className="text-current opacity-60 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
