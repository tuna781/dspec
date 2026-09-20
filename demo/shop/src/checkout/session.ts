import type { Cart } from '../cart/cart';
import type { Totals } from '../pricing/totals';

export interface CheckoutSession {
  cart: Cart;
  totals: Totals;
  openedAt: number;
}

export const openSession = (cart: Cart, totals: Totals): CheckoutSession =>
  ({ cart, totals, openedAt: Date.now() });

/** A session older than this has stale prices and stale discounts; it is re-priced on use. */
export const SESSION_TTL_MS = 30 * 60 * 1000;

export const isStale = (s: CheckoutSession): boolean => Date.now() - s.openedAt > SESSION_TTL_MS;
