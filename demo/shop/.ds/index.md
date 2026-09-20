# shop — map

Every feature: what it is, where it lives, what it depends on.
Read this first, then the one feature file you need under `.ds/features/`.

## API

- **HTTP API** — The routes the storefront calls. A thin map from path to feature.
  → `src/api/routes.ts` · uses: Checkout, Apply discount, Promotion catalogue

## Cart

- **Cart** — The basket: lines, the region that decides tax, and the discounts applied so far.
  → `src/cart/cart.ts`, `src/cart/line.ts`

## Catalog

- **Promotion catalogue** — What a discount code means: kind, value, expiry, and whether it may
  share a cart. Also which products may be discounted at all.
  → `src/catalog/promotion.ts`, `src/catalog/product.ts`

## Checkout

- **Checkout** — The checkout session: validate the cart, price it, redeem codes against it.
  → `src/checkout/index.ts`, `src/checkout/session.ts`, `src/checkout/validate.ts`
    · uses: Apply discount, Order totals, Cart, Promotion catalogue

## Orders

- **Orders** — Placing an order from a priced session, taking payment, and refunding it.
  → `src/orders/place.ts`, `src/orders/refund.ts`, `src/payments/charge.ts` · uses: Checkout

## Pricing

- **Apply discount** — Redeeming a code against a cart: is it real, may it combine with what is
  already there, and what is it worth.
  → `src/pricing/discount.ts`, `src/pricing/rules.ts` · uses: Cart, Promotion catalogue
- **Order totals** — Turns a cart into the four numbers a customer sees.
  → `src/pricing/totals.ts`, `src/pricing/tax.ts` · uses: Apply discount, Cart
