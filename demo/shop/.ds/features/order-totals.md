---
name: Order totals
area: Pricing
kind: product
checked: 2026-09-23
code:
  - src/pricing/totals.ts
  - src/pricing/tax.ts
uses: [Apply discount, Cart]
---

Turns a cart into the four numbers a customer sees: subtotal, discount, tax, total. Start at
`computeTotals`, which calls `clampDiscount` and then `taxFor`, in that order.

## Rules

- **Tax is charged on the discounted amount, not the list price.** `taxFor` is given
  `subtotalCents - discountCents`, never the subtotal.
- **The discount is clamped before tax is computed.**

## Behaviour

- Tax rates are per region in `RATES`: EU 21%, US 7%, UK 20%; an unknown region pays no tax.
- `totalCents` is subtotal minus the clamped discount plus tax.
