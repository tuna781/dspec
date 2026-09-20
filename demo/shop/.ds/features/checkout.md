---
name: Checkout
area: Checkout
code:
  - src/checkout/index.ts
  - src/checkout/session.ts
  - src/checkout/validate.ts
uses: [Apply discount, Order totals, Cart, Promotion catalogue]
---

The checkout session: validate the cart, price it, and let codes be redeemed against it. Start at
`startCheckout`.

## Behaviour

- Redeeming a code re-prices the whole session rather than adjusting the total in place.
- A session older than `SESSION_TTL_MS` has stale prices and stale discounts, and is re-priced.
