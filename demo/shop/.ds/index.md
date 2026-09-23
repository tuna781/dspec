# shop — map

Every feature: what it is, where it starts, what it depends on.
Read this first, then the one feature file you need under `.ds/features/`.
Going the other way — you have a file and need the feature — search `code:` across
`.ds/features/`.

## The product

### API

- **HTTP API** — The routes the storefront calls. A thin map from path to feature.
  → `src/api/routes.ts` · uses: Checkout, Apply discount, Promotion catalogue

### Cart

- **Cart** — The basket: lines, the region that decides tax, and the discounts applied so far.
  → `src/cart/cart.ts` +1 · used by: Apply discount, Checkout, Order totals

### Catalog

- **Promotion catalogue** — What a discount code means: kind, value, expiry, and whether it may
  share a cart. Also which products may be discounted at all.
  → `src/catalog/promotion.ts` +1 · used by: Apply discount, Checkout, HTTP API

### Checkout

- **Checkout** — The checkout session: validate the cart, price it, redeem codes against it.
  → `src/checkout/index.ts` +2 · uses: Apply discount, Order totals, Cart, Promotion catalogue ·
    used by: HTTP API, Orders

### Orders

- **Orders** — Placing an order from a priced session, taking payment, and refunding it.
  → `src/orders/place.ts` +2 · uses: Checkout

### Pricing

- **Apply discount** — Redeeming a code against a cart: is it real, may it combine with what is
  already there, and what is it worth.
  → `src/pricing/discount.ts` +1 · uses: Cart, Promotion catalogue · used by: Checkout, HTTP API,
    Order totals
- **Order totals** — Turns a cart into the four numbers a customer sees.
  → `src/pricing/totals.ts` +1 · uses: Apply discount, Cart · used by: Checkout
