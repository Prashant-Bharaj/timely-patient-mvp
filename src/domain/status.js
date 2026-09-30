import {
  expectedStart,
  floor5,
  fmt,
  isLiveAppointment,
  lowerBound,
  rangeText,
  returnAt,
} from './time.js';

/**
 * Pure status view-model for the patient live screen.
 * `actions` are symbolic so the UI layer can render buttons.
 */
export function statusModel({ appt, now, delay, aheadCount }) {
  if (!appt) return null;

  if (!isLiveAppointment(appt)) {
    return {
      cls: '',
      eyebrow: 'Confirmed',
      headline: `Tomorrow, ${fmt(appt.start)}`,
      range: '',
      sub: 'We will send live updates on the day of your appointment.',
      actions: [],
    };
  }

  const ex = expectedStart(appt.start, delay);

  if (appt.phase === 'done') {
    return {
      cls: 'done',
      eyebrow: 'Finished',
      headline: 'All done. Thank you.',
      range: '',
      sub: 'Your total wait in the practice: ' + (appt.waitedInPractice ?? 0) + ' min.',
      actions: [],
    };
  }

  if (appt.phase === 'called') {
    return {
      cls: 'next',
      eyebrow: 'Your turn',
      headline: 'Please go to Room 2',
      range: '',
      sub: 'Dr. Hoffmann is ready for you.',
      actions: [],
    };
  }

  if (appt.away) {
    if (now >= returnAt(appt.start, delay)) {
      return {
        cls: 'return',
        eyebrow: 'Time to come back',
        headline: `Please be back by ${fmt(lowerBound(appt.start, delay))}`,
        range: rangeText(appt.start, delay),
        sub: 'Expected start. Tap below when you are back at reception.',
        actions: [{ id: 'back-in', label: "I'm back", style: 'warm' }],
      };
    }
    return {
      cls: 'coffee',
      eyebrow: 'Enjoy your break',
      headline: `We'll text you at about ${fmt(returnAt(appt.start, delay))}`,
      range: rangeText(appt.start, delay),
      sub: `Expected start. That's about ${returnAt(appt.start, delay) - now} min for you.`,
      actions: [{ id: 'back-in', label: "I'm back early", style: 'line' }],
    };
  }

  if (appt.checkedIn) {
    if (appt.phase === 'next') {
      return {
        cls: 'next',
        eyebrow: "You're next",
        headline: 'Please stay close to the waiting room',
        range: rangeText(appt.start, delay),
        sub: 'We will call you in a moment.',
        actions: [],
      };
    }
    const wait = lowerBound(appt.start, delay) - now;
    if (wait >= 20 && !appt.coffeeDeclined) {
      return {
        cls: 'coffee',
        eyebrow: 'You have time',
        headline: `About ${wait} min until your turn`,
        range: rangeText(appt.start, delay),
        sub: `Grab a coffee nearby. We'll text you at about ${fmt(returnAt(appt.start, delay))}, 10 min before it's your turn.`,
        actions: [
          { id: 'coffee', label: 'Go for a coffee', style: 'warm' },
          { id: 'stay', label: "I'll wait here", style: 'line' },
        ],
      };
    }
    return {
      cls: delay >= 10 ? 'late' : '',
      eyebrow: 'Checked in',
      headline: wait > 0 ? `About ${wait} min to go` : 'Almost your turn',
      range: rangeText(appt.start, delay),
      sub: `${aheadCount} patient${aheadCount === 1 ? '' : 's'} ahead of you.`,
      actions: [],
    };
  }

  const checkin = [{ id: 'checkin', label: "I'm here, check me in", style: 'primary' }];
  if (now > ex) {
    return {
      cls: 'late',
      eyebrow: 'Your appointment time',
      headline: 'Are you on your way?',
      range: rangeText(appt.start, delay),
      sub: 'Check in as soon as you arrive.',
      actions: checkin,
    };
  }
  if (delay >= 10) {
    return {
      cls: 'late',
      eyebrow: `Running ~${delay} min late`,
      headline: `No need to arrive before ${fmt(floor5(lowerBound(appt.start, delay) - 10))}`,
      range: rangeText(appt.start, delay),
      sub: `Expected start instead of ${fmt(appt.start)}.`,
      actions: checkin,
    };
  }
  return {
    cls: '',
    eyebrow: 'On time',
    headline: `Please arrive by ${fmt(appt.start - 5)}`,
    range: rangeText(appt.start, delay),
    sub: 'Your appointment is running on time.',
    actions: checkin,
  };
}

export function queueStatus(q, now, delay) {
  if (q.done) return 'done';
  const s = q.start + delay;
  if (now >= s + q.dur) return 'done';
  if (now >= s) return 'in';
  if (now >= q.start - 10) return 'wait';
  return 'upcoming';
}

export function patientsAhead(queue, appt, now, delay) {
  if (!appt) return 0;
  return queue.filter(q => {
    if (q.start >= appt.start) return false;
    const status = queueStatus(q, now, delay);
    return status !== 'done';
  }).length;
}
