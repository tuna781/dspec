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
`computeTotals`; the order it calls `clampDiscount` and then `taxFor` in is the feature.

## Rules

- **Tax is charged on the discounted amount, not the list price.** `taxFor` is given
  `subtotalCents - discountCents`, never the subtotal.
- **The discount is clamped before tax**, so the floor is applied once and tax is computed on a
  number that can actually be charged.

## Decisions

- **Taxing the list price was rejected: it overcharges every discounted order.** The order of the
  two steps is the whole of this feature — clamp, then tax.
