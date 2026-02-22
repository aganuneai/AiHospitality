async function main() {
    const checkIn = new Date(); checkIn.setUTCHours(0, 0, 0, 0);
    checkIn.setDate(checkIn.getDate() + 2);
    const checkOut = new Date(checkIn); checkOut.setDate(checkOut.getDate() + 1);

    const payload = {
        checkIn: checkIn.toISOString(), checkOut: checkOut.toISOString(),
        channel: "DIRECT", source: "PHONE",
        holderName: "Test User", holderEmail: "test@test.com", holderPhone: "11999999999",
        rooms: [{ roomTypeId: "STD", ratePlanId: "BAR", adults: 2, children: 0 }],
        guaranteeType: "NONE", notes: "Admin test"
    };

    console.log("Payload:", JSON.stringify(payload, null, 2));
    const res = await fetch('http://localhost:3000/api/v1/admin/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(await res.json(), null, 2));
}
main().catch(console.error);
