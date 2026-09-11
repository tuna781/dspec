---
name: Place order
area: Checkout
code:
  - src/order/place.ts
entry: placeOrder
uses: [Apply discount]
tests: [test/place.spec.ts]
---

Turns a cart into an order and takes the money.

Rules
- A customer may hold at most three pending orders.

Behaviour
- Refuses an empty cart before touching payment.
