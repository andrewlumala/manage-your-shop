import { useRef, useState } from 'react';
import type { InventoryItem } from '@/types';
import { parseCSV } from '@/lib/csv';

interface ParsedRow {
  name: string;
  category?: string;
  buyingPrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  status: 'new' | 'duplicate' | 'invalid';
}

function findColumn(header: string[], candidates: string[]): number {
  const lower = header.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c);
    if (idx !== -1) return idx;
  }
  return -1;
}

export function ImportInventoryModal({
  existingInventory,
  onImport,
  onClose,
}: {
  existingInventory: InventoryItem[];
  onImport: (items: Omit<InventoryItem, 'id'>[]) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const table = parseCSV(text);
      if (table.length < 2) {
        setError('That file has no data rows.');
        return;
      }
      const [header, ...dataRows] = table;
      const nameIdx = findColumn(header, ['item name', 'name']);
      const categoryIdx = findColumn(header, ['category']);
      const buyIdx = findColumn(header, ['buying price', 'buying price (ugx)', 'buy price', 'cost']);
      const sellIdx = findColumn(header, ['selling price', 'selling price (ugx)', 'sell price', 'price']);
      const stockIdx = findColumn(header, ['current stock', 'stock', 'quantity']);
      const reorderIdx = findColumn(header, ['reorder level', 'reorder']);

      if (nameIdx === -1 || buyIdx === -1 || sellIdx === -1) {
        setError('Could not find "Item Name", "Buying Price", and "Selling Price" columns in this file.');
        return;
      }

      const existingNames = new Set(existingInventory.map((i) => i.name.trim().toLowerCase()));
      const seenInFile = new Set<string>();
      const parsed: ParsedRow[] = dataRows.map((r) => {
        const name = (r[nameIdx] || '').trim();
        const buyingPrice = Number(r[buyIdx]) || 0;
        const sellingPrice = Number(r[sellIdx]) || 0;
        const currentStock = stockIdx !== -1 ? Number(r[stockIdx]) || 0 : 0;
        const reorderLevel = reorderIdx !== -1 ? Number(r[reorderIdx]) || 5 : 5;
        const category = categoryIdx !== -1 ? r[categoryIdx]?.trim() || undefined : undefined;

        let status: ParsedRow['status'] = 'new';
        if (!name || buyingPrice <= 0 || sellingPrice <= 0) status = 'invalid';
        else if (existingNames.has(name.toLowerCase()) || seenInFile.has(name.toLowerCase())) status = 'duplicate';

        if (status === 'new') seenInFile.add(name.toLowerCase());
        return { name, category, buyingPrice, sellingPrice, currentStock, reorderLevel, status };
      });
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const newRows = rows?.filter((r) => r.status === 'new') || [];
  const duplicateCount = rows?.filter((r) => r.status === 'duplicate').length || 0;
  const invalidCount = rows?.filter((r) => r.status === 'invalid').length || 0;

  const handleConfirm = () => {
    onImport(
      newRows.map((r) => ({
        name: r.name,
        category: r.category,
        buyingPrice: r.buyingPrice,
        sellingPrice: r.sellingPrice,
        currentStock: r.currentStock,
        reorderLevel: r.reorderLevel,
      }))
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white border border-violet-100 dark:bg-neutral-900 dark:border-violet-900/40 rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">Import Inventory</h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
          Upload a CSV with columns for Item Name, Buying Price, and Selling Price (Category, Current Stock, and Reorder
          Level are optional).
        </p>

        {!rows && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-8 border-2 border-dashed border-violet-200 dark:border-violet-900/40 rounded-xl text-neutral-500 dark:text-neutral-400 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all"
            >
              Click to choose a CSV file
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm mt-3">
            {error}
          </div>
        )}

        {rows && (
          <div className="space-y-4">
            <div className="bg-violet-50 dark:bg-neutral-800/50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">New items to add</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{newRows.length}</span>
              </div>
              {duplicateCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Skipped (already in inventory)</span>
                  <span className="text-neutral-500 dark:text-neutral-400">{duplicateCount}</span>
                </div>
              )}
              {invalidCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Skipped (missing name or price)</span>
                  <span className="text-red-500 dark:text-red-400">{invalidCount}</span>
                </div>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto border border-violet-100 dark:border-neutral-800 rounded-lg">
              {newRows.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 text-sm border-b border-violet-50 dark:border-neutral-800 last:border-b-0"
                >
                  <span className="text-neutral-900 dark:text-white truncate">{r.name}</span>
                  <span className="text-neutral-500 dark:text-neutral-400 shrink-0 ml-2">{r.currentStock} in stock</span>
                </div>
              ))}
              {newRows.length === 0 && (
                <p className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-500 text-center">Nothing new to import.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white font-medium rounded-xl transition-all"
          >
            Cancel
          </button>
          {rows && newRows.length > 0 && (
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-medium rounded-xl transition-all"
            >
              Import {newRows.length} Item{newRows.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
