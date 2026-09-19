import { useEffect, useRef, useState } from 'react';
import type { Customer } from '@/types';

const inputClass =
  'w-full px-4 py-2 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500';

export function CustomerSearchSelect({
  customers,
  value,
  onChange,
  onCreateNew,
  placeholder = 'Customer name (optional if paid in full)',
}: {
  customers: Customer[];
  value: string; // selected customer id, or '' for none
  onChange: (customerId: string) => void;
  onCreateNew: (name: string) => string; // creates the customer, returns its new id
  placeholder?: string;
}) {
  const selected = customers.find((c) => c.id === value) || null;
  const [query, setQuery] = useState(selected?.name || '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const trimmed = query.trim();
  const filtered = trimmed ? customers.filter((c) => c.name.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 30) : customers.slice(0, 30);
  const exactMatch = customers.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());

  const handleSelect = (customer: Customer) => {
    onChange(customer.id);
    setQuery(customer.name);
    setOpen(false);
  };

  const handleCreateNew = () => {
    if (!trimmed) return;
    const newId = onCreateNew(trimmed);
    onChange(newId);
    setOpen(false);
  };

  const handleInputChange = (text: string) => {
    setQuery(text);
    setOpen(true);
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
          {filtered.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => handleSelect(customer)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-left text-neutral-900 dark:text-white hover:bg-violet-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <span className="truncate">{customer.name}</span>
              {customer.phone && <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0 ml-2">{customer.phone}</span>}
            </button>
          ))}
          {trimmed && !exactMatch && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-neutral-700 transition-colors border-t border-violet-100 dark:border-neutral-700"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add "{trimmed}" as a new customer
            </button>
          )}
          {filtered.length === 0 && !trimmed && <p className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">Start typing a name…</p>}
        </div>
      )}
    </div>
  );
}
