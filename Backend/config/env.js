import dotenv from 'dotenv';
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5001),
  appName: process.env.APP_NAME || 'Smart Food Operations',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:3000',
  dbPath: process.env.DB_PATH || './smart-food-operations.sqlite',
  authMode: (process.env.AUTH_MODE || 'local').toLowerCase(),
  notificationsProvider: (process.env.NOTIFICATIONS_PROVIDER || 'none').toLowerCase(),
  llmEnabled: String(process.env.LLM_ENABLED || 'false').toLowerCase() === 'true',
};

const DEMO_MARKERS = ['change-me', 'local-demo-only', 'replace-with'];

export function requireSecret(name, { minLength = 32 } = {}) {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    throw new Error(`${name} must be configured and at least ${minLength} characters long.`);
  }
  if (env.nodeEnv === 'production' && DEMO_MARKERS.some(marker => value.toLowerCase().includes(marker))) {
    throw new Error(`${name} contains a demo/placeholder value and cannot be used in production.`);
  }
  return value;
}

export function validateRuntimeConfiguration() {
  requireSecret('JWT_SECRET');
  requireSecret('DELIVERY_LOCK_SECRET');

  if (!['local', 'ldap'].includes(env.authMode)) {
    throw new Error('AUTH_MODE must be either "local" or "ldap".');
  }

  if (env.authMode === 'ldap') {
    for (const name of ['LDAP_URL', 'LDAP_BASE_DN', 'LDAP_BIND_DN', 'LDAP_BIND_PASSWORD', 'LDAP_DOMAIN']) {
      if (!process.env[name]) throw new Error(`${name} is required when AUTH_MODE=ldap.`);
    }
  }

  if (!['none', 'firebase'].includes(env.notificationsProvider)) {
    throw new Error('NOTIFICATIONS_PROVIDER must be either "none" or "firebase".');
  }
  if (env.notificationsProvider === 'firebase' && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is required when NOTIFICATIONS_PROVIDER=firebase.');
  }

  if (env.llmEnabled && !process.env.LLM_API_KEY) {
    throw new Error('LLM_API_KEY is required when LLM_ENABLED=true.');
  }
}
