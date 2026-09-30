import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMockPracticeApi } from '../src/api/practiceApi.js';
import { START_NOW, SLOTS_TODAY } from '../src/mocks/practiceDay.js';

describe('mock practice API', () => {
  it('starts at the simulated practice time with an empty delay', () => {
    const api = createMockPracticeApi();
    assert.equal(api.getNow(), START_NOW);
    assert.equal(api.getDelay(), 0);
    assert.equal(api.getQueue().length, 5);
  });

  it('applies demo delay events with clamps', () => {
    const api = createMockPracticeApi();
    api.applyEvent('emergency');
    assert.equal(api.getDelay(), 20);
    api.applyEvent('overrun');
    assert.equal(api.getDelay(), 30);
    api.applyEvent('noshow');
    assert.equal(api.getDelay(), 15);
    api.setDelay(55);
    api.applyEvent('emergency');
    assert.equal(api.getDelay(), 60);
  });

  it('exposes slots and types for booking', () => {
    const api = createMockPracticeApi();
    const slots = api.getSlots();
    assert.deepEqual(slots.today, SLOTS_TODAY);
    assert.ok(api.getTypes().acute);
    assert.equal(api.parseSlotTime('11:00'), 660);
  });

  it('resets simulation state', () => {
    const api = createMockPracticeApi();
    api.setDelay(40);
    api.tick(30);
    api.setPlaying(true);
    api.reset();
    assert.equal(api.getDelay(), 0);
    assert.equal(api.getNow(), START_NOW);
    assert.equal(api.isPlaying(), false);
  });
});
