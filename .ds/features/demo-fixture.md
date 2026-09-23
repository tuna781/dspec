---
name: Demo fixture
area: Demo
kind: repo
checked: 2026-09-23
code:
  - demo/shop/src/api/routes.ts
  - demo/shop/src/cart/cart.ts
  - demo/shop/src/cart/line.ts
  - demo/shop/src/catalog/product.ts
  - demo/shop/src/catalog/promotion.ts
  - demo/shop/src/checkout/index.ts
  - demo/shop/src/checkout/session.ts
  - demo/shop/src/checkout/validate.ts
  - demo/shop/src/orders/place.ts
  - demo/shop/src/orders/refund.ts
  - demo/shop/src/payments/charge.ts
  - demo/shop/src/pricing/discount.ts
  - demo/shop/src/pricing/rules.ts
  - demo/shop/src/pricing/tax.ts
  - demo/shop/src/pricing/totals.ts
  - demo/shop/.ds/index.md
  - demo/shop/.ds/product.md
  - demo/shop/.ds/features/apply-discount.md
  - demo/shop/.ds/features/cart.md
  - demo/shop/.ds/features/checkout.md
  - demo/shop/.ds/features/http-api.md
  - demo/shop/.ds/features/order-totals.md
  - demo/shop/.ds/features/orders.md
  - demo/shop/.ds/features/promotion-catalogue.md
  - demo/shop/CLAUDE.md
---

`demo/shop` — a fifteen-file storefront checkout that exists to be asked a question. It is the
repository the recording is made in and the one the README's figures were measured on, and it
carries a real `.ds/` map and a real memory-file block, so it stands for a codebase where somebody
has already run `dspec init` and `/ds-bootstrap`. It is a fixture, not a product: nothing imports
it, nothing builds it, and it ships to nobody.

## Rules

- **The question must have an answer the code does not state.** *Why does checkout reject my
  second discount code?* is a decision somebody made once — codes combine only where every
  promotion is stackable, and never within one `exclusiveGroup`. The branch is visible in
  `discount.ts`; the reason is not, which is the entire point being demonstrated. A fixture whose
  behaviour were self-evident would prove nothing.
- **The word must be spread across files that are not the feature.** Twelve of the fifteen source
  files mention "discount" — the cart, the product catalogue, checkout validation, the totals, the
  orders, the API routes — while the feature itself is two of them. That is what makes the search
  half of the recording expensive and the map half cheap; flattening the spread would quietly make
  the no-map baseline look better than the tool it is measured against.
- **Its map is written to the same standard as any other.** It is read by a real session on camera
  and quoted on the social card, so a lazy fixture map would be a demonstration of the product
  failing. Its rules are the fixture's actual invariants, not filler.
- **Its map is in the current format.** It is the only worked example of `.ds/` anybody sees, so a
  format change here is part of the format change, not a follow-up.
- **Change `shop/`, re-record.** The gif, the README's table and the card's panel all describe one
  run against this fixture. Editing the source without re-recording leaves three surfaces
  describing a repository that no longer exists.

## Behaviour

- Seven features across six areas — cart, catalogue, checkout, pricing, orders, API — small enough
  to read in a few minutes and shaped so that "where is this decided?" is a genuine question. All
  seven are `kind: product`: the fixture has no build, no tests and no release of its own.
- The answer the recording is after lives in `apply-discount.md` under `## Decisions`, which is
  what the demo's question is asking for.
- The invariants are real ones and are why the fixture reads as code rather than as sample text:
  money is integer cents everywhere, tax is charged on the discounted amount, a discount never
  takes an order below `MINIMUM_CHARGE_CENTS`, and a cart mixing a discount with a
  non-discountable product is refused outright rather than half-discounted.
- `demo/shop/CLAUDE.md` is the installed block verbatim, which is what makes the "with dspec" half
  a real installation rather than a hint typed into a prompt.
- It is also what `demo/eval` puts its planning tasks to, so its `## Decisions` sections double as
  the answer key: each task asks for a change one of them rejected.
- Nothing here is compiled or type-checked: the root `tsconfig.json` includes `src/**/*` only, and
  `files` in `package.json` excludes `demo/` from the published package.

## Decisions

- **Its map was corrected where it disagreed with its code.** *Apply discount* recorded the
  minimum-charge floor as "a refusal, not a clamp"; `clampDiscount()` in `rules.ts` clamps the
  discount and accepts the code. The code won, as the block says it must. The recording was not
  re-made for it: the question it asks is answered by the stacking decisions, which did not change.
