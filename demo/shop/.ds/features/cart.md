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
`Cart` interface; `emptyCart` builds one (region `EU` by default) and `setLines` replaces its lines.

## Behaviour

- `setLines` returns a cart with `discounts: []` — every discount is dropped when the lines change.
- `lineTotal` is `unitCents * quantity`.
