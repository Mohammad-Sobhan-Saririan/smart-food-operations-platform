import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReadOnlySql } from '../security/readOnlySql.js';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(backend, '..');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.next') return [];
    return entry.isDirectory() ? walk(p) : [p];
  });
}

function textFiles() {
  const self = fileURLToPath(import.meta.url);
  return walk(root).filter(file => file !== self && (/\.(js|ts|tsx|json|md|css|mjs|example|gitignore)$/.test(file) || path.basename(file).startsWith('.env')));
}


test('read-only SQL accepts SELECT and WITH SELECT', () => {
  assert.equal(validateReadOnlySql('SELECT name FROM products'), 'SELECT name FROM products');
  assert.equal(validateReadOnlySql('WITH p AS (SELECT id FROM products) SELECT * FROM p'), 'WITH p AS (SELECT id FROM products) SELECT * FROM p');
});

test('read-only SQL rejects mutations and schema operations', () => {
  for (const sql of ['UPDATE products SET stock=0', 'DELETE FROM orders', 'DROP TABLE users', 'CREATE TABLE x(a)', 'ALTER TABLE users ADD x']) {
    assert.throws(() => validateReadOnlySql(sql));
  }
});

test('read-only SQL rejects ATTACH, PRAGMA and multiple statements', () => {
  for (const sql of ["ATTACH DATABASE 'x' AS x", 'PRAGMA table_info(users)', 'SELECT 1; DELETE FROM users']) {
    assert.throws(() => validateReadOnlySql(sql));
  }
});

test('SQL keyword-like text inside string literals is not misclassified', () => {
  assert.doesNotThrow(() => validateReadOnlySql("SELECT 'delete drop pragma' AS harmless"));
});

test('organization-specific infrastructure markers are absent from public text files', () => {
  const forbidden = [/firebaseapp\.com/i, /firebasestorage\.googleapis\.com/i];
  for (const file of textFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${pattern} found in ${file}`);
  }
});

test('hardcoded credential-like and hosted project identifiers are absent', () => {
  const forbidden = [/AIza[0-9A-Za-z_-]{20,}/, /firebaseapp\.com/i, /firebasestorage\.googleapis\.com/i, /BEGIN (?:RSA |EC )?PRIVATE KEY/];
  for (const file of textFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${pattern} found in ${file}`);
  }
});

test('gitignore excludes local dependencies, builds, databases, logs, and credentials', () => {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  for (const requiredPattern of [
    'node_modules/',
    '.next/',
    '*.sqlite',
    '*.sqlite3',
    '*.db',
    '*.log',
    '.env',
    '*service-account*.json',
    'uploads/',
  ]) {
    assert.ok(
      gitignore.includes(requiredPattern),
      `Missing .gitignore rule: ${requiredPattern}`
    );
  }
});

test('questionable company/font/archive assets are removed', () => {
  const paths = walk(root).map(p => p.toLowerCase());
  assert.ok(!paths.some(p => p.endsWith('.ttf') || p.endsWith('.woff') || p.endsWith('.woff2')));
  assert.ok(!paths.some(p => p.endsWith('.tgz')));
  assert.ok(!paths.some(p => /(?:company|brand)[-_]?logo/i.test(p)));
});


test('security-sensitive dependency baseline uses remediated versions', () => {
  const backendPackage = JSON.parse(fs.readFileSync(path.join(backend, 'package.json'), 'utf8'));
  const frontendPackage = JSON.parse(fs.readFileSync(path.join(root, 'Frontend/cafe-pwa/package.json'), 'utf8'));

  assert.equal(backendPackage.dependencies.sqlite3, '6.0.1');
  assert.equal(backendPackage.dependencies['firebase-admin'], '14.5.0');
  assert.ok(!('html2pdf.js' in frontendPackage.dependencies));
  assert.equal(
    frontendPackage.dependencies.xlsx,
    'https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz'
  );
  assert.match(backendPackage.engines.node, />=22/);
  assert.match(frontendPackage.engines.node, />=22/);
});

test('optional integrations default to disabled in env examples', () => {
  const backendEnv = fs.readFileSync(path.join(backend, '.env.example'), 'utf8');
  const frontendEnv = fs.readFileSync(path.join(root, 'Frontend/cafe-pwa/.env.example'), 'utf8');
  assert.match(backendEnv, /^AUTH_MODE=local$/m);
  assert.match(backendEnv, /^NOTIFICATIONS_PROVIDER=none$/m);
  assert.match(backendEnv, /^LLM_ENABLED=false$/m);
  assert.match(frontendEnv, /^NEXT_PUBLIC_NOTIFICATIONS_PROVIDER=none$/m);
});
