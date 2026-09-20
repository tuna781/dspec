import type { Cart } from '../cart/cart';
import { applyDiscount, type DiscountError } from '../pricing/discount';
import { computeTotals } from '../pricing/totals';
import { validateCheckout } from './validate';
import { openSession, type CheckoutSession } from './session';

export function startCheckout(cart: Cart): CheckoutSession {
  validateCheckout(cart);
  return openSession(cart, computeTotals(cart));
}

/** Add a discount code during checkout, then re-price the session. */
export function redeemCode(session: CheckoutSession, code: string): CheckoutSession | DiscountError {
  const result = applyDiscount(session.cart, code);
  if ('kind' in result) return result;
  session.cart.discounts.push(result);
  session.totals = computeTotals(session.cart);
  return session;
}
