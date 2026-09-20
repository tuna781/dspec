---
name: Orders
area: Orders
code:
  - src/orders/place.ts
  - src/orders/refund.ts
  - src/payments/charge.ts
uses: [Checkout]
---

Placing an order from a priced session, taking the payment, and refunding it.

## Rules

- **The discount codes are recorded on the order.** A refund has to know what was given away.
- **A partial refund apportions the discount** rather than returning it in full — otherwise
  refunding one line of a discounted order gives back more than that line ever cost.
