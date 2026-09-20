import type { Order } from './place';
import { refundCharge } from '../payments/charge';

/**
 * A partial refund is computed against what the customer actually paid, so the discount is
 * apportioned rather than returned in full — otherwise refunding one line of a discounted order
 * gives back more than that line ever cost.
 */
export async function refund(order: Order, fractionPaid: number): Promise<number> {
  const amount = Math.round(order.totalCents * fractionPaid);
  await refundCharge(order.id, amount);
  return amount;
}
