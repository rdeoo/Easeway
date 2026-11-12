import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateAuthInput } from '../src/utils/auth-validation.ts';

test('registration reports specific missing fields', () => {
  assert.equal(validateAuthInput('register', '   ', '', ''), 'Enter your name.');
  assert.equal(validateAuthInput('register', 'Name', ' ', ''), 'Enter your email address.');
  assert.equal(validateAuthInput('register', 'Name', 'me@example.com', ''), 'Enter your password.');
});

test('both forms reject malformed emails before authentication', () => {
  for (const screen of ['login', 'register']) {
    for (const email of ['not-an-email', 'me@', '@example.com', 'me @example.com', 'me@@example.com']) {
      assert.equal(validateAuthInput(screen, 'Name', email, 'password'), 'Enter a valid email address.');
    }
  }
});

test('registration requires eight characters and rejects all-space passwords', () => {
  assert.equal(validateAuthInput('register', 'Name', 'me@example.com', '1234567'), 'Use a password with at least 8 characters.');
  assert.equal(validateAuthInput('register', 'Name', 'me@example.com', '12345678'), null);
  assert.equal(validateAuthInput('register', 'Name', 'me@example.com', '        '), 'Your password cannot contain only spaces.');
});

test('login permits existing shorter passwords and registration accepts trimmed email/name', () => {
  assert.equal(validateAuthInput('login', '', 'me@example.com', 'short'), null);
  assert.equal(validateAuthInput('login', '', 'me@example.com', ''), 'Enter your password.');
  assert.equal(validateAuthInput('register', ' Name ', ' me@example.com ', 'long password'), null);
});
