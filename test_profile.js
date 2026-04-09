const http = require('http');

// First login to get the token
const loginData = JSON.stringify({
  email: 'test@example.com',
  password: 'password123'
});

const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

const req = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const loginResponse = JSON.parse(data);
    const token = loginResponse.token;

    console.log('Login successful, got token. Now testing profile endpoint...');

    // Now test the profile endpoint with the token
    const profileOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/profile',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const profileReq = http.request(profileOptions, (profileRes) => {
      console.log(`Profile Status: ${profileRes.statusCode}`);

      let profileData = '';
      profileRes.on('data', (chunk) => {
        profileData += chunk;
      });

      profileRes.on('end', () => {
        console.log('Profile Response:', profileData);
      });
    });

    profileReq.on('error', (e) => {
      console.error(`Problem with profile request: ${e.message}`);
    });

    profileReq.end();
  });
});

req.on('error', (e) => {
  console.error(`Problem with login request: ${e.message}`);
});

req.write(loginData);
req.end();