import type { Cart } from '../cart/cart';
import { clampDiscount } from './rules';
import { taxFor } from './tax';

export interface Totals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

export function computeTotals(cart: Cart): Totals {
  const subtotalCents = cart.lines.reduce((n, l) => n + l.unitCents * l.quantity, 0);
  const rawDiscount = cart.discounts.reduce((n, d) => n + d.amountCents, 0);
  const discountCents = clampDiscount(subtotalCents, rawDiscount);
  const taxCents = taxFor(subtotalCents - discountCents, cart.region);
  return { subtotalCents, discountCents, taxCents, totalCents: subtotalCents - discountCents + taxCents };
}
