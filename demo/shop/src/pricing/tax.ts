const RATES: Record<string, number> = { EU: 0.21, US: 0.07, UK: 0.2 };

/** Tax is charged on the discounted amount, not the list price. */
export function taxFor(afterDiscountCents: number, region: string): number {
  return Math.round(afterDiscountCents * (RATES[region] ?? 0));
}
