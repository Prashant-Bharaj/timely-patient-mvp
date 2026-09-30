import { floor5, fmt, lowerBound, rangeText, returnAt, expectedStart, isLiveAppointment } from './time.js';

/**
 * Pure evaluation of delay / return / next-up notifications.
 * Returns messages to send and appointment field patches — no DOM side effects.
 */
export function evaluateNotifications({ appt, now, delay }) {
  if (!isLiveAppointment(appt) || appt.phase === 'done') {
    return { messages: [], patch: {} };
  }

  const messages = [];
  const patch = {};
  const a = { ...appt, ...patch };

  if (!a.checkedIn && Math.abs(delay - a.notifiedDelay) >= 10) {
    if (delay >= 10) {
      const lb = lowerBound(a.start, delay);
      messages.push(
        `Update: Dr. Hoffmann is running about ${delay} min late. Expected start ${rangeText(a.start, delay)}. No need to arrive before ${fmt(floor5(lb - 10))}.`,
      );
    } else {
      messages.push(`Good news: the practice is back on schedule. Your appointment is at ${fmt(a.start)}.`);
    }
    patch.notifiedDelay = delay;
    a.notifiedDelay = delay;
  }

  if (a.away && now >= returnAt(a.start, delay) && !a.returnSent) {
    patch.returnSent = true;
    messages.push(
      `Time to come back. You are up in about 10 min (expected ${rangeText(a.start, delay)}). Please check in again when you are back.`,
    );
  }

  if (
    a.checkedIn &&
    !a.away &&
    a.phase === 'waiting' &&
    now >= expectedStart(a.start, delay) - 2 &&
    !a.nextSent
  ) {
    patch.nextSent = true;
    patch.phase = 'next';
  }

  return { messages, patch };
}

export function confirmationMessage(typeName, day, time) {
  return `Confirmed: ${typeName}, ${day} at ${time} with Dr. Hoffmann. Live status: timely.link/a8k2`;
}

export function adminReceivedMessage(firstName) {
  return `Thanks ${firstName}, we received your request. We'll text you when it is ready.`;
}

export function coffeeLeaveMessage(returnMinute) {
  return `Enjoy your coffee. We'll text you at about ${fmt(returnMinute)} when it's time to come back.`;
}

export function calledInMessage() {
  return 'It is your turn. Please go to Room 2.';
}
