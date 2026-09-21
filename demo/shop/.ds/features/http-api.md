---
name: HTTP API
area: API
kind: product
code:
  - src/api/routes.ts
uses: [Checkout, Apply discount, Promotion catalogue]
---

The routes the storefront calls. A thin map from path to feature; no logic lives here.
