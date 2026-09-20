import type { CheckoutSession } from '../checkout/session';
import { charge } from '../payments/charge';

export interface Order {
  id: string;
  cartId: string;
  totalCents: number;
  discountCents: number;
  codes: string[];
}

/** The discount codes are recorded on the order: a refund has to know what was given away. */
export async function placeOrder(session: CheckoutSession): Promise<Order> {
  const receipt = await charge(session.totals.totalCents, session.cart.id);
  return {
    id: receipt.id,
    cartId: session.cart.id,
    totalCents: session.totals.totalCents,
    discountCents: session.totals.discountCents,
    codes: session.cart.discounts.map((d) => d.code),
  };
}
