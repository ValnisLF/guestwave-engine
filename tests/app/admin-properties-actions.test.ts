import { beforeEach, describe, expect, it, vi } from 'vitest';

const propertyFindUniqueMock = vi.fn();
const propertyUpdateMock = vi.fn();
const propertyDeleteMock = vi.fn();
const bookingCountMock = vi.fn();
const bookingFindUniqueMock = vi.fn();
const bookingDeleteMock = vi.fn();
const blockedDateDeleteManyMock = vi.fn();
const bookingRefundAuditCreateMock = vi.fn();
const sendBookingEmailMock = vi.fn();

vi.mock('@infra/prisma', () => ({
  prisma: {
    property: {
      findUnique: propertyFindUniqueMock,
      update: propertyUpdateMock,
      delete: propertyDeleteMock,
    },
    booking: {
      count: bookingCountMock,
      findUnique: bookingFindUniqueMock,
      delete: bookingDeleteMock,
    },
    blockedDate: {
      deleteMany: blockedDateDeleteManyMock,
    },
    $transaction: vi.fn(async (callback: any) =>
      callback({
        blockedDate: {
          deleteMany: blockedDateDeleteManyMock,
        },
        booking: {
          delete: bookingDeleteMock,
        },
        bookingRefundAudit: {
          create: bookingRefundAuditCreateMock,
        },
      })
    ),
  },
}));

vi.mock('@infra/ical/sync', () => ({
  syncPropertyIcal: vi.fn(),
  syncPropertyIcalCalendar: vi.fn(),
}));

const refundStripePaymentMock = vi.fn();

vi.mock('@infra/stripe', () => ({
  refundStripePayment: refundStripePaymentMock,
}));

vi.mock('@/lib/mail', () => ({
  sendBookingEmail: sendBookingEmailMock,
}));

vi.mock('@/lib/admin-auth', () => ({
  getAuthenticatedAdminEmail: vi.fn().mockResolvedValue('owner@example.com'),
  ensureAppUserByEmail: vi.fn().mockResolvedValue({ id: 'user_1', email: 'owner@example.com' }),
  canManagePropertyByEmail: vi.fn().mockResolvedValue(true),
  getAuthorizedPropertiesByEmail: vi.fn().mockResolvedValue([]),
  isSystemAdminByEmail: vi.fn().mockResolvedValue(true),
}));

