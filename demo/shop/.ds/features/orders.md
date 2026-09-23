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
`placeOrder`, which calls `charge` and copies the totals and the applied codes onto the `Order`.

## Rules

- **The discount codes are recorded on the order**, in `codes`.
- **A partial refund is computed from what the customer paid**: `refund` returns
  `order.totalCents * fractionPaid`, rounded, so the discount is apportioned rather than returned in
  full.

## Behaviour

- `charge` throws `nothing to charge` for an amount of zero or less; `refundCharge` throws
  `nothing to refund` the same way.
