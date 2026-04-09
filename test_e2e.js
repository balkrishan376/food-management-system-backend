const API_URL = 'http://localhost:5000/api';

async function runTest() {
  try {
    console.log('--- STARTING E2E TEST ---');

    const randomSuffix = Math.floor(Math.random() * 100000);
    const donorEmail = `donor${randomSuffix}@test.com`;
    const receiverEmail = `receiver${randomSuffix}@test.com`;

    // 1. Register Donor
    console.log(`\nRegistering Donor (${donorEmail})...`);
    let res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Donor', email: donorEmail, password: 'password123', role: 'donor', contactNumber: '1234567890'
      })
    });
    if (!res.ok) throw new Error(await res.text());
    let data = await res.json();
    const donorToken = data.token;
    console.log('Donor registered successfully! Token:', donorToken.substring(0, 20) + '...');

    // 2. Add Donation as Donor
    console.log('\nCreating food donation...');
    res = await fetch(`${API_URL}/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${donorToken}` },
      body: JSON.stringify({
        foodType: 'veg', quantity: '50 Box Meals', description: 'Fresh vegetarian meals',
        address: 'Downtown, City Plaza', longitude: 77.209, latitude: 28.6139,
        expiryTime: new Date(Date.now() + 86400000).toISOString()
      })
    });
    if (!res.ok) throw new Error(await res.text());
    data = await res.json();
    const donationId = data._id;
    console.log('Donation created! ID:', donationId);

    // 3. Register Receiver
    console.log(`\nRegistering Receiver (${receiverEmail})...`);
    res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Receiver', email: receiverEmail, password: 'password123', role: 'receiver',
        contactNumber: '0987654321', organization: 'Helping Hands NGO'
      })
    });
    if (!res.ok) throw new Error(await res.text());
    data = await res.json();
    const receiverToken = data.token;
    console.log('Receiver registered successfully! Token:', receiverToken.substring(0, 20) + '...');

    // 4. Fetch Nearby Donations as Receiver
    console.log('\nFetching nearby donations...');
    res = await fetch(`${API_URL}/donations/nearby?lat=28.6139&lng=77.209&radius=15`, {
      headers: { Authorization: `Bearer ${receiverToken}` }
    });
    if (!res.ok) throw new Error(await res.text());
    data = await res.json();
    const donations = data.data;
    console.log(`Found ${data.count} donations nearby.`);
    
    const targetDonation = donations.find((d) => d._id === donationId);
    if (!targetDonation) throw new Error('Created donation not found in nearby fetch!');
    console.log('Successfully located the created donation in the nearby search list.');

    // 5. Claim the Donation
    console.log('\nClaiming the donation...');
    res = await fetch(`${API_URL}/donations/${donationId}/claim`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${receiverToken}` }
    });
    if (!res.ok) throw new Error(await res.text());
    data = await res.json();
    console.log('Donation claimed! Status:', data.donation.status);

    console.log('\n--- E2E TEST COMPLETED SUCCESSFULLY ---');
  } catch (error) {
    console.error('\n!!! TEST FAILED !!!', error.message || error);
  }
}

runTest();
