import { CurrencyCode, ExchangeRate } from '../types'
import { supabase } from '../supabaseClient'

const EXCHANGE_RATE_CACHE_DURATION = 1000 * 60 * 15; // 15 minutes
let rateCache: { [key: string]: ExchangeRate } = {};

// Get API key from environment variables
const EXCHANGE_RATE_API_KEY = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY;

export async function getExchangeRate(from: CurrencyCode, to: CurrencyCode): Promise<number> {
  if (from === to) return 1;

  const cacheKey = `${from}_${to}`;
  const cachedRate = rateCache[cacheKey];
  
  if (cachedRate && (Date.now() - cachedRate.timestamp) < EXCHANGE_RATE_CACHE_DURATION) {
    return cachedRate.rate;
  }

  try {
    // First try to get rate from our database
    const { data: dbRate, error: dbError } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', from)
      .eq('to_currency', to)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbRate && !dbError) {
      const rate: ExchangeRate = {
        from,
        to,
        rate: dbRate.rate,
        timestamp: Date.now()
      };
      rateCache[cacheKey] = rate;
      return rate.rate;
    }

    // If no rate in database, fetch from external API
    if (!EXCHANGE_RATE_API_KEY) {
      throw new Error('Exchange rate API key not found');
    }

    // Use the API key in the request
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${from}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }

    const data = await response.json();
    const rate = data.conversion_rates[to];

    if (!rate) {
      throw new Error(`No rate found for ${from} to ${to}`);
    }

    // Store the new rate in our database
    await supabase.from('exchange_rates').insert({
      from_currency: from,
      to_currency: to,
      rate: rate,
      created_at: new Date().toISOString()
    });

    // Update cache
    rateCache[cacheKey] = {
      from,
      to,
      rate,
      timestamp: Date.now()
    };

    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    // If we have a cached rate, use it even if expired
    if (cachedRate) {
      return cachedRate.rate;
    }
    
    // Default rates as fallback (you should update these periodically)
    const fallbackRates: Record<string, number> = {
      'USD_NGN': 1500,
      'NGN_USD': 1/1500
    };
    
    return fallbackRates[cacheKey] || 1;
  }
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format(amount);
}

export async function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): Promise<{ amount: number; rate: number }> {
  const rate = await getExchangeRate(from, to);
  return {
    amount: amount * rate,
    rate
  };
} 