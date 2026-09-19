import { useState } from 'react';
import type { Expense } from '@/types';
import { todayISO } from '@/lib/format';

const CATEGORIES = ['Rent', 'Transport', 'Wages', 'Utilities', 'Supplies', 'Other'];

const inputClass =
  'px-4 py-2 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500';

export function ExpensesTab({
  expenses,
  money,
  showBaseCurrencyNote,
  onAdd,
  onDelete,
  onExport,
}: {
  expenses: Expense[];
  money: (amount: number) => string;
  showBaseCurrencyNote: boolean;
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  const [form, setForm] = useState({ date: todayISO(), category: CATEGORIES[0], description: '', amount: 0 });

  const handleAdd = () => {
    if (!form.amount || form.amount <= 0) return;
    onAdd(form);
    setForm({ date: todayISO(), category: CATEGORIES[0], description: '', amount: 0 });
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const sorted = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-6">
      <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Record Expense</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
          <div>
            <input
              type="number"
              placeholder={showBaseCurrencyNote ? 'Amount (UGX)' : 'Amount'}
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-violet-700 transition-all"
          >
            Add Expense
          </button>
        </div>
      </div>

      <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-violet-100 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Expense Log <span className="text-neutral-500 dark:text-neutral-500 font-normal text-sm">— total {money(total)}</span>
          </h3>
          <button
            onClick={onExport}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300 rounded-lg text-sm transition-all"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-violet-50 dark:bg-neutral-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-100 dark:divide-neutral-800">
              {sorted.map((expense) => (
                <tr key={expense.id} className="hover:bg-violet-50/60 dark:hover:bg-neutral-800/30">
                  <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">{expense.date}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 text-xs bg-violet-50 text-violet-700 dark:bg-neutral-800 dark:text-neutral-300 rounded-full">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white">{expense.description || '—'}</td>
                  <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400">{money(expense.amount)}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => onDelete(expense.id)} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-500 text-sm">
                    No expenses recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
