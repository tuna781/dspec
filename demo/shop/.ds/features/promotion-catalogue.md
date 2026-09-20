---
name: Promotion catalogue
area: Catalog
code:
  - src/catalog/promotion.ts
  - src/catalog/product.ts
---

What a discount code means: its kind, its value, when it expires, and whether it may share a cart.
Also which products may be discounted at all.

## Rules

- **Some products never take a discount** — third-party goods sold at a fixed margin. A cart mixing
  them with a discount is rejected at checkout rather than discounting the wrong half of it.
