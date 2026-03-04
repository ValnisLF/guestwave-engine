import { NextRequest, NextResponse } from 'next/server';
import { verifyStripeWebhook } from '@infra/stripe';
import { prisma } from '@infra/prisma';
import { sendOwnerPaymentNotification } from '@infra/notifications/resend';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
    }

    const rawBody = await request.text();
    const event = verifyStripeWebhook(rawBody, signature);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const bookingId = session.metadata?.bookingId;

      let booking = bookingId
        ? await prisma.booking.findUnique({ where: { id: bookingId } })
        : await prisma.booking.findUnique({ where: { stripeSessionId: session.id } });

      if (!booking) {
        return NextResponse.json({ received: true, ignored: true });
      }

      await prisma.$transaction(async (tx) => {
        booking = await tx.booking.update({
          where: { id: booking!.id },
          data: {
            status: 'CONFIRMED',
            stripeSessionId: session.id,
          },
        });

        const existingBlocked = await tx.blockedDate.findFirst({
          where: { bookingId: booking!.id },
          select: { id: true },
        });

        if (!existingBlocked) {
          await tx.blockedDate.create({
            data: {
              propertyId: booking!.propertyId,
              bookingId: booking!.id,
              startDate: booking!.checkIn,
              endDate: booking!.checkOut,
              source: 'BOOKING',
            },
          });
        }
      });

      const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
      if (ownerEmail) {
        try {
          await sendOwnerPaymentNotification({
            toEmail: ownerEmail,
            bookingId: booking.id,
            propertyId: booking.propertyId,
            amountPaid: Number(booking.depositAmount),
          });
        } catch (notificationError) {
          console.error('Owner notification error:', notificationError);
        }
      }

      return NextResponse.json({ received: true, bookingId: booking.id });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 400 });
  }
}
