import { REASONS, QUESTIONS } from '../domain/triage.js';
import { fmt, isLiveAppointment } from '../domain/time.js';
import { statusModel, patientsAhead, queueStatus } from '../domain/status.js';
import { esc } from './state.js';

const icon = d =>
  `<span class="ic"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></span>`;

const steps = n =>
  `<div class="steps">${[1, 2, 3, 4].map(i => `<span class="${i <= n ? 'on' : ''}"></span>`).join('')}</div>`;

function actionButtons(actions) {
  const cls = { primary: 'btn-primary', warm: 'btn-warm', line: 'btn-line' };
  const data = {
    checkin: 'data-checkin',
    coffee: 'data-coffee',
    stay: 'data-stay',
    'back-in': 'data-back-in',
  };
  return actions
    .map(a => `<button class="btn ${cls[a.style] || 'btn-line'}" ${data[a.id]}>${a.label}</button>`)
    .join('');
}

export function screenHome(S, practice, delay) {
  const lateTxt = delay >= 10 ? `Running about ${delay} min late right now` : 'Running on time right now';
  return `
    <h1 class="screen-title">When would you like to come in?</h1>
    <p class="screen-sub">We tell you when it is your turn, so you spend less time in the waiting room.</p>
    <div class="card"><div class="eyebrow">${practice.name} · Today</div>
      <div style="font-weight:700;margin-top:4px">${lateTxt}</div>
      <div class="small muted">Open until ${practice.openUntil} · ${practice.address}</div></div>
    <button class="btn btn-primary" data-go="reason">Book an appointment</button>
    ${S.appt ? `<button class="btn btn-line" data-go="status">View my appointment</button>` : ''}
  `;
}

export function screenReason() {
  return `
    <button class="back" data-back>← Back</button>
    ${steps(1)}
    <h1 class="screen-title">What brings you in?</h1>
    <p class="screen-sub">Choose what fits best. You don't need to know the right appointment type. We work it out for you.</p>
    <div class="choice-list">
      ${REASONS.map(
        r =>
          `<button class="choice" data-reason="${r.id}">${icon(r.ic)}<span><span class="t">${r.t}</span><span class="d">${r.d}</span></span></button>`,
      ).join('')}
    </div>`;
}

export function screenQuestion(S) {
  const q = QUESTIONS[S.qid];
  if (!q || q.urgent) return '';
  const body = q.free
    ? `<div class="field"><label for="free">A few words are enough</label><textarea id="free" rows="4" placeholder="e.g. sick note for work, question about my blood pressure readings">${esc(S.freeText)}</textarea></div>
       <button class="btn btn-primary" data-free>Continue</button>`
    : `<div class="choice-list">${q.opts
        .map(
          (o, i) =>
            `<button class="choice" data-opt="${i}"><span><span class="t">${o.l}</span></span></button>`,
        )
        .join('')}</div>`;
  return `
    <button class="back" data-back>← Back</button>
    ${steps(2)}
    <h1 class="screen-title">${q.q}</h1>
    ${body}`;
}

export function screenUrgent(practice) {
  return `
    <button class="back" data-back>← Back</button>
    <div class="alert"><b>Please don't wait for an appointment.</b>Call the emergency number <b style="display:inline">112</b> now. If you are unsure, call the practice directly on ${practice.phone}.</div>
    <p class="screen-sub">Online booking is not suitable for emergencies.</p>`;
}

export function screenType(S, types) {
  const ty = types[S.typeKey];
  const chips = ty.dur ? [`${ty.dur} min`, ty.staff, ty.room] : [ty.staff, 'No visit needed'];
  return `
    <button class="back" data-back>← Back</button>
    ${steps(3)}
    <h1 class="screen-title">This is what we suggest</h1>
    <div class="card type-card">
      <div class="eyebrow">Appointment type</div>
      <div class="type-name">${ty.name}</div>
      <div class="meta">${chips.map(c => `<span class="chip">${c}</span>`).join('')}</div>
      <p class="prep">${ty.prep}</p>
    </div>
    <p class="screen-sub">Based on your answers. The team can still adjust it if something else fits better.</p>
    <button class="btn btn-primary" data-go="${ty.dur ? 'slot' : 'details'}">${ty.dur ? 'Choose a time' : 'Continue'}</button>`;
}

export function screenSlot(S, slots) {
  const btn = (day, s) => {
    const sel = S.slot && S.slot.day === day && S.slot.time === s;
    return `<button class="slot ${sel ? 'selected' : ''} ${slots.recommended.includes(s) ? 'rec' : ''}" data-slot="${day}|${s}">${s}</button>`;
  };
  return `
    <button class="back" data-back>← Back</button>
    ${steps(3)}
    <h1 class="screen-title">Pick a time</h1>
    <div><div class="slots-day">Today</div><div class="slots">${slots.today.map(s => btn('today', s)).join('')}</div></div>
    <div><div class="slots-day">Tomorrow</div><div class="slots">${slots.tomorrow.map(s => btn('tomorrow', s)).join('')}</div></div>
    <div class="legend"><i></i> Usually the shortest wait, based on past days</div>
    <button class="btn btn-primary" data-go="details" ${S.slot ? '' : 'disabled'}>Continue</button>
    <p class="small muted">Tip for the demo: choose a time today to see the live updates.</p>`;
}

