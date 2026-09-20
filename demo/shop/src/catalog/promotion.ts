export interface Promotion {
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  expiresAt: number;
  /** May this promotion share a cart with another? */
  stackable: boolean;
  /** Two promotions in the same group never combine, stackable or not. */
  exclusiveGroup?: string;
}

const CATALOG: Promotion[] = [
  { code: 'WELCOME10', kind: 'percent', value: 10, expiresAt: 4102444800000, stackable: true, exclusiveGroup: 'newcomer' },
  { code: 'SUMMER20', kind: 'percent', value: 20, expiresAt: 4102444800000, stackable: false },
  { code: 'SHIP5', kind: 'fixed', value: 500, expiresAt: 4102444800000, stackable: true },
];

export const findPromotion = (code: string): Promotion | undefined =>
  CATALOG.find((p) => p.code === code.toUpperCase());

export const listPromotions = (): Promotion[] => [...CATALOG];
