---
name: Apply discount
area: Pricing
code:
  - src/pricing/discount.ts
  - src/pricing/rules.ts
uses: [Cart, Promotion catalogue]
---

Redeeming a discount code against a cart: whether the code is real, whether it may be combined
with what is already there, and what it is worth. Start at `applyDiscount`.

## Rules

- **A second code is refused unless every promotion involved is stackable.** Silently dropping it
  would show the customer a total they cannot reproduce; applying both would let two "20% off
  everything" campaigns compound into 36% off, which is not what either campaign meant.
- **Two promotions in the same `exclusiveGroup` never combine**, stackable or not. That is how one
  campaign is expressed as several codes without them stacking against each other.
- **A discount never takes an order below `MINIMUM_CHARGE_CENTS`** — shipping still has to be paid
  for.

## Behaviour

- Checks run in order and stop at the first failure: unknown code, expired, already applied, then
  not stackable. `not_stackable` names the code it conflicts with, so the customer can be told
  which of the two to keep.
- Changing the cart lines clears every discount: the amounts were computed against the old basket.
- A percentage discount is rounded once, against the whole subtotal, never per line.
