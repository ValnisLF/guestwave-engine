import { NextRequest, NextResponse } from 'next/server';
import { verifyStripeWebhook } from '@infra/stripe';
import { prisma } from '@infra/prisma';
import { sendBookingEmail } from '@/lib/mail';

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
        ? await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
              property: {
                select: {
                  name: true,
                  smtpHost: true,
                  smtpPort: true,
                  smtpUser: true,
                  smtpPassword: true,
                  smtpFromEmail: true,
                },
              },
            },
          })
        : await prisma.booking.findUnique({
            where: { stripeSessionId: session.id },
            include: {
              property: {
                select: {
                  name: true,
                  smtpHost: true,
                  smtpPort: true,
                  smtpUser: true,
                  smtpPassword: true,
                  smtpFromEmail: true,
                },
              },
            },
          });

      if (!booking) {
        return NextResponse.json({ received: true, ignored: true });
      }

      const confirmedBooking = booking;

      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
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
              propertyId: confirmedBooking.propertyId,
              bookingId: confirmedBooking.id,
              startDate: confirmedBooking.checkIn,
              endDate: confirmedBooking.checkOut,
              source: 'BOOKING',
            },
          });
        }
      });

      if (confirmedBooking.guestEmail) {
        try {
          const totalAmount = Number(confirmedBooking.totalPrice);
          const paidAmount = Number(confirmedBooking.depositAmount);
          const pendingAmount = Math.max(0, totalAmount - paidAmount);

          await sendBookingEmail({
            to: confirmedBooking.guestEmail,
            subject: `Reserva confirmada · ${confirmedBooking.property.name} · ${confirmedBooking.bookingCode}`,
            html: `
              <h2>Tu reserva esta confirmada</h2>
              <p><strong>Propiedad:</strong> ${confirmedBooking.property.name}</p>
              <p><strong>Codigo de reserva:</strong> ${confirmedBooking.bookingCode}</p>
              <p><strong>Check-in:</strong> ${confirmedBooking.checkIn.toLocaleDateString('es-ES')}</p>
              <p><strong>Check-out:</strong> ${confirmedBooking.checkOut.toLocaleDateString('es-ES')}</p>
              <p><strong>Importe total de la reserva:</strong> ${totalAmount.toFixed(2)} EUR</p>
              <p><strong>Importe pagado:</strong> ${paidAmount.toFixed(2)} EUR</p>
              ${pendingAmount > 0 ? `<p><strong>Importe pendiente por pagar:</strong> ${pendingAmount.toFixed(2)} EUR</p>` : ''}
            `,
            text: [
              'Tu reserva esta confirmada',
              `Propiedad: ${confirmedBooking.property.name}`,
              `Codigo de reserva: ${confirmedBooking.bookingCode}`,
              `Check-in: ${confirmedBooking.checkIn.toISOString().slice(0, 10)}`,
              `Check-out: ${confirmedBooking.checkOut.toISOString().slice(0, 10)}`,
              `Importe total de la reserva: ${totalAmount.toFixed(2)} EUR`,
              `Importe pagado: ${paidAmount.toFixed(2)} EUR`,
              ...(pendingAmount > 0
                ? [`Importe pendiente por pagar: ${pendingAmount.toFixed(2)} EUR`]
                : []),
            ].join('\n'),
            property: {
              smtpHost: confirmedBooking.property.smtpHost,
              smtpPort: confirmedBooking.property.smtpPort,
              smtpUser: confirmedBooking.property.smtpUser,
              smtpPassword: confirmedBooking.property.smtpPassword,
              smtpFromEmail: confirmedBooking.property.smtpFromEmail,
            },
          });
        } catch (notificationError) {
          console.error('Booking confirmation email error:', notificationError);
        }
      }

      return NextResponse.json({ received: true, bookingId: confirmedBooking.id });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook handling failed' }, { status: 400 });
  }
}
