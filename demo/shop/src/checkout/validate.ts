import type { Cart } from '../cart/cart';
import { findProduct } from '../catalog/product';

export function validateCheckout(cart: Cart): void {
  if (!cart.lines.length) throw new Error('cart is empty');
  for (const line of cart.lines) {
    const product = findProduct(line.sku);
    if (!product) throw new Error(`unknown sku: ${line.sku}`);
    // A discount must never reach a non-discountable product, so a cart mixing the two is
    // rejected here rather than silently discounting the wrong half of it.
    if (!product.discountable && cart.discounts.length) {
      throw new Error(`${product.name} cannot be discounted`);
    }
  }
}
