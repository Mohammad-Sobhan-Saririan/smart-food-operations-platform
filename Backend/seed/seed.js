import bcrypt from 'bcryptjs';
import jalaali from 'jalaali-js';
import { dbPromise } from '../db/db.js';

export const DEMO_PASSWORD = 'DemoPass!2026';

const products = [
  ['coffee-espresso', 'Espresso', 35000, 'Hot Bar', 'Short espresso with a rich crema', 40],
  ['coffee-latte', 'Cafe Latte', 52000, 'Hot Bar', 'Espresso with steamed milk', 35],
  ['tea-mint', 'Mint Tea', 28000, 'Hot Bar', 'Fresh mint herbal tea', 45],
  ['cold-iced-coffee', 'Iced Coffee', 58000, 'Cold Bar', 'Chilled coffee over ice', 30],
  ['cold-lemonade', 'Citrus Lemonade', 47000, 'Cold Bar', 'Fresh citrus and sparkling water', 25],
  ['cold-smoothie', 'Berry Smoothie', 69000, 'Cold Bar', 'Mixed berry smoothie', 20],
];

const demoUsers = [
  { id: 'demo-employee', name: 'Avery Employee', email: 'employee@example.test', employeeNumber: '1001', role: 'user', rstRoleId: 4, groupId: 1, companyId: 1, floorId: 1 },
  { id: 'demo-barista', name: 'Bailey Barista', email: 'barista@example.test', employeeNumber: '2001', role: 'barista', rstRoleId: 4, groupId: 1, companyId: 1, floorId: 2 },
  { id: 'demo-admin', name: 'Casey Admin', email: 'admin@example.test', employeeNumber: '3001', role: 'admin', rstRoleId: 1, groupId: 2, companyId: 1, floorId: 1 },
  { id: 'demo-manager', name: 'Drew Manager', email: 'manager@example.test', employeeNumber: '4001', role: 'user', rstRoleId: 2, groupId: 2, companyId: 2, floorId: 2 },
  { id: 'demo-delegate', name: 'Emery Delegate', email: 'delegate@example.test', employeeNumber: '5001', role: 'user', rstRoleId: 4, groupId: 1, companyId: 1, floorId: 3 },
];

function currentJalaliWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 6 ? 0 : day + 1;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() - diff);
  const j = jalaali.toJalaali(saturday);
  return `${j.jy}-${String(j.jm).padStart(2, '0')}-${String(j.jd).padStart(2, '0')}`;
}

export async function seedDatabase({ reset = true } = {}) {
  const { db } = await dbPromise;
  if (reset) {
    await db.exec('PRAGMA foreign_keys = OFF');
    const tables = [
      'fcm_tokens','reports','orders','rst_delivery_locks','rst_delegations','rst_reservations','rst_daily_options','rst_menus',
      'rst_daily_entitlements','users','products','floors','rst_dishes','rst_companies'
    ];
    for (const table of tables) await db.run(`DELETE FROM ${table}`);
    await db.exec("DELETE FROM sqlite_sequence WHERE name IN ('floors','rst_companies','rst_dishes','rst_menus','rst_daily_options','rst_reservations','rst_delivery_locks','rst_delegations')");
    await db.exec('PRAGMA foreign_keys = ON');
  }

  for (const floor of ['Lobby Pickup', 'North Wing', 'South Wing']) {
    await db.run('INSERT OR IGNORE INTO floors(name) VALUES (?)', [floor]);
  }
  for (const company of ['North Campus', 'Central Office', 'Innovation Hub']) {
    await db.run('INSERT OR IGNORE INTO rst_companies(name) VALUES (?)', [company]);
  }
  for (const [id, name, price, category, description, stock] of products) {
    await db.run(`
      INSERT OR REPLACE INTO products(id,name,price,category,imageUrl,rating,maxOrderPerUser,description,stock,isDisabled)
      VALUES(?,?,?,?,NULL,4.5,5,?,?,0)
    `, [id, name, price, category, description, stock]);
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const user of demoUsers) {
    await db.run(`
      INSERT OR REPLACE INTO users
      (id,name,email,password,position,creditLimit,creditBalance,role,employeeNumber,defaultFloorId,defaultCompanyId,isAdUser,adAttributes,entitlementGroupId,rst_roleId)
      VALUES(?,?,?,?,?,1000000,1000000,?,?,?,?,0,'{}',?,?)
    `, [user.id,user.name,user.email,hash,'Demo account',user.role,user.employeeNumber,user.floorId,user.companyId,user.groupId,user.rstRoleId]);
  }

  for (let day = 0; day < 7; day++) {
    await db.run(`INSERT OR REPLACE INTO rst_daily_entitlements(groupId,dayOfWeek,mealTypeId,dishCount) VALUES(1,?,2,1)`, [day]);
    await db.run(`INSERT OR REPLACE INTO rst_daily_entitlements(groupId,dayOfWeek,mealTypeId,dishCount) VALUES(2,?,2,2)`, [day]);
  }

  const dishes = [
    ['Herb Chicken Bowl',1], ['Vegetable Rice Bowl',1], ['Pasta Primavera',2],
    ['Roasted Vegetable Plate',2], ['Grilled Chicken Salad',3], ['Lentil Bowl',3],
  ];
  for (const [name, companyId] of dishes) {
    await db.run('INSERT OR IGNORE INTO rst_dishes(name,companyId,description,imageUrl) VALUES(?,?,?,NULL)', [name, companyId, 'Synthetic demo dish']);
  }

  const weekStart = currentJalaliWeekStart();
  for (let companyId = 1; companyId <= 3; companyId++) {
    const result = await db.run('INSERT OR IGNORE INTO rst_menus(weekStartDate,companyId) VALUES(?,?)', [weekStart, companyId]);
    const menu = await db.get('SELECT id FROM rst_menus WHERE weekStartDate=? AND companyId=?', [weekStart, companyId]);
    const companyDishes = await db.all('SELECT id FROM rst_dishes WHERE companyId=? ORDER BY id', [companyId]);
    for (let day = 0; day < 7; day++) {
      for (const dish of companyDishes) {
        await db.run('INSERT OR IGNORE INTO rst_daily_options(menuId,dayOfWeek,mealTypeId,dishId,isActive) VALUES(?,?,?,?,1)', [menu.id, day, 2, dish.id]);
      }
    }
  }

  await db.run(`
    INSERT OR REPLACE INTO rst_delegations(ownerId,delegateId,priority,startDate,endDate)
    VALUES('demo-manager','demo-delegate',1,NULL,NULL)
  `);

  await db.run("UPDATE configs SET isEnabled = 0 WHERE feature = 'creditSystem'");
  return { weekStart, users: demoUsers.map(({ id, name, employeeNumber, role }) => ({ id, name, employeeNumber, role })) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase({ reset: true })
    .then(result => { console.log('Synthetic demo database seeded.', result); process.exit(0); })
    .catch(error => { console.error(error); process.exit(1); });
}
