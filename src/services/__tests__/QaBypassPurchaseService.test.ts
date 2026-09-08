import { QaBypassPurchaseService } from '../QaBypassPurchaseService';

describe('QaBypassPurchaseService', () => {
  const svc = new QaBypassPurchaseService();

  it('reports the entitlement as active without any store', async () => {
    await expect(svc.loadEntitlement()).resolves.toBe(true);
    await expect(svc.loadOffering()).resolves.toBeNull();
    await expect(svc.purchase()).resolves.toEqual({ kind: 'unlocked' });
    await expect(svc.restorePurchases()).resolves.toEqual({ kind: 'unlocked' });
    expect(typeof svc.subscribe()).toBe('function');
  });
});
