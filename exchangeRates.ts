const CACHE_KEY = 'wholesale-exchange-rates';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours — rates don't need to be more fresh than this for a shop tracker

interface RateCache {
  base: string;
  fetchedAt: number;
  rates: Record<string, number>;
}

// Free, keyless exchange-rate API. Base currency is fixed to UGX because
// that's the currency all prices are actually entered/stored in — the
// "display currency" the user picks in Settings only affects presentation.
const RATES_URL = (base: string) => `https://open.er-api.com/v6/latest/${base}`;

export async function getRates(base: string): Promise<Record<string, number> | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: RateCache = JSON.parse(cached);
      if (parsed.base === base && Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
        return parsed.rates;
      }
    }
  } catch {
    // corrupt cache — fall through to a fresh fetch
  }

  try {
    const res = await fetch(RATES_URL(base));
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result !== 'success' || !data.rates) return null;
    const cache: RateCache = { base, fetchedAt: Date.now(), rates: data.rates };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // ignore quota errors — the rate still works for this session
    }
    return data.rates;
  } catch {
    // offline, CORS blocked, API down, etc. — caller falls back to 1:1
    return null;
  }
}
