import { beforeEach, describe, expect, it, vi } from 'vitest';

const propertyFindUniqueMock = vi.fn();
const propertyUpdateMock = vi.fn();
const propertyDeleteMock = vi.fn();
const bookingCountMock = vi.fn();

vi.mock('@infra/prisma', () => ({
  prisma: {
    property: {
      findUnique: propertyFindUniqueMock,
      update: propertyUpdateMock,
      delete: propertyDeleteMock,
    },
    booking: {
      count: bookingCountMock,
    },
  },
}));

vi.mock('@infra/ical/sync', () => ({
  syncAllIcalInputs: vi.fn(),
  syncPropertyIcal: vi.fn(),
  syncPropertyIcalCalendar: vi.fn(),
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
});
