import { useState } from 'react';
import type { InventoryItem } from '@/types';

const inputClass =
  'w-full px-4 py-2.5 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500';

export function EditItemModal({
  item,
  showBaseCurrencyNote,
  onSave,
  onClose,
}: {
  item: InventoryItem;
  showBaseCurrencyNote: boolean;
  onSave: (updated: InventoryItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<InventoryItem>(item);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!form.name.trim() || form.buyingPrice <= 0 || form.sellingPrice <= 0) {
      setError('Name, buying price and selling price are required.');
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white border border-violet-100 dark:bg-neutral-900 dark:border-violet-900/40 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Edit Item</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Item Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Category (optional)</label>
            <input
              type="text"
              value={form.category || ''}
              onChange={(e) => setForm({ ...form, category: e.target.value || undefined })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Barcode (optional)</label>
            <input
              type="text"
              value={form.barcode || ''}
              onChange={(e) => setForm({ ...form, barcode: e.target.value || undefined })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Buying Price {showBaseCurrencyNote && <span className="font-normal text-neutral-400">(UGX)</span>}
              </label>
              <input
                type="number"
                value={form.buyingPrice}
                onChange={(e) => setForm({ ...form, buyingPrice: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Selling Price {showBaseCurrencyNote && <span className="font-normal text-neutral-400">(UGX)</span>}
              </label>
              <input
                type="number"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Current Stock</label>
              <input
                type="number"
                value={form.currentStock}
                onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Reorder Level</label>
              <input
                type="number"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm">
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
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
