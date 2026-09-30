import { parseTime } from '../domain/time.js';

/** Reproducible simulated practice day used by the mock practice API. */
export const START_NOW = parseTime('10:20');

export const BASE_QUEUE = [
  { name: 'A. Becker', start: parseTime('10:10'), dur: 10, type: 'Follow-up / results' },
  { name: 'M. Yilmaz', start: parseTime('10:20'), dur: 15, type: 'Acute consultation' },
  { name: 'K. Schulz', start: parseTime('10:35'), dur: 10, type: 'Vaccination' },
  { name: 'L. Fischer', start: parseTime('10:45'), dur: 15, type: 'Acute consultation' },
  { name: 'J. Wagner', start: parseTime('11:40'), dur: 10, type: 'Short consultation' },
];

export const SLOTS_TODAY = ['11:00', '11:15', '11:25', '12:10'];
export const SLOTS_TOMORROW = ['08:30', '09:10', '09:45', '10:30', '14:00', '15:15', '16:20', '17:30'];
export const RECOMMENDED = ['11:00', '08:30', '14:00'];

export const PRACTICE = {
  name: 'Dr. Hoffmann practice',
  doctor: 'Dr. Hoffmann',
  address: 'Königsallee 12, Düsseldorf',
  openUntil: '18:00',
  phone: '0211 123 456',
};

/** Demo events that mutate delay — same deltas as the original console. */
export const DELAY_EVENTS = {
  emergency: 20,
  overrun: 10,
  noshow: -15,
};
