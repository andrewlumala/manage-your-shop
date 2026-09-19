import type { Purchase } from '@/types';

export function PurchaseHistory({ purchases, money, onExport }: { purchases: Purchase[]; money: (amount: number) => string; onExport: () => void }) {
  const sorted = [...purchases].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);

  return (
    <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-violet-100 dark:border-neutral-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Recent Restocks</h3>
        {purchases.length > 0 && (
          <button
            onClick={onExport}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300 rounded-lg text-sm transition-all"
          >
            Export CSV
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-violet-50 dark:bg-neutral-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Unit Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Total Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Supplier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-100 dark:divide-neutral-800">
            {sorted.map((p) => (
              <tr key={p.id} className="hover:bg-violet-50/60 dark:hover:bg-neutral-800/30">
                <td className="px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">{p.date}</td>
                <td className="px-6 py-3 text-sm text-neutral-900 dark:text-white">{p.itemName}</td>
                <td className="px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">{p.quantity}</td>
                <td className="px-6 py-3 text-sm text-neutral-600 dark:text-neutral-300">{money(p.unitCost)}</td>
                <td className="px-6 py-3 text-sm text-violet-600 dark:text-violet-400">{money(p.totalCost)}</td>
                <td className="px-6 py-3 text-sm text-neutral-500 dark:text-neutral-400">{p.supplier || '—'}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-500 text-sm">
                  No restocks logged yet. Use the restock icon on an item to log one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
