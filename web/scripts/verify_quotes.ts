// Native fetch supported in Node 18+

async function verifyQuote() {
    const baseUrl = 'http://localhost:3000/api/v1/quotes';

    // Future dates
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 10);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2);

    const payload = {
        stay: {
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString(),
        },
        guests: {
            adults: 2,
            children: 0
        },
        ratePlanCode: "BAR",
        // roomTypeCodes: ["STANDARD"] // Optional, let's fetch all
    };

    try {
        console.log(`Testing Quote API: ${baseUrl}`);
        console.log('Payload:', JSON.stringify(payload, null, 2));

        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hotel-id': 'hotel1' // Mock context header if middleware allows or uses default
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error(`Status: ${res.status}`);
            console.error(await res.text());
            process.exit(1);
        }

        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (Array.isArray(data.quotes)) {
            console.log('✅ Quote API returns an array.');

            if (data.quotes.length > 0) {
                const quote = data.quotes[0];
                if (quote.quoteId && quote.total > 0 && quote.pricingSignature) {
                    console.log(`✅ Quote Valid: ID=${quote.quoteId}, Total=${quote.total}`);
                } else {
                    console.error('❌ Quote structure mismatch:', quote);
                    process.exit(1);
                }
            } else {
                console.warn('⚠️ No quotes found. Check Inventory availability for dates.');
            }
        } else {
            console.error('❌ API did not return "quotes" array.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
}

verifyQuote();
