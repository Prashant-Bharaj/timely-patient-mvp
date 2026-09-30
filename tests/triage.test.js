import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  REASONS,
  QUESTIONS,
  startQuestion,
  resolveOption,
  resolveFreeText,
  allDeterministicPaths,
} from '../src/domain/triage.js';
import { TYPES } from '../src/domain/types.js';

describe('triage tree', () => {
  it('has a start question for every reason', () => {
    for (const reason of REASONS) {
      assert.ok(QUESTIONS[startQuestion(reason.id)], reason.id);
    }
  });

  it('maps emergency option to urgent', () => {
    assert.deepEqual(resolveOption('sym1', 0), { kind: 'urgent' });
  });

  it('maps high fever to same-day acute', () => {
    assert.deepEqual(resolveOption('sym1', 1), { kind: 'type', typeKey: 'urgentToday' });
  });

  it('continues symptoms duration branch', () => {
    assert.deepEqual(resolveOption('sym1', 2), { kind: 'next', qid: 'sym2' });
    assert.deepEqual(resolveOption('sym2', 0), { kind: 'type', typeKey: 'acute' });
    assert.deepEqual(resolveOption('sym2', 2), { kind: 'type', typeKey: 'extended' });
  });

  it('maps admin and short prescription paths', () => {
    assert.deepEqual(resolveOption('rx1', 0), { kind: 'type', typeKey: 'admin' });
    assert.deepEqual(resolveOption('rx1', 1), { kind: 'type', typeKey: 'short' });
    assert.deepEqual(resolveOption('rx2', 0), { kind: 'type', typeKey: 'admin' });
  });

  it('maps follow-up and prevention paths', () => {
    assert.deepEqual(resolveOption('fu1', 0), { kind: 'type', typeKey: 'labfollow' });
    assert.deepEqual(resolveOption('fu1', 1), { kind: 'type', typeKey: 'followup' });
    assert.deepEqual(resolveOption('pv1', 0), { kind: 'type', typeKey: 'checkup' });
    assert.deepEqual(resolveOption('pv1', 1), { kind: 'type', typeKey: 'vaccine' });
    assert.deepEqual(resolveOption('pv1', 2), { kind: 'type', typeKey: 'screening' });
  });

  it('maps free text to team-reviewed standard consultation', () => {
    assert.deepEqual(resolveFreeText(), { kind: 'type', typeKey: 'other' });
  });

  it('every deterministic path ends in a known type or urgent', () => {
    const paths = allDeterministicPaths();
    assert.ok(paths.length >= 15);
    for (const p of paths) {
      if (p.result.kind === 'urgent') continue;
      assert.equal(p.result.kind, 'type');
      assert.ok(TYPES[p.result.typeKey], p.result.typeKey);
    }
  });
});
