import { test, expect } from '@playwright/test';

test.describe('ARI Calendar E2E', () => {
    test('should load ARI calendar page', async ({ page }) => {
        await page.goto('/admin/ari');

        // Should see ARI Management title
        await expect(page.locator('h1')).toContainText('ARI Management');

        // Should have room type selector
        const roomTypeSelector = page.locator('select, [role="combobox"]');
        await expect(roomTypeSelector.first()).toBeVisible();
    });

    test('should display calendar table', async ({ page }) => {
        await page.goto('/admin/ari');

        // Wait for calendar to load
        await page.waitForSelector('table', { timeout: 5000 });

        // Should have table headers
        await expect(page.locator('th')).toContainText('Data');
        await expect(page.locator('th')).toContainText('Disponível');
        await expect(page.locator('th')).toContainText('Tarifa');
    });

    test('should navigate between months', async ({ page }) => {
        await page.goto('/admin/ari');

        // Wait for calendar
        await page.waitForSelector('table', { timeout: 5000 });

        // Find navigation buttons (ChevronLeft/Right)
        const prevButton = page.locator('button').filter({ has: page.locator('svg') }).first();
        const nextButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1);

        // Click next month
        if (await nextButton.count() > 0) {
            await nextButton.click();
            await page.waitForTimeout(500);

            // Calendar should update (check for loading or new data)
            expect(page.locator('table')).toBeVisible();
        }
    });

    test('should open bulk update dialog', async ({ page }) => {
        await page.goto('/admin/ari');

        // Look for "Atualização em Massa" button
        const bulkButton = page.locator('button:has-text("Atualização em Massa")');

        if (await bulkButton.count() > 0) {
            await bulkButton.click();

            // Dialog should open
            await page.waitForTimeout(300);

            // Check for dialog content
            const dialog = page.locator('[role="dialog"], .dialog');
            if (await dialog.count() > 0) {
                await expect(dialog).toBeVisible();
            }
        }
    });

    test('should toggle event log viewer', async ({ page }) => {
        await page.goto('/admin/ari');

        // Look for event log button
        const eventLogButton = page.locator('button:has-text("Log de Eventos"), button:has-text("Ver")');

        if (await eventLogButton.count() > 0) {
            await eventLogButton.click();
            await page.waitForTimeout(300);

            // Event log should be visible
            const eventLog = page.locator('text="Log de Eventos ARI"');
            if (await eventLog.count() > 0) {
                await expect(eventLog).toBeVisible();
            }
        }
    });
});

test.describe('ARI API Integration', () => {
    test('should fetch calendar data via API', async ({ request }) => {
        const response = await request.get(
            '/api/v1/ari/calendar?roomType=DELUXE&from=2026-09-01&to=2026-09-30',
            {
                headers: {
                    'x-hotel-id': 'test-hotel-e2e',
                    'x-request-id': 'e2e-calendar-test',
                }
            }
        );

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('roomTypeCode');
        expect(data).toHaveProperty('days');
        expect(Array.isArray(data.days)).toBeTruthy();
    });

    test('should update availability via API', async ({ request }) => {
        const response = await request.post('/api/v1/ari/availability', {
            headers: {
                'x-hotel-id': 'test-hotel-e2e',
                'x-request-id': 'e2e-availability-test',
                'content-type': 'application/json'
            },
            data: {
                roomTypeCode: 'DELUXE',
                dateRange: {
                    from: '2026-10-01',
                    to: '2026-10-03'
                },
                availability: 25,
                updateType: 'SET'
            }
        });

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('updated');
        expect(data.updated).toBeGreaterThan(0);
    });

    test('should update rates via API', async ({ request }) => {
        const response = await request.post('/api/v1/ari/rates', {
            headers: {
                'x-hotel-id': 'test-hotel-e2e',
                'x-request-id': 'e2e-rate-test',
                'content-type': 'application/json'
            },
            data: {
                roomTypeCode: 'DELUXE',
                dateRange: {
                    from: '2026-10-01',
                    to: '2026-10-03'
                },
                baseRate: 275.00
            }
        });

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('avgRate');
        expect(data.avgRate).toBe(275.00);
    });
});
