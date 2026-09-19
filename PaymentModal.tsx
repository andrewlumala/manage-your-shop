import { useState } from 'react';

export function PaymentModal({
  customerName,
  balance,
  money,
  showBaseCurrencyNote,
  onSave,
  onClose,
}: {
  customerName: string;
  balance: number;
  money: (amount: number) => string;
  showBaseCurrencyNote: boolean;
  onSave: (amount: number) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<number>(balance);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (amount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (amount > balance) {
      setError(`Amount can't exceed the outstanding balance of ${money(balance)}.`);
      return;
    }
    onSave(amount);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white border border-violet-100 dark:bg-neutral-900 dark:border-violet-900/40 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">Record Payment</h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
          {customerName} owes {money(balance)}
        </p>

        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
          Amount Received {showBaseCurrencyNote && <span className="font-normal text-neutral-400">(UGX)</span>}
        </label>
        <input
          type="number"
          value={amount || ''}
          onChange={(e) => setAmount(Number(e.target.value))}
          autoFocus
          className="w-full px-4 py-2.5 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        />

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

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
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}
