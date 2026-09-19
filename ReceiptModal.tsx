import type { SaleRecord } from '@/types';
import { formatDateDMY } from '@/lib/format';

export function ReceiptModal({
  lines,
  businessName,
  money,
  onClose,
}: {
  lines: SaleRecord[];
  businessName: string;
  money: (amount: number) => string;
  onClose: () => void;
}) {
  if (lines.length === 0) return null;
  const total = lines.reduce((sum, l) => sum + l.totalRevenue, 0);
  const paid = lines.reduce((sum, l) => sum + l.amountPaid, 0);
  const balance = total - paid;
  const status = lines[0].paymentStatus;
  const customerName = lines[0].customerName;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white text-neutral-900 rounded-2xl shadow-2xl overflow-hidden receipt-print"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold">{businessName}</h3>
            <p className="text-xs text-neutral-500 mt-1">Sale Receipt</p>
            <p className="text-xs text-neutral-500">{formatDateDMY(new Date(lines[0].date).toISOString())}</p>
            {customerName && <p className="text-xs text-neutral-500 mt-1">Customer: {customerName}</p>}
          </div>

          <div className="border-t border-b border-neutral-200 py-3 space-y-2">
            {lines.map((line) => (
              <div key={line.id} className="flex justify-between text-sm">
                <span>
                  {line.itemName} × {line.quantitySold}
                </span>
                <span>{money(line.totalRevenue)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 space-y-1">
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            <div className="flex justify-between text-sm text-neutral-600">
              <span>Paid</span>
              <span>{money(paid)}</span>
            </div>
            {balance > 0 && (
              <div className="flex justify-between text-sm font-semibold text-red-600">
                <span>Balance Due</span>
                <span>{money(balance)}</span>
              </div>
            )}
            <p className="text-xs text-neutral-500 text-center mt-3 capitalize">Status: {status}</p>
          </div>
        </div>

        <div className="flex gap-3 p-4 bg-neutral-50 no-print">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-medium rounded-xl transition-all"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-medium rounded-xl transition-all"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
