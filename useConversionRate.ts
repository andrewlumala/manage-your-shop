import { useEffect, useState } from 'react';
import { getRates } from '@/lib/exchangeRates';

export interface ConversionState {
  rate: number; // multiply a base-currency amount by this to get the display-currency amount
  loading: boolean;
  // true when we couldn't reach the rates API and are showing base-currency
  // amounts unconverted rather than failing outright
  stale: boolean;
}

export function useConversionRate(base: string, target: string): ConversionState {
  const [state, setState] = useState<ConversionState>(
    target === base ? { rate: 1, loading: false, stale: false } : { rate: 1, loading: true, stale: false }
  );

  useEffect(() => {
    let cancelled = false;

    if (target === base) {
      setState({ rate: 1, loading: false, stale: false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    getRates(base).then((rates) => {
      if (cancelled) return;
      if (rates && typeof rates[target] === 'number') {
        setState({ rate: rates[target], loading: false, stale: false });
      } else {
        setState({ rate: 1, loading: false, stale: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [base, target]);

  return state;
}
