'use server';

import { prisma } from '@infra/prisma';
import { getAuthenticatedAdminIdentity } from '@/lib/admin-auth';

export type ReconcileBookingPaymentType = 'DEPOSIT' | 'FULL';

export type ReconcileBookingPaymentInput = {
  bookingId: string;
  paymentType: ReconcileBookingPaymentType;
};

export type ReconcileBookingPaymentResponse = {
  success: boolean;
  data?: {
    bookingId: string;
    depositPaidAt: Date | null;
    finalBalancePaidAt: Date | null;
    isReconciled: boolean;
  };
  error?: string;
};

export async function reconcileBookingPayment(
  input: ReconcileBookingPaymentInput
): Promise<ReconcileBookingPaymentResponse> {
  const identity = await getAuthenticatedAdminIdentity();

  if (!identity || identity.role !== 'OWNER') {
    return {
      success: false,
      error: 'Unauthorized: OWNER role required',
    };
  }

  const bookingId = input.bookingId?.trim();
  if (!bookingId) {
    return {
      success: false,
      error: 'Booking ID is required',
    };
  }

  const now = new Date();

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          depositPaidAt: true,
          finalBalancePaidAt: true,
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      const nextDepositPaidAt = input.paymentType === 'DEPOSIT' ? now : booking.depositPaidAt;
      const nextFinalBalancePaidAt =
        input.paymentType === 'FULL' ? now : booking.finalBalancePaidAt;
      const nextIsReconciled = Boolean(nextDepositPaidAt && nextFinalBalancePaidAt);

      return tx.booking.update({
        where: { id: bookingId },
        data: {
          depositPaidAt: nextDepositPaidAt,
          finalBalancePaidAt: nextFinalBalancePaidAt,
          isReconciled: nextIsReconciled,
        },
        select: {
          id: true,
          depositPaidAt: true,
          finalBalancePaidAt: true,
          isReconciled: true,
        },
      });
    });

    return {
      success: true,
      data: {
        bookingId: updated.id,
        depositPaidAt: updated.depositPaidAt,
        finalBalancePaidAt: updated.finalBalancePaidAt,
        isReconciled: updated.isReconciled,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Failed to reconcile booking payment',
    };
  }
}
