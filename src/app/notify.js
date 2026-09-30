import { fmt } from '../domain/time.js';

/** In-app message + toast. Web Push can subscribe later without changing call sites. */
export function pushMessage(S, text, now, $, options = {}) {
  S.messages.unshift({ at: now, text });

  const el = document.createElement('div');
  el.className = 'sms-toast';
  el.innerHTML = `<b>Text message · Timely · ${fmt(now)}</b>${text}`;
  const drawer = $('#smsDrawer');
  drawer.prepend(el);
  while (drawer.children.length > 1) drawer.lastChild.remove();
  setTimeout(() => el.remove(), 4500);

  if (options.consent && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification('Timely', { body: text, icon: 'icons/icon-192.png', tag: 'timely-update' });
    } catch {
      /* ignore — OS may block Notification constructor outside SW */
    }
  }
}

export async function ensureNotificationPermission(consent) {
  if (!consent || typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'unsupported';
  }
}
