import type { Promotion } from '../catalog/promotion';

/** Two promotions may sit on one cart only when both say they are stackable. */
export function stackingAllowed(a: Promotion, b: Promotion): boolean {
  if (!a.stackable || !b.stackable) return false;
  if (a.exclusiveGroup && a.exclusiveGroup === b.exclusiveGroup) return false;
  return true;
}

/** A discount never takes an order below the floor: shipping still has to be paid for. */
export function clampDiscount(totalCents: number, discountCents: number): number {
  return Math.max(0, Math.min(discountCents, totalCents - MINIMUM_CHARGE_CENTS));
}

export const MINIMUM_CHARGE_CENTS = 100;
