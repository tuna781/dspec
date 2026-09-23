---
name: Promotion catalogue
area: Catalog
kind: product
checked: 2026-09-23
code:
  - src/catalog/promotion.ts
  - src/catalog/product.ts
---

What a discount code means: its kind, its value, when it expires, and whether it may share a cart.
Also which products may be discounted at all. `findPromotion` and `findProduct` are the two lookups;
`CATALOG` and `PRODUCTS` are the fixed data behind them.

## Rules

- **Some products never take a discount** — `discountable: false`. *Checkout* refuses a cart that
  mixes one with a discount.
- **`stackable` and `exclusiveGroup` are the promotion's own answer** to whether it may share a
  cart; *Apply discount* only reads them.

## Behaviour

- `findPromotion` upper-cases the code before matching, so codes are case-insensitive.
- Three promotions: `WELCOME10` (10%, stackable, group `newcomer`), `SUMMER20` (20%, not
  stackable) and `SHIP5` (500 cents off, stackable). Two products: `MUG-01` (discountable) and
  `GC-25`, a gift card (not discountable).
