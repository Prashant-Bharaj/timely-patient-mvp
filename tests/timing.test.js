import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTime,
  fmt,
  expectedStart,
  lowerBound,
  upperBound,
  returnAt,
  rangeText,
  isLiveAppointment,
} from '../src/domain/time.js';
import { statusModel } from '../src/domain/status.js';
import { evaluateNotifications } from '../src/domain/notifications.js';

describe('timing helpers', () => {
  it('parses and formats minutes', () => {
    assert.equal(parseTime('11:00'), 660);
    assert.equal(fmt(660), '11:00');
  });

  it('keeps booked time when delay under 10', () => {
    assert.equal(expectedStart(660, 5), 665);
    assert.equal(lowerBound(660, 5), 665);
    assert.equal(rangeText(660, 5), '11:00');
  });

  it('uses rounded range and early return when delay is 10+', () => {
    assert.equal(lowerBound(660, 20), 675);
    assert.equal(returnAt(660, 20), 665);
    assert.match(rangeText(660, 20), /^\d{2}:\d{2}–\d{2}:\d{2}$/);
  });

  it('detects live today appointments only', () => {
    assert.equal(isLiveAppointment({ day: 'today', dur: 15 }), true);
    assert.equal(isLiveAppointment({ day: 'tomorrow', dur: 15 }), false);
    assert.equal(isLiveAppointment({ day: 'today', dur: 0 }), false);
  });
});

describe('status transitions', () => {
  const base = {
    start: 660,
    day: 'today',
    dur: 15,
    phase: 'waiting',
    checkedIn: false,
    away: false,
    coffeeDeclined: false,
  };

  it('suggests coffee after check-in when wait >= 20', () => {
    const m = statusModel({
      appt: { ...base, checkedIn: true },
      now: 620,
      delay: 0,
      aheadCount: 2,
    });
    assert.equal(m.cls, 'coffee');
    assert.ok(m.actions.some(a => a.id === 'coffee'));
  });

  it('asks patient to come back when away and return time reached', () => {
    const m = statusModel({
      appt: { ...base, checkedIn: true, away: true },
      now: 655,
      delay: 0,
      aheadCount: 0,
    });
    assert.equal(m.cls, 'return');
  });

  it('sends late update when delay jumps by 10 before check-in', () => {
    const { messages, patch } = evaluateNotifications({
      appt: { ...base, notifiedDelay: 0, returnSent: false, nextSent: false },
      now: 620,
      delay: 20,
    });
    assert.equal(messages.length, 1);
    assert.match(messages[0], /running about 20 min late/);
    assert.equal(patch.notifiedDelay, 20);
  });

  it('sends come-back message when away and time reached', () => {
    const { messages, patch } = evaluateNotifications({
      appt: {
        ...base,
        checkedIn: true,
        away: true,
        notifiedDelay: 0,
        returnSent: false,
        nextSent: false,
      },
      now: 650,
      delay: 0,
    });
    assert.equal(messages.length, 1);
    assert.match(messages[0], /Time to come back/);
    assert.equal(patch.returnSent, true);
  });
});
