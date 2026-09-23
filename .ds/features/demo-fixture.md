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

- **The word must be spread across files that are not the feature.** Twelve of the fifteen source
  files mention "discount" — the cart, the product catalogue, checkout validation, the totals, the
  orders, the API routes — while the feature itself is two of them.
- **Its map is written to the same standard as any other**, and in the current format: it is read
  by a real session on camera and quoted on the social card.
- **Change `shop/`, re-record.** The gif, the README's table and the card's panel all describe
  runs against this fixture.
- **Each eval rubric's answer key is read from `src/`.** Change the code a key rests on and the task
  that tests it has to change too.

## Behaviour

- Seven features across six areas — cart, catalogue, checkout, pricing, orders, API — all
  `kind: product`: the fixture has no build, no tests and no release of its own.
- The demo question, *when does checkout refuse a second discount code?*, is answered by the Rules
  of `apply-discount.md`: every promotion involved must be stackable, and two in one
  `exclusiveGroup` never combine.
- The invariants it enforces: money is integer cents, tax is charged on the discounted amount, a
  discount never takes an order below `MINIMUM_CHARGE_CENTS`, and a cart mixing a discount with a
  non-discountable product is refused by `validateCheckout`.
- Its map records what the code does where the source comments claim more: `redeemCode` does not
  call `validateCheckout`, and nothing calls `isStale`.
- `demo/shop/CLAUDE.md` is the installed block verbatim.
- Nothing here is compiled or type-checked: the root `tsconfig.json` includes `src/**/*` only, and
  `files` in `package.json` excludes `demo/`.
