// Native fetch supported in Node 18+

async function verifyGuestSearch() {
    const baseUrl = 'http://localhost:3000/api/v1/admin/guests/search';
    const query = 'John'; // Assuming seed data or existing guest

    try {
        console.log(`Testing Guest Search: ${baseUrl}?q=${query}`);
        const res = await fetch(`${baseUrl}?q=${query}`);

        if (!res.ok) {
            console.error(`Status: ${res.status}`);
            console.error(await res.text());
            process.exit(1);
        }

        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (Array.isArray(data.guests)) {
            console.log('✅ Guest Search API returns an array.');

            if (data.guests.length > 0) {
                const guest = data.guests[0];
                if (guest.firstName && guest.email) {
                    console.log('✅ Guest structure is correct (firstName, email).');
                } else {
                    console.error('❌ Guest structure mismatch:', guest);
                }
            } else {
                console.warn('⚠️ No guests found. Verify seed data if this is unexpected.');
            }
        } else {
            console.error('❌ API did not return "guests" array.');
            process.exit(1);
        }

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
}

verifyGuestSearch();
