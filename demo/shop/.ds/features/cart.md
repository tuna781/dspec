---
name: Cart
area: Cart
kind: product
code:
  - src/cart/cart.ts
  - src/cart/line.ts
---

The basket: lines, the region that decides tax, and the discounts applied so far.

## Behaviour

- `setLines` returns a cart with no discounts — see *Apply discount* for why.
