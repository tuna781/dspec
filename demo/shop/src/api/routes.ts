import { redeemCode, startCheckout } from '../checkout';
import { removeDiscount } from '../pricing/discount';
import { listPromotions } from '../catalog/promotion';
import type { Cart } from '../cart/cart';
import type { CheckoutSession } from '../checkout/session';

export const routes = {
  'POST /checkout': (cart: Cart) => startCheckout(cart),
  'POST /checkout/discount': (s: CheckoutSession, code: string) => redeemCode(s, code),
  'DELETE /checkout/discount/:code': (s: CheckoutSession, code: string) => removeDiscount(s.cart, code),
  'GET /promotions': () => listPromotions(),
};
