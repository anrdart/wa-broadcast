// Simple WebSocket test script
const WebSocket = require('ws');

console.log('🔌 Connecting to WebSocket at ws://localhost:3000...');

const ws = new WebSocket('ws://localhost:3000');

let qrReceived = false;

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
  console.log('⏳ Waiting for QR code...');
});

ws.on('message', function message(data) {
  try {
    const msg = JSON.parse(data);
    console.log('\n📨 Received message:', msg.type);

    if (msg.type === 'qr_code') {
      qrReceived = true;
      console.log('✅ QR Code received!');
      console.log('📱 QR Code length:', msg.qr?.length || 0);
      console.log('📱 QR Code preview:', msg.qr?.substring(0, 50) + '...');

      // Close after receiving QR code
      setTimeout(() => {
        console.log('\n✅ Test successful! QR code was generated and received.');
        ws.close();
        process.exit(0);
      }, 1000);
    } else {
      console.log('📄 Message data:', JSON.stringify(msg, null, 2));
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket disconnected');
  if (!qrReceived) {
    console.log('⚠️  No QR code was received - there might be an issue');
    process.exit(1);
  }
});

// Timeout after 15 seconds
setTimeout(() => {
  if (!qrReceived) {
    console.error('❌ Timeout: No QR code received after 15 seconds');
    ws.close();
    process.exit(1);
  }
}, 15000);
