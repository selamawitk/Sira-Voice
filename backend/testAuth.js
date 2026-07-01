const fetch = global.fetch;
const base = process.env.TEST_API_URL || 'http://localhost:5002/api';
const password = process.env.TEST_PASSWORD || 'Test1234!';
const body = {
  fullName: 'Auth Test',
  phone: '+251' + Math.floor(100000000 + Math.random() * 899999999),
  email: `test+${Date.now()}@example.com`,
  password,
  role: 'worker',
};
(async () => {
  try {
    const reg = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const regJson = await reg.json();
    console.log('register', reg.status, regJson.success, regJson.message || regJson);
    if (!regJson.success) return;
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginJson = await login.json();
    console.log('login', login.status, loginJson.success, loginJson);
    const token = loginJson?.data?.token;
    if (!token) return;
    const me = await fetch(`${base}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const meJson = await me.json();
    console.log('me', me.status, meJson);
  } catch (e) {
    console.error(e);
  }
})();
