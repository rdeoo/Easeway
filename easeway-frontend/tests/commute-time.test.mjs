import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultCommutes } from '../src/constants/default-commutes.ts';
import {
  departureMinutes, departureToday, formatTime, isInTrafficWindow, nextTrip, trafficWindowStart,
} from '../src/utils/commute-time.ts';

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

// Monday 2026-11-09 local time; the Work commute departs 08:00 with a 1183 s estimate.
const monday = (hours, minutes = 0) => new Date(2026, 10, 9, hours, minutes);

test('nextTrip returns today\'s trip until its departure minute has passed', () => {
  const work = defaultCommutes[0];
  const trip = nextTrip(work, monday(7, 59));
  assert.deepEqual(trip.departure, monday(8, 0));
  assert.deepEqual(trip.arrival, monday(8, 30));
  assert.deepEqual(nextTrip(work, new Date(2026, 10, 9, 8, 0, 59)).departure, monday(8, 0));
  assert.deepEqual(nextTrip(work, monday(8, 1)).departure, new Date(2026, 10, 10, 8, 0));
});

test('nextTrip skips non-commute days and wraps the week', () => {
  const work = defaultCommutes[0];
  // Friday after departure -> next Monday.
  assert.deepEqual(nextTrip(work, new Date(2026, 10, 13, 9, 0)).departure, new Date(2026, 10, 16, 8, 0));
  const sundayOnly = { ...work, days: [7] };
  assert.deepEqual(nextTrip(sundayOnly, monday(9)).arrival, new Date(2026, 10, 15, 8, 30));
});

test('nextTrip uses the arrival time when there is no saved estimate', () => {
  const trip = nextTrip({ ...defaultCommutes[0], estimatedDurationSeconds: null }, monday(8, 15));
  assert.equal(trip.departure, null);
  assert.deepEqual(trip.arrival, monday(8, 30));
});

test('traffic window opens at double the no-traffic duration, capped at one hour', () => {
  const departure = monday(8, 0);
  assert.deepEqual(trafficWindowStart(departure, 1183), new Date(departure.getTime() - 2366_000));
  assert.deepEqual(trafficWindowStart(departure, 1800), monday(7, 0));
  assert.deepEqual(trafficWindowStart(departure, 5400), monday(7, 0));
});

test('isInTrafficWindow is only true between window start and departure', () => {
  const work = defaultCommutes[0];
  const at = now => isInTrafficWindow(nextTrip(work, now), work.estimatedDurationSeconds, now);
  assert.equal(at(monday(7, 20)), false); // 40 min before; window is ~39.4 min
  assert.equal(at(monday(7, 21)), true);
  assert.equal(at(monday(8, 0)), true);
  assert.equal(at(monday(8, 1)), false);
  assert.equal(isInTrafficWindow(null, 1183, monday(7, 30)), false);
  const noEstimate = { ...work, estimatedDurationSeconds: null };
  assert.equal(isInTrafficWindow(nextTrip(noEstimate, monday(7, 30)), null, monday(7, 30)), false);
});
