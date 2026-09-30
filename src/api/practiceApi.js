import { TYPES } from '../domain/types.js';
import { parseTime } from '../domain/time.js';
import {
  BASE_QUEUE,
  DELAY_EVENTS,
  PRACTICE,
  RECOMMENDED,
  SLOTS_TODAY,
  SLOTS_TOMORROW,
  START_NOW,
} from '../mocks/practiceDay.js';

/**
 * Practice data contract.
 * UI talks only to this shape; a real practice system can replace the mock later.
 *
 * @typedef {object} PracticeApi
 * @property {() => object} getPractice
 * @property {() => number} getNow
 * @property {(minutes: number) => void} setNow
 * @property {(n?: number) => void} tick
 * @property {() => boolean} isPlaying
 * @property {(playing: boolean) => void} setPlaying
 * @property {() => number} getDelay
 * @property {(minutes: number) => void} setDelay
 * @property {(event: 'emergency'|'overrun'|'noshow') => number} applyEvent
 * @property {() => Array} getQueue
 * @property {() => { today: string[], tomorrow: string[], recommended: string[] }} getSlots
 * @property {() => typeof TYPES} getTypes
 * @property {() => void} reset
 * @property {(name: string) => void} markEarlierDone
 */

/**
 * In-browser mock that owns simulated clock, delay, and queue.
 * @returns {PracticeApi & { _state: object }}
 */
export function createMockPracticeApi() {
  const state = {
    now: START_NOW,
    delay: 0,
    playing: false,
    queue: BASE_QUEUE.map(q => ({ ...q, done: false })),
  };

  return {
    _state: state,

    getPractice() {
      return { ...PRACTICE };
    },

    getNow() {
      return state.now;
    },

    setNow(minutes) {
      state.now = minutes;
    },

    tick(n = 1) {
      state.now += n;
    },

    isPlaying() {
      return state.playing;
    },

    setPlaying(playing) {
      state.playing = playing;
    },

    getDelay() {
      return state.delay;
    },

    setDelay(minutes) {
      state.delay = Math.max(0, Math.min(60, minutes));
    },

    applyEvent(event) {
      const delta = DELAY_EVENTS[event];
      if (delta === undefined) return state.delay;
      state.delay = Math.max(0, Math.min(60, state.delay + delta));
      return state.delay;
    },

    getQueue() {
      return state.queue.map(q => ({ ...q }));
    },

    /** Mutating accessor for queueStatus done-flags (matches original behaviour). */
    getQueueMutable() {
      return state.queue;
    },

    getSlots() {
      return {
        today: [...SLOTS_TODAY],
        tomorrow: [...SLOTS_TOMORROW],
        recommended: [...RECOMMENDED],
      };
    },

    getTypes() {
      return TYPES;
    },

    parseSlotTime(time) {
      return parseTime(time);
    },

    markEarlierDone(beforeStart) {
      state.queue.forEach(q => {
        if (q.start < beforeStart) q.done = true;
      });
    },

    reset() {
      state.now = START_NOW;
      state.delay = 0;
      state.playing = false;
      state.queue = BASE_QUEUE.map(q => ({ ...q, done: false }));
    },
  };
}
