import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
export function requireLocalQa(env = process.env) {
  const base = new URL(env.BASE_URL || 'http://localhost:8721');
  const backend = new URL(env.QA_SUPABASE_URL || 'http://invalid');
  if (env.QA_ALLOW_MUTATIONS !== 'local-only' || !loopback.has(base.hostname)
      || !loopback.has(backend.hostname) || backend.port !== '54321'
      || base.protocol !== 'http:' || backend.protocol !== 'http:') {
    throw new Error('Mutating QA requires explicit local-only opt-in, a loopback app, and local Supabase port 54321.');
  }
  if (!env.QA_SUPABASE_SERVICE_ROLE_KEY) throw new Error('Local QA cleanup credentials are required.');
  return { base: base.origin, backend: backend.origin };
}

export async function createQaSandbox(env = process.env, clientFactory = createClient) {
  const { base, backend } = requireLocalQa(env);
  const client = clientFactory(backend, env.QA_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const run = randomUUID();
  const email = `style.qa.${run}@example.invalid`, password = `Qa-${randomUUID()}!`;
  const productId = randomUUID();
  let userId;
  let productCreated = false;
  const checked = async request => { const result = await request; if (result.error) throw new Error('Local QA database operation failed'); return result; };
  const cleanup = async () => {
    const failures = [];
    const attempt = async operation => { try { await operation(); } catch { failures.push('Local QA cleanup operation failed'); } };
    if (userId) {
      await attempt(async () => {
        const { data: orders } = await checked(client.from('orders').select('id').eq('user_id', userId));
        for (const order of orders || []) await checked(client.from('order_items').delete().eq('order_id', order.id));
        await checked(client.from('orders').delete().eq('user_id', userId));
      });
      for (const table of ['cart', 'favorites', 'reviews']) {
        await attempt(() => checked(client.from(table).delete().eq('user_id', userId)));
      }
    }
    if (productCreated) await attempt(() => checked(client.from('furniture').delete().eq('id', productId)));
    if (userId && failures.length === 0) {
      await attempt(() => checked(client.from('profiles').delete().eq('id', userId)));
      if (failures.length === 0) await attempt(() => checked(client.auth.admin.deleteUser(userId)));
    }
    if (failures.length) throw new AggregateError(failures.map(message => new Error(message)), 'Local QA cleanup incomplete');
  };
  try {
    const { data } = await checked(client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username: 'Style QA' } }));
    userId = data.user?.id;
    if (!userId) throw new Error('Local QA user creation returned no ID');
    productCreated = true;
    await checked(client.from('furniture').insert({ id: productId, name: `Style QA ${run}`, price: 100, category: 'Chair', is_deleted: false }));
  } catch (error) {
    try { await cleanup(); } catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Local QA setup and cleanup failed'); }
    throw error;
  }
  return {
    base, backend, email, password, productId, cleanup,
    allowRequest(raw) {
      const url = new URL(raw);
      return ['data:', 'blob:', 'about:'].includes(url.protocol) || url.origin === base || url.origin === backend;
    },
  };
}
