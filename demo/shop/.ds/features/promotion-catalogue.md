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

- **Some products never take a discount** — `discountable: false`, third-party goods sold at a
  fixed margin.
- **`stackable` and `exclusiveGroup` are the promotion's own answer** to whether it may share a
  cart; *Apply discount* only reads them.

## Decisions

- **A cart mixing a non-discountable product with a discount is rejected outright** at checkout,
  rather than discounting the half of it that is eligible. A half-applied discount is a total the
  customer cannot reproduce from the code they entered.
