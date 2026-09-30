/**
 * Patient booking UI state (separate from practice simulation).
 */
export function createBookingState() {
  return {
    route: 'home',
    reason: null,
    qid: null,
    trail: [],
    typeKey: null,
    freeText: '',
    slot: null,
    name: '',
    phone: '',
    consent: true,
    appt: null,
    messages: [],
  };
}

export function createAppointment({ typeKey, name, day, start, dur, delay }) {
  return {
    typeKey,
    name,
    day,
    start,
    dur,
    checkedIn: false,
    away: false,
    phase: 'waiting',
    notifiedDelay: delay,
    returnSent: false,
    nextSent: false,
    coffeeDeclined: false,
  };
}

export function esc(v) {
  return String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
