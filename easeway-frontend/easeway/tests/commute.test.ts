import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  calculatePlan, DEFAULT_DESTINATION, DEFAULT_ORIGIN, DEMO_ROUTE, departureCountdown, displayDate, displayTime, formatDuration, googleMapsUrl,
  localDateValue, parseArrival, parseBuffer,
} from '../src/lib/commute.ts';

test('9 AM arrival minus 28 minute commute and 10 minute buffer leaves at 8:22', () => {
  const arrival = new Date(2030, 6, 10, 9, 0);
  const plan = calculatePlan(arrival, 28, 10);
  assert.equal(plan.departure.getHours(), 8);
  assert.equal(plan.departure.getMinutes(), 22);
  assert.equal(plan.destinationArrival.getHours(), 8);
  assert.equal(plan.destinationArrival.getMinutes(), 50);
  assert.equal(plan.arrival.getTime(), arrival.getTime());
});

test('a buffer is subtracted, not added, and zero is valid', () => {
  const arrival = new Date(2030, 6, 10, 9, 0);
  const withoutBuffer = calculatePlan(arrival, 28, 0);
  const withBuffer = calculatePlan(arrival, 28, 15);
  assert.equal(withoutBuffer.departure.getTime() - withBuffer.departure.getTime(), 15 * 60_000);
  assert.equal(withoutBuffer.destinationArrival.getTime(), arrival.getTime());
});

test('departure can be on the previous day or year', () => {
  const plan = calculatePlan(new Date(2030, 0, 1, 0, 15), 28, 10);
  assert.equal(localDateValue(plan.departure), '2029-12-31');
  assert.equal(plan.departure.getHours(), 23);
  assert.equal(plan.departure.getMinutes(), 37);
});

test('partial travel minutes round up to avoid a late departure', () => {
  const plan = calculatePlan(new Date(2030, 6, 10, 9, 0), 28.01, 10);
  assert.equal(plan.durationMinutes, 29);
  assert.equal(plan.departure.getMinutes(), 21);
});

test('arrival parses local time and rejects malformed, impossible, and past dates', () => {
  const now = new Date(2030, 0, 1);
  const arrival = parseArrival('2030-07-10', '09:05', now);
  assert.equal(localDateValue(arrival), '2030-07-10');
  assert.equal(arrival.getHours(), 9);
  assert.equal(arrival.getMinutes(), 5);
  for (const [date, time] of [
    ['2030-02-30', '09:00'], ['2030-13-10', '09:00'],
    ['2030-07-10', '24:00'], ['2030-07-10', '09:60'],
    ['', '09:00'], ['2030-07-10', '9:00'],
    ['2029-12-31', '09:00'], ['2030-01-01', '00:00'],
  ]) {
    assert.throws(() => parseArrival(date, time, now));
  }
});

test('buffer accepts only whole minutes in the supported range', () => {
  for (const value of ['0', '5', '10', '180']) assert.equal(parseBuffer(value), Number(value));
  for (const value of ['', '-1', '181', '1.5', 'abc', '1e2', ' 5']) {
    assert.throws(() => parseBuffer(value));
  }
});

test('invalid durations, buffers, and dates cannot produce success-shaped plans', () => {
  const arrival = new Date(2030, 6, 10, 9, 0);
  for (const duration of [0, -1, Infinity, NaN]) {
    assert.throws(() => calculatePlan(arrival, duration, 10));
  }
  for (const buffer of [-1, 181, 1.5, NaN]) {
    assert.throws(() => calculatePlan(arrival, 28, buffer));
  }
  assert.throws(() => calculatePlan(new Date(NaN), 28, 10));
});

test('driving demo retains illustrative timing and uses Vancouver-to-Burnaby defaults', () => {
  assert.equal(DEFAULT_ORIGIN, 'Waterfront Station, 601 W Cordova St, Vancouver, BC, Canada');
  assert.equal(DEFAULT_DESTINATION, 'BCIT Burnaby, 3700 Willingdon Ave, Burnaby, BC, Canada');
  const arrival = new Date(2030, 6, 10, 9, 0);
  const plan = calculatePlan(arrival, DEMO_ROUTE.durationMinutes, 10);
  assert.equal(arrival.getTime() - plan.departure.getTime(), (DEMO_ROUTE.durationMinutes + 10) * 60_000);
  assert.equal(formatDuration(28), '28 min');
  assert.equal(formatDuration(60), '1 hr');
  assert.equal(formatDuration(112), '1 hr 52 min');
});

test('Google Maps link encodes addresses and always requests driving', () => {
  const url = new URL(googleMapsUrl('A & B #1', 'C/D, City'));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.searchParams.get('origin'), 'A & B #1');
  assert.equal(url.searchParams.get('destination'), 'C/D, City');
  assert.equal(url.searchParams.get('travelmode'), 'driving');
  assert.equal(url.searchParams.get('api'), '1');
});

test('dashboard countdown uses the calculated departure and rounds remaining minutes up', () => {
  const now = new Date(2030, 6, 10, 8, 0).getTime();
  assert.equal(departureCountdown(new Date(now + 22 * 60_000), now), 'in 22 minutes');
  assert.equal(departureCountdown(new Date(now + 1), now), 'in 1 minute');
  assert.equal(departureCountdown(new Date(now + 61 * 60_000), now), 'in 1 hr 1 min');
  assert.equal(departureCountdown(new Date(now + 1440 * 60_000), now), 'in 1 day');
  assert.equal(departureCountdown(new Date(now + 1500 * 60_000), now), 'in 1 day 1 hr');
  assert.equal(departureCountdown(new Date(now), now), 'Recommended departure has passed');
  assert.equal(departureCountdown(new Date(now - 1), now), 'Recommended departure has passed');
});

test('dashboard clock and date unambiguously display AM/PM and previous-day departure', () => {
  const plan = calculatePlan(new Date(2030, 0, 1, 0, 15), 28, 10);
  assert.equal(displayTime(plan.departure), '11:37 PM');
  assert.equal(displayTime(plan.arrival), '12:15 AM');
  assert.equal(displayDate(plan.departure), 'Mon, Dec 31, 2029');
});
