import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyMock = vi.fn();
const sendMailMock = vi.fn();
const createTransportMock = vi.fn(() => ({
  verify: verifyMock,
  sendMail: sendMailMock,
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
  createTransport: createTransportMock,
}));

describe('sendBookingEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.SMTP_HOST = 'default.smtp.local';
    process.env.SMTP_PORT = '2525';
    process.env.SMTP_USER = 'default-user';
    process.env.SMTP_PASSWORD = 'default-pass';
    process.env.SMTP_FROM_EMAIL = 'default-from@example.com';

    verifyMock.mockResolvedValue(true);
    sendMailMock.mockResolvedValue({ messageId: 'message_1' });
  });

  it('uses property SMTP credentials when property has SMTP data', async () => {
    const { sendBookingEmail } = await import('./mail');

    const result = await sendBookingEmail({
      to: 'guest@example.com',
      subject: 'Reserva confirmada',
      html: '<p>Hola</p>',
      property: {
        smtpHost: 'prop.smtp.local',
        smtpPort: 587,
        smtpUser: 'prop-user',
        smtpPassword: 'encrypted-pass',
        smtpFromEmail: 'villa@example.com',
      },
    });

    expect(result.success).toBe(true);
    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'prop.smtp.local',
      port: 587,
      secure: false,
      auth: {
        user: 'prop-user',
        pass: 'encrypted-pass',
      },
    });
    expect(verifyMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'villa@example.com',
      to: 'guest@example.com',
      subject: 'Reserva confirmada',
      html: '<p>Hola</p>',
      text: undefined,
    });
  });

  it('falls back to default env SMTP credentials when property SMTP data is missing', async () => {
    const { sendBookingEmail } = await import('./mail');

    const result = await sendBookingEmail({
      to: 'guest@example.com',
      subject: 'Reserva confirmada',
      html: '<p>Hola</p>',
      property: {
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPassword: null,
        smtpFromEmail: null,
      },
    });

    expect(result.success).toBe(true);
    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'default.smtp.local',
      port: 2525,
      secure: false,
      auth: {
        user: 'default-user',
        pass: 'default-pass',
      },
    });
    expect(verifyMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'default-from@example.com',
      to: 'guest@example.com',
      subject: 'Reserva confirmada',
      html: '<p>Hola</p>',
      text: undefined,
    });
  });
});
