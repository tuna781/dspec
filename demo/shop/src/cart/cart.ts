import type { AppliedDiscount } from '../pricing/discount';
import type { Line } from './line';

export interface Cart {
  id: string;
  region: string;
  lines: Line[];
  discounts: AppliedDiscount[];
}

export function emptyCart(id: string, region = 'EU'): Cart {
  return { id, region, lines: [], discounts: [] };
}

/** Changing the lines invalidates every discount: the amounts were computed against the old basket. */
export function setLines(cart: Cart, lines: Line[]): Cart {
  return { ...cart, lines, discounts: [] };
}
