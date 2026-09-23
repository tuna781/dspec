---
name: Apply discount
area: Pricing
kind: product
checked: 2026-09-23
code:
  - src/pricing/discount.ts
  - src/pricing/rules.ts
uses: [Cart, Promotion catalogue]
---

Redeeming a discount code against a cart: whether the code is real, whether it may be combined
with what is already there, and what it is worth. Start at `applyDiscount`.

## Rules

- **A second code is refused unless every promotion involved is stackable** — `stackingAllowed`
  checks the new promotion against each one already on the cart.
- **Two promotions in the same `exclusiveGroup` never combine**, stackable or not.
- **A discount never takes an order below `MINIMUM_CHARGE_CENTS`** (100 cents). `clampDiscount`
  shrinks the discount to fit; the code itself is still accepted.

## Behaviour

- Checks run in order and stop at the first failure: `unknown_code`, `expired`, `already_applied`,
  then `not_stackable`. `not_stackable` carries `conflictsWith`, the code already on the cart that
  it conflicts with.
- A percentage discount is rounded once, against the whole subtotal, never per line. A fixed
  discount is capped at the subtotal.
- Changing the cart lines clears every discount (`setLines` in *Cart*).
- `removeDiscount` takes one code off the cart; it is what `DELETE /checkout/discount/:code` calls.
