export interface Product {
  sku: string;
  name: string;
  priceCents: number;
  /** Some products never take a discount — third-party goods sold at a fixed margin. */
  discountable: boolean;
}

const PRODUCTS: Product[] = [
  { sku: 'MUG-01', name: 'Mug', priceCents: 1200, discountable: true },
  { sku: 'GC-25', name: 'Gift card', priceCents: 2500, discountable: false },
];

export const findProduct = (sku: string): Product | undefined => PRODUCTS.find((p) => p.sku === sku);
