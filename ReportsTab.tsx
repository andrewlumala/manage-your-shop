import { useMemo, useState } from 'react';
import type { SaleRecord, Expense } from '@/types';
import { todayISO, startOfWeekISO, startOfMonthISO } from '@/lib/format';

type RangePreset = 'week' | 'month' | 'year' | 'custom';

function startOfYearISO(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export function ReportsTab({
  sales,
  expenses,
  businessName,
  money,
}: {
  sales: SaleRecord[];
  expenses: Expense[];
  businessName: string;
  money: (amount: number) => string;
}) {
  const [preset, setPreset] = useState<RangePreset>('month');
  const [customFrom, setCustomFrom] = useState(startOfMonthISO());
  const [customTo, setCustomTo] = useState(todayISO());

  const { from, to, label } = useMemo(() => {
    const today = todayISO();
    switch (preset) {
      case 'week':
        return { from: startOfWeekISO(), to: today, label: 'This Week' };
      case 'year':
        return { from: startOfYearISO(), to: today, label: `${new Date().getFullYear()}` };
      case 'custom':
        return { from: customFrom, to: customTo, label: `${customFrom} to ${customTo}` };
      case 'month':
      default:
        return { from: startOfMonthISO(), to: today, label: 'This Month' };
    }
  }, [preset, customFrom, customTo]);

  const salesInRange = useMemo(() => sales.filter((s) => s.date >= from && s.date <= to), [sales, from, to]);
  const expensesInRange = useMemo(() => expenses.filter((e) => e.date >= from && e.date <= to), [expenses, from, to]);

  const revenue = salesInRange.reduce((sum, s) => sum + s.totalRevenue, 0);
  const grossProfit = salesInRange.reduce((sum, s) => sum + s.totalProfit, 0);
  const cogs = revenue - grossProfit;
  const totalExpenses = expensesInRange.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expensesInRange) map.set(e.category, (map.get(e.category) || 0) + e.amount);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expensesInRange]);

  const topItems = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    for (const s of salesInRange) {
      const entry = map.get(s.itemName) || { qty: 0, revenue: 0 };
      entry.qty += s.quantitySold;
      entry.revenue += s.totalRevenue;
      map.set(s.itemName, entry);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10);
  }, [salesInRange]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl p-6 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['week', 'month', 'year', 'custom'] as RangePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                  preset === p
                    ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                }`}
              >
                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'Custom'}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-medium rounded-lg transition-all"
          >
            Print Report
          </button>
        </div>
        {preset === 'custom' && (
          <div className="flex items-center gap-2 mt-4">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-sm text-neutral-900 dark:text-white"
            />
            <span className="text-neutral-500 dark:text-neutral-400 text-sm">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-sm text-neutral-900 dark:text-white"
            />
          </div>
        )}
      </div>

      <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl p-8 report-print">
        <div className="text-center mb-6 pb-6 border-b border-violet-100 dark:border-neutral-800">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{businessName}</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Profit &amp; Loss — {label}</p>
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <Row label="Revenue" value={money(revenue)} />
          <Row label="Cost of Goods Sold" value={`-${money(cogs)}`} muted />
          <Row label="Gross Profit" value={money(grossProfit)} bold />
          <div className="h-px bg-violet-100 dark:bg-neutral-800 my-2" />
          {expensesByCategory.map(([category, amount]) => (
            <Row key={category} label={category} value={`-${money(amount)}`} muted indent />
          ))}
          <Row label="Total Expenses" value={`-${money(totalExpenses)}`} muted />
          <div className="h-px bg-violet-100 dark:bg-neutral-800 my-2" />
          <Row label="Net Profit" value={money(netProfit)} bold large />
        </div>

        {topItems.length > 0 && (
          <div className="mt-8 pt-6 border-t border-violet-100 dark:border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Top Items ({label})</h3>
            <div className="max-w-md mx-auto space-y-1.5">
              {topItems.map(([name, { qty, revenue: itemRevenue }]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-300 truncate">
                    {name} <span className="text-neutral-400 dark:text-neutral-500">×{qty}</span>
                  </span>
                  <span className="text-neutral-900 dark:text-white shrink-0 ml-2">{money(itemRevenue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted, large, indent }: { label: string; value: string; bold?: boolean; muted?: boolean; large?: boolean; indent?: boolean }) {
  return (
    <div className={`flex justify-between ${large ? 'text-lg' : 'text-sm'} ${indent ? 'pl-4' : ''}`}>
      <span className={bold ? 'font-semibold text-neutral-900 dark:text-white' : muted ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-700 dark:text-neutral-300'}>
        {label}
      </span>
      <span className={bold ? 'font-semibold text-neutral-900 dark:text-white' : muted ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-900 dark:text-white'}>
        {value}
      </span>
    </div>
  );
}
