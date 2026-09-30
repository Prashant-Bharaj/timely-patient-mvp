export const pad = n => String(n).padStart(2, '0');
export const fmt = m => `${pad(Math.floor(m / 60) % 24)}:${pad(((m % 60) + 60) % 60)}`;
export const parseTime = s => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};
export const floor5 = m => Math.floor(m / 5) * 5;
export const ceil5 = m => Math.ceil(m / 5) * 5;

/**
 * Expected start / range helpers.
 * Thresholds match the MVP prototype:
 * - under 10 min delay → show booked time (+/−5 upper)
 * - 10+ min delay → 5-min rounded window with slack
 */
export function expectedStart(apptStart, delay) {
  return apptStart + delay;
}

export function lowerBound(apptStart, delay) {
  const ex = expectedStart(apptStart, delay);
  return delay < 10 ? ex : floor5(ex - 5);
}

export function upperBound(apptStart, delay) {
  const ex = expectedStart(apptStart, delay);
  return delay < 10 ? ex + 5 : ceil5(ex + 5 + Math.round(delay * 0.2));
}

export function returnAt(apptStart, delay) {
  return lowerBound(apptStart, delay) - 10;
}

export function rangeText(apptStart, delay) {
  if (delay < 10) return fmt(apptStart);
  return `${fmt(lowerBound(apptStart, delay))}–${fmt(upperBound(apptStart, delay))}`;
}

export function isLiveAppointment(appt) {
  return Boolean(appt && appt.day === 'today' && appt.dur > 0);
}
