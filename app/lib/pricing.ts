/**
 * Pricing utilities for My Stitch platform
 * 
 * Platform takes a 30% markup on all tailor prices
 * with a minimum platform commission of $10
 */

export const PLATFORM_MARKUP = 0.30 // 30%
export const MINIMUM_PLATFORM_COMMISSION = 10.00 // $10 minimum commission

/**
 * Calculate the customer-facing price from tailor's base price
 * @param tailorPrice - The price set by the tailor
 * @returns The price shown to customers (tailor price + max(30% or $10))
 */
export function calculateCustomerPrice(tailorPrice: number): number {
  if (tailorPrice <= 0) return MINIMUM_PLATFORM_COMMISSION
  
  const calculatedCommission = tailorPrice * PLATFORM_MARKUP
  const actualCommission = Math.max(calculatedCommission, MINIMUM_PLATFORM_COMMISSION)
  
  return tailorPrice + actualCommission
}

/**
 * Calculate the platform commission from tailor's price
 * @param tailorPrice - The price set by the tailor
 * @returns The platform's commission amount (minimum $10)
 */
export function calculatePlatformCommission(tailorPrice: number): number {
  const calculatedCommission = tailorPrice * PLATFORM_MARKUP
  return Math.max(calculatedCommission, MINIMUM_PLATFORM_COMMISSION)
}

/**
 * Calculate the tailor's payout (which is just their set price)
 * @param tailorPrice - The price set by the tailor
 * @returns The amount the tailor receives
 */
export function calculateTailorPayout(tailorPrice: number): number {
  return tailorPrice
}

