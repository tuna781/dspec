---
name: Promotion catalogue
area: Catalog
kind: product
code:
  - src/catalog/promotion.ts
  - src/catalog/product.ts
---

What a discount code means: its kind, its value, when it expires, and whether it may share a cart.
Also which products may be discounted at all.

## Rules

- **Some products never take a discount** — third-party goods sold at a fixed margin.

## Decisions

- **A cart mixing a non-discountable product with a discount is rejected outright** at checkout,
  rather than discounting the half of it that is eligible. A half-applied discount is a total the
  customer cannot reproduce from the code they entered.
