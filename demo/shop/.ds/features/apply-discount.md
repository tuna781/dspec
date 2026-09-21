---
name: Apply discount
area: Pricing
kind: product
code:
  - src/pricing/discount.ts
  - src/pricing/rules.ts
uses: [Cart, Promotion catalogue]
---

Redeeming a discount code against a cart: whether the code is real, whether it may be combined
with what is already there, and what it is worth. Start at `applyDiscount`.

## Rules

- **A second code is refused unless every promotion involved is stackable.**
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

## Decisions

- **The second code is refused rather than silently dropped.** Dropping it would show the customer
  a total they cannot reproduce from the codes they entered, and a refusal that names the
  conflicting code lets them choose which one to keep.
- **Stackable campaigns were not allowed to compound.** Applying both would let two "20% off
  everything" campaigns come to 36% off, which is not what either campaign meant — so the rule is
  that *every* promotion involved must be stackable, not just the new one.
- **The floor is a refusal, not a clamp to zero.** An order below `MINIMUM_CHARGE_CENTS` still
  costs the same to ship, so the discount is what gives way.
