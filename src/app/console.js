import { fmt, isLiveAppointment } from '../domain/time.js';
import { queueStatus } from '../domain/status.js';
import { esc } from './state.js';

export function renderConsole(S, api, $) {
  const now = api.getNow();
  const delay = api.getDelay();
  const types = api.getTypes();

  $('#simClock').textContent = fmt(now);
  $('#phoneClock').textContent = fmt(now);
  $('#delaySlider').value = delay;
  $('#delayOut').textContent = `${delay} min`;
  const pill = $('#delayPill');
  pill.textContent = delay >= 10 ? `${delay} min late` : 'On time';
  pill.className = 'delay-pill' + (delay >= 10 ? ' late' : '');
  $('#playBtn').textContent = api.isPlaying() ? '❚❚ Pause' : '▶ Play';

  const rows = api.getQueue().map(q => ({ ...q, me: false }));
  if (isLiveAppointment(S.appt)) {
    rows.push({
      name: esc(S.appt.name) || 'You (demo patient)',
      start: S.appt.start,
      dur: S.appt.dur,
      type: types[S.appt.typeKey].name,
      me: true,
    });
  }
  rows.sort((a, b) => a.start - b.start);

  const labels = {
    done: ['done', 'Done'],
    in: ['in', 'In treatment'],
    wait: ['wait', 'Waiting room'],
    upcoming: ['', 'Upcoming'],
  };
  const mutable = api.getQueueMutable();
  $('#queue').innerHTML = rows
    .map(q => {
      let b;
      if (q.me) {
        const a = S.appt;
        b =
          a.phase === 'done'
            ? labels.done
            : a.phase === 'called'
              ? labels.in
              : a.away
                ? ['away', 'Out for coffee']
                : a.checkedIn
                  ? labels.wait
                  : ['', 'Not arrived'];
      } else {
        const orig = mutable.find(x => x.name === q.name);
        const st = queueStatus(orig, now, delay);
        if (st === 'done') orig.done = true;
        b = labels[st];
      }
      const late = delay > 0 && b[0] !== 'done' ? `<small>→ ${fmt(q.start + delay)}</small>` : '';
      return `<li class="${q.me ? 'me' : ''}"><span class="qt">${fmt(q.start)}${late}</span><span class="qn">${q.name}${q.me ? ' · booked via Timely' : ''}<small>${q.type} · ${q.dur} min</small></span><span class="badge ${b[0]}">${b[1]}</span></li>`;
    })
    .join('');

  const acts = $('#consoleActions');
  if (isLiveAppointment(S.appt) && S.appt.phase !== 'done') {
    const a = S.appt;
    const canCall = a.checkedIn && !a.away && a.phase !== 'called';
    acts.innerHTML =
      a.phase === 'called'
        ? `<button class="btn btn-ghost" data-finish>Finish treatment for ${a.name.split(' ')[0] || 'patient'}</button>`
        : `<button class="btn btn-ghost" data-call ${canCall ? '' : 'disabled'}>Call ${a.name.split(' ')[0] || 'patient'} in</button><span class="small muted" style="align-self:center">${canCall ? '' : a.away ? 'Patient is out, send the "come back" text first by moving time forward.' : 'Patient has not checked in yet.'}</span>`;
  } else {
    acts.innerHTML = S.appt
      ? ''
      : '<p class="empty-q">Book an appointment for today in the patient view to add yourself to this queue.</p>';
  }

  $('#rulesTable').innerHTML = `<thead><tr><th>Type</th><th>Duration</th><th>Staff</th><th>Room</th></tr></thead><tbody>${Object.entries(
    types,
  )
    .map(([k, v]) => {
      const hit = (S.appt ? S.appt.typeKey : S.typeKey) === k ? 'hit' : '';
      return `<tr class="${hit}"><td>${v.name}</td><td>${v.dur ? v.dur + ' min' : '—'}</td><td>${v.staff}</td><td>${v.room}</td></tr>`;
    })
    .join('')}</tbody>`;
}
