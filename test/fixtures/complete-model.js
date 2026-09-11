'use strict';
// ============================================================
// One in-memory model, shared by every test that needs a whole one.
//
// It exercises the shapes that have bitten before: a feature with every optional key filled, one
// with only the required three, a `uses:` that resolves and one that does not, and two features
// claiming the same file — shared infrastructure, which is a fact rather than a conflict.
// ============================================================

const feature = (over = {}) => ({
  name: 'Place order',
  area: 'Checkout',
  code: ['src/order/place.ts'],
  entry: 'placeOrder',
  uses: [],
  tests: [],
  stamp: undefined,
  lead: 'Turns a cart into an order and takes the money.',
  rules: ['- A customer may hold at most three pending orders.'],
  behaviour: ['- Refuses an empty cart before touching payment.'],
  body: 'Turns a cart into an order and takes the money.\n\nRules\n- A customer may hold at most three pending orders.\n\nBehaviour\n- Refuses an empty cart before touching payment.',
  ...over,
});

const model = (over = {}) => ({
  product: {
    name: 'Shop',
    vision: 'Online retail for the domestic market.',
    rules: ['- Money is always minor units, never a float.'],
  },
  glossary: '# Glossary\n\n**Order** — the thing being paid for.',
  features: [
    feature({ uses: ['Apply discount'], tests: ['test/place.spec.ts'] }),
    feature({
      name: 'Apply discount',
      code: ['src/billing/discount.ts', 'src/order/place.ts'],
      entry: 'applyDiscount',
      uses: [],
      lead: 'Applies a coupon to an order total.',
      rules: ['- Only one coupon may be applied to an order.'],
      behaviour: [],
      body: 'Applies a coupon to an order total.\n\nRules\n- Only one coupon may be applied to an order.',
    }),
  ],
  ...over,
});

module.exports = { model, feature };
