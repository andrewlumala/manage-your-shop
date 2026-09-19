import { useState } from 'react';
import type { InventoryItem } from '@/types';
import { todayISO } from '@/lib/format';

const inputClass =
  'w-full px-4 py-2.5 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500';

export function RestockModal({
  item,
  money,
  showBaseCurrencyNote,
  onSave,
  onClose,
}: {
  item: InventoryItem;
  money: (amount: number) => string;
  showBaseCurrencyNote: boolean;
  onSave: (args: { quantity: number; unitCost: number; supplier: string; date: string }) => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(item.buyingPrice);
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState('');

  const newAverageCost =
    quantity > 0 ? Math.round((item.currentStock * item.buyingPrice + quantity * unitCost) / (item.currentStock + quantity)) : item.buyingPrice;

  const handleSave = () => {
    if (quantity <= 0) {
      setError('Enter a quantity greater than zero.');
      return;
    }
    if (unitCost <= 0) {
      setError('Enter a unit cost greater than zero.');
      return;
    }
    onSave({ quantity, unitCost, supplier: supplier.trim(), date });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white border border-violet-100 dark:bg-neutral-900 dark:border-violet-900/40 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">Restock Item</h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
          {item.name} — currently {item.currentStock} in stock at {money(item.buyingPrice)}/unit
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Quantity Received</label>
              <input type="number" value={quantity || ''} onChange={(e) => setQuantity(Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Unit Cost {showBaseCurrencyNote && <span className="font-normal text-neutral-400">(UGX)</span>}
              </label>
              <input type="number" value={unitCost || ''} onChange={(e) => setUnitCost(Number(e.target.value))} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Supplier (optional)</label>
            <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>

          {quantity > 0 && (
            <div className="bg-violet-50 dark:bg-neutral-800/50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">New stock level</span>
                <span className="text-neutral-900 dark:text-white">{item.currentStock + quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">New average cost/unit</span>
                <span className="text-neutral-900 dark:text-white">{money(newAverageCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Total cost of this restock</span>
                <span className="text-neutral-900 dark:text-white">{money(quantity * unitCost)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white font-medium rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-medium rounded-xl transition-all"
          >
            Confirm Restock
          </button>
        </div>
      </div>
    </div>
  );
}
