import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/chat/route';
import { dbService } from '../lib/db';
import { signSessionToken, SESSION_COOKIE_NAME } from '../lib/session';

test('AI Help Chat: 1. Rejects unauthenticated requests with 401', async () => {
  const req = new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'What are the land norms?' }),
  });

  const res = await POST(req);
  assert.equal(res.status, 401, 'Unauthenticated request must return 401');
  const data = await res.json();
  assert.equal(data.success, false);
});

test('AI Help Chat: 2. Rejects empty message with 400', async () => {
  const officer = dbService.getUserByEmail('officer@example.com')!;
  assert.ok(officer, 'officer user must exist');
  const token = signSessionToken({ id: officer.id, role: officer.role }, 3600);

  const req = new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
    },
    body: JSON.stringify({ message: '   ' }),
  });

  const res = await POST(req);
  assert.equal(res.status, 400, 'Empty message must return 400');
  const data = await res.json();
  assert.equal(data.success, false);
});

test('AI Help Chat: 3. Rejects oversized message (>2000 chars) with 400', async () => {
  const officer = dbService.getUserByEmail('officer@example.com')!;
  const token = signSessionToken({ id: officer.id, role: officer.role }, 3600);

  const oversized = 'A'.repeat(2005);
  const req = new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
    },
    body: JSON.stringify({ message: oversized }),
  });

  const res = await POST(req);
  assert.equal(res.status, 400, 'Oversized message must return 400');
});

test('AI Help Chat: 4. Returns structured statutory guidance for authenticated user', async () => {
  const officer = dbService.getUserByEmail('officer@example.com')!;
  const token = signSessionToken({ id: officer.id, role: officer.role }, 3600);

  const req = new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `${SESSION_COOKIE_NAME}=${token}`,
    },
    body: JSON.stringify({
      message: 'What are the land norms for Metro cities?',
      history: [],
      context: { currentPage: '/cases' },
    }),
  });

  const res = await POST(req);
  assert.equal(res.status, 200, 'Authenticated chat must return 200');
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.reply && data.reply.length > 20, 'Must contain descriptive reply');
  assert.ok(Array.isArray(data.suggested_actions), 'Must return suggested actions array');
  assert.ok(Array.isArray(data.sources), 'Must return sources array');
});

