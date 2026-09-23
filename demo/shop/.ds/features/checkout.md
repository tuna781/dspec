---
name: Checkout
area: Checkout
kind: product
checked: 2026-09-23
code:
  - src/checkout/index.ts
  - src/checkout/session.ts
  - src/checkout/validate.ts
uses: [Apply discount, Order totals, Cart, Promotion catalogue]
---

The checkout session: validate the cart, price it, and let codes be redeemed against it. Start at
`startCheckout`.

## Rules

- **A cart holding a non-discountable product and any discount is refused** when checkout starts:
  `validateCheckout` throws `<product name> cannot be discounted`. The eligible lines are not
  discounted on their own.

## Behaviour

- `startCheckout` runs `validateCheckout` — `cart is empty`, `unknown sku: <sku>`, then the mixed
  cart rule above — and opens a session priced by `computeTotals`.
- `redeemCode` passes the code to *Apply discount*; a refusal comes back unchanged. An accepted
  code is pushed onto the cart and the whole session is re-priced with `computeTotals`.
- `redeemCode` does not call `validateCheckout`: the mixed-cart rule is checked when a session
  starts, not when a code is redeemed into it.
- `isStale` reports a session older than `SESSION_TTL_MS` (30 minutes). Nothing in this repository
  calls it.
