import { useEffect, useRef, useState } from 'react';
import type { InventoryItem } from '@/types';

const inputClass =
  'w-full px-4 py-2 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500';

export function ItemSearchSelect({
  items,
  value,
  onChange,
  placeholder = 'Search items...',
}: {
  items: InventoryItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const selected = items.find((i) => i.id === value) || null;
  const [query, setQuery] = useState(selected?.name || '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the text box in sync if the selection is cleared/changed by the parent.
  useEffect(() => {
    setQuery(selected?.name || '');
  }, [selected?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 50);

  const handleSelect = (item: InventoryItem) => {
    onChange(item.id);
    setQuery(item.name);
    setOpen(false);
  };

  const handleInputChange = (text: string) => {
    setQuery(text);
    setOpen(true);
    // Typing away from the confirmed selection clears it, so "+ Add" can't
    // fire against a stale item that no longer matches what's shown.
    if (selected && text !== selected.name) onChange('');
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        className={inputClass}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg shadow-xl">
          {filtered.length === 0 && <p className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">No items match.</p>}
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              disabled={item.currentStock === 0}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-left text-neutral-900 dark:text-white hover:bg-violet-50 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="truncate">{item.name}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0 ml-2">
                {item.currentStock === 0 ? 'Out of stock' : `Stock: ${item.currentStock}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
