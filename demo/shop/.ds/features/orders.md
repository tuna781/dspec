---
name: Orders
area: Orders
kind: product
checked: 2026-09-23
code:
  - src/orders/place.ts
  - src/orders/refund.ts
  - src/payments/charge.ts
uses: [Checkout]
---

Placing an order from a priced session, taking the payment, and refunding it. Start at
`placeOrder`, which calls `charge` and keeps what it was given away on the `Order`.

## Rules

- **The discount codes are recorded on the order.** A refund has to know what was given away.
- **A partial refund apportions the discount** rather than returning it in full: `refund` works
  from `order.totalCents`, which is what the customer actually paid.

## Decisions

- **Refunding the discount in full was rejected.** Refunding one line of a discounted order that
  way gives back more than that line ever cost.
