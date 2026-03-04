export async function sendOwnerPaymentNotification(payload: {
  toEmail: string;
  bookingId: string;
  propertyId: string;
  amountPaid: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: true, reason: 'Missing RESEND_API_KEY' };

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'GuestWave <onboarding@resend.dev>';

  const html = `
    <h2>Nuevo pago confirmado</h2>
    <p><strong>Reserva:</strong> ${payload.bookingId}</p>
    <p><strong>Propiedad:</strong> ${payload.propertyId}</p>
    <p><strong>Importe pagado:</strong> ${payload.amountPaid.toFixed(2)} EUR</p>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [payload.toEmail],
      subject: `Pago confirmado · Reserva ${payload.bookingId}`,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error ${response.status}: ${body}`);
  }

  return { sent: true };
}
