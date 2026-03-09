import { beforeEach, describe, expect, it, vi } from 'vitest';

const propertyUpdateMock = vi.fn();

const canManagePropertyByEmailMock = vi.fn();
const getAuthenticatedAdminEmailMock = vi.fn();

vi.mock('@infra/prisma', () => ({
  prisma: {
    property: {
      update: propertyUpdateMock,
    },
  },
}));

vi.mock('@infra/ical/sync', () => ({
  syncPropertyIcal: vi.fn(),
  syncPropertyIcalCalendar: vi.fn(),
}));

vi.mock('@infra/stripe', () => ({
  refundStripePayment: vi.fn(),
}));

vi.mock('@/lib/mail', () => ({
  sendBookingEmail: vi.fn(),
}));

vi.mock('@/lib/admin-auth', () => ({
  getAuthenticatedAdminEmail: getAuthenticatedAdminEmailMock,
  ensureAppUserByEmail: vi.fn().mockResolvedValue({ id: 'user_1', email: 'owner@example.com' }),
  canManagePropertyByEmail: canManagePropertyByEmailMock,
  getAuthorizedPropertiesByEmail: vi.fn().mockResolvedValue([]),
  isSystemAdminByEmail: vi.fn().mockResolvedValue(true),
}));

describe('admin property settings action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedAdminEmailMock.mockResolvedValue('owner@example.com');
    canManagePropertyByEmailMock.mockResolvedValue(true);
  });

  it('allows updating primaryColor only for authorized users', async () => {
    canManagePropertyByEmailMock.mockResolvedValueOnce(false);

    const { updatePropertySettings } = await import('@/app/admin/properties/_actions');

    const result = await updatePropertySettings({
      propertyId: 'prop_1',
      primaryColor: '#1A2B3C',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized: you do not have access to this property');
    expect(propertyUpdateMock).not.toHaveBeenCalled();
  });

  it('rejects invalid hex format for primaryColor', async () => {
    const { updatePropertySettings } = await import('@/app/admin/properties/_actions');

    const result = await updatePropertySettings({
      propertyId: 'prop_1',
      primaryColor: 'blue',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Primary color must be a valid hex color');
    expect(propertyUpdateMock).not.toHaveBeenCalled();
  });

  it('persists a valid primaryColor when user is authorized', async () => {
    propertyUpdateMock.mockResolvedValueOnce({ id: 'prop_1', primaryColor: '#1A2B3C' });

    const { updatePropertySettings } = await import('@/app/admin/properties/_actions');

    const result = await updatePropertySettings({
      propertyId: 'prop_1',
      primaryColor: ' #1a2b3c ',
    });

    expect(result.success).toBe(true);
    expect(propertyUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prop_1' },
        data: expect.objectContaining({
          primaryColor: '#1A2B3C',
        }),
      })
    );
  });
});
