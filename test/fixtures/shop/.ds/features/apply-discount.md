---
name: Apply discount
area: Checkout
code:
  - src/billing/discount.ts
entry: applyDiscount
---

Applies a coupon to an order total.

Rules
- Only one coupon may be applied to an order.
