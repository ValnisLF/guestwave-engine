import { beforeEach, describe, expect, it, vi } from 'vitest';

const bookingFindUniqueMock = vi.fn();
const bookingUpdateMock = vi.fn();
const transactionMock = vi.fn(async (callback: any) =>
  callback({
    booking: {
      findUnique: bookingFindUniqueMock,
      update: bookingUpdateMock,
    },
  })
);

const getAuthenticatedAdminIdentityMock = vi.fn();

vi.mock('@infra/prisma', () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

vi.mock('@/lib/admin-auth', () => ({
  getAuthenticatedAdminIdentity: getAuthenticatedAdminIdentityMock,
}));

describe('finance actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects reconcile when user is not authenticated', async () => {
    getAuthenticatedAdminIdentityMock.mockResolvedValueOnce(null);

    const { reconcileBookingPayment } = await import('@/app/lib/actions/finance');

    const result = await reconcileBookingPayment({
      bookingId: 'booking_1',
      paymentType: 'DEPOSIT',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized: OWNER role required');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rejects reconcile when user role is not OWNER', async () => {
    getAuthenticatedAdminIdentityMock.mockResolvedValueOnce({
      id: 'admin_1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    const { reconcileBookingPayment } = await import('@/app/lib/actions/finance');

    const result = await reconcileBookingPayment({
      bookingId: 'booking_1',
      paymentType: 'FULL',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized: OWNER role required');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rejects reconcile when bookingId is empty', async () => {
    getAuthenticatedAdminIdentityMock.mockResolvedValueOnce({
      id: 'owner_1',
      email: 'owner@example.com',
      role: 'OWNER',
    });

    const { reconcileBookingPayment } = await import('@/app/lib/actions/finance');

    const result = await reconcileBookingPayment({
      bookingId: '   ',
      paymentType: 'DEPOSIT',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Booking ID is required');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('sets depositPaidAt and keeps isReconciled false when final payment is missing', async () => {
    getAuthenticatedAdminIdentityMock.mockResolvedValueOnce({
      id: 'owner_1',
      email: 'owner@example.com',
      role: 'OWNER',
    });

    bookingFindUniqueMock.mockResolvedValueOnce({
      id: 'booking_1',
      depositPaidAt: null,
      finalBalancePaidAt: null,
    });

    bookingUpdateMock.mockImplementationOnce(async ({ where, data }: any) => ({
      id: where.id,
      depositPaidAt: data.depositPaidAt,
      finalBalancePaidAt: data.finalBalancePaidAt,
      isReconciled: data.isReconciled,
    }));

    const { reconcileBookingPayment } = await import('@/app/lib/actions/finance');

    const result = await reconcileBookingPayment({
      bookingId: 'booking_1',
      paymentType: 'DEPOSIT',
    });

    expect(result.success).toBe(true);
    expect(bookingFindUniqueMock).toHaveBeenCalledWith({
      where: { id: 'booking_1' },
      select: {
        id: true,
        depositPaidAt: true,
        finalBalancePaidAt: true,
      },
    });

    expect(bookingUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking_1' },
        data: expect.objectContaining({
          depositPaidAt: expect.any(Date),
          finalBalancePaidAt: null,
          isReconciled: false,
        }),
      })
    );
  });

  it('sets finalBalancePaidAt and marks isReconciled true when deposit was already paid', async () => {
    getAuthenticatedAdminIdentityMock.mockResolvedValueOnce({
      id: 'owner_1',
      email: 'owner@example.com',
      role: 'OWNER',
    });

    const alreadyPaidDeposit = new Date('2026-03-01T10:00:00.000Z');

    bookingFindUniqueMock.mockResolvedValueOnce({
      id: 'booking_2',
      depositPaidAt: alreadyPaidDeposit,
      finalBalancePaidAt: null,
    });

    bookingUpdateMock.mockImplementationOnce(async ({ where, data }: any) => ({
      id: where.id,
      depositPaidAt: data.depositPaidAt,
      finalBalancePaidAt: data.finalBalancePaidAt,
      isReconciled: data.isReconciled,
    }));

    const { reconcileBookingPayment } = await import('@/app/lib/actions/finance');

    const result = await reconcileBookingPayment({
      bookingId: 'booking_2',
      paymentType: 'FULL',
    });

    expect(result.success).toBe(true);
    expect(bookingUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking_2' },
        data: expect.objectContaining({
          depositPaidAt: alreadyPaidDeposit,
          finalBalancePaidAt: expect.any(Date),
          isReconciled: true,
        }),
      })
    );
    expect(result.data?.isReconciled).toBe(true);
  });

  it('returns not found when booking does not exist', async () => {
    getAuthenticatedAdminIdentityMock.mockResolvedValueOnce({
      id: 'owner_1',
      email: 'owner@example.com',
      role: 'OWNER',
    });

    bookingFindUniqueMock.mockResolvedValueOnce(null);

    const { reconcileBookingPayment } = await import('@/app/lib/actions/finance');

    const result = await reconcileBookingPayment({
      bookingId: 'missing',
      paymentType: 'DEPOSIT',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Booking not found');
    expect(bookingUpdateMock).not.toHaveBeenCalled();
  });
});
