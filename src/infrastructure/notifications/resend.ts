export async function sendOwnerPaymentNotification(payload: {
  toEmail: string;
  bookingId: string;
  propertyId: string;
  amountPaid: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) throw new Error('Missing RESEND_FROM_EMAIL');

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

export async function sendAdminInviteEmail(payload: {
  toEmail: string;
  invitedByEmail: string;
  propertyName: string;
  acceptUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) throw new Error('Missing RESEND_FROM_EMAIL');

  const html = `
    <h2>Invitacion a GuestWave Backoffice</h2>
    <p><strong>${payload.invitedByEmail}</strong> te ha invitado a gestionar la propiedad <strong>${payload.propertyName}</strong>.</p>
    <p>Para activar tu acceso, crea tu contrasena desde este enlace:</p>
    <p><a href="${payload.acceptUrl}">${payload.acceptUrl}</a></p>
    <p>Si no esperabas esta invitacion, puedes ignorar este correo.</p>
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
      subject: `Invitacion Backoffice · ${payload.propertyName}`,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error ${response.status}: ${body}`);
  }

  return { sent: true };
}
