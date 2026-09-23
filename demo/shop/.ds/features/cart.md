---
name: Cart
area: Cart
kind: product
checked: 2026-09-23
code:
  - src/cart/cart.ts
  - src/cart/line.ts
---

The basket: lines, the region that decides tax, and the discounts applied so far. Start at the
`Cart` interface; `emptyCart` builds one and `setLines` is the only thing that empties `discounts`.

## Behaviour

- `setLines` returns a cart with no discounts — see *Apply discount* for why.
