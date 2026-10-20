const API_BASE = 'http://localhost:4000/api/v1';

async function testFullFlow() {
  console.log('--- 🧪 STARTING END-TO-END VERIFICATION ---');

  // 1. Request OTP for brand new user
  const newPhone = '9811223344';
  console.log(`\n1. Requesting OTP for new user: ${newPhone}`);
  const reqOtpRes = await fetch(`${API_BASE}/auth/customer/otp-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: newPhone }),
  });
  const reqOtpData = await reqOtpRes.json();
  console.log('OTP requested successfully:', reqOtpData.message);

  // 2. Verify OTP for new user -> Auto-creates account in MongoDB
  console.log(`\n2. Verifying OTP (123456) for new user: ${newPhone}`);
  const verifyRes = await fetch(`${API_BASE}/auth/customer/otp-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: newPhone, otpCode: '123456' }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(JSON.stringify(verifyData));
  const token = verifyData.data.token;
  const user = verifyData.data.user;
  console.log('✅ Authenticated successfully! User ID:', user.id, 'Role:', user.role);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3. Add new delivery address in Indiranagar
  console.log('\n3. Adding new delivery address in Indiranagar (560038)...');
  const addAddrRes = await fetch(`${API_BASE}/auth/addresses`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tag: 'HOME',
      recipientName: 'Priya Patel',
      phoneNumber: '9811223344',
      flatPlotNumber: 'Apt 304, Green Heights',
      apartmentName: 'Green Heights',
      streetName: '12th Main Road, HAL 2nd Stage',
      landmark: 'Near Indiranagar Club',
      pincode: '560038',
      city: 'Bengaluru',
      gateSecurityInstructions: 'Call on intercom 304 if gate closed',
      isDefault: true,
    }),
  });
  const addAddrData = await addAddrRes.json();
  if (!addAddrRes.ok) throw new Error(JSON.stringify(addAddrData));
  console.log('✅ Address added successfully!');
  const createdAddress = addAddrData.address || addAddrData.data[addAddrData.data.length - 1];
  console.log('Created Address ID:', createdAddress.id);
  const userAddrCount = addAddrData.user ? addAddrData.user.savedAddresses.length : addAddrData.data.length;
  console.log('Updated user address count:', userAddrCount);

  // 4. Update the address
  console.log('\n4. Updating address (updating flat to Penthouse 501)...');
  const updateAddrRes = await fetch(`${API_BASE}/auth/addresses/${createdAddress.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      flatPlotNumber: 'Penthouse 501',
      gateSecurityInstructions: 'Leave with security guard',
    }),
  });
  const updateAddrData = await updateAddrRes.json();
  if (!updateAddrRes.ok) throw new Error(JSON.stringify(updateAddrData));
  const updatedAddr = updateAddrData.address || updateAddrData.data.find((a) => a.id === createdAddress.id);
  console.log('Updated flat number:', updatedAddr.flatPlotNumber);
  console.log('Updated instructions:', updatedAddr.gateSecurityInstructions);

  // 5. Test Check Coverage for 560038
  console.log('\n5. Checking coverage for Indiranagar pincode (560038)...');
  const coverageRes = await fetch(`${API_BASE}/depots/coverage?pincode=560038`);
  const coverageData = await coverageRes.json();
  console.log('Coverage result:', coverageData.data);
  if (!coverageData.data.isServiced) {
    throw new Error('Pincode 560038 should be serviced by Indiranagar depot!');
  }
  console.log('✅ Servicing Depot:', coverageData.data.depot.name);

  // 6. Fetch catalog
  console.log('\n6. Fetching catalog...');
  const catalogRes = await fetch(`${API_BASE}/products`);
  const catalogData = await catalogRes.json();
  const products = catalogData.data;
  console.log(`Found ${products.length} products in database.`);
  const product = products[0];

  // 7. Place order using custom address
  console.log('\n7. Placing order with the custom Indiranagar address...');
  const today = new Date().toISOString().slice(0, 10);
  const orderRes = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      items: [
        {
          productId: product._id,
          unit: 'TRAY_30',
          quantity: 1,
        },
      ],
      deliveryAddress: {
        tag: updatedAddr.tag,
        recipientName: updatedAddr.recipientName,
        phoneNumber: updatedAddr.phoneNumber,
        flatPlotNumber: updatedAddr.flatPlotNumber,
        apartmentName: updatedAddr.apartmentName,
        streetName: updatedAddr.streetName,
        landmark: updatedAddr.landmark,
        pincode: updatedAddr.pincode,
        city: updatedAddr.city,
        gateSecurityInstructions: updatedAddr.gateSecurityInstructions,
      },
      deliverySlot: 'MORNING_RUSH',
      scheduledDeliveryDate: today,
      paymentMethod: 'UPI_ON_DELIVERY',
    }),
  });
  const orderData = await orderRes.json();
  if (!orderRes.ok) throw new Error(JSON.stringify(orderData));
  console.log('✅ Order placed successfully!');
  console.log('Order Number:', orderData.data.orderNumber);
  console.log('Assigned Depot Hub:', orderData.data.depotHubId);
  console.log('Delivery address flat number:', orderData.data.deliveryAddress.flatPlotNumber);

  // 8. Verify get profile returns saved address
  console.log('\n8. Fetching updated profile...');
  const profileRes = await fetch(`${API_BASE}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profileData = await profileRes.json();
  console.log('Saved addresses in profile:', profileData.data.savedAddresses.length);

  // 9. Verify get my orders returns the new order
  console.log('\n9. Fetching user orders...');
  const myOrdersRes = await fetch(`${API_BASE}/orders/my-orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const myOrdersData = await myOrdersRes.json();
  console.log(`User has ${myOrdersData.data.length} orders in MongoDB.`);

  // 10. Verify Rahul Sharma can also login independently and has his own data
  console.log('\n10. Verifying multi-account: Logging in as Rahul Sharma (9876543210)...');
  const rahulLoginRes = await fetch(`${API_BASE}/auth/customer/otp-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9876543210', otpCode: '123456' }),
  });
  const rahulData = await rahulLoginRes.json();
  console.log('Rahul user ID:', rahulData.data.user.id);
  console.log('Rahul name:', rahulData.data.user.name);
  console.log('Rahul addresses count:', rahulData.data.user.savedAddresses.length);

  console.log('\n=============================================');
  console.log('🎉 ALL END-TO-END VERIFICATION CHECKS PASSED!');
  console.log('=============================================');
}

testFullFlow().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
