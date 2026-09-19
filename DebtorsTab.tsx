import { useMemo, useState } from 'react';
import type { SaleRecord, Customer } from '@/types';
import { PaymentModal } from '@/components/PaymentModal';

interface TransactionSummary {
  transactionId: string;
  date: string;
  groupKey: string;
  customerId?: string;
  displayName: string;
  items: string;
  total: number;
  paid: number;
  balance: number;
}

export function DebtorsTab({
  sales,
  customers,
  money,
  showBaseCurrencyNote,
  onRecordPayment,
}: {
  sales: SaleRecord[];
  customers: Customer[];
  money: (amount: number) => string;
  showBaseCurrencyNote: boolean;
  onRecordPayment: (transactionId: string, amount: number) => void;
}) {
  const [payingTransaction, setPayingTransaction] = useState<TransactionSummary | null>(null);
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const transactions = useMemo(() => {
    const byTx = new Map<string, SaleRecord[]>();
    for (const s of sales) {
      if (s.paymentStatus === 'paid') continue;
      if (!byTx.has(s.transactionId)) byTx.set(s.transactionId, []);
      byTx.get(s.transactionId)!.push(s);
    }
    const summaries: TransactionSummary[] = [];
    for (const [transactionId, lines] of byTx) {
      const total = lines.reduce((sum, l) => sum + l.totalRevenue, 0);
      const paid = lines.reduce((sum, l) => sum + l.amountPaid, 0);
      const balance = total - paid;
      if (balance <= 0) continue;
      const first = lines[0];
      // Group by customer record where we have one; fall back to the raw
      // typed name for sales recorded before customer records existed.
      const groupKey = first.customerId || `name:${first.customerName || 'Unnamed customer'}`;
      const displayName = (first.customerId && customerById.get(first.customerId)?.name) || first.customerName || 'Unnamed customer';
      summaries.push({
        transactionId,
        date: first.date,
        groupKey,
        customerId: first.customerId,
        displayName,
        items: lines.map((l) => `${l.itemName} ×${l.quantitySold}`).join(', '),
        total,
        paid,
        balance,
      });
    }
    return summaries.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [sales, customerById]);

  const byCustomer = useMemo(() => {
    const map = new Map<string, TransactionSummary[]>();
    for (const t of transactions) {
      if (!map.has(t.groupKey)) map.set(t.groupKey, []);
      map.get(t.groupKey)!.push(t);
    }
    return Array.from(map.entries())
      .map(([groupKey, txs]) => ({
        groupKey,
        displayName: txs[0].displayName,
        phone: txs[0].customerId ? customerById.get(txs[0].customerId)?.phone : undefined,
        transactions: txs,
        totalOwed: txs.reduce((sum, t) => sum + t.balance, 0),
      }))
      .sort((a, b) => b.totalOwed - a.totalOwed);
  }, [transactions, customerById]);

  const grandTotal = transactions.reduce((sum, t) => sum + t.balance, 0);

  return (
    <div className="space-y-6">
      {payingTransaction && (
        <PaymentModal
          customerName={payingTransaction.displayName}
          balance={payingTransaction.balance}
          money={money}
          showBaseCurrencyNote={showBaseCurrencyNote}
          onClose={() => setPayingTransaction(null)}
          onSave={(amount) => {
            onRecordPayment(payingTransaction.transactionId, amount);
            setPayingTransaction(null);
          }}
        />
      )}

      <div className="bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
        <p className="text-amber-700 dark:text-amber-400 text-sm">Total outstanding across all customers</p>
        <p className="text-amber-700 dark:text-amber-400 font-semibold text-lg">{money(grandTotal)}</p>
      </div>

      {byCustomer.length === 0 && (
        <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-violet-200 dark:text-neutral-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-neutral-500 dark:text-neutral-500">No outstanding balances. Everyone's paid up.</p>
        </div>
      )}

      {byCustomer.map(({ groupKey, displayName, phone, transactions: txs, totalOwed }) => (
        <div key={groupKey} className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-violet-100 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{displayName}</h3>
              {phone && <p className="text-xs text-neutral-500 dark:text-neutral-400">{phone}</p>}
            </div>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">{money(totalOwed)} owed</span>
          </div>
          <div className="divide-y divide-violet-100 dark:divide-neutral-800">
            {txs.map((t) => (
              <div key={t.transactionId} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-neutral-900 dark:text-white truncate">{t.items}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">
                    {t.date} · Total {money(t.total)} · Paid {money(t.paid)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{money(t.balance)}</span>
                  <button
                    onClick={() => setPayingTransaction(t)}
                    className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 dark:text-violet-400 text-sm font-medium rounded-lg transition-all"
                  >
                    Record Payment
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
