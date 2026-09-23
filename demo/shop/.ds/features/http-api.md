---
name: HTTP API
area: API
kind: product
checked: 2026-09-23
code:
  - src/api/routes.ts
uses: [Checkout, Apply discount, Promotion catalogue]
---

The routes the storefront calls — the `routes` object, four entries, `POST /checkout` through
`GET /promotions`. A thin map from path to feature; no logic lives here.
