import { useState } from 'react';
import type { InventoryItem, Customer, CartLine, PaymentStatus } from '@/types';
import { todayISO } from '@/lib/format';
import { ItemSearchSelect } from '@/components/ItemSearchSelect';
import { CustomerSearchSelect } from '@/components/CustomerSearchSelect';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';

const inputClass =
  'px-4 py-2 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded-lg text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500';

export function SaleCart({
  inventory,
  customers,
  onCreateCustomer,
  money,
  showBaseCurrencyNote,
  onComplete,
}: {
  inventory: InventoryItem[];
  customers: Customer[];
  onCreateCustomer: (name: string) => string;
  money: (amount: number) => string;
  showBaseCurrencyNote: boolean;
  onComplete: (args: {
    date: string;
    cart: CartLine[];
    customerId?: string;
    customerName: string;
    paymentStatus: PaymentStatus;
    amountPaid: number;
  }) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [customerId, setCustomerId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const total = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const addItemToCart = (item: InventoryItem, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, item.currentStock);
        return prev.map((l) => (l.itemId === item.id ? { ...l, quantity: nextQty } : l));
      }
      return [
        ...prev,
        {
          itemId: item.id,
          itemName: item.name,
          unitPrice: item.sellingPrice,
          unitCost: item.buyingPrice,
          quantity: Math.min(quantity, item.currentStock),
          availableStock: item.currentStock,
        },
      ];
    });
  };

  const handleAddToCart = () => {
    const item = inventory.find((i) => i.id === selectedItemId);
    if (!item || quantityToAdd <= 0) return;
    addItemToCart(item, quantityToAdd);
    setSelectedItemId('');
    setQuantityToAdd(1);
  };

  const handleBarcodeDetected = (code: string) => {
    const item = inventory.find((i) => i.barcode && i.barcode === code);
    setShowScanner(false);
    if (!item) {
      setError(`No item found with barcode ${code}.`);
      return;
    }
    if (item.currentStock <= 0) {
      setError(`${item.name} is out of stock.`);
      return;
    }
    setError('');
    addItemToCart(item, 1);
  };

  const updateLineQuantity = (itemId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, quantity: Math.max(1, Math.min(quantity, l.availableStock)) } : l))
    );
  };

  const removeLine = (itemId: string) => setCart((prev) => prev.filter((l) => l.itemId !== itemId));

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleComplete = () => {
    setError('');
    if (cart.length === 0) {
      setError('Add at least one item to the cart.');
      return;
    }
    if (paymentStatus !== 'paid' && !customerId) {
      setError('Select or add a customer for credit or partial sales.');
      return;
    }
    if (paymentStatus === 'partial' && (amountPaid <= 0 || amountPaid >= total)) {
      setError('Amount paid must be between 0 and the total for a partial payment.');
      return;
    }

    onComplete({
      date,
      cart,
      customerId: customerId || undefined,
      customerName: selectedCustomer?.name || '',
      paymentStatus,
      amountPaid: paymentStatus === 'paid' ? total : paymentStatus === 'credit' ? 0 : amountPaid,
    });

    setCart([]);
    setCustomerId('');
    setPaymentStatus('paid');
    setAmountPaid(0);
  };

  return (
    <div className="bg-white border border-violet-100 dark:bg-neutral-900 dark:border-neutral-800 rounded-xl p-6 space-y-5">
      {showScanner && <BarcodeScannerModal onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}

      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Record New Sale</h3>

      {/* Add item row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        <div className="sm:col-span-2">
          <ItemSearchSelect items={inventory} value={selectedItemId} onChange={setSelectedItemId} placeholder="Search items to add..." />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={quantityToAdd}
            onChange={(e) => setQuantityToAdd(Number(e.target.value))}
            className={`w-16 ${inputClass}`}
          />
          <button
            onClick={handleAddToCart}
            disabled={!selectedItemId}
            className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add
          </button>
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            title="Scan barcode"
            className="px-3 rounded-lg shrink-0 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V5a1 1 0 011-1h2M4 17v2a1 1 0 001 1h2m10-16h2a1 1 0 011 1v2m-3 14h2a1 1 0 001-1v-2M7 8v8m3-8v8m4-8v8m3-8v8" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div className="border border-violet-100 dark:border-neutral-800 rounded-lg overflow-hidden">
          {cart.map((line) => (
            <div
              key={line.itemId}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-violet-100 dark:border-neutral-800 last:border-b-0"
            >
              <span className="flex-1 text-sm text-neutral-900 dark:text-white truncate">{line.itemName}</span>
              <input
                type="number"
                min={1}
                max={line.availableStock}
                value={line.quantity}
                onChange={(e) => updateLineQuantity(line.itemId, Number(e.target.value))}
                className="w-16 px-2 py-1 bg-white border border-violet-200 dark:bg-neutral-800 dark:border-violet-900/40 rounded text-neutral-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <span className="text-sm text-violet-600 dark:text-violet-400 w-24 text-right">{money(line.unitPrice * line.quantity)}</span>
              <button onClick={() => removeLine(line.itemId)} className="text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-violet-50 dark:bg-neutral-800/50">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Total</span>
            <span className="text-neutral-900 dark:text-white font-semibold">{money(total)}</span>
          </div>
        </div>
      )}

      {/* Customer & payment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CustomerSearchSelect customers={customers} value={customerId} onChange={setCustomerId} onCreateNew={onCreateCustomer} />
        <div className="grid grid-cols-3 gap-2">
          {(['paid', 'partial', 'credit'] as PaymentStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => {
                setPaymentStatus(status);
                if (status !== 'partial') setAmountPaid(0);
              }}
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
          <input
            type="number"
            placeholder="Amount paid now"
            value={amountPaid || ''}
            onChange={(e) => setAmountPaid(Number(e.target.value))}
            className={`w-full sm:w-64 ${inputClass}`}
          />
          {showBaseCurrencyNote && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Enter this in UGX — the total above is only converted for display.</p>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleComplete}
        className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-violet-700 transition-all"
      >
        Complete Sale
      </button>
    </div>
  );
}
