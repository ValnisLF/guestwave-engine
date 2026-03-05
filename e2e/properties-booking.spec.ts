/// <reference types="node" />

import { expect, test, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const hasDatabase = Boolean(process.env.DATABASE_URL);

const slug = `e2e-property-${Date.now()}`;
let propertyId = '';

function toInputDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function atNoon(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function fillValidDates(page: Page, startOffsetDays = 1) {
  const tomorrow = atNoon(new Date());
  tomorrow.setDate(tomorrow.getDate() + startOffsetDays);

  const checkout = new Date(tomorrow);
  checkout.setDate(checkout.getDate() + 2);

  await page.getByLabel('Check-in').fill(toInputDate(tomorrow));
  await page.getByLabel('Check-out').fill(toInputDate(checkout));
}

async function fillDates(page: Page, checkIn: Date, checkOut: Date) {
  await page.getByLabel('Check-in').fill(toInputDate(checkIn));
  await page.getByLabel('Check-out').fill(toInputDate(checkOut));
}

async function findCalendarDayButton(page: Page, date: Date) {
  const dateKey = toInputDate(date);
  for (let i = 0; i < 4; i++) {
    const button = page.locator(`button[data-date="${dateKey}"]`).first();
    if (await button.count()) {
      return button;
    }
    await page.getByRole('button', { name: 'Next month' }).click();
  }

  throw new Error(`Unable to find calendar day button for ${dateKey}`);
}

test.describe('Public properties booking flow', () => {
  test.skip(!hasDatabase, 'DATABASE_URL is required for Playwright E2E tests');

  test.beforeAll(async () => {
    const property = await prisma.property.create({
      data: {
        name: 'E2E Ocean Villa',
        slug,
        description: 'Property created by Playwright test',
        amenities: {
          wifi: true,
          pool: true,
        },
        basePrice: 100,
        cleaningFee: 20,
        minimumStay: 2,
        depositPercentage: 30,
      },
    });

    propertyId = property.id;
  });

  test.afterAll(async () => {
    if (propertyId) {
      await prisma.blockedDate.deleteMany({ where: { propertyId } });
      await prisma.booking.deleteMany({ where: { propertyId } });
      await prisma.seasonRate.deleteMany({ where: { propertyId } });
      await prisma.property.delete({ where: { id: propertyId } });
    }

    await prisma.$disconnect();
  });

  test('lists properties and navigates to detail', async ({ page }) => {
    await page.goto('/properties');

    await expect(page.getByRole('heading', { name: 'Discover Our Properties' })).toBeVisible();
    await expect(page.getByRole('link', { name: /E2E Ocean Villa/i })).toBeVisible();

    await page.getByRole('link', { name: /E2E Ocean Villa/i }).click();

    await expect(page).toHaveURL(new RegExp(`/properties/${slug}$`));
    await expect(page.getByRole('heading', { name: 'E2E Ocean Villa' })).toBeVisible();
  });

  test('calculates price and validates guest data before checkout', async ({ page }) => {
    await page.goto(`/properties/${slug}`);

    await fillValidDates(page);

    await expect(page.getByText('Total')).toBeVisible();
    await expect(page.getByText('$220')).toBeVisible();
    await expect(page.getByText(/Due now/i).locator('..').getByText('$66')).toBeVisible();

    const bookNowButton = page.getByRole('button', { name: 'Book Now' });
    await expect(bookNowButton).toBeEnabled();

    await bookNowButton.click();
    await expect(page.getByText('Please enter your name and email to continue')).toBeVisible();
  });

  test('completes checkout and shows success banner (mock mode)', async ({ page }) => {
    await page.goto(`/properties/${slug}`);
    await fillValidDates(page, 4);

    await page.getByLabel('Guest name').fill('E2E Success Guest');
    await page.getByLabel('Email').fill('success@example.com');

    await page.getByRole('button', { name: 'Book Now' }).click();

    await expect(page).toHaveURL(new RegExp(`/properties/${slug}\\?checkout=success&bookingId=`));
    await expect(page.getByText('Booking created and payment completed successfully.')).toBeVisible();
  });

  test('shows checkout error when mock checkout fails', async ({ page }) => {
    await page.goto(`/properties/${slug}`);
    await fillValidDates(page, 8);

    await page.getByLabel('Guest name').fill('E2E Failure Guest');
    await page.getByLabel('Email').fill('fail@example.com');

    await page.getByRole('button', { name: 'Book Now' }).click();

    await expect(page.getByText('Mock checkout failure')).toBeVisible();
  });

  test('blocks check-in night and keeps check-out day available in calendar', async ({ page }) => {
    await page.goto(`/properties/${slug}`);

    const checkIn = addDays(atNoon(new Date()), 12);
    const checkOut = addDays(checkIn, 3);

    await fillDates(page, checkIn, checkOut);

    await page.getByLabel('Guest name').fill('E2E Calendar Semantics Guest');
    await page.getByLabel('Email').fill('calendar-semantics@example.com');

    await page.getByRole('button', { name: 'Book Now' }).click();

    await expect(page).toHaveURL(new RegExp(`/properties/${slug}\\?checkout=success&bookingId=`));

    const checkInButton = await findCalendarDayButton(page, checkIn);
    await expect(checkInButton).toBeDisabled();

    const checkOutButton = await findCalendarDayButton(page, checkOut);
    await expect(checkOutButton).toBeEnabled();
  });

  test('rejects booking when check-in date is in the past', async ({ page }) => {
    await page.goto(`/properties/${slug}`);

    const yesterday = addDays(atNoon(new Date()), -1);
    const tomorrow = addDays(atNoon(new Date()), 1);

    await fillDates(page, yesterday, tomorrow);

    await page.getByLabel('Guest name').fill('E2E Past Date Guest');
    await page.getByLabel('Email').fill('past-date@example.com');

    const yesterdayCalendarButton = await findCalendarDayButton(page, yesterday);
    await expect(yesterdayCalendarButton).toBeDisabled();

    await expect(page.getByText('Check-in date cannot be in the past')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Book Now' })).toBeDisabled();
    await expect(page).toHaveURL(new RegExp(`/properties/${slug}$`));
  });
});
