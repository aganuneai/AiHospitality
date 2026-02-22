// Native fetch in Node 18+

async function run() {
    try {
        const res = await fetch('http://localhost:3000/api/v1/quotes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hotel-id': 'HOTEL_001',
                'x-domain': 'PROPERTY'
            },
            body: JSON.stringify({
                stay: {
                    checkIn: '2026-02-15',
                    checkOut: '2026-02-20',
                    adults: 2,
                    children: 0
                }
            })
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text.substring(0, 500)); // First 500 chars
    } catch (e) {
        console.error(e);
    }
}

run();
