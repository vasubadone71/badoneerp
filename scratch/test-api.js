const fetch = require('node-fetch'); // wait, native fetch is in Node 18+

async function testLogin() {
  try {
    const response = await fetch('http://93.127.166.207:5002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'badonemotors', password: 'Honda@1699', rememberMe: false })
    });
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

testLogin();
