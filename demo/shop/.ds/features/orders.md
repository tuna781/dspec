---
name: Orders
area: Orders
kind: product
code:
  - src/orders/place.ts
  - src/orders/refund.ts
  - src/payments/charge.ts
uses: [Checkout]
---

Placing an order from a priced session, taking the payment, and refunding it.

## Rules

- **The discount codes are recorded on the order.** A refund has to know what was given away.
- **A partial refund apportions the discount** rather than returning it in full.

## Decisions

- **Refunding the discount in full was rejected.** Refunding one line of a discounted order that
  way gives back more than that line ever cost.
