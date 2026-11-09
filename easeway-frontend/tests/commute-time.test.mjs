import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultCommutes } from '../src/constants/default-commutes.ts';
import { departureMinutes, departureToday, formatTime } from '../src/utils/commute-time.ts';

test('default Work commute departs at 08:00 with Google duration and buffer', () => {
  assert.equal(defaultCommutes[0].estimatedDurationSeconds, 1183);
  assert.equal(departureMinutes(defaultCommutes[0]), 480);
  assert.equal(formatTime(departureMinutes(defaultCommutes[0])), '8:00 AM');
});

test('default class commute rounds 1803 seconds up, departing at 17:19', () => {
  assert.equal(defaultCommutes[1].estimatedDurationSeconds, 1803);
  assert.equal(formatTime(departureMinutes(defaultCommutes[1])), '5:19 PM');
});

test('rounds partial minutes up but not exact minutes', () => {
  const commute = { ...defaultCommutes[0], bufferMinutes: 0 };
  assert.equal(departureMinutes({ ...commute, estimatedDurationSeconds: 60 }), 509);
  assert.equal(departureMinutes({ ...commute, estimatedDurationSeconds: 61 }), 508);
  assert.equal(departureMinutes({ ...commute, estimatedDurationSeconds: 0 }), 510);
});

test('missing legacy estimates never produce a fabricated departure', () => {
  const commute = { ...defaultCommutes[0], estimatedDurationSeconds: null };
  assert.equal(departureMinutes(commute), null);
  assert.equal(departureToday(commute, 1, 0), null);
});

test('departures crossing midnight are shown on the previous day, including Sunday', () => {
  const commute = {
    ...defaultCommutes[0], arrivalTime: '00:10', days: [1],
    estimatedDurationSeconds: 1200, bufferMinutes: 10,
  };
  assert.equal(departureMinutes(commute), -20);
  assert.equal(formatTime(departureMinutes(commute)), '11:40 PM');
  assert.equal(departureToday(commute, 7, 1380), 1420);
  assert.equal(departureToday(commute, 7, 1421), null);
  assert.equal(departureToday(commute, 1, 0), null);
});

test('upcoming selection excludes passed departures and non-scheduled days', () => {
  assert.equal(departureToday(defaultCommutes[0], 1, 479), 480);
  assert.equal(departureToday(defaultCommutes[0], 1, 481), null);
  assert.equal(departureToday(defaultCommutes[0], 7, 0), null);
});
