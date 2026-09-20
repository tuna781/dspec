export interface Receipt { id: string; amountCents: number }

export async function charge(amountCents: number, reference: string): Promise<Receipt> {
  if (amountCents <= 0) throw new Error('nothing to charge');
  return { id: `ch_${reference}`, amountCents };
}

export async function refundCharge(chargeId: string, amountCents: number): Promise<void> {
  if (amountCents <= 0) throw new Error('nothing to refund');
  void chargeId;
}
