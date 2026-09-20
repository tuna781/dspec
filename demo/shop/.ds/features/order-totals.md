---
name: Order totals
area: Pricing
code:
  - src/pricing/totals.ts
  - src/pricing/tax.ts
uses: [Apply discount, Cart]
---

Turns a cart into the four numbers a customer sees: subtotal, discount, tax, total.

## Rules

- **Tax is charged on the discounted amount, not the list price.** The other way round overcharges
  every discounted order.
- **The discount is clamped before tax**, so the floor is applied once and tax is computed on a
  number that can actually be charged.
