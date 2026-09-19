import { useState } from 'react';
import type { SaleRecord, PaymentStatus } from '@/types';

const inputClass =
  'w-full px-4 py-2.5 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500';

export function EditSaleModal({
  sale,
  money,
  showBaseCurrencyNote,
  maxQuantity,
  onSave,
  onClose,
}: {
  sale: SaleRecord;
  money: (amount: number) => string;
  showBaseCurrencyNote: boolean;
  maxQuantity: number;
  onSave: (updated: SaleRecord) => void;
  onClose: () => void;
}) {
  const unitPrice = sale.totalRevenue / sale.quantitySold;
  const unitCost = (sale.totalRevenue - sale.totalProfit) / sale.quantitySold;

  const [quantity, setQuantity] = useState(sale.quantitySold);
  const [date, setDate] = useState(sale.date);
  const [customerName, setCustomerName] = useState(sale.customerName || '');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(sale.paymentStatus);
  const [amountPaid, setAmountPaid] = useState(sale.amountPaid);
  const [error, setError] = useState('');

  const newRevenue = Math.round(unitPrice * quantity);
  const newProfit = Math.round((unitPrice - unitCost) * quantity);

  const handlePaymentStatusChange = (status: PaymentStatus) => {
    setPaymentStatus(status);
    if (status === 'paid') setAmountPaid(newRevenue);
    if (status === 'credit') setAmountPaid(0);
  };

  const handleSave = () => {
    if (quantity <= 0) {
      setError('Quantity must be at least 1.');
      return;
    }
    if (quantity > maxQuantity) {
      setError(`Only ${maxQuantity} in stock (including this sale's original quantity).`);
      return;
    }
    if (paymentStatus !== 'paid' && !customerName.trim()) {
      setError('A customer name is required for credit or partial sales.');
      return;
    }
    if (paymentStatus === 'partial' && (amountPaid <= 0 || amountPaid >= newRevenue)) {
      setError('Amount paid must be between 0 and the total for a partial payment.');
      return;
    }

    onSave({
      ...sale,
      date,
      quantitySold: quantity,
      totalRevenue: newRevenue,
      totalProfit: newProfit,
      customerName: customerName.trim() || undefined,
      paymentStatus,
      amountPaid: paymentStatus === 'paid' ? newRevenue : paymentStatus === 'credit' ? 0 : amountPaid,
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white border border-violet-100 dark:bg-neutral-900 dark:border-violet-900/40 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">Edit Sale</h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">{sale.itemName}</p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Quantity</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Customer Name {paymentStatus !== 'paid' && '(required)'}
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in customer"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Payment Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(['paid', 'partial', 'credit'] as PaymentStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handlePaymentStatusChange(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                    paymentStatus === status
                      ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {paymentStatus === 'partial' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Amount Paid</label>
              <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} className={inputClass} />
              {showBaseCurrencyNote && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Enter this in UGX — displayed totals are converted.</p>
              )}
            </div>
          )}

          <div className="bg-violet-50 dark:bg-neutral-800/50 rounded-lg p-3 flex items-center justify-between text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">New total</span>
            <span className="text-neutral-900 dark:text-white font-semibold">{money(newRevenue)}</span>
          </div>

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
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
