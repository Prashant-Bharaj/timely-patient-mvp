/** Guided single-choice question tree for appointment pre-qualification. */

export const REASONS = [
  {
    id: 'symptoms',
    t: 'I have symptoms',
    d: 'Pain, fever, infection, feeling unwell',
    ic: 'M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z',
    start: 'sym1',
  },
  {
    id: 'rx',
    t: 'Prescription or referral',
    d: 'Repeat medication, referral letter',
    ic: 'M9 3h6v4H9zM6 7h12v14H6zM12 11v6M9 14h6',
    start: 'rx1',
  },
  {
    id: 'follow',
    t: 'Follow-up or test results',
    d: 'Discuss results, check progress',
    ic: 'M4 19h16M7 16V9M12 16V5M17 16v-4',
    start: 'fu1',
  },
  {
    id: 'prev',
    t: 'Check-up or vaccination',
    d: 'Prevention, screening, vaccines',
    ic: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
    start: 'pv1',
  },
  {
    id: 'other',
    t: 'Something else',
    d: 'Describe it in a few words',
    ic: 'M5 12h.01M12 12h.01M19 12h.01',
    start: 'ot1',
  },
];

export const QUESTIONS = {
  sym1: {
    q: 'Is any of this true right now?',
    opts: [
      { l: 'Chest pain, difficulty breathing, signs of a stroke or heavy bleeding', urgent: true },
      { l: 'High fever (over 39 °C) or severe pain', r: 'urgentToday' },
      { l: 'None of these', n: 'sym2' },
    ],
  },
  sym2: {
    q: 'How long have you had the symptoms?',
    opts: [
      { l: 'Since today or yesterday', r: 'acute' },
      { l: 'A few days', r: 'acute' },
      { l: 'More than a week', r: 'extended' },
    ],
  },
  rx1: {
    q: 'What do you need?',
    opts: [
      { l: 'Repeat prescription for medication I already take', r: 'admin' },
      { l: 'A new prescription', r: 'short' },
      { l: 'A referral to a specialist', n: 'rx2' },
    ],
  },
  rx2: {
    q: 'Have you already discussed this referral with the doctor?',
    opts: [
      { l: 'Yes, it was agreed', r: 'admin' },
      { l: 'No, not yet', r: 'short' },
    ],
  },
  fu1: {
    q: 'Do you need a new blood test?',
    opts: [
      { l: 'Yes, or I am not sure', r: 'labfollow' },
      { l: 'No, just to discuss results or progress', r: 'followup' },
    ],
  },
  pv1: {
    q: 'Which one?',
    opts: [
      { l: 'Health check-up (35+)', r: 'checkup' },
      { l: 'Vaccination', r: 'vaccine' },
      { l: 'Cancer screening', r: 'screening' },
    ],
  },
  ot1: { q: 'What is it about?', free: true, r: 'other' },
};

/** Resolve a reason id to the first question id. */
export function startQuestion(reasonId) {
  const reason = REASONS.find(r => r.id === reasonId);
  return reason ? reason.start : null;
}

/**
 * Apply a single-choice answer.
 * @returns {{ kind: 'urgent' } | { kind: 'next', qid: string } | { kind: 'type', typeKey: string }}
 */
export function resolveOption(qid, optIndex) {
  const q = QUESTIONS[qid];
  if (!q || !q.opts) throw new Error(`Unknown question: ${qid}`);
  const o = q.opts[optIndex];
  if (!o) throw new Error(`Unknown option ${optIndex} for ${qid}`);
  if (o.urgent) return { kind: 'urgent' };
  if (o.n) return { kind: 'next', qid: o.n };
  return { kind: 'type', typeKey: o.r };
}

/** Free-text path always maps to team review. */
export function resolveFreeText() {
  return { kind: 'type', typeKey: 'other' };
}

/** Enumerate every deterministic path for tests: reason → type or urgent. */
export function allDeterministicPaths() {
  const paths = [];
  for (const reason of REASONS) {
    walk(reason.start, [reason.id], paths);
  }
  return paths;
}

function walk(qid, trail, out) {
  const q = QUESTIONS[qid];
  if (!q) return;
  if (q.free) {
    out.push({ trail: [...trail, qid, 'free'], result: resolveFreeText() });
    return;
  }
  q.opts.forEach((o, i) => {
    const step = [...trail, qid, i];
    const r = resolveOption(qid, i);
    if (r.kind === 'next') walk(r.qid, step, out);
    else out.push({ trail: step, result: r });
  });
}
