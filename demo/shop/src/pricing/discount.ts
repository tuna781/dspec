import type { Cart } from '../cart/cart';
import { findPromotion, type Promotion } from '../catalog/promotion';
import { stackingAllowed } from './rules';

export interface AppliedDiscount {
  code: string;
  amountCents: number;
  promotion: Promotion;
}

export type DiscountError =
  | { kind: 'unknown_code' }
  | { kind: 'expired' }
  | { kind: 'already_applied' }
  | { kind: 'not_stackable'; conflictsWith: string };

/**
 * Apply a discount code to a cart.
 *
 * A cart may carry more than one discount, but only where every promotion involved is marked
 * stackable. The second code is refused otherwise — silently dropping it would show the customer
 * a total they cannot reproduce, and applying both would let two "20% off everything" campaigns
 * compound into 36% off, which is not what either campaign meant.
 */
export function applyDiscount(cart: Cart, code: string): AppliedDiscount | DiscountError {
  const promotion = findPromotion(code);
  if (!promotion) return { kind: 'unknown_code' };
  if (promotion.expiresAt < Date.now()) return { kind: 'expired' };
  if (cart.discounts.some((d) => d.code === code)) return { kind: 'already_applied' };

  for (const existing of cart.discounts) {
    if (!stackingAllowed(existing.promotion, promotion)) {
      return { kind: 'not_stackable', conflictsWith: existing.code };
    }
  }

  return { code, amountCents: discountAmount(cart, promotion), promotion };
}

export function discountAmount(cart: Cart, promotion: Promotion): number {
  const base = cart.lines.reduce((n, l) => n + l.unitCents * l.quantity, 0);
  return promotion.kind === 'percent'
    ? Math.round(base * (promotion.value / 100))
    : Math.min(promotion.value, base);
}

export function removeDiscount(cart: Cart, code: string): void {
  cart.discounts = cart.discounts.filter((d) => d.code !== code);
}
