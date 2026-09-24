import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sfo-test-'));
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(tempDir, 'test.sqlite');
process.env.JWT_SECRET = 'test-only-jwt-secret-0123456789-abcdefgh';
process.env.DELIVERY_LOCK_SECRET = 'test-only-lock-secret-0123456789-abcdef';
process.env.AUTH_MODE = 'local';
process.env.NOTIFICATIONS_PROVIDER = 'none';
process.env.LLM_ENABLED = 'false';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.PUBLIC_APP_URL = 'http://localhost:3000';

let baseUrl;
let server;
let seeded;
let db;
let app;
let employeeCookie;
let delegateCookie;
let baristaCookie;
let adminCookie;
let managerCookie;
let orderId;
let orderClientId;

async function login(employeeNumber, password = 'DemoPass!2026') {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ employeeNumber, password }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie?.startsWith('token='));
  return { cookie, body };
}

async function request(url, { cookie, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (cookie) headers.set('cookie', cookie);
  return fetch(`${baseUrl}${url}`, { ...options, headers });
}

before(async () => {
  ({ default: app } = await import('../app.js'));
  const { seedDatabase } = await import('../seed/seed.js');
  ({ db } = await import('../db/db.js').then(m => m.dbPromise));
  seeded = await seedDatabase({ reset: true });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (db) await db.close();
  await fs.rm(tempDir, { recursive: true, force: true });
});

test('01 local demo authentication works', async () => {
  const result = await login('1001');
  employeeCookie = result.cookie;
  assert.equal(result.body.user.id, 'demo-employee');
  assert.equal(result.body.user.isAdUser, false);
});

test('02 additional demo roles authenticate locally', async () => {
  delegateCookie = (await login('5001')).cookie;
  baristaCookie = (await login('2001')).cookie;
  adminCookie = (await login('3001')).cookie;
  managerCookie = (await login('4001')).cookie;
  assert.ok(delegateCookie && baristaCookie && adminCookie && managerCookie);
});

test('03 order creation derives user and pricing server-side', async () => {
  orderClientId = `test-${Date.now()}`;
  const res = await request('/api/orders', {
    cookie: employeeCookie,
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      clientRequestId: orderClientId,
      employeeNumber: '3001',
      totalAmount: 1,
      deliveryFloorId: 1,
      items: [{ id: 'coffee-espresso', name: 'Tampered', price: 1, quantity: 2 }],
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 201, JSON.stringify(body));
  assert.equal(body.order.userId, 'demo-employee');
  assert.equal(body.order.totalAmount, 70000);
  const items = JSON.parse(body.order.items);
  assert.equal(items[0].name, 'Espresso');
  assert.equal(items[0].price, 35000);
  orderId = body.order.id;
});

test('04 order idempotency returns the existing order without duplicate stock change', async () => {
  const stockBefore = (await db.get("SELECT stock FROM products WHERE id='coffee-espresso'" )).stock;
  const res = await request('/api/orders', {
    cookie: employeeCookie, method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientRequestId: orderClientId, deliveryFloorId: 1, items: [{ id: 'coffee-espresso', quantity: 2 }] }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.alreadyExisted, true);
  assert.equal(body.order.id, orderId);
  const stockAfter = (await db.get("SELECT stock FROM products WHERE id='coffee-espresso'" )).stock;
  assert.equal(stockAfter, stockBefore);
});

test('05 another employee cannot read an order by id', async () => {
  const res = await request(`/api/orders/${orderId}`, { cookie: delegateCookie });
  assert.equal(res.status, 403);
});

test('06 order owner can read own order', async () => {
  const res = await request(`/api/orders/${orderId}`, { cookie: employeeCookie });
  assert.equal(res.status, 200);
});

test('07 barista can read employee orders for operations', async () => {
  const res = await request(`/api/orders/${orderId}`, { cookie: baristaCookie });
  assert.equal(res.status, 200);
});

test('08 admin can read employee orders for operations', async () => {
  const res = await request(`/api/orders/${orderId}`, { cookie: adminCookie });
  assert.equal(res.status, 200);
});

test('09 idempotency lookup also enforces ownership', async () => {
  const denied = await request(`/api/orders/by-client-request/${encodeURIComponent(orderClientId)}`, { cookie: delegateCookie });
  assert.equal(denied.status, 403);
  const allowed = await request(`/api/orders/by-client-request/${encodeURIComponent(orderClientId)}`, { cookie: employeeCookie });
  assert.equal(allowed.status, 200);
});

test('10 reservation within entitlement succeeds', async () => {
  const dish = await db.get('SELECT id FROM rst_dishes WHERE companyId=1 ORDER BY id LIMIT 1');
  const res = await request('/api/restaurant/reserve', {
    cookie: employeeCookie, method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      weekStartDate: seeded.weekStart, userRSTCompany: 1,
      reservations: [{ date: seeded.weekStart, mealTypeId: 2, dishId: dish.id, quantity: 1 }],
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
});

test('11 restaurant entitlement rejects over-allocation', async () => {
  const dish = await db.get('SELECT id FROM rst_dishes WHERE companyId=1 ORDER BY id LIMIT 1');
  const res = await request('/api/restaurant/reserve', {
    cookie: employeeCookie, method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      weekStartDate: seeded.weekStart, userRSTCompany: 1,
      reservations: [{ date: seeded.weekStart, mealTypeId: 2, dishId: dish.id, quantity: 2 }],
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400, JSON.stringify(body));
  assert.match(body.message, /سهمیه/);
});

test('12 delegation priority is maintained and returned in priority order', async () => {
  const add = await request('/api/restaurant/delegates', {
    cookie: managerCookie, method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ delegateId: 'demo-employee', priority: 1, startDate: null, endDate: null }),
  });
  assert.equal(add.status, 200);
  const list = await request('/api/restaurant/delegates', { cookie: managerCookie });
  assert.equal(list.status, 200);
  const rows = await list.json();
  assert.equal(rows[0].userId, 'demo-employee');
  assert.equal(rows[0].priority, 1);
  assert.equal(rows[1].userId, 'demo-delegate');
  assert.equal(rows[1].priority, 2);
});

test('13 delivery lock middleware awaits verification and exposes signed filters', async () => {
  const { signFilters } = await import('../utils/lockCode.js');
  const { extractLockFromRequest } = await import('../middleware/lockFromRequest.js');
  const filters = { companyId: 1, statusId: 1 };
  const token = signFilters(filters);
  await db.run(`INSERT INTO rst_delivery_locks(token,userId,filters,expiresAt,isRevoked) VALUES(?,?,?,?,0)`, [
    token, 'demo-admin', JSON.stringify(filters), new Date(Date.now() + 60000).toISOString(),
  ]);
  const req = { query: { lockCode: token }, headers: {} };
  await new Promise((resolve, reject) => extractLockFromRequest(req, {}, error => error ? reject(error) : resolve()));
  assert.equal(req.deliveryLock.enabled, true);
  assert.deepEqual(req.deliveryLock.filters, filters);
});

test('14 reporting allows safe SELECT through the protected endpoint', async () => {
  const res = await request('/api/reports/run', {
    cookie: adminCookie, method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sql_query: 'SELECT name, stock FROM products ORDER BY name LIMIT 2' }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.results.length, 2);
});

test('15 reporting rejects mutation SQL', async () => {
  const res = await request('/api/reports/run', {
    cookie: adminCookie, method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sql_query: "UPDATE products SET stock=0" }),
  });
  assert.equal(res.status, 400);
});

test('16 reporting rejects ATTACH and PRAGMA even when disguised around a SELECT', async () => {
  const { validateReadOnlySql } = await import('../security/readOnlySql.js');
  assert.throws(() => validateReadOnlySql("ATTACH DATABASE 'x' AS x"));
  assert.throws(() => validateReadOnlySql('PRAGMA table_info(users)'));
  assert.throws(() => validateReadOnlySql('SELECT 1; DELETE FROM products'));
  assert.doesNotThrow(() => validateReadOnlySql("SELECT 'delete is text' AS note"));
});

test('17 LLM schema context contains metadata but no real user rows or sensitive columns', async () => {
  const { getDatabaseSchema } = await import('../controllers/reportingController.js');
  const schema = await getDatabaseSchema();
  assert.match(schema, /TABLE: users/);
  assert.doesNotMatch(schema, /Avery Employee|employee@example\.test|DemoPass/);
  assert.doesNotMatch(schema, /password\s+TEXT|adAttributes\s+TEXT/i);
});

test('18 upload rejects unauthenticated requests', async () => {
  const form = new FormData();
  form.append('image', new Blob([Buffer.from([0x89,0x50,0x4e,0x47])], { type: 'image/png' }), 'x.png');
  const res = await request('/api/upload', { method: 'POST', body: form });
  assert.equal(res.status, 401);
});

test('19 upload rejects spoofed image MIME content', async () => {
  const form = new FormData();
  form.append('image', new Blob([Buffer.from('not a png')], { type: 'image/png' }), 'x.png');
  const res = await request('/api/upload', { cookie: baristaCookie, method: 'POST', body: form });
  assert.equal(res.status, 415);
});

test('20 upload rejects oversize content', async () => {
  const form = new FormData();
  form.append('image', new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'large.png');
  const res = await request('/api/upload', { cookie: baristaCookie, method: 'POST', body: form });
  assert.equal(res.status, 413);
});

test('21 disabled optional integrations do not contact external services', async () => {
  const { notifyRoles } = await import('../services/notificationService.js');
  const notificationResult = await notifyRoles(['admin'], { title: 'test', body: 'test' });
  assert.equal(notificationResult.skipped, true);

  const { generateValidSqlQuery } = await import('../services/reportingAgent.js');
  await assert.rejects(() => generateValidSqlQuery('TABLE: products', 'count products'), /disabled/);

  const { authenticateUser } = await import('../services/ADServices.js');
  assert.throws(() => authenticateUser('demo', 'demo'), /disabled/);
});

test('22 core application health endpoint works with all optional integrations disabled', async () => {
  const res = await request('/api/health');
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.app, 'Smart Food Operations');
});