export function screenDetails(S, types, practice) {
  const ty = types[S.typeKey];
  return `
    <button class="back" data-back>← Back</button>
    ${steps(4)}
    <h1 class="screen-title">Almost done</h1>
    <div class="card"><div class="eyebrow">${ty.name}</div>
      <div style="font-weight:700;margin-top:4px">${
        ty.dur
          ? `${S.slot.day === 'today' ? 'Today' : 'Tomorrow'}, ${S.slot.time} · ${practice.doctor}`
          : 'Request, no visit'
      }</div></div>
    <div class="field"><label for="nm">Full name</label><input id="nm" autocomplete="name" value="${esc(S.name)}" placeholder="First and last name"></div>
    <div class="field"><label for="ph">Mobile number for updates</label><input id="ph" type="tel" autocomplete="tel" value="${esc(S.phone)}" placeholder="+49 …"></div>
    <label class="check"><input type="checkbox" id="cs" ${S.consent ? 'checked' : ''}> Send me text updates about delays and when it is my turn. Only used for this appointment.</label>
    <button class="btn btn-primary" data-confirm>Confirm</button>`;
}

export function screenAdminDone() {
  return `
    <div class="status-hero done"><div class="eyebrow">Request received</div>
      <div class="headline">No visit needed</div>
      <div class="sub">We'll text you as soon as it is ready, usually by tomorrow at 10:00.</div></div>
    <button class="btn btn-line" data-restart>Start over</button>`;
}

export function screenStatus(S, types, api) {
  const a = S.appt;
  const ty = types[a.typeKey];
  const now = api.getNow();
  const delay = api.getDelay();
  const queue = api.getQueueMutable();
  // Keep original done-flag mutation behaviour while computing ahead
  queue.forEach(q => {
    if (queueStatus(q, now, delay) === 'done') q.done = true;
  });
  const aheadCount = patientsAhead(queue, a, now, delay);
  const m = statusModel({ appt: a, now, delay, aheadCount });
  const live = isLiveAppointment(a) && a.phase !== 'done';
  return `
    <div class="status-hero ${m.cls}">
      <div class="eyebrow">${live ? '<span class="live-dot"></span>' : ''}${m.eyebrow}</div>
      ${m.range ? `<div class="range">${m.range}</div>` : ''}
      <div class="headline">${m.headline}</div>
      <div class="sub">${m.sub}</div>
    </div>
    ${actionButtons(m.actions)}
    <div class="facts">
      <div class="fact"><div class="v">${fmt(a.start)}</div><div class="l">Booked time${a.day === 'tomorrow' ? ' (tomorrow)' : ''}</div></div>
      <div class="fact"><div class="v">${ty.dur} min</div><div class="l">${ty.name}</div></div>
    </div>
    <div class="card"><div class="eyebrow">Please bring</div><p class="small" style="margin-top:4px">${ty.prep}</p></div>
    <div>
      <div class="eyebrow" style="margin-bottom:8px">Messages</div>
      <div class="timeline">${
        S.messages.map(x => `<div class="msg"><time>${fmt(x.at)}</time>${x.text}</div>`).join('') ||
        '<div class="small muted">No messages yet.</div>'
      }</div>
    </div>
    <button class="btn btn-line" data-restart>Start a new booking</button>`;
}

export function renderPatientScreen(S, api, $) {
  const practice = api.getPractice();
  const types = api.getTypes();
  const r = S.route;
  const html =
    r === 'home'
      ? screenHome(S, practice, api.getDelay())
      : r === 'reason'
        ? screenReason()
        : r === 'q'
          ? screenQuestion(S)
          : r === 'urgent'
            ? screenUrgent(practice)
            : r === 'type'
              ? screenType(S, types)
              : r === 'slot'
                ? screenSlot(S, api.getSlots())
                : r === 'details'
                  ? screenDetails(S, types, practice)
                  : r === 'admin'
                    ? screenAdminDone()
                    : screenStatus(S, types, api);

  const screen = $('#screen');
  const keepScroll = screen.dataset.route === r;
  const y = screen.scrollTop;
  if (r === 'details' && $('#nm')) {
    S.name = $('#nm').value;
    S.phone = $('#ph').value;
    S.consent = $('#cs').checked;
  }
  if (r === 'q' && $('#free')) S.freeText = $('#free').value;
  const active = document.activeElement && document.activeElement.id;
  screen.innerHTML = html;
  screen.dataset.route = r;
  if (keepScroll) screen.scrollTop = y;
  else screen.scrollTop = 0;
  if (active && $('#' + active, screen)) {
    const el = $('#' + active, screen);
    el.focus();
    if (el.setSelectionRange && el.value) el.setSelectionRange(el.value.length, el.value.length);
  }
}
