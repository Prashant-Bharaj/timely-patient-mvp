import { createMockPracticeApi } from '../api/practiceApi.js';
import { startQuestion, resolveOption, resolveFreeText } from '../domain/triage.js';
import { returnAt, isLiveAppointment } from '../domain/time.js';
import { evaluateNotifications, confirmationMessage, adminReceivedMessage, coffeeLeaveMessage, calledInMessage } from '../domain/notifications.js';
import { createBookingState, createAppointment } from './state.js';
import { renderPatientScreen } from './screens.js';
import { renderConsole } from './console.js';
import { pushMessage, ensureNotificationPermission } from './notify.js';
import { registerServiceWorker } from './pwa.js';

const $ = (s, el = document) => el.querySelector(s);

const api = createMockPracticeApi();
let S = createBookingState();

function applyNotificationEval() {
  const { messages, patch } = evaluateNotifications({
    appt: S.appt,
    now: api.getNow(),
    delay: api.getDelay(),
  });
  if (S.appt && Object.keys(patch).length) Object.assign(S.appt, patch);
  for (const text of messages) pushMessage(S, text, api.getNow(), $, { consent: S.consent });
}

function render() {
  applyNotificationEval();
  renderPatientScreen(S, api, $);
  renderConsole(S, api, $);
}

function go(route) {
  S.trail.push({ route: S.route, qid: S.qid });
  S.route = route;
  render();
}

function back() {
  const p = S.trail.pop();
  if (!p) return;
  S.route = p.route;
  S.qid = p.qid;
  render();
}

function tick(n = 1) {
  for (let i = 0; i < n; i++) {
    api.tick(1);
    applyNotificationEval();
  }
  render();
}

function resetAll() {
  api.reset();
  S = createBookingState();
  $('#smsDrawer').innerHTML = '';
  render();
}

document.addEventListener('click', e => {
  const el = e.target.closest('button, [data-slot]');
  if (!el) return;
  const d = el.dataset;

  if (d.go) {
    if (d.go === 'status' && S.appt) S.trail = [];
    go(d.go);
  } else if ('back' in d) {
    back();
  } else if (d.reason) {
    S.reason = d.reason;
    S.qid = startQuestion(d.reason);
    S.freeText = '';
    go('q');
  } else if (d.opt !== undefined) {
    const result = resolveOption(S.qid, +d.opt);
    if (result.kind === 'urgent') go('urgent');
    else if (result.kind === 'next') {
      S.trail.push({ route: 'q', qid: S.qid });
      S.qid = result.qid;
      render();
    } else {
      S.typeKey = result.typeKey;
      S.slot = null;
      go('type');
    }
  } else if ('free' in d) {
    S.freeText = $('#free').value;
    S.typeKey = resolveFreeText().typeKey;
    S.slot = null;
    go('type');
  } else if (d.slot) {
    const [day, time] = d.slot.split('|');
    S.slot = { day, time };
    render();
  } else if ('confirm' in d) {
    S.name = $('#nm').value.trim();
    S.phone = $('#ph').value.trim();
    S.consent = $('#cs').checked;
    if (!S.name) {
      $('#nm').focus();
      $('#nm').style.borderColor = 'var(--danger)';
      return;
    }
    ensureNotificationPermission(S.consent);
    const ty = api.getTypes()[S.typeKey];
    S.messages = [];
    if (!ty.dur) {
      S.appt = null;
      S.trail = [];
      S.route = 'admin';
      pushMessage(S, adminReceivedMessage(S.name.split(' ')[0]), api.getNow(), $, { consent: S.consent });
      render();
      return;
    }
    S.appt = createAppointment({
      typeKey: S.typeKey,
      name: S.name,
      day: S.slot.day,
      start: api.parseSlotTime(S.slot.time),
      dur: ty.dur,
      delay: api.getDelay(),
    });
    S.trail = [];
    S.route = 'status';
    pushMessage(
      S,
      confirmationMessage(ty.name, S.slot.day, S.slot.time),
      api.getNow(),
      $,
      { consent: S.consent },
    );
    render();
  } else if ('checkin' in d) {
    S.appt.checkedIn = true;
    S.appt.checkinAt = api.getNow();
    render();
  } else if ('coffee' in d) {
    S.appt.away = true;
    pushMessage(
      S,
      coffeeLeaveMessage(returnAt(S.appt.start, api.getDelay())),
      api.getNow(),
      $,
      { consent: S.consent },
    );
    render();
  } else if ('stay' in d) {
    S.appt.coffeeDeclined = true;
    render();
  } else if ('backIn' in d) {
    S.appt.away = false;
    S.appt.coffeeDeclined = true;
    S.appt.returnSent = true;
    S.appt.backAt = api.getNow();
    render();
  } else if ('call' in d) {
    api.markEarlierDone(S.appt.start);
    S.appt.phase = 'called';
    S.appt.waitedInPractice = api.getNow() - (S.appt.backAt ?? S.appt.checkinAt);
    pushMessage(S, calledInMessage(), api.getNow(), $, { consent: S.consent });
    render();
  } else if ('finish' in d) {
    S.appt.phase = 'done';
    api.setDelay(Math.max(0, api.getDelay()));
    render();
  } else if ('restart' in d) {
    S.route = 'home';
    S.trail = [];
    S.typeKey = null;
    S.slot = null;
    render();
  } else if (d.skip) {
    tick(+d.skip);
  } else if (d.event) {
    api.applyEvent(d.event);
    render();
  } else if (el.id === 'playBtn') {
    api.setPlaying(!api.isPlaying());
    render();
  } else if (el.id === 'resetBtn') {
    resetAll();
  } else if (el.classList.contains('tab')) {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === el));
    document.body.dataset.view = el.dataset.view;
  } else if (el.id === 'themeToggle') {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  }
});

$('#delaySlider').addEventListener('input', e => {
  api.setDelay(+e.target.value);
  render();
});

setInterval(() => {
  if (api.isPlaying()) tick(1);
}, 1000);

document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light';
document.body.dataset.view = 'patient';
registerServiceWorker();
render();

// Expose for automated browser checks in demos / tests
window.__timely = { api, getState: () => S, render, tick, resetAll, isLiveAppointment };
