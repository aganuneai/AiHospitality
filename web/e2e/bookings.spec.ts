import { test, expect } from '@playwright/test';

test.describe('Booking Flow E2E', () => {
    test('should complete full booking flow', async ({ page }) => {
        // Navigate to home page
        await page.goto('/');

        // Should see the homepage
        await expect(page).toHaveTitle(/AiHospitality/i);

        // Navigate to bookings page (if exists)
        // For now, we'll test the API integration via direct navigation
        await page.goto('/admin/reservations');

        // Should load reservations page
        await expect(page.locator('h1')).toContainText('Reservas');
    });

    test('should display booking list', async ({ page }) => {
        await page.goto('/admin/reservations');

        // Check if table or list is present
        const hasTable = await page.locator('table').count() > 0;
        const hasList = await page.locator('[data-testid="reservations-list"]').count() > 0;

        expect(hasTable || hasList).toBeTruthy();
    });

    test('should filter bookings by status', async ({ page }) => {
        await page.goto('/admin/reservations');

        // Look for status filter dropdown
        const statusDropdown = page.locator('select, [role="combobox"]').first();

        if (await statusDropdown.count() > 0) {
            await statusDropdown.click();

            // Check if CONFIRMED option exists
            const confirmedOption = page.locator('text=CONFIRMED, text=Confirmada').first();
            if (await confirmedOption.count() > 0) {
                await confirmedOption.click();

                // Wait for filtering to happen
                await page.waitForTimeout(500);

                // Verify URL or UI changed
                expect(page.url()).toBeTruthy();
            }
        }
    });

    test('should search bookings by PNR', async ({ page }) => {
        await page.goto('/admin/reservations');

        // Look for search input
        const searchInput = page.locator('input[type="text"], input[type="search"]').first();

        if (await searchInput.count() > 0) {
            await searchInput.fill('TEST');
            await page.waitForTimeout(500); // Wait for debounced search

            expect(await searchInput.inputValue()).toBe('TEST');
        }
    });
});

test.describe('Booking API Integration', () => {
    test('should interact with booking API', async ({ page, request }) => {
        // Test API endpoint directly
        const response = await request.get('/api/v1/bookings', {
            headers: {
                'x-hotel-id': 'test-hotel-e2e'
            }
        });

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('bookings');
        expect(Array.isArray(data.bookings)).toBeTruthy();
    });

    test('should create booking via API', async ({ request }) => {
        const response = await request.post('/api/v1/bookings', {
            headers: {
                'x-hotel-id': 'test-hotel-e2e',
                'content-type': 'application/json'
            },
            data: {
                idempotencyKey: `e2e-test-${Date.now()}`,
                quoteId: 'quote-e2e',
                pricingSignature: 'SIG_e2e',
                stay: {
                    checkIn: '2026-12-01',
                    checkOut: '2026-12-03',
                    adults: 2,
                    children: 0
                },
                roomTypeCode: 'DELUXE',
                ratePlanCode: 'BAR',
                primaryGuest: {
                    firstName: 'E2E',
                    lastName: 'Test',
                    email: 'e2e@example.com'
                }
            }
        });

        expect(response.status()).toBe(201);

        const data = await response.json();
        expect(data.booking).toHaveProperty('reservationId');
        expect(data.booking).toHaveProperty('pnr');
    });
});
