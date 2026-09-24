import app from './app.js';
import { dbPromise } from './db/db.js';
import { env, validateRuntimeConfiguration } from './config/env.js';

export async function startServer() {
  validateRuntimeConfiguration();
  await dbPromise;
  return app.listen(env.port, () => {
    console.log(`${env.appName} backend listening on http://localhost:${env.port}`);
    console.log(`Auth: ${env.authMode}; notifications: ${env.notificationsProvider}; LLM: ${env.llmEnabled ? 'enabled' : 'disabled'}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch(error => {
    console.error('Failed to start backend:', error.message);
    process.exit(1);
  });
}