describe('admin properties actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates an existing property', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({ id: 'prop_1', slug: 'villa-sol' });
    propertyUpdateMock.mockResolvedValueOnce({
      id: 'prop_1',
      name: 'Villa Sol Updated',
      slug: 'villa-sol',
      description: 'Updated desc',
      imageUrls: ['https://example.com/a.jpg'],
      amenities: { wifi: true },
      basePrice: 180,
      cleaningFee: 40,
      minimumStay: 2,
      depositPercentage: 30,
      icalUrlIn: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const { updateProperty } = await import('@/app/admin/properties/_actions');

    const result = await updateProperty('prop_1', {
      name: 'Villa Sol Updated',
      slug: 'villa-sol',
      description: 'Updated desc',
      imageUrls: ['https://example.com/a.jpg'],
      amenities: { wifi: true },
      basePrice: 180,
      cleaningFee: 40,
      minimumStay: 2,
      depositPercentage: 30,
    });

    expect(result.success).toBe(true);
    expect(propertyUpdateMock).toHaveBeenCalledWith({
      where: { id: 'prop_1' },
      data: {
        name: 'Villa Sol Updated',
        slug: 'villa-sol',
        description: 'Updated desc',
        imageUrls: ['https://example.com/a.jpg'],
        amenities: { wifi: true },
        basePrice: 180,
        cleaningFee: 40,
        minimumStay: 2,
        depositPercentage: 30,
      },
    });
  });

  it('rejects update when property does not exist', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce(null);

    const { updateProperty } = await import('@/app/admin/properties/_actions');

    const result = await updateProperty('missing', {
      name: 'Any Name',
      slug: 'any-slug',
      basePrice: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Property not found');
    expect(propertyUpdateMock).not.toHaveBeenCalled();
  });

  it('rejects update when new slug already exists', async () => {
    propertyFindUniqueMock
      .mockResolvedValueOnce({ id: 'prop_1', slug: 'villa-sol' })
      .mockResolvedValueOnce({ id: 'prop_2', slug: 'villa-luna' });

    const { updateProperty } = await import('@/app/admin/properties/_actions');

    const result = await updateProperty('prop_1', {
      name: 'Villa Sol',
      slug: 'villa-luna',
      basePrice: 150,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Slug already exists. Please choose a unique slug.');
    expect(propertyUpdateMock).not.toHaveBeenCalled();
  });

  it('deletes property when no active bookings exist', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({ id: 'prop_1' });
    bookingCountMock.mockResolvedValueOnce(0);
    propertyDeleteMock.mockResolvedValueOnce({ id: 'prop_1' });

    const { deleteProperty } = await import('@/app/admin/properties/_actions');

    const result = await deleteProperty('prop_1');

    expect(result.success).toBe(true);
    expect(propertyDeleteMock).toHaveBeenCalledWith({ where: { id: 'prop_1' } });
  });

  it('blocks deletion when property has active bookings', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({ id: 'prop_1' });
    bookingCountMock.mockResolvedValueOnce(2);

    const { deleteProperty } = await import('@/app/admin/properties/_actions');

    const result = await deleteProperty('prop_1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot delete property with active bookings');
    expect(propertyDeleteMock).not.toHaveBeenCalled();
  });

  it('updates auto-sync settings for a property', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({ id: 'prop_1' });
    propertyUpdateMock.mockResolvedValueOnce({
      id: 'prop_1',
      name: 'Villa Sol',
      slug: 'villa-sol',
      description: null,
      imageUrls: [],
      amenities: {},
      basePrice: 120,
      cleaningFee: 35,
      minimumStay: 2,
      depositPercentage: 30,
      icalUrlIn: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const { updatePropertyAutoSyncSettings } = await import('@/app/admin/properties/_actions');

    const result = await updatePropertyAutoSyncSettings({
      propertyId: 'prop_1',
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 20,
    });

    expect(result.success).toBe(true);
    expect(propertyUpdateMock).toHaveBeenCalledWith({
      where: { id: 'prop_1' },
      data: {
        autoSyncEnabled: true,
        autoSyncIntervalMinutes: 20,
      },
    });
  });

  it('rejects auto-sync interval outside valid range', async () => {
    const { updatePropertyAutoSyncSettings } = await import('@/app/admin/properties/_actions');

    const result = await updatePropertyAutoSyncSettings({
      propertyId: 'prop_1',
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: 2,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Auto-sync interval must be between 5 and 1440 minutes');
    expect(propertyFindUniqueMock).not.toHaveBeenCalled();
  });

  it('updates booking prefix with normalization and validation', async () => {
    propertyUpdateMock.mockResolvedValueOnce({ id: 'prop_1' });

    const { updatePropertyBookingPrefix } = await import('@/app/admin/properties/_actions');

    const result = await updatePropertyBookingPrefix({
      propertyId: 'prop_1',
      bookingPrefix: ' ef ',
    });

    expect(result.success).toBe(true);
    expect(propertyUpdateMock).toHaveBeenCalledWith({
      where: { id: 'prop_1' },
      data: {
        bookingPrefix: 'EF',
      },
    });
  });

  it('rejects booking prefix update when value is invalid', async () => {
    const { updatePropertyBookingPrefix } = await import('@/app/admin/properties/_actions');

    const result = await updatePropertyBookingPrefix({
      propertyId: 'prop_1',
      bookingPrefix: '1A',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Booking prefix must contain only letters');
    expect(propertyUpdateMock).not.toHaveBeenCalled();
  });

  it('updates SMTP settings using new password when provided', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({
      id: 'prop_1',
      smtpPassword: 'stored-pass',
    });
    propertyUpdateMock.mockResolvedValueOnce({ id: 'prop_1' });

    const { updatePropertySmtpSettings } = await import('@/app/admin/properties/_actions');

    const result = await updatePropertySmtpSettings({
      propertyId: 'prop_1',
      bookingPrefix: ' ef ',
      smtpHost: ' smtp.host.local ',
      smtpPort: 587,
      smtpUser: ' smtp-user ',
      smtpPassword: ' new-pass ',
      smtpFromEmail: ' from@example.com ',
    });

    expect(result.success).toBe(true);
    expect(propertyUpdateMock).toHaveBeenCalledWith({
      where: { id: 'prop_1' },
      data: {
        bookingPrefix: 'EF',
        smtpHost: 'smtp.host.local',
        smtpPort: 587,
        smtpUser: 'smtp-user',
        smtpPassword: 'new-pass',
        smtpFromEmail: 'from@example.com',
      },
    });
  });

  it('keeps existing SMTP password when password input is empty', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({
      id: 'prop_1',
      smtpPassword: 'stored-pass',
    });
    propertyUpdateMock.mockResolvedValueOnce({ id: 'prop_1' });

    const { updatePropertySmtpSettings } = await import('@/app/admin/properties/_actions');

    const result = await updatePropertySmtpSettings({
      propertyId: 'prop_1',
      bookingPrefix: 'AB',
      smtpHost: 'smtp.host.local',
      smtpPort: 2525,
      smtpUser: 'smtp-user',
      smtpPassword: '   ',
      smtpFromEmail: 'from@example.com',
    });

    expect(result.success).toBe(true);
    expect(propertyUpdateMock).toHaveBeenCalledWith({
      where: { id: 'prop_1' },
      data: {
        bookingPrefix: 'AB',
        smtpHost: 'smtp.host.local',
        smtpPort: 2525,
        smtpUser: 'smtp-user',
        smtpPassword: 'stored-pass',
        smtpFromEmail: 'from@example.com',
      },
    });
  });

  it('rejects SMTP save when no password exists at all', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({
      id: 'prop_1',
      smtpPassword: null,
    });

    const { updatePropertySmtpSettings } = await import('@/app/admin/properties/_actions');

    const result = await updatePropertySmtpSettings({
      propertyId: 'prop_1',
      bookingPrefix: 'AB',
      smtpHost: 'smtp.host.local',
      smtpPort: 2525,
      smtpUser: 'smtp-user',
      smtpPassword: '',
      smtpFromEmail: 'from@example.com',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP password is required');
    expect(propertyUpdateMock).not.toHaveBeenCalled();
  });

  it('tests SMTP connection using provided password and test recipient', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({
      smtpPassword: 'stored-pass',
    });
    sendBookingEmailMock.mockResolvedValueOnce({ success: true, messageId: 'm_1' });

    const { testPropertySmtpConnection } = await import('@/app/admin/properties/_actions');

    const result = await testPropertySmtpConnection({
      propertyId: 'prop_1',
      bookingPrefix: 'EF',
      smtpHost: 'smtp.host.local',
      smtpPort: 587,
      smtpUser: 'smtp-user',
      smtpPassword: 'provided-pass',
      smtpFromEmail: 'from@example.com',
      testToEmail: 'qa@example.com',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ recipient: 'qa@example.com' });
    expect(sendBookingEmailMock).toHaveBeenCalledWith({
      to: 'qa@example.com',
      subject: 'GuestWave · Test SMTP',
      html: '<p>Conexion SMTP OK desde GuestWave.</p>',
      text: 'Conexion SMTP OK desde GuestWave.',
      property: {
        smtpHost: 'smtp.host.local',
        smtpPort: 587,
        smtpUser: 'smtp-user',
        smtpPassword: 'provided-pass',
        smtpFromEmail: 'from@example.com',
      },
    });
  });

  it('tests SMTP connection using stored password fallback when input password is empty', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({
      smtpPassword: 'stored-pass',
    });
    sendBookingEmailMock.mockResolvedValueOnce({ success: true, messageId: 'm_2' });

    const { testPropertySmtpConnection } = await import('@/app/admin/properties/_actions');

    const result = await testPropertySmtpConnection({
      propertyId: 'prop_1',
      bookingPrefix: 'EF',
      smtpHost: 'smtp.host.local',
      smtpPort: 465,
      smtpUser: 'smtp-user',
      smtpPassword: ' ',
      smtpFromEmail: 'from@example.com',
      testToEmail: '',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ recipient: 'owner@example.com' });
    expect(sendBookingEmailMock).toHaveBeenCalledWith({
      to: 'owner@example.com',
      subject: 'GuestWave · Test SMTP',
      html: '<p>Conexion SMTP OK desde GuestWave.</p>',
      text: 'Conexion SMTP OK desde GuestWave.',
      property: {
        smtpHost: 'smtp.host.local',
        smtpPort: 465,
        smtpUser: 'smtp-user',
        smtpPassword: 'stored-pass',
        smtpFromEmail: 'from@example.com',
      },
    });
  });

  it('rejects SMTP test when no password is provided nor stored', async () => {
    propertyFindUniqueMock.mockResolvedValueOnce({
      smtpPassword: null,
    });

    const { testPropertySmtpConnection } = await import('@/app/admin/properties/_actions');

    const result = await testPropertySmtpConnection({
      propertyId: 'prop_1',
      bookingPrefix: 'EF',
      smtpHost: 'smtp.host.local',
      smtpPort: 587,
      smtpUser: 'smtp-user',
      smtpPassword: '',
      smtpFromEmail: 'from@example.com',
      testToEmail: 'qa@example.com',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP password is required to send a test email');
    expect(sendBookingEmailMock).not.toHaveBeenCalled();
  });

  it('deletes a booking only after successful refund confirmation', async () => {
    bookingFindUniqueMock.mockResolvedValueOnce({
      id: 'booking_1',
      propertyId: 'prop_1',
      stripeSessionId: 'cs_live_123',
      totalPrice: 250,
      guestEmail: 'guest@example.com',
    });
    refundStripePaymentMock.mockResolvedValueOnce({
      id: 're_123',
      status: 'succeeded',
    });
    blockedDateDeleteManyMock.mockResolvedValueOnce({ count: 1 });
    bookingDeleteMock.mockResolvedValueOnce({ id: 'booking_1' });

    const { deleteBookingAndRefund } = await import('@/app/admin/properties/_actions');

    const result = await deleteBookingAndRefund('booking_1');

    expect(result.success).toBe(true);
    expect(refundStripePaymentMock).toHaveBeenCalledWith({
      stripeSessionId: 'cs_live_123',
      amount: 250,
      reason: 'requested_by_customer',
    });
    expect(blockedDateDeleteManyMock).toHaveBeenCalledWith({
      where: { bookingId: 'booking_1' },
    });
    expect(bookingDeleteMock).toHaveBeenCalledWith({
      where: { id: 'booking_1' },
    });
    expect(bookingRefundAuditCreateMock).toHaveBeenCalledWith({
      data: {
        bookingId: 'booking_1',
        propertyId: 'prop_1',
        performedByUserId: 'user_1',
        guestEmail: 'guest@example.com',
        amount: 250,
        refundId: 're_123',
        refundStatus: 'succeeded',
      },
    });
  });

  it('does not delete booking when refund fails', async () => {
    bookingFindUniqueMock.mockResolvedValueOnce({
      id: 'booking_2',
      propertyId: 'prop_1',
      stripeSessionId: 'cs_live_999',
      totalPrice: 180,
      guestEmail: 'guest2@example.com',
    });
    refundStripePaymentMock.mockResolvedValueOnce({
      id: 're_999',
      status: 'failed',
    });

    const { deleteBookingAndRefund } = await import('@/app/admin/properties/_actions');

    const result = await deleteBookingAndRefund('booking_2');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Stripe refund could not be confirmed');
    expect(bookingDeleteMock).not.toHaveBeenCalled();
    expect(blockedDateDeleteManyMock).not.toHaveBeenCalled();
    expect(bookingRefundAuditCreateMock).not.toHaveBeenCalled();
  });

  it('rejects booking deletion when booking does not exist', async () => {
    bookingFindUniqueMock.mockResolvedValueOnce(null);

    const { deleteBookingAndRefund } = await import('@/app/admin/properties/_actions');

    const result = await deleteBookingAndRefund('missing');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Booking not found');
    expect(refundStripePaymentMock).not.toHaveBeenCalled();
  });

  it('rejects booking deletion when stripeSessionId is missing', async () => {
    bookingFindUniqueMock.mockResolvedValueOnce({
      id: 'booking_3',
      propertyId: 'prop_1',
      stripeSessionId: '',
      totalPrice: 200,
      guestEmail: null,
    });

    const { deleteBookingAndRefund } = await import('@/app/admin/properties/_actions');

    const result = await deleteBookingAndRefund('booking_3');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Booking cannot be refunded: missing Stripe session id');
    expect(refundStripePaymentMock).not.toHaveBeenCalled();
  });
});
