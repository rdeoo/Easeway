import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync } from 'node:fs';

// Replace only Supabase session storage; exercise the real service and HTTP client.
const serviceUrl = new URL('../src/services/commutes.ts', import.meta.url).href;
const apiUrl = new URL('../src/services/api.ts', import.meta.url).href;
const authUrl = 'test:commutes-auth';
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === serviceUrl) {
      if (specifier === '../lib/supabase') return { url: authUrl, shortCircuit: true };
      if (specifier === './api') return nextResolve(apiUrl, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    // The existing ApiError constructor uses parameter properties, requiring transformation.
    if (url === apiUrl) return {
      format: 'module', shortCircuit: true,
      source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform' }),
    };
    if (url === authUrl) return {
      format: 'module', shortCircuit: true,
      source: 'export const supabase = { auth: { getSession: async () => globalThis.__commuteTestAuth } };',
    };
    return nextLoad(url, context);
  },
});
const { getCommute, updateCommute, listCommutes, removeCommute } = await import(serviceUrl);
const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const record = {
  id: 42, name: 'Work', origin_address: 'Origin', destination_address: 'Destination',
  days_of_week: [0, 1], arrival_time: '08:30:00', arrival_buffer_minutes: 10,
  estimated_duration_seconds: 3000, travel_mode: 'drive',
};
let requests;
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://test.invalid:8000';
  globalThis.__commuteTestAuth = { data: { session: { access_token: 'test-token' } }, error: null };
  requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return Response.json(record);
  };
});
after(() => {
  hooks.deregister();
  globalThis.fetch = originalFetch;
  delete globalThis.__commuteTestAuth;
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

test('single-record read uses bearer auth and maps the backend response', async () => {
  const controller = new AbortController();
  const commute = await getCommute('42', controller.signal);
  assert.equal(requests[0].url, 'http://test.invalid:8000/commutes/42');
  assert.equal(requests[0].method, 'GET');
  assert.equal(requests[0].headers.Authorization, 'Bearer test-token');
  assert.equal(requests[0].signal, controller.signal);
  assert.deepEqual(commute, {
    id: '42', name: 'Work', origin: 'Origin', destination: 'Destination',
    days: [7, 1], arrivalTime: '08:30', bufferMinutes: 10,
    estimatedDurationSeconds: 3000, travelMode: 'driving',
  });
});

test('PATCH sends only supplied fields, preserving zero buffer and weekday/mode mappings', async () => {
  await updateCommute('42', { days: [7, 1], bufferMinutes: 0, travelMode: 'bicycling' });
  assert.equal(requests[0].method, 'PATCH');
  assert.equal(requests[0].url, 'http://test.invalid:8000/commutes/42');
  assert.equal(requests[0].headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(requests[0].body), {
    days_of_week: [0, 1], arrival_buffer_minutes: 0, travel_mode: 'bike',
  });
});

test('PATCH maps all editable form fields and uses the returned saved values', async () => {
  const commute = await updateCommute('42', {
    name: 'Updated', origin: 'New origin', destination: 'New destination', days: [2],
    arrivalTime: '09:00', bufferMinutes: 20, travelMode: 'walking',
  });
  assert.deepEqual(JSON.parse(requests[0].body), {
    name: 'Updated', origin_address: 'New origin', destination_address: 'New destination',
    days_of_week: [2], arrival_time: '09:00', arrival_buffer_minutes: 20, travel_mode: 'walk',
  });
  assert.equal(commute.name, record.name);
  assert.equal(commute.estimatedDurationSeconds, record.estimated_duration_seconds);
});

test('signed-out reads and updates fail before making HTTP requests', async () => {
  globalThis.__commuteTestAuth.data.session = null;
  await assert.rejects(getCommute('42'), /Sign in/);
  await assert.rejects(updateCommute('42', { name: 'Updated' }), /Sign in/);
  assert.equal(requests.length, 0);
});

test('read/update errors propagate; retry can recover after an upstream failure', async () => {
  globalThis.fetch = async () => Response.json({ detail: 'Commute not found' }, { status: 404 });
  await assert.rejects(getCommute('42'), error => error.status === 404 && /not found/.test(error.message));
  globalThis.fetch = async () => Response.json({ detail: 'Could not save' }, { status: 502 });
  await assert.rejects(updateCommute('42', { name: 'Updated' }), error => error.status === 502);
  globalThis.fetch = async () => Response.json(record);
  assert.equal((await getCommute('42')).id, '42');
});

test('empty successful responses are rejected instead of reporting a saved commute', async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 });
  await assert.rejects(getCommute('42'), /empty response/);
  await assert.rejects(updateCommute('42', { name: 'Updated' }), /empty response/);
});

test('backend validation errors retain their field-specific messages', async () => {
  globalThis.fetch = async () => Response.json({ detail: [
    { loc: ['body', 'arrival_buffer_minutes'], msg: 'Input should be less than or equal to 120' },
    { loc: ['body', 'days_of_week'], msg: 'Select at least one day' },
  ] }, { status: 422 });
  await assert.rejects(updateCommute('42', { bufferMinutes: 121 }), error =>
    error.status === 422 && error.message.includes('arrival_buffer_minutes: Input should')
    && error.message.includes('days_of_week: Select at least one day'));
});

test('empty validation details still produce a visible fallback error', async () => {
  globalThis.fetch = async () => Response.json({ detail: [] }, { status: 422 });
  await assert.rejects(updateCommute('42', { bufferMinutes: 121 }), /API request failed \(422\)/);
});

test('an empty user-scoped list stays empty without demonstration records', async () => {
  globalThis.fetch = async () => Response.json([]);
  assert.deepEqual(await listCommutes(new AbortController().signal), []);
});

test('deletion always requests the authenticated backend and propagates failures', async () => {
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return Response.json({ detail: 'Commute not found' }, { status: 404 });
  };
  await assert.rejects(removeCommute('42'), /Commute not found/);
  assert.equal(requests[0].method, 'DELETE');
  assert.equal(requests[0].headers.Authorization, 'Bearer test-token');
  globalThis.fetch = async () => new Response(null, { status: 204 });
  await removeCommute('42');
});
