export interface Line {
  sku: string;
  quantity: number;
  unitCents: number;
}

export const lineTotal = (l: Line): number => l.unitCents * l.quantity;
