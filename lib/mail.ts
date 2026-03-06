import nodemailer from 'nodemailer';

type PropertySmtpConfig = {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFromEmail?: string | null;
};

type SendBookingEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  property?: PropertySmtpConfig | null;
};

type ResolvedSmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
  source: 'property' | 'default';
};

function normalizeNonEmpty(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveSmtpConfig(property?: PropertySmtpConfig | null): ResolvedSmtpConfig {
  const propertyHost = normalizeNonEmpty(property?.smtpHost);
  const propertyPort = property?.smtpPort ?? null;
  const propertyUser = normalizeNonEmpty(property?.smtpUser);
  const propertyPassword = normalizeNonEmpty(property?.smtpPassword);
  const propertyFromEmail = normalizeNonEmpty(property?.smtpFromEmail);

  if (propertyHost && propertyPort && propertyUser && propertyPassword && propertyFromEmail) {
    return {
      host: propertyHost,
      port: propertyPort,
      user: propertyUser,
      password: propertyPassword,
      fromEmail: propertyFromEmail,
      source: 'property',
    };
  }

  const host = normalizeNonEmpty(process.env.SMTP_HOST);
  const portRaw = normalizeNonEmpty(process.env.SMTP_PORT);
  const user = normalizeNonEmpty(process.env.SMTP_USER);
  const password = normalizeNonEmpty(process.env.SMTP_PASSWORD);
  const fromEmail = normalizeNonEmpty(process.env.SMTP_FROM_EMAIL);

  const port = portRaw ? Number(portRaw) : NaN;

  if (!host || !Number.isFinite(port) || !user || !password || !fromEmail) {
    throw new Error('Missing default SMTP configuration (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL)');
  }

  return {
    host,
    port,
    user,
    password,
    fromEmail,
    source: 'default',
  };
}

export async function sendBookingEmail(input: SendBookingEmailInput) {
  const smtp = resolveSmtpConfig(input.property);

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.password,
    },
  });

  await transporter.verify();

  const response = await transporter.sendMail({
    from: smtp.fromEmail,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  return {
    success: true as const,
    source: smtp.source,
    messageId: response.messageId,
  };
}
